-- QA first: the diagnostics view was exposed to anon/authenticated by an older baseline.
-- No application source references this view as of the reviewed repository.
-- Remove public API access and make underlying RLS apply for future privileged use.
-- Requires PostgreSQL 15+ (Supabase supported).
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.worker_onboarding_diagnostics') IS NULL THEN
   RAISE EXCEPTION 'worker_onboarding_diagnostics missing: review schema before applying';
 END IF;
END;
$guard$;
ALTER VIEW public.worker_onboarding_diagnostics SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public.worker_onboarding_diagnostics FROM PUBLIC, anon, authenticated;
-- Existing service role can retain its access for controlled diagnostics.
GRANT SELECT ON TABLE public.worker_onboarding_diagnostics TO service_role;
COMMIT;
