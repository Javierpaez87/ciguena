-- CIGÜEÑA PROD únicamente. EJECUCIÓN MANUAL CONTROLADA.
-- Adaptación de: 20261124000600_external_support_qa.sql
-- Paso 2/3. Acceso seguro externo, sin backfill ni envío de emails.
-- Ejecutar SOLO en Supabase Cigüeña PROD, tras validar el paso 1.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.support_requests') IS NULL THEN
    RAISE EXCEPTION 'support_requests no existe en el destino';
  END IF;
  IF to_regclass('public.support_external_access') IS NOT NULL THEN
    RAISE EXCEPTION 'support_external_access ya existe: revisar, no reejecutar paso 2';
  END IF;
END $$;
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
