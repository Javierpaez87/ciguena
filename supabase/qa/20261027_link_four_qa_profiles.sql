-- QA ONLY. Run AFTER manually creating these four accounts in Supabase QA > Authentication > Users.
-- Does not create Auth users or passwords, and refuses to run if any Auth identity is absent.
-- The whole DO block is atomic. Repeatable for the same users and roles.
DO $$
DECLARE
  v_missing text;
  v_conflict text;
BEGIN
  WITH requested(email) AS (VALUES
    ('javierpaezbondiapps@gmail.com'),
    ('javierpaezgba+spi.admin1@gmail.com'),
    ('paez.javierandres+spi.worker1@gmail.com'),
    ('paez.javierandres+spi.worker2@gmail.com')
  )
  SELECT string_agg(r.email, ', ') INTO v_missing
  FROM requested r LEFT JOIN auth.users u ON lower(u.email) = r.email
  WHERE u.id IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing QA Auth accounts: %', v_missing;
  END IF;
  WITH requested(email, slug) AS (VALUES
    ('javierpaezbondiapps@gmail.com','bondiapps-qa'),
    ('javierpaezgba+spi.admin1@gmail.com','spi-qa'),
    ('paez.javierandres+spi.worker1@gmail.com','spi-qa'),
    ('paez.javierandres+spi.worker2@gmail.com','spi-qa')
  )
  SELECT string_agg(r.email, ', ') INTO v_conflict
  FROM requested r JOIN auth.users u ON lower(u.email)=r.email
  JOIN public.profiles p ON (p.auth_user_id=u.id OR lower(p.email)=r.email)
  JOIN public.tenants t ON t.slug=r.slug
  WHERE (p.auth_user_id IS NOT NULL AND p.auth_user_id <> u.id)
     OR (p.tenant_id IS DISTINCT FROM t.id);
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Conflicting existing QA profiles; inspect before changes: %', v_conflict;
  END IF;
  WITH requested(email, full_name, role, slug) AS (VALUES
    ('javierpaezbondiapps@gmail.com','BondiApps QA Superadmin','super_admin','bondiapps-qa'),
    ('javierpaezgba+spi.admin1@gmail.com','SPI QA Administrator','admin','spi-qa'),
    ('paez.javierandres+spi.worker1@gmail.com','SPI QA Worker 1','worker','spi-qa'),
    ('paez.javierandres+spi.worker2@gmail.com','SPI QA Worker 2','worker','spi-qa')
  )
  INSERT INTO public.profiles (auth_user_id, tenant_id, full_name, email, role, status, source)
  SELECT u.id,t.id,r.full_name,r.email,r.role,'active','qa_seed'
  FROM requested r
  JOIN auth.users u ON lower(u.email)=r.email
  JOIN public.tenants t ON t.slug=r.slug
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.auth_user_id=u.id OR lower(p.email)=r.email
  );
  IF (SELECT count(*) FROM public.profiles WHERE source='qa_seed' AND email IN (
    'javierpaezbondiapps@gmail.com', 'javierpaezgba+spi.admin1@gmail.com',
    'paez.javierandres+spi.worker1@gmail.com', 'paez.javierandres+spi.worker2@gmail.com'
  )) <> 4 THEN
    RAISE EXCEPTION 'Expected four newly created QA profiles. Inspect existing profiles manually.';
  END IF;
END $$;
