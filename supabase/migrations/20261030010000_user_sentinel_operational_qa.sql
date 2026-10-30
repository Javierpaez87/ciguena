-- QA V4: auditable sentinel classification, never delete or rewrite training evidence.
-- Requires 20261029230000_user_trash_qa.sql (profiles.is_test_user).
CREATE TABLE IF NOT EXISTS public.profile_test_user_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 profile_id uuid NOT NULL REFERENCES public.profiles(id),
 actor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
 previous_is_test_user boolean NOT NULL,
 new_is_test_user boolean NOT NULL,
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_test_user_events_profile ON public.profile_test_user_events(tenant_id,profile_id,created_at DESC);
ALTER TABLE public.profile_test_user_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_test_user_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_test_user(p_tenant uuid,p_profile uuid,p_mark boolean,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid; v_target public.profiles%ROWTYPE;
BEGIN
 IF p_mark IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 1000 THEN
   RAISE EXCEPTION 'A valid reason is required';
 END IF;
 SELECT id INTO v_actor FROM public.profiles
 WHERE auth_user_id=auth.uid() AND tenant_id=p_tenant
 AND role='superadmin' AND deleted_at IS NULL LIMIT 1;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Only the tenant superadmin may classify sentinel users'; END IF;
 SELECT * INTO v_target FROM public.profiles WHERE id=p_profile AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 IF v_target.role IN ('admin','superadmin') OR v_target.deleted_at IS NOT NULL THEN
   RAISE EXCEPTION 'Cannot change an administrative or trashed profile';
 END IF;
 IF v_target.is_test_user IS NOT DISTINCT FROM p_mark THEN RAISE EXCEPTION 'Classification unchanged'; END IF;
 UPDATE public.profiles SET is_test_user=p_mark WHERE id=p_profile AND tenant_id=p_tenant;
 INSERT INTO public.profile_test_user_events(tenant_id,profile_id,actor_profile_id,previous_is_test_user,new_is_test_user,reason)
 VALUES(p_tenant,p_profile,v_actor,coalesce(v_target.is_test_user,false),p_mark,btrim(p_reason));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_test_user(uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_test_user(uuid,uuid,boolean,text) TO authenticated;
