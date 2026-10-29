-- Bulk deadline changes: tenant-scoped, transactional, auditable and reversible.
CREATE TABLE IF NOT EXISTS public.deadline_change_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 actor_profile_id uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(),
 reverted_at timestamptz, reverted_by uuid REFERENCES public.profiles(id)
);
CREATE TABLE IF NOT EXISTS public.deadline_change_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES public.deadline_change_batches(id),
 assignment_id uuid NOT NULL REFERENCES public.training_assignments(id),
 previous_due_date timestamptz, new_due_date timestamptz NOT NULL,
 UNIQUE(batch_id, assignment_id)
);
CREATE INDEX IF NOT EXISTS deadline_change_batches_tenant_idx ON public.deadline_change_batches(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deadline_change_items_assignment_idx ON public.deadline_change_items(assignment_id);
ALTER TABLE public.deadline_change_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadline_change_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deadline_change_batches, public.deadline_change_items FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bulk_deadline_change(p_tenant uuid, p_items jsonb, p_new_date date, p_revert_batch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor uuid; v_batch uuid; v_count int := 0; v_item record; v_row public.training_assignments%ROWTYPE;
BEGIN
 SELECT id INTO v_actor FROM public.profiles
 WHERE auth_user_id = auth.uid() AND tenant_id = p_tenant AND role IN ('admin','superadmin') LIMIT 1;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Unauthorized tenant admin'; END IF;
 IF p_revert_batch IS NOT NULL THEN
   SELECT id INTO v_batch FROM public.deadline_change_batches
   WHERE id=p_revert_batch AND tenant_id=p_tenant AND reverted_at IS NULL FOR UPDATE;
   IF v_batch IS NULL THEN RAISE EXCEPTION 'Batch not found or already reverted'; END IF;
   -- Lock first, then require unchanged deadlines before reverting anything.
   FOR v_item IN SELECT i.* FROM public.deadline_change_items i WHERE i.batch_id=v_batch ORDER BY i.assignment_id LOOP
     SELECT * INTO v_row FROM public.training_assignments WHERE id=v_item.assignment_id AND tenant_id=p_tenant FOR UPDATE;
     IF NOT FOUND OR v_row.due_date IS DISTINCT FROM v_item.new_due_date THEN RAISE EXCEPTION 'Deadline changed since batch; cannot revert'; END IF;
     UPDATE public.training_assignments SET due_date=v_item.previous_due_date WHERE id=v_item.assignment_id;
     INSERT INTO public.training_assignment_events(tenant_id,assignment_id,user_id,training_id,event_type,event_detail,created_by)
     VALUES(p_tenant,v_row.id,v_row.user_id,v_row.training_id,'deadline_bulk_reverted',
       jsonb_build_object('batch',v_batch,'old',v_item.new_due_date,'new',v_item.previous_due_date)::text,v_actor);
     v_count:=v_count+1;
   END LOOP;
   UPDATE public.deadline_change_batches SET reverted_at=now(),reverted_by=v_actor WHERE id=v_batch;
   RETURN jsonb_build_object('batch_id',v_batch,'changed',v_count,'reverted',true);
 END IF;
 IF p_new_date IS NULL OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 2000 THEN
   RAISE EXCEPTION 'Invalid selection (1..2000 assignments required)';
 END IF;
 IF (SELECT count(DISTINCT elem->>'id') FROM jsonb_array_elements(p_items) elem) <> jsonb_array_length(p_items) THEN
   RAISE EXCEPTION 'Duplicate assignments';
 END IF;
 INSERT INTO public.deadline_change_batches(tenant_id,actor_profile_id) VALUES(p_tenant,v_actor) RETURNING id INTO v_batch;
 FOR v_item IN SELECT elem->>'id' AS id, elem->>'due_date' AS old_date FROM jsonb_array_elements(p_items) elem ORDER BY elem->>'id' LOOP
   SELECT * INTO v_row FROM public.training_assignments WHERE id=v_item.id::uuid AND tenant_id=p_tenant FOR UPDATE;
   IF NOT FOUND OR v_row.due_date IS DISTINCT FROM v_item.old_date::timestamptz THEN
     RAISE EXCEPTION 'Assignment changed since preview (%). Refresh and retry.',v_item.id;
   END IF;
   IF v_row.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Inactive assignment (%)',v_item.id; END IF;
   IF v_row.due_date IS NULL THEN RAISE EXCEPTION 'Assignment has no deadline (%)',v_item.id; END IF;
   -- For safety, certified/completed assignments are never modified by this endpoint.
   IF v_row.status IN ('passed','certificate_issued') OR v_row.completed_at IS NOT NULL OR
      EXISTS(SELECT 1 FROM public.certificates c WHERE c.tenant_id=p_tenant AND c.assignment_id=v_row.id) THEN
     RAISE EXCEPTION 'Completed/certified assignment (%)',v_item.id;
   END IF;
   IF v_row.due_date IS NOT DISTINCT FROM (p_new_date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') THEN CONTINUE; END IF;
   INSERT INTO public.deadline_change_items(batch_id,assignment_id,previous_due_date,new_due_date)
   VALUES(v_batch,v_row.id,v_row.due_date,p_new_date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires');
   UPDATE public.training_assignments SET due_date=p_new_date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' WHERE id=v_row.id;
   INSERT INTO public.training_assignment_events(tenant_id,assignment_id,user_id,training_id,event_type,event_detail,created_by)
   VALUES(p_tenant,v_row.id,v_row.user_id,v_row.training_id,'deadline_bulk_updated',
     jsonb_build_object('batch',v_batch,'old',v_row.due_date,'new',p_new_date)::text,v_actor);
   v_count:=v_count+1;
 END LOOP;
 IF v_count=0 THEN RAISE EXCEPTION 'No deadlines changed'; END IF;
 RETURN jsonb_build_object('batch_id',v_batch,'changed',v_count,'reverted',false);
END; $$;
REVOKE ALL ON FUNCTION public.bulk_deadline_change(uuid,jsonb,date,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_deadline_change(uuid,jsonb,date,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.deadline_change_latest(p_tenant uuid)
RETURNS TABLE(batch_id uuid, changed_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT b.id, (SELECT count(*) FROM public.deadline_change_items i WHERE i.batch_id=b.id), b.created_at
 FROM public.deadline_change_batches b
 WHERE b.tenant_id=p_tenant AND b.reverted_at IS NULL
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid() AND p.tenant_id=p_tenant AND p.role IN ('admin','superadmin'))
 ORDER BY b.created_at DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.deadline_change_latest(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.deadline_change_latest(uuid) TO authenticated;
