-- QA V4.1: global superadmin sentinel management.
-- Requires V4 migration 20261030010000_user_sentinel_operational_qa.sql.
-- Replace the V4 RPC to recognize global super_admin only; do not grant tenant admins.
CREATE OR REPLACE FUNCTION public.admin_set_test_user(p_tenant uuid,p_profile uuid,p_mark boolean,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor uuid; v_target public.profiles%ROWTYPE;
BEGIN
 IF p_mark IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 1000 THEN
   RAISE EXCEPTION 'A valid reason is required';
 END IF;
 SELECT p.id INTO v_actor FROM public.profiles p
 WHERE p.auth_user_id=auth.uid() AND p.role='super_admin' AND p.deleted_at IS NULL LIMIT 1;
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Only global superadmin can classify sentinel users'; END IF;
 SELECT * INTO v_target FROM public.profiles WHERE id=p_profile AND tenant_id=p_tenant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found in tenant'; END IF;
 IF v_target.role IN ('admin','superadmin','super_admin') OR v_target.deleted_at IS NOT NULL THEN
   RAISE EXCEPTION 'Cannot classify an administrator or trashed user';
 END IF;
 IF v_target.is_test_user IS NOT DISTINCT FROM p_mark THEN RAISE EXCEPTION 'Classification unchanged'; END IF;
 UPDATE public.profiles SET is_test_user=p_mark WHERE id=p_profile AND tenant_id=p_tenant;
 INSERT INTO public.profile_test_user_events(tenant_id,profile_id,actor_profile_id,previous_is_test_user,new_is_test_user,reason)
 VALUES(p_tenant,p_profile,v_actor,coalesce(v_target.is_test_user,false),p_mark,btrim(p_reason));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_test_user(uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_test_user(uuid,uuid,boolean,text) TO authenticated;

-- Return only a bounded set of non-admin profiles belonging to the requested tenant.
CREATE OR REPLACE FUNCTION public.global_sentinel_candidates(p_tenant uuid,p_search text DEFAULT '',p_limit int DEFAULT 50)
RETURNS TABLE(profile_id uuid, full_name text, email text, is_test_user boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.auth_user_id=auth.uid() AND p.role='super_admin' AND p.deleted_at IS NULL) THEN
   RAISE EXCEPTION 'Only global superadmin can list sentinel candidates';
 END IF;
 IF p_tenant IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR length(coalesce(p_search,'')) > 200 THEN
   RAISE EXCEPTION 'Invalid search';
 END IF;
 RETURN QUERY SELECT p.id, p.full_name::text, p.email::text, coalesce(p.is_test_user,false)
 FROM public.profiles p WHERE p.tenant_id=p_tenant AND p.deleted_at IS NULL
 AND p.role NOT IN ('admin','superadmin','super_admin')
 AND (coalesce(btrim(p_search),'')='' OR coalesce(p.full_name,'') ILIKE '%'||btrim(p_search)||'%' OR coalesce(p.email,'') ILIKE '%'||btrim(p_search)||'%')
 ORDER BY p.full_name NULLS LAST,p.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.global_sentinel_candidates(uuid,text,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.global_sentinel_candidates(uuid,text,int) TO authenticated;
