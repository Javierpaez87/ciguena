-- Additional metadata for last-batch rollback UI. Requires 20261029180000_bulk_deadline_management.sql.
DROP FUNCTION IF EXISTS public.deadline_change_latest(uuid);
CREATE FUNCTION public.deadline_change_latest(p_tenant uuid)
RETURNS TABLE(batch_id uuid, changed_count bigint, created_at timestamptz, actor_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT b.id, (SELECT count(*) FROM public.deadline_change_items i WHERE i.batch_id=b.id),
        b.created_at, p.email::text
 FROM public.deadline_change_batches b
 JOIN public.profiles p ON p.id=b.actor_profile_id AND p.tenant_id=b.tenant_id
 WHERE b.tenant_id=p_tenant AND b.reverted_at IS NULL
 AND EXISTS (SELECT 1 FROM public.profiles me WHERE me.auth_user_id=auth.uid() AND me.tenant_id=p_tenant AND me.role IN ('admin','superadmin'))
 ORDER BY b.created_at DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.deadline_change_latest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deadline_change_latest(uuid) TO authenticated;
