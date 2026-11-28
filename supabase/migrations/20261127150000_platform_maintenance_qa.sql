-- Step 1: environment-wide maintenance control; no operational RLS changes yet.
BEGIN;
CREATE TABLE IF NOT EXISTS public.platform_maintenance (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.platform_maintenance(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.platform_maintenance_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enabled boolean NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_maintenance_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_maintenance, public.platform_maintenance_events FROM PUBLIC, anon, authenticated;

-- Public status plus authorization calculated from the real authenticated profile.
CREATE OR REPLACE FUNCTION public.get_platform_maintenance()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('enabled', m.enabled, 'allowed', EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid()
   AND p.status='active' AND p.deleted_at IS NULL
   AND (p.role='super_admin' OR (p.role='worker' AND p.is_test_user IS TRUE))
 ), 'can_manage', EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid()
   AND p.status='active' AND p.deleted_at IS NULL AND p.role='super_admin'
 )) FROM public.platform_maintenance m WHERE m.singleton;
$$;
REVOKE ALL ON FUNCTION public.get_platform_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_maintenance() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_platform_maintenance(p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid; previous boolean;
BEGIN
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Invalid maintenance state'; END IF;
 SELECT p.id INTO actor FROM public.profiles p WHERE p.auth_user_id=auth.uid()
 AND p.status='active' AND p.deleted_at IS NULL AND p.role='super_admin' LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 SELECT enabled INTO STRICT previous FROM public.platform_maintenance WHERE singleton FOR UPDATE;
 IF previous IS DISTINCT FROM p_enabled THEN
  UPDATE public.platform_maintenance SET enabled=p_enabled, updated_at=now(), updated_by=actor WHERE singleton;
  INSERT INTO public.platform_maintenance_events(enabled,actor_profile_id) VALUES(p_enabled,actor);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_platform_maintenance(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_platform_maintenance(boolean) TO authenticated;

-- Profiles are created by trusted Netlify service-role functions, never clients.
REVOKE INSERT ON public.profiles FROM PUBLIC, anon, authenticated;

-- Guard the authorization attributes against direct client writes, including
-- installations still carrying the legacy own-profile UPDATE policy.
CREATE OR REPLACE FUNCTION public.guard_maintenance_profile_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND (
 NEW.role IS DISTINCT FROM OLD.role OR NEW.is_test_user IS DISTINCT FROM OLD.is_test_user
 OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.status IS DISTINCT FROM OLD.status
 OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
 ) THEN RAISE EXCEPTION 'Protected profile authority fields' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_maintenance_profile_authority ON public.profiles;
CREATE TRIGGER guard_maintenance_profile_authority BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_maintenance_profile_authority();
COMMIT;
