-- QA-first reversible profile trash. Keeps original audit and training records.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_user boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_deleted ON public.profiles(tenant_id, deleted_at);
CREATE TABLE IF NOT EXISTS public.profile_trash_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 profile_id uuid NOT NULL REFERENCES public.profiles(id), actor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
 action text NOT NULL CHECK (action IN ('trash','restore')), reason text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_trash_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_trash_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_profile_trash(p_tenant uuid,p_profile uuid,p_restore boolean,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid; v_target public.profiles%ROWTYPE;
BEGIN
 SELECT id INTO v_actor FROM public.profiles
 WHERE auth_user_id=auth.uid() AND tenant_id=p_tenant
 AND role IN ('admin','superadmin') AND deleted_at IS NULL LIMIT 1;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT * INTO v_target FROM public.profiles WHERE id=p_profile AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 IF v_target.role IN ('admin','superadmin') OR v_target.id=v_actor THEN
   RAISE EXCEPTION 'Administrative accounts cannot be moved to trash';
 END IF;
 IF p_restore THEN
   IF v_target.deleted_at IS NULL THEN RAISE EXCEPTION 'User not in trash'; END IF;
   UPDATE public.profiles SET deleted_at=NULL,deleted_by=NULL,deletion_reason=NULL WHERE id=p_profile;
   INSERT INTO public.profile_trash_events(tenant_id,profile_id,actor_profile_id,action)
   VALUES(p_tenant,p_profile,v_actor,'restore');
 ELSE
   IF v_target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Already in trash'; END IF;
   IF p_reason NOT IN ('duplicate','test','roster_error','other') OR p_reason IS NULL THEN
     RAISE EXCEPTION 'Invalid reason';
   END IF;
   UPDATE public.profiles SET deleted_at=now(),deleted_by=v_actor,deletion_reason=p_reason WHERE id=p_profile;
   INSERT INTO public.profile_trash_events(tenant_id,profile_id,actor_profile_id,action,reason)
   VALUES(p_tenant,p_profile,v_actor,'trash',p_reason);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_profile_trash(uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_trash(uuid,uuid,boolean,text) TO authenticated;
