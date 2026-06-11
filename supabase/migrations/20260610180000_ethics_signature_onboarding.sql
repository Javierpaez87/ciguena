/*
  # CIGÜEÑA — Firma de Código de Ética / Onboarding Worker

  Agrega:
  - ethics_codes: versiones del código de ética por tenant.
  - ethics_acceptances: aceptaciones firmadas por trabajador.
  - bucket signature-images para guardar firmas.
  - columnas de referencia en certificates solo si la tabla certificates existe.

  Nota:
  Para el MVP se permite que el worker inserte su propia aceptación.
  En una etapa posterior conviene mover la creación de aceptaciones/certificados
  a una Edge Function para capturar IP y endurecer validaciones server-side.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================
-- ETHICS_CODES
-- ===========================

CREATE TABLE IF NOT EXISTS public.ethics_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  content text NOT NULL,
  content_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(tenant_id, version)
);

ALTER TABLE public.ethics_codes ENABLE ROW LEVEL SECURITY;

-- ===========================
-- ETHICS_ACCEPTANCES
-- ===========================

CREATE TABLE IF NOT EXISTS public.ethics_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ethics_code_id uuid NOT NULL REFERENCES public.ethics_codes(id) ON DELETE RESTRICT,
  accepted_name text NOT NULL,
  accepted_document_number text,
  signature_image_url text NOT NULL,
  signature_hash text NOT NULL,
  acceptance_text text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ethics_code_id)
);

ALTER TABLE public.ethics_acceptances ENABLE ROW LEVEL SECURITY;

-- Las aceptaciones firmadas no deberían editarse ni borrarse desde la app.
-- Si hay un error, se crea una nueva versión/documento/evento.

-- ===========================
-- CERTIFICATES EXTENSION
-- ===========================
-- Si todavía no existe la tabla certificates, salteamos esta parte.
-- Más adelante, cuando creemos certificates, agregamos estas columnas ahí.

DO $$
BEGIN
  IF to_regclass('public.certificates') IS NOT NULL THEN
    ALTER TABLE public.certificates
      ADD COLUMN IF NOT EXISTS ethics_acceptance_id uuid REFERENCES public.ethics_acceptances(id),
      ADD COLUMN IF NOT EXISTS worker_signature_image_url text;
  END IF;
END $$;

-- ===========================
-- STORAGE BUCKET
-- ===========================

INSERT INTO storage.buckets (id, name, public)
VALUES ('signature-images', 'signature-images', true)
ON CONFLICT (id) DO NOTHING;

-- ===========================
-- POLICIES: ETHICS_CODES
-- ===========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ethics_codes'
      AND policyname = 'Authenticated can view active ethics codes'
  ) THEN
    CREATE POLICY "Authenticated can view active ethics codes"
      ON public.ethics_codes
      FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ethics_codes'
      AND policyname = 'Admins can manage ethics codes'
  ) THEN
    CREATE POLICY "Admins can manage ethics codes"
      ON public.ethics_codes
      FOR ALL
      TO authenticated
      USING (
        tenant_id IN (
          SELECT tenant_id
          FROM public.profiles
          WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id
          FROM public.profiles
          WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ===========================
-- POLICIES: ETHICS_ACCEPTANCES
-- ===========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ethics_acceptances'
      AND policyname = 'Users can view own ethics acceptances'
  ) THEN
    CREATE POLICY "Users can view own ethics acceptances"
      ON public.ethics_acceptances
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = auth.uid()
        )
        OR tenant_id IN (
          SELECT tenant_id
          FROM public.profiles
          WHERE auth_user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ethics_acceptances'
      AND policyname = 'Workers can insert own ethics acceptance'
  ) THEN
    CREATE POLICY "Workers can insert own ethics acceptance"
      ON public.ethics_acceptances
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id
          FROM public.profiles
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ===========================
-- STORAGE POLICIES
-- ===========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated can upload signature images'
  ) THEN
    CREATE POLICY "Authenticated can upload signature images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'signature-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated can view signature images'
  ) THEN
    CREATE POLICY "Authenticated can view signature images"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'signature-images');
  END IF;
END $$;

-- ===========================
-- SEED DEMO / BONDIAPPS
-- ===========================
-- Para el Supabase demo actual, creamos un Código de Ética BondiApps v1.0
-- para cada tenant activo.
-- Cuando usemos un Supabase separado por empresa, este seed se ajusta a un solo tenant/brand.

INSERT INTO public.ethics_codes (
  tenant_id,
  title,
  version,
  content,
  content_hash,
  is_active
)
SELECT
  t.id,
  'Código de Ética BondiApps',
  '1.0',
  'Código de Ética BondiApps v1.0

1. Actuar con honestidad, responsabilidad y respeto en todas las actividades realizadas dentro de la plataforma.

2. Cumplir las normas internas de la empresa, los procedimientos de seguridad e higiene y las indicaciones aplicables a cada capacitación.

3. Realizar las capacitaciones y evaluaciones de manera personal, sin suplantar identidad ni permitir que terceros respondan en nombre propio.

4. Declarar información verdadera y mantener actualizados los datos personales o laborales requeridos para la emisión de constancias y certificados.

5. Respetar la confidencialidad de la información, contenidos, documentos y materiales a los que se acceda mediante Cigüeña.

6. Usar la plataforma de forma adecuada, evitando acciones que puedan alterar registros, afectar la trazabilidad o comprometer la seguridad de la información.

7. Aceptar que la firma electrónica registrada podrá ser utilizada en constancias y certificados vinculados a capacitaciones completadas dentro de la plataforma.

Al firmar, la persona declara haber leído y aceptado este Código de Ética y autoriza el uso de su firma electrónica para constancias y certificados emitidos por Cigüeña.',
  encode(digest('Código de Ética BondiApps v1.0', 'sha256'), 'hex'),
  true
FROM public.tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, version) DO NOTHING;

-- ===========================
-- INDEXES
-- ===========================

CREATE INDEX IF NOT EXISTS idx_ethics_codes_tenant_id
ON public.ethics_codes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ethics_codes_active
ON public.ethics_codes(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ethics_acceptances_tenant_id
ON public.ethics_acceptances(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ethics_acceptances_user_id
ON public.ethics_acceptances(user_id);

CREATE INDEX IF NOT EXISTS idx_ethics_acceptances_code_id
ON public.ethics_acceptances(ethics_code_id);
