-- ============================================================
-- CIGÜEÑA — Worker Onboarding Foundation (3A.1)
--
-- Objetivos:
-- 1) Separar la firma/consentimiento del Código de Ética.
-- 2) Registrar que el worker validó sus datos de perfil.
-- 3) Crear configuración de onboarding por tenant con precedencia:
--      Admin tenant > Superadmin > fallback.
-- 4) Migrar firmas históricas de ethics_acceptances para no
--    obligar a volver a firmar a quienes ya lo hicieron.
--
-- Esta migración NO cambia todavía el frontend ni bloquea usuarios.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. Validación explícita de datos de perfil
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_validated_at timestamptz;

-- ------------------------------------------------------------
-- 2. Firma + consentimiento independientes del Código de Ética
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_signature_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  signature_image_url text NOT NULL,
  signature_hash text NOT NULL,

  accepted_name text NOT NULL,
  accepted_document_number text,

  consent_text text NOT NULL,
  consent_version text NOT NULL DEFAULT '1.0',

  -- Snapshot auditable de los datos validados al momento de consentir.
  profile_snapshot jsonb,

  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Permite migrar de forma idempotente firmas históricas.
  legacy_ethics_acceptance_id uuid UNIQUE
    REFERENCES public.ethics_acceptances(id) ON DELETE SET NULL
);

ALTER TABLE public.worker_signature_consents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_worker_signature_consents_user
  ON public.worker_signature_consents(user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_worker_signature_consents_tenant
  ON public.worker_signature_consents(tenant_id, accepted_at DESC);

-- Lectura: el propio usuario, admins de su tenant o Superadmin.
DROP POLICY IF EXISTS "Users can view relevant worker signatures"
  ON public.worker_signature_consents;

CREATE POLICY "Users can view relevant worker signatures"
ON public.worker_signature_consents
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
  )
  OR tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
  )
);

-- El worker solo puede insertar su propia firma/consentimiento.
DROP POLICY IF EXISTS "Workers can insert own signature consent"
  ON public.worker_signature_consents;

CREATE POLICY "Workers can insert own signature consent"
ON public.worker_signature_consents
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.tenant_id = worker_signature_consents.tenant_id
  )
);

-- No se crean policies UPDATE/DELETE: el registro es auditable e inmutable.

-- ------------------------------------------------------------
-- 3. Configuración de onboarding por tenant
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_onboarding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- superadmin = default definido por BondiApps
  -- admin      = override definido por el cliente
  source text NOT NULL CHECK (source IN ('superadmin', 'admin')),

  onboarding_mode text NOT NULL
    CHECK (onboarding_mode IN ('signature_only', 'ethics_and_signature')),

  -- Solo requerido cuando onboarding_mode = ethics_and_signature.
  ethics_code_id uuid REFERENCES public.ethics_codes(id) ON DELETE RESTRICT,

  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, source),

  CONSTRAINT tenant_onboarding_ethics_mode_check CHECK (
    onboarding_mode = 'signature_only'
    OR ethics_code_id IS NOT NULL
  )
);

ALTER TABLE public.tenant_onboarding_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_settings_tenant
  ON public.tenant_onboarding_settings(tenant_id, source);

-- Workers/Admins leen settings de su tenant. Superadmin puede leer todos.
DROP POLICY IF EXISTS "Authenticated can view tenant onboarding settings"
  ON public.tenant_onboarding_settings;

CREATE POLICY "Authenticated can view tenant onboarding settings"
ON public.tenant_onboarding_settings
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
  )
);

-- Superadmin gestiona únicamente el default de BondiApps para cualquier tenant.
DROP POLICY IF EXISTS "Superadmin can insert default onboarding settings"
  ON public.tenant_onboarding_settings;
CREATE POLICY "Superadmin can insert default onboarding settings"
ON public.tenant_onboarding_settings
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'superadmin'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Superadmin can update default onboarding settings"
  ON public.tenant_onboarding_settings;
CREATE POLICY "Superadmin can update default onboarding settings"
ON public.tenant_onboarding_settings
FOR UPDATE
TO authenticated
USING (
  source = 'superadmin'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
  )
)
WITH CHECK (
  source = 'superadmin'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
  )
);

-- Admin del tenant puede crear/modificar SOLO su override.
DROP POLICY IF EXISTS "Tenant admin can insert onboarding override"
  ON public.tenant_onboarding_settings;
