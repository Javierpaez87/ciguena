-- QA ONLY. Minimal tenant seed; run in Supabase branch qa-ciguena, never main/PRODUCTION.
-- Additive and repeatable; intentionally does not copy workers, certificates or Auth accounts.
-- Rollback (only if never used): remove qa domain, then tenant_branding and tenants created here.
DO $$
DECLARE
  v_bondi uuid;
  v_spi uuid;
BEGIN
  SELECT id INTO v_bondi FROM public.tenants WHERE slug = 'bondiapps-qa' LIMIT 1;
  IF v_bondi IS NULL THEN
    INSERT INTO public.tenants (name, slug, status) VALUES ('BondiApps QA', 'bondiapps-qa', 'active') RETURNING id INTO v_bondi;
  END IF;
  SELECT id INTO v_spi FROM public.tenants WHERE slug = 'spi-qa' LIMIT 1;
  IF v_spi IS NULL THEN
    INSERT INTO public.tenants (name, slug, status) VALUES ('SPI QA', 'spi-qa', 'active') RETURNING id INTO v_spi;
  END IF;
  INSERT INTO public.tenant_branding (tenant_id, brand_name, is_custom_branding)
  SELECT v_bondi, 'Cigüeña QA', false
  WHERE NOT EXISTS (SELECT 1 FROM public.tenant_branding WHERE tenant_id = v_bondi);
  INSERT INTO public.tenant_branding (tenant_id, brand_name, is_custom_branding, custom_domain)
  SELECT v_spi, 'SPI Capacitaciones QA', true, 'spi-dev.bondiapps.com'
  WHERE NOT EXISTS (SELECT 1 FROM public.tenant_branding WHERE tenant_id = v_spi);
  IF EXISTS (SELECT 1 FROM public.tenant_domains WHERE hostname = 'spi-dev.bondiapps.com' AND tenant_id <> v_spi) THEN
    RAISE EXCEPTION 'QA hostname is already owned by another tenant; manual investigation required';
  END IF;
  INSERT INTO public.tenant_domains (tenant_id, hostname, domain_type, is_primary, is_active)
  SELECT v_spi, 'spi-dev.bondiapps.com', 'custom', true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.tenant_domains WHERE hostname = 'spi-dev.bondiapps.com');
END $$;
