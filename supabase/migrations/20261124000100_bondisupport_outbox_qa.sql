-- CIGÜEÑA QA ÚNICAMENTE. No ejecutar en BondiSupport ni Cigüeña producción.
-- Fase 1: capturar reportes autenticados con tenant comprobado en cola privada.
-- NO envía información fuera de Cigüeña QA; NO backfill de tickets históricos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.support_bondi_outbox (
  request_id uuid PRIMARY KEY REFERENCES public.support_requests(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','processing','synced','error')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  central_ticket_id uuid,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_bondi_outbox_work
  ON public.support_bondi_outbox(next_attempt_at)
  WHERE state IN ('pending','error');

ALTER TABLE public.support_bondi_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_bondi_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_bondi_outbox TO service_role;

-- Este trigger SOLO encola tickets nuevos enviados desde la plataforma:
-- verifica que auth_user_id tenga perfil propio del tenant (no confía en datos de cliente).
-- No registra reportes anónimos de login/registro ni tickets históricos.
CREATE OR REPLACE FUNCTION public.support_bondi_queue_authenticated_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.source <> 'platform'
     OR NEW.auth_user_id IS NULL
     OR NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = NEW.auth_user_id
      AND p.tenant_id = NEW.tenant_id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.support_bondi_outbox(request_id,tenant_id)
  VALUES (NEW.id,NEW.tenant_id)
  ON CONFLICT (request_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.support_bondi_queue_authenticated_request()
  FROM PUBLIC,anon,authenticated;

-- No reemplaza triggers existentes. Si ya existe con este nombre, abortar y revisar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.support_requests'::regclass
      AND tgname='trg_support_bondi_queue_authenticated_request'
      AND NOT tgisinternal
  ) THEN
    RAISE NOTICE 'El trigger de integración ya existe; no se duplica';
  ELSE
    CREATE TRIGGER trg_support_bondi_queue_authenticated_request
      AFTER INSERT ON public.support_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.support_bondi_queue_authenticated_request();
  END IF;
END;
$$;
COMMIT;