CREATE POLICY "Tenant admin can insert onboarding override"
ON public.tenant_onboarding_settings
FOR INSERT
TO authenticated
WITH CHECK (
  source = 'admin'
  AND tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Tenant admin can update onboarding override"
  ON public.tenant_onboarding_settings;
CREATE POLICY "Tenant admin can update onboarding override"
ON public.tenant_onboarding_settings
FOR UPDATE
TO authenticated
USING (
  source = 'admin'
  AND tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  source = 'admin'
  AND tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Admin puede borrar su override para volver al default del Superadmin.
DROP POLICY IF EXISTS "Tenant admin can delete onboarding override"
  ON public.tenant_onboarding_settings;
CREATE POLICY "Tenant admin can delete onboarding override"
ON public.tenant_onboarding_settings
FOR DELETE
TO authenticated
USING (
  source = 'admin'
  AND tenant_id IN (
    SELECT p.tenant_id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
  )
);

-- ------------------------------------------------------------
-- 4. Backfill: firmas históricas del Código de Ética
-- ------------------------------------------------------------
-- La pantalla antigua ya exigía datos + firma + consentimiento de uso.
-- Migramos la aceptación más reciente de cada worker para que esas personas
-- NO deban volver a dibujar su firma.
INSERT INTO public.worker_signature_consents (
  tenant_id,
  user_id,
  signature_image_url,
  signature_hash,
  accepted_name,
  accepted_document_number,
  consent_text,
  consent_version,
  profile_snapshot,
  accepted_at,
  user_agent,
  ip_address,
  legacy_ethics_acceptance_id
)
SELECT DISTINCT ON (ea.user_id)
  ea.tenant_id,
  ea.user_id,
  ea.signature_image_url,
  ea.signature_hash,
  COALESCE(NULLIF(ea.accepted_name, ''), p.full_name),
  COALESCE(ea.accepted_document_number, p.dni),
  ea.acceptance_text,
  'legacy-ethics-v1',
  jsonb_build_object(
    'full_name', p.full_name,
    'dni', p.dni,
    'employee_code', p.employee_code,
    'work_role', COALESCE(p.work_role, p.job_role, p.position),
    'phone', p.phone,
    'area', p.area,
    'position', p.position
  ),
  COALESCE(ea.accepted_at, ea.created_at, now()),
  ea.user_agent,
  ea.ip_address,
  ea.id
FROM public.ethics_acceptances ea
JOIN public.profiles p ON p.id = ea.user_id
WHERE ea.signature_image_url IS NOT NULL
  AND ea.signature_hash IS NOT NULL
ORDER BY ea.user_id, ea.accepted_at DESC NULLS LAST, ea.created_at DESC
ON CONFLICT (legacy_ethics_acceptance_id) DO NOTHING;

-- Quienes ya atravesaron la pantalla histórica también validaron sus datos.
UPDATE public.profiles p
SET profile_validated_at = COALESCE(p.profile_validated_at, migrated.accepted_at)
FROM (
  SELECT user_id, MAX(COALESCE(accepted_at, created_at)) AS accepted_at
  FROM public.ethics_acceptances
  GROUP BY user_id
) migrated
WHERE p.id = migrated.user_id
  AND p.profile_validated_at IS NULL;

-- ------------------------------------------------------------
-- 5. Seed de configuración default sin cambiar comportamiento existente
-- ------------------------------------------------------------
-- Si el tenant tiene un Código de Ética activo, preservamos ese flujo.
-- Si no tiene uno, queda en firma + consentimiento solamente.
INSERT INTO public.tenant_onboarding_settings (
  tenant_id,
  source,
  onboarding_mode,
  ethics_code_id,
  is_active
)
SELECT
  t.id,
  'superadmin',
  CASE
    WHEN active_code.id IS NOT NULL THEN 'ethics_and_signature'
    ELSE 'signature_only'
  END,
  active_code.id,
  true
FROM public.tenants t
LEFT JOIN LATERAL (
  SELECT ec.id
  FROM public.ethics_codes ec
  WHERE ec.tenant_id = t.id
    AND ec.is_active = true
  ORDER BY ec.created_at DESC
  LIMIT 1
) active_code ON true
ON CONFLICT (tenant_id, source) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Vista de diagnóstico (sin datos sensibles de firma)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.worker_onboarding_diagnostics AS
SELECT
  p.id AS user_id,
  p.tenant_id,
  p.email,
  p.full_name,
  p.status,
  p.profile_validated_at,
  CASE
    WHEN NULLIF(TRIM(COALESCE(p.full_name, '')), '') IS NULL THEN false
    WHEN NULLIF(TRIM(COALESCE(p.dni, '')), '') IS NULL THEN false
    WHEN NULLIF(TRIM(COALESCE(p.employee_code, '')), '') IS NULL THEN false
    WHEN NULLIF(TRIM(COALESCE(p.work_role, p.job_role, p.position, '')), '') IS NULL THEN false
    WHEN NULLIF(TRIM(COALESCE(p.phone, '')), '') IS NULL THEN false
    ELSE true
  END AS required_profile_fields_complete,
  EXISTS (
    SELECT 1
    FROM public.worker_signature_consents wsc
    WHERE wsc.user_id = p.id
  ) AS has_signature_consent
FROM public.profiles p
WHERE p.role = 'worker';

COMMENT ON TABLE public.worker_signature_consents IS
  'Firma electrónica y consentimiento de uso del worker, independiente del Código de Ética.';

COMMENT ON TABLE public.tenant_onboarding_settings IS
  'Configuración de onboarding por tenant. source=admin tiene precedencia sobre source=superadmin.';
