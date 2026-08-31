-- ============================================================
-- CIGÜEÑA — Worker Onboarding Profile Hotfix (3A.2.1)
--
-- Resuelve dos problemas del onboarding:
-- 1) persistencia robusta de datos de nómina/perfil;
-- 2) sincronización atómica profiles <-> employee_directory.
--
-- La función SOLO puede actualizar el profile del usuario autenticado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_worker_profile_onboarding(
  p_full_name text,
  p_dni text,
  p_employee_code text,
  p_work_role text,
  p_phone text,
  p_area text DEFAULT NULL,
  p_position text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
  v_full_name text := btrim(COALESCE(p_full_name, ''));
  v_dni text := btrim(COALESCE(p_dni, ''));
  v_employee_code text := btrim(COALESCE(p_employee_code, ''));
  v_work_role text := btrim(COALESCE(p_work_role, ''));
  v_phone text := btrim(COALESCE(p_phone, ''));
  v_area text := NULLIF(btrim(COALESCE(p_area, '')), '');
  v_position text := NULLIF(btrim(COALESCE(p_position, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión inválida.';
  END IF;

  IF v_full_name = '' OR v_dni = '' OR v_employee_code = '' OR v_work_role = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'Faltan datos obligatorios del perfil.';
  END IF;

  SELECT p.*
  INTO v_profile
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.role = 'worker'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró un perfil worker asociado a la sesión.';
  END IF;

  UPDATE public.profiles p
  SET
    full_name = v_full_name,
    dni = v_dni,
    employee_code = v_employee_code,
    work_role = v_work_role,
    job_role = v_work_role,
    phone = v_phone,
    area = v_area,
    position = COALESCE(v_position, v_work_role),
    profile_validated_at = v_now
  WHERE p.id = v_profile.id
  RETURNING p.* INTO v_profile;

  -- Sincroniza la nómina existente, ya sea vinculada por profile_id
  -- o todavía identificada solamente por tenant + email.
  UPDATE public.employee_directory ed
  SET
    full_name = v_full_name,
    dni = v_dni,
    employee_code = v_employee_code,
    work_role = v_work_role,
    phone = v_phone,
    area = v_area,
    position = COALESCE(v_position, v_work_role),
    status = 'registered',
    registered_at = COALESCE(ed.registered_at, v_now),
    profile_id = v_profile.id
  WHERE ed.tenant_id = v_profile.tenant_id
    AND (
      ed.profile_id = v_profile.id
      OR lower(ed.email) = lower(v_profile.email)
    );

  RETURN to_jsonb(v_profile);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_worker_profile_onboarding(
  text, text, text, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_worker_profile_onboarding(
  text, text, text, text, text, text, text
) TO authenticated;
