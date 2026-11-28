-- QA Step 2. Requires 20261127150000_platform_maintenance_qa.sql.
-- No changes to historical exams, certificates or existing permissive policies.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.platform_maintenance WHERE singleton AND enabled IS FALSE) THEN
   RAISE EXCEPTION 'Disable maintenance before installing Step 2';
 END IF;
END $$;
-- Refuse to overwrite a different database-configured PostgREST pre-request hook.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) AS c(value)
   WHERE s.setrole IN (0, (SELECT oid FROM pg_roles WHERE rolname='authenticator'))
   AND s.setdatabase IN (0, (SELECT oid FROM pg_database WHERE datname=current_database()))
   AND c.value LIKE 'pgrst.db_pre_request=%'
   AND c.value <> 'pgrst.db_pre_request=public.enforce_platform_maintenance'
 ) THEN RAISE EXCEPTION 'Existing PostgREST pre-request hook; review and compose before applying maintenance'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.maintenance_access_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT COALESCE((SELECT NOT m.enabled OR EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid()
   AND p.status='active' AND p.deleted_at IS NULL
   AND (p.role='super_admin' OR (p.role='worker' AND p.is_test_user IS TRUE))
 ) FROM public.platform_maintenance m WHERE m.singleton),false);
$$;
REVOKE ALL ON FUNCTION public.maintenance_access_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maintenance_access_allowed() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_maintenance() TO service_role;

-- Used ONLY by trusted Netlify functions after validating an Auth JWT.
CREATE OR REPLACE FUNCTION public.maintenance_actor_authorized(p_auth_user_id uuid, p_superadmin_only boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.auth_user_id=p_auth_user_id
 AND p.status='active' AND p.deleted_at IS NULL
 AND (p.role='super_admin' OR (NOT p_superadmin_only AND p.role='worker' AND p.is_test_user IS TRUE)));
$$;
REVOKE ALL ON FUNCTION public.maintenance_actor_authorized(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_actor_authorized(uuid,boolean) TO service_role;

-- Every REST/RPC call by a public client, including SECURITY DEFINER RPCs, is checked.
-- Only public branding/status, the maintenance toggle, and own-profile login bootstrap
-- remain reachable. The toggle has its own authorization; profiles have restrictive RLS below.
CREATE OR REPLACE FUNCTION public.enforce_platform_maintenance()
RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE path text := coalesce(current_setting('request.path',true),'');
        method text := coalesce(current_setting('request.method',true),'');
        actor text;
BEGIN
 IF current_user NOT IN ('anon','authenticated','service_role') THEN RETURN; END IF;
 IF path IN ('/rpc/get_platform_maintenance','/rpc/resolve_public_tenant_branding','/rpc/set_platform_maintenance') THEN RETURN; END IF;
 IF current_user='service_role' AND path='/rpc/maintenance_actor_authorized' THEN RETURN; END IF;
 -- Hold a shared transaction lock so activation waits for previously admitted REST/RPC calls.
 PERFORM pg_advisory_xact_lock_shared(27112026,160000);
 IF current_user='service_role' THEN
   -- The service key is trusted infrastructure, but unmarked old deployments/jobs
   -- must not continue using the REST API during maintenance. Only the server
   -- supplies this header after verifying the caller's JWT. Browser headers are ignored.
   IF (public.get_platform_maintenance()->>'enabled')::boolean IS FALSE THEN RETURN; END IF;
   actor := (coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb)->>'x-ciguena-maintenance-actor';
   IF actor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
     IF public.maintenance_actor_authorized(actor::uuid,false) THEN RETURN; END IF;
   END IF;
   RAISE SQLSTATE 'PT503' USING MESSAGE='Platform maintenance in progress', DETAIL='MAINTENANCE_ACTIVE';
 END IF;
 IF path='/profiles' AND method IN ('GET','HEAD') THEN RETURN; END IF;
 IF NOT public.maintenance_access_allowed() THEN
   RAISE SQLSTATE 'PT503' USING MESSAGE='Platform maintenance in progress', DETAIL='MAINTENANCE_ACTIVE';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.enforce_platform_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_platform_maintenance() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_platform_maintenance(p_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid; previous boolean;
BEGIN
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Invalid maintenance state'; END IF;
 SELECT p.id INTO actor FROM public.profiles p WHERE p.auth_user_id=auth.uid()
 AND p.status='active' AND p.deleted_at IS NULL AND p.role='super_admin' LIMIT 1;
 IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(27112026,160000);
 SELECT enabled INTO STRICT previous FROM public.platform_maintenance WHERE singleton FOR UPDATE;
 IF previous IS DISTINCT FROM p_enabled THEN
  UPDATE public.platform_maintenance SET enabled=p_enabled, updated_at=now(), updated_by=actor WHERE singleton;
  INSERT INTO public.platform_maintenance_events(enabled,actor_profile_id) VALUES(p_enabled,actor);
 END IF;
END $$;

-- Defense in depth for RLS-enabled public tables, including Realtime reads.
-- Does not grant access or enable RLS on unrelated tables. Existing policies still apply.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
 AND c.relname NOT IN ('profiles','platform_maintenance','platform_maintenance_events')
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS maintenance_step2_guard ON public.%I',t.relname);
  EXECUTE format('CREATE POLICY maintenance_step2_guard ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING ((SELECT public.maintenance_access_allowed())) WITH CHECK ((SELECT public.maintenance_access_allowed()))',t.relname);
 END LOOP;
END $$;
DROP POLICY IF EXISTS maintenance_step2_profile_read ON public.profiles;
CREATE POLICY maintenance_step2_profile_read ON public.profiles AS RESTRICTIVE FOR SELECT TO anon, authenticated
 USING ((SELECT public.maintenance_access_allowed()) OR auth_user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS maintenance_step2_profile_insert ON public.profiles;
CREATE POLICY maintenance_step2_profile_insert ON public.profiles AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK ((SELECT public.maintenance_access_allowed()));
DROP POLICY IF EXISTS maintenance_step2_profile_update ON public.profiles;
CREATE POLICY maintenance_step2_profile_update ON public.profiles AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING ((SELECT public.maintenance_access_allowed())) WITH CHECK ((SELECT public.maintenance_access_allowed()));
DROP POLICY IF EXISTS maintenance_step2_profile_delete ON public.profiles;
CREATE POLICY maintenance_step2_profile_delete ON public.profiles AS RESTRICTIVE FOR DELETE TO anon, authenticated USING ((SELECT public.maintenance_access_allowed()));

-- Storage is a separate API and does not run the PostgREST hook. Public bucket
-- downloads (logos, public content) may remain accessible by design.
DROP POLICY IF EXISTS maintenance_step2_storage_guard ON storage.objects;
CREATE POLICY maintenance_step2_storage_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
 USING ((SELECT public.maintenance_access_allowed())) WITH CHECK ((SELECT public.maintenance_access_allowed()));

DO $$ BEGIN
 EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L', current_database(), 'public.enforce_platform_maintenance');
END $$;
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
COMMIT;
