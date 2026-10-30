-- QA V3: mandatory restore reason and tenant-scoped immutable trash timeline.
-- Requires 20261029230000_user_trash_qa.sql and 20261029233000_user_trash_reason_text.sql.
CREATE OR REPLACE FUNCTION public.admin_set_profile_trash(p_tenant uuid,p_profile uuid,p_restore boolean,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid; v_target public.profiles%ROWTYPE; v_reason text;
BEGIN
 SELECT id INTO v_actor FROM public.profiles
 WHERE auth_user_id=auth.uid() AND tenant_id=p_tenant AND role IN ('admin','superadmin') AND deleted_at IS NULL LIMIT 1;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT * INTO v_target FROM public.profiles WHERE id=p_profile AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 IF v_target.role IN ('admin','superadmin') OR v_target.id=v_actor THEN
   RAISE EXCEPTION 'Administrative accounts cannot be moved to trash';
 END IF;
 v_reason := btrim(coalesce(p_reason,''));
 IF length(v_reason)=0 OR length(v_reason)>1000 THEN
   RAISE EXCEPTION 'Reason must contain between 1 and 1000 characters';
 END IF;
 IF p_restore THEN
   IF v_target.deleted_at IS NULL THEN RAISE EXCEPTION 'User not in trash'; END IF;
   UPDATE public.profiles SET deleted_at=NULL,deleted_by=NULL,deletion_reason=NULL WHERE id=p_profile;
   INSERT INTO public.profile_trash_events(tenant_id,profile_id,actor_profile_id,action,reason)
   VALUES(p_tenant,p_profile,v_actor,'restore',v_reason);
 ELSE
   IF v_target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Already in trash'; END IF;
   UPDATE public.profiles SET deleted_at=now(),deleted_by=v_actor,deletion_reason=v_reason WHERE id=p_profile;
   INSERT INTO public.profile_trash_events(tenant_id,profile_id,actor_profile_id,action,reason)
   VALUES(p_tenant,p_profile,v_actor,'trash',v_reason);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_profile_trash(uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_trash(uuid,uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_profile_trash_history(p_tenant uuid,p_profile uuid)
RETURNS TABLE(id uuid, action text, reason text, created_at timestamptz, actor_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid()
   AND p.tenant_id=p_tenant AND p.role IN ('admin','superadmin') AND p.deleted_at IS NULL) THEN
   RAISE EXCEPTION 'Unauthorized';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=p_profile AND p.tenant_id=p_tenant) THEN
   RAISE EXCEPTION 'User not found';
 END IF;
 RETURN QUERY SELECT e.id,e.action,e.reason,e.created_at,a.email::text
 FROM public.profile_trash_events e
 JOIN public.profiles a ON a.id=e.actor_profile_id AND a.tenant_id=e.tenant_id
 WHERE e.tenant_id=p_tenant AND e.profile_id=p_profile
 ORDER BY e.created_at DESC,e.id DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_profile_trash_history(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_profile_trash_history(uuid,uuid) TO authenticated;
