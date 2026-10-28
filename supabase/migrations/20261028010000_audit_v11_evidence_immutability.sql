-- Cigüeña / Auditoría V1.1 / PATCH 1: evidencia histórica (QA primero).
-- Este cambio no altera firmas, certificados, asignaciones ni el flujo del examen.
-- Requiere que las tablas de auditoría V1 ya existan.
BEGIN;

CREATE OR REPLACE FUNCTION public.reject_training_test_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Exam audit evidence is append-only: %.% cannot be %',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS training_test_audit_versions_immutable ON public.training_test_audit_versions;
CREATE TRIGGER training_test_audit_versions_immutable
BEFORE UPDATE OR DELETE ON public.training_test_audit_versions
FOR EACH ROW EXECUTE FUNCTION public.reject_training_test_audit_mutation();

DROP TRIGGER IF EXISTS training_test_audit_attempts_immutable ON public.training_test_audit_attempts;
CREATE TRIGGER training_test_audit_attempts_immutable
BEFORE UPDATE OR DELETE ON public.training_test_audit_attempts
FOR EACH ROW EXECUTE FUNCTION public.reject_training_test_audit_mutation();

DROP TRIGGER IF EXISTS training_test_audit_answers_immutable ON public.training_test_audit_answers;
CREATE TRIGGER training_test_audit_answers_immutable
BEFORE UPDATE OR DELETE ON public.training_test_audit_answers
FOR EACH ROW EXECUTE FUNCTION public.reject_training_test_audit_mutation();

-- Defense in depth: these tables are written via the audited SECURITY DEFINER RPC.
-- Existing grants were revoked in V1; reassert them without altering RPC execution rights.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
  public.training_test_audit_versions,
  public.training_test_audit_attempts,
  public.training_test_audit_answers
FROM PUBLIC, anon, authenticated;

COMMIT;
