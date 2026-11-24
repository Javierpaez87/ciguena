-- SOLO Cigüeña QA. Añadir solicitudes externas a la cola fiable de BondiSupport.
-- Mantener el filtro estricto de identidad/tenant para los tickets autenticados.
-- Sin backfill automático ni cambios en RLS.
ALTER TABLE public.support_bondi_outbox
  ALTER COLUMN tenant_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.support_bondi_queue_authenticated_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $function$
BEGIN
  IF NEW.source = 'platform' THEN
    IF NEW.auth_user_id IS NULL OR NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = NEW.auth_user_id AND p.tenant_id = NEW.tenant_id
    ) THEN RETURN NEW; END IF;
    INSERT INTO public.support_bondi_outbox(request_id, tenant_id)
    VALUES (NEW.id, NEW.tenant_id) ON CONFLICT (request_id) DO NOTHING;
  ELSIF NEW.source IN ('login', 'register') AND NEW.auth_user_id IS NULL
      AND NEW.tenant_id IS NULL AND NEW.contact_email IS NOT NULL THEN
    -- No atribuir estos tickets a un tenant de SPI ni a una identidad autenticada.
    INSERT INTO public.support_bondi_outbox(request_id, tenant_id)
    VALUES (NEW.id, NULL) ON CONFLICT (request_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
