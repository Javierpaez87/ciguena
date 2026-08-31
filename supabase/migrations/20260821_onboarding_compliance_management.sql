-- ============================================================
-- CIGÜEÑA — Onboarding & Compliance Management (3B)
--
-- Permite:
-- - Superadmin: definir onboarding default por tenant.
-- - Admin tenant: crear override con prioridad sobre Superadmin.
-- - Modo signature_only o ethics_and_signature.
-- - Código de Ética versionado e inmutable, con texto y/o PDF.
-- - Admin puede volver al default eliminando su override.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. Metadatos/versionado de ethics_codes
-- ------------------------------------------------------------
ALTER TABLE public.ethics_codes
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Backfill: si conocemos al creador y era admin del tenant, lo tratamos
-- como código del cliente. Los seeds/legacy quedan como superadmin.
UPDATE public.ethics_codes ec
SET source = CASE
  WHEN p.role = 'admin' THEN 'admin'
  ELSE 'superadmin'
END
FROM public.profiles p
WHERE ec.created_by = p.id
  AND ec.source IS NULL;

UPDATE public.ethics_codes
SET source = 'superadmin'
WHERE source IS NULL;

UPDATE public.ethics_codes
SET published_at = COALESCE(published_at, created_at, now())
WHERE published_at IS NULL;

ALTER TABLE public.ethics_codes
  ALTER COLUMN source SET DEFAULT 'superadmin',
  ALTER COLUMN source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ethics_codes_source_check'
      AND conrelid = 'public.ethics_codes'::regclass
  ) THEN
    ALTER TABLE public.ethics_codes
      ADD CONSTRAINT ethics_codes_source_check
      CHECK (source IN ('superadmin', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ethics_codes_tenant_source
  ON public.ethics_codes(tenant_id, source, created_at DESC);

-- ------------------------------------------------------------
-- 2. RLS de ethics_codes
--    Los códigos publicados son inmutables: nuevas versiones = nuevas filas.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view active ethics codes"
  ON public.ethics_codes;
DROP POLICY IF EXISTS "Admins can manage ethics codes"
  ON public.ethics_codes;
DROP POLICY IF EXISTS "Tenant users can view relevant ethics codes"
  ON public.ethics_codes;
DROP POLICY IF EXISTS "Authorized can publish ethics codes"
  ON public.ethics_codes;

CREATE POLICY "Tenant users can view relevant ethics codes"
ON public.ethics_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (
        p.role = 'super_admin'
        OR (
          p.tenant_id = ethics_codes.tenant_id
          AND (p.role = 'admin' OR ethics_codes.is_active = true)
        )
      )
  )
);

CREATE POLICY "Authorized can publish ethics codes"
ON public.ethics_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (
        (p.role = 'super_admin' AND ethics_codes.source = 'superadmin')
        OR
        (
          p.role = 'admin'
          AND p.tenant_id = ethics_codes.tenant_id
          AND ethics_codes.source = 'admin'
        )
      )
  )
);

-- No UPDATE/DELETE policies: el contenido publicado queda auditable.

-- ------------------------------------------------------------
-- 3. Bucket opcional para PDF del Código de Ética
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ethics-documents', 'ethics-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authorized can upload ethics documents"
  ON storage.objects;

CREATE POLICY "Authorized can upload ethics documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ethics-documents'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND (
        p.role = 'super_admin'
        OR (
          p.role = 'admin'
          AND p.tenant_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

-- ------------------------------------------------------------
-- 4. RPC: guardar modalidad/configuración del source correspondiente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_tenant_onboarding_setting(
  p_tenant_id uuid,
  p_source text,
  p_mode text,
  p_ethics_code_id uuid DEFAULT NULL
)
RETURNS SETOF public.tenant_onboarding_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_user_tenant_id uuid;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_user_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un perfil activo para el usuario autenticado.';
  END IF;

  IF p_source NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Source inválido.';
  END IF;

  IF p_mode NOT IN ('signature_only', 'ethics_and_signature') THEN
    RAISE EXCEPTION 'Modalidad de onboarding inválida.';
  END IF;

  IF p_source = 'superadmin' THEN
    IF v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Solo Superadmin puede modificar el default de onboarding.';
    END IF;
  ELSE
    IF v_role <> 'admin' OR v_user_tenant_id IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Solo el Admin del tenant puede modificar su override.';
    END IF;
  END IF;

  IF p_mode = 'ethics_and_signature' THEN
    IF p_ethics_code_id IS NULL THEN
      RAISE EXCEPTION 'Seleccioná o publicá un Código de Ética para usar esta modalidad.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.ethics_codes ec
      WHERE ec.id = p_ethics_code_id
        AND ec.tenant_id = p_tenant_id
        AND ec.source = p_source
        AND ec.is_active = true
    ) THEN
      RAISE EXCEPTION 'El Código de Ética seleccionado no pertenece a esta configuración.';
    END IF;
  ELSE
    p_ethics_code_id := NULL;
  END IF;

  RETURN QUERY
  INSERT INTO public.tenant_onboarding_settings (
    tenant_id,
    source,
    onboarding_mode,
    ethics_code_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_source,
    p_mode,
    p_ethics_code_id,
    true,
    v_profile_id,
    v_profile_id,
    now(),
    now()
  )
  ON CONFLICT (tenant_id, source)
  DO UPDATE SET
    onboarding_mode = EXCLUDED.onboarding_mode,
    ethics_code_id = EXCLUDED.ethics_code_id,
    is_active = true,
    updated_by = v_profile_id,
    updated_at = now()
  RETURNING *;
