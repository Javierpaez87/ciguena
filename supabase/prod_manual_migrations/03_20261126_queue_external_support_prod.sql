BEGIN;

-- Evitar reemplazar por sorpresa un procedimiento de otro esquema o entorno.
DO $$ BEGIN
 IF to_regclass('public.support_bondi_outbox') IS NULL OR to_regclass('public.support_external_access') IS NULL THEN
   RAISE EXCEPTION 'Falta paso 1 o 2; no ejecutar paso 3';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_bondi_outbox' AND column_name='tenant_id' AND is_nullable='NO') THEN
   RAISE EXCEPTION 'tenant_id ya es nullable o la estructura difiere: revisar antes de ejecutar paso 3';
 END IF;
END $$;
-- CIGÜEÑA PROD únicamente. EJECUCIÓN MANUAL CONTROLADA.
-- Adaptación de: 20261124203000_queue_external_support_for_bondisupport_qa.sql
-- Paso 3/3. Encola solicitudes externas de login/registro.
-- Ejecutar SOLO en Supabase Cigüeña PROD, tras validar pasos 1 y 2.
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

COMMIT;
