-- SOLO Supabase Cigüeña QA. NO ejecutar en SPI producción.
-- Tokens de seguimiento para reportes SIN sesión (login/registro).
BEGIN;
CREATE TABLE IF NOT EXISTS public.support_external_access (
 request_id uuid PRIMARY KEY REFERENCES public.support_requests(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_external_access_expires ON public.support_external_access(expires_at);
ALTER TABLE public.support_external_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_external_access FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.support_external_access TO service_role;
COMMIT;