END;
$$;

-- ------------------------------------------------------------
-- 5. RPC: publicar nueva versión y dejarla vigente en ese source
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_tenant_ethics_code(
  p_tenant_id uuid,
  p_source text,
  p_title text,
  p_version text,
  p_content text DEFAULT '',
  p_document_url text DEFAULT NULL
)
RETURNS SETOF public.ethics_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_user_tenant_id uuid;
  v_code_id uuid;
  v_title text := btrim(COALESCE(p_title, ''));
  v_version text := btrim(COALESCE(p_version, ''));
  v_content text := COALESCE(p_content, '');
  v_document_url text := NULLIF(btrim(COALESCE(p_document_url, '')), '');
  v_hash text;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_user_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un perfil activo para el usuario autenticado.';
  END IF;

  IF p_source = 'superadmin' THEN
    IF v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Solo Superadmin puede publicar el Código de Ética default.';
    END IF;
  ELSIF p_source = 'admin' THEN
    IF v_role <> 'admin' OR v_user_tenant_id IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Solo el Admin del tenant puede publicar su Código de Ética.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Source inválido.';
  END IF;

  IF v_title = '' THEN
    RAISE EXCEPTION 'Ingresá un título para el Código de Ética.';
  END IF;

  IF v_version = '' THEN
    RAISE EXCEPTION 'Ingresá una versión.';
  END IF;

  IF btrim(v_content) = '' AND v_document_url IS NULL THEN
    RAISE EXCEPTION 'Ingresá el contenido o adjuntá un PDF.';
  END IF;

  v_hash := encode(
    digest(v_content || '|' || COALESCE(v_document_url, ''), 'sha256'),
    'hex'
  );

  INSERT INTO public.ethics_codes (
    tenant_id,
    title,
    version,
    content,
    content_hash,
    is_active,
    created_by,
    source,
    document_url,
    published_at,
    created_at
  ) VALUES (
    p_tenant_id,
    v_title,
    v_version,
    v_content,
    v_hash,
    true,
    v_profile_id,
    p_source,
    v_document_url,
    now(),
    now()
  )
  RETURNING id INTO v_code_id;

  INSERT INTO public.tenant_onboarding_settings (
    tenant_id,
    source,
    onboarding_mode,
    ethics_code_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    p_source,
    'ethics_and_signature',
    v_code_id,
    true,
    v_profile_id,
    v_profile_id,
    now(),
    now()
  )
  ON CONFLICT (tenant_id, source)
  DO UPDATE SET
    onboarding_mode = 'ethics_and_signature',
    ethics_code_id = v_code_id,
    is_active = true,
    updated_by = v_profile_id,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.ethics_codes ec
  WHERE ec.id = v_code_id;
END;
$$;

-- ------------------------------------------------------------
-- 6. RPC: Admin elimina override y vuelve al default BondiApps
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_tenant_onboarding_admin_override()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_tenant_id uuid;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL OR v_role <> 'admin' OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Solo un Admin de tenant puede eliminar su override.';
  END IF;

  DELETE FROM public.tenant_onboarding_settings
  WHERE tenant_id = v_tenant_id
    AND source = 'admin';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.save_tenant_onboarding_setting(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_tenant_onboarding_setting(uuid, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.publish_tenant_ethics_code(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_tenant_ethics_code(uuid, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.reset_tenant_onboarding_admin_override() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_tenant_onboarding_admin_override() TO authenticated;
