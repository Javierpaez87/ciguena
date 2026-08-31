-- Batería 2H — Domain Resolver + branding público pre-login
-- Permite múltiples hostnames por tenant sin exponer tenant_branding completo al rol anon.

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hostname text NOT NULL UNIQUE,
  domain_type text NOT NULL DEFAULT 'custom'
    CHECK (domain_type IN ('bondiapps', 'custom', 'legacy')),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_domains_tenant_id_idx
  ON public.tenant_domains(tenant_id);

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_domains_superadmin_select ON public.tenant_domains;
CREATE POLICY tenant_domains_superadmin_select
ON public.tenant_domains
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS tenant_domains_superadmin_insert ON public.tenant_domains;
CREATE POLICY tenant_domains_superadmin_insert
ON public.tenant_domains
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS tenant_domains_superadmin_update ON public.tenant_domains;
CREATE POLICY tenant_domains_superadmin_update
ON public.tenant_domains
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  )
);

DROP POLICY IF EXISTS tenant_domains_superadmin_delete ON public.tenant_domains;
CREATE POLICY tenant_domains_superadmin_delete
ON public.tenant_domains
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  )
);

-- Cada vez que Superadmin guarda un custom_domain en tenant_branding,
-- lo conservamos también como alias. Si más adelante cambia de
-- spi-dev.bondiapps.com a spi.bondiapps.com, el alias DEV sigue existiendo.
CREATE OR REPLACE FUNCTION public.sync_tenant_branding_domain_alias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostname text;
  v_domain_type text;
BEGIN
  v_hostname := lower(trim(trailing '.' from btrim(COALESCE(NEW.custom_domain, ''))));

  IF v_hostname = '' THEN
    RETURN NEW;
  END IF;

  -- Defensive cleanup in case a URL was pasted instead of a hostname.
  v_hostname := regexp_replace(v_hostname, '^https?://', '');
  v_hostname := split_part(v_hostname, '/', 1);
  v_hostname := split_part(v_hostname, ':', 1);

  v_domain_type := CASE
    WHEN v_hostname LIKE '%.bondiapps.com' THEN 'bondiapps'
    ELSE 'custom'
  END;

  INSERT INTO public.tenant_domains AS td (
    tenant_id,
    hostname,
    domain_type,
    is_primary,
    is_active,
    updated_at
  ) VALUES (
    NEW.tenant_id,
    v_hostname,
    v_domain_type,
    true,
    true,
    now()
  )
  ON CONFLICT (hostname)
  DO UPDATE SET
    is_active = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN true
      ELSE td.is_active
    END,
    is_primary = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN true
      ELSE td.is_primary
    END,
    updated_at = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN now()
      ELSE td.updated_at
    END;

  -- El custom_domain actual es el preferido, pero no apagamos aliases históricos.
  UPDATE public.tenant_domains
  SET is_primary = (hostname = v_hostname),
      updated_at = now()
  WHERE tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_branding_sync_domain_alias ON public.tenant_branding;
CREATE TRIGGER tenant_branding_sync_domain_alias
AFTER INSERT OR UPDATE OF custom_domain
ON public.tenant_branding
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_branding_domain_alias();

-- Backfill de los dominios ya configurados.
INSERT INTO public.tenant_domains (
  tenant_id,
  hostname,
  domain_type,
  is_primary,
  is_active
)
SELECT
  tb.tenant_id,
  lower(trim(trailing '.' from btrim(tb.custom_domain))),
  CASE
    WHEN lower(tb.custom_domain) LIKE '%.bondiapps.com' THEN 'bondiapps'
    ELSE 'custom'
  END,
  true,
  true
FROM public.tenant_branding tb
WHERE NULLIF(btrim(tb.custom_domain), '') IS NOT NULL
ON CONFLICT (hostname) DO NOTHING;

-- Resolver público deliberadamente acotado: recibe UN hostname exacto y
-- devuelve solo identidad visual segura. No expone configuración privada.
CREATE OR REPLACE FUNCTION public.resolve_public_tenant_branding(p_hostname text)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  matched_hostname text,
  brand_name text,
  logo_url text,
  logo_compact_url text,
  logo_negative_url text,
  favicon_url text,
  primary_color text,
  accent_color text,
  custom_domain text,
  is_custom_branding boolean,
  show_powered_by_bondiapps boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostname text;
  v_tenant_id uuid;
BEGIN
  v_hostname := lower(trim(trailing '.' from btrim(COALESCE(p_hostname, ''))));
  v_hostname := regexp_replace(v_hostname, '^https?://', '');
  v_hostname := split_part(v_hostname, '/', 1);
  v_hostname := split_part(v_hostname, ':', 1);

  IF v_hostname = '' THEN
    RETURN;
  END IF;

  SELECT td.tenant_id
  INTO v_tenant_id
  FROM public.tenant_domains td
  JOIN public.tenants t ON t.id = td.tenant_id
  WHERE td.hostname = v_hostname
    AND td.is_active = true
    AND t.status = 'active'
  ORDER BY td.is_primary DESC, td.updated_at DESC
  LIMIT 1;

  -- Compatibilidad inmediata con filas tenant_branding anteriores al backfill.
  IF v_tenant_id IS NULL THEN
    SELECT tb.tenant_id
    INTO v_tenant_id
    FROM public.tenant_branding tb
    JOIN public.tenants t ON t.id = tb.tenant_id
    WHERE lower(trim(trailing '.' from btrim(COALESCE(tb.custom_domain, '')))) = v_hostname
      AND t.status = 'active'
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    v_hostname,
    tb.brand_name,
    tb.logo_url,
    tb.logo_compact_url,
    tb.logo_negative_url,
    tb.favicon_url,
    tb.primary_color,
    tb.accent_color,
    tb.custom_domain,
    COALESCE(tb.is_custom_branding, false),
    COALESCE(tb.show_powered_by_bondiapps, true)
  FROM public.tenants t
  LEFT JOIN public.tenant_branding tb ON tb.tenant_id = t.id
  WHERE t.id = v_tenant_id
    AND t.status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_tenant_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_branding(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_public_tenant_branding(text)
IS 'Resuelve de forma pública y segura el branding visible de un tenant a partir de un hostname exacto.';
