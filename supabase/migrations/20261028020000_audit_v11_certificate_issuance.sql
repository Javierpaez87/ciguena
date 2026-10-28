-- CIGUENA / QA FIRST. Apply only after deploying the matching frontend on QA.
-- V1.1: secure issuance based on an existing audited attempt, without claiming
-- the client-supplied answer key is authoritative (that requires V2).
BEGIN;

CREATE TABLE IF NOT EXISTS public.training_test_certificate_links (
  certificate_id uuid PRIMARY KEY REFERENCES public.certificates(id),
  assignment_id uuid NOT NULL REFERENCES public.training_assignments(id),
  attempt_id uuid NOT NULL UNIQUE REFERENCES public.training_test_attempts(id),
  audit_attempt_id uuid NOT NULL UNIQUE REFERENCES public.training_test_audit_attempts(id),
  issued_by_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  evidence_level text NOT NULL DEFAULT 'v1_client_key_audited'
    CHECK (evidence_level = 'v1_client_key_audited'),
  UNIQUE (assignment_id)
);
ALTER TABLE public.training_test_certificate_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_test_certificate_links FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Workers read own certificate audit links" ON public.training_test_certificate_links;
CREATE POLICY "Workers read own certificate audit links"
ON public.training_test_certificate_links FOR SELECT TO authenticated
USING (EXISTS (
 SELECT 1 FROM public.training_assignments a
 JOIN public.profiles p ON p.id = a.user_id
 WHERE a.id = assignment_id AND p.auth_user_id = auth.uid() AND p.status = 'active'
));
GRANT SELECT ON public.training_test_certificate_links TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_audited_test_certificate(
  p_attempt_id uuid, p_expires_at timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
 v_attempt public.training_test_attempts%ROWTYPE;
 v_assignment public.training_assignments%ROWTYPE;
 v_profile public.profiles%ROWTYPE;
 v_audit_id uuid;
 v_certificate_id uuid;
 v_signature public.tenant_signatures%ROWTYPE;
 v_worker_signature text;
 v_code text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_attempt FROM public.training_test_attempts WHERE id=p_attempt_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
 SELECT * INTO v_assignment FROM public.training_assignments
  WHERE id=v_attempt.assignment_id FOR UPDATE;
 IF NOT FOUND OR v_attempt.user_id IS DISTINCT FROM v_assignment.user_id
    OR v_attempt.training_id IS DISTINCT FROM v_assignment.training_id THEN
  RAISE EXCEPTION 'Invalid assignment/attempt relationship';
 END IF;
 SELECT * INTO v_profile FROM public.profiles
 WHERE id=v_assignment.user_id AND auth_user_id=auth.uid() AND status='active';
 IF NOT FOUND OR v_profile.tenant_id IS DISTINCT FROM v_assignment.tenant_id THEN
  RAISE EXCEPTION 'Attempt does not belong to authenticated worker';
 END IF;
 SELECT aa.id INTO v_audit_id FROM public.training_test_audit_attempts aa
 WHERE aa.attempt_id=v_attempt.id AND aa.assignment_id=v_assignment.id
 AND aa.user_id=v_assignment.user_id AND aa.attempt_number=v_attempt.attempt_number;
 IF v_audit_id IS NULL THEN RAISE EXCEPTION 'No audited evidence for attempt'; END IF;
 IF NOT v_attempt.passed OR v_attempt.score < 0 OR v_attempt.score > 100
    OR v_attempt.total_questions <= 0
    OR v_attempt.score IS DISTINCT FROM round(100.0 * v_attempt.correct_answers / v_attempt.total_questions)::int
    OR v_attempt.correct_answers IS DISTINCT FROM (
      SELECT count(*)::int FROM public.training_test_audit_answers WHERE audit_attempt_id=v_audit_id AND is_correct
    ) OR v_attempt.total_questions IS DISTINCT FROM (
      SELECT count(*)::int FROM public.training_test_audit_answers WHERE audit_attempt_id=v_audit_id
    ) THEN
  RAISE EXCEPTION 'Attempt is not an internally consistent passing attempt';
 END IF;
 -- Idempotent: an already issued certificate is returned without altering it.
 SELECT id INTO v_certificate_id FROM public.certificates
 WHERE assignment_id=v_assignment.id ORDER BY issued_at LIMIT 1;
 IF v_certificate_id IS NOT NULL THEN RETURN v_certificate_id; END IF;
 IF EXISTS (SELECT 1 FROM public.training_test_attempts
  WHERE assignment_id=v_assignment.id AND passed AND id<>v_attempt.id
    AND completed_at <= v_attempt.completed_at) THEN
  RAISE EXCEPTION 'An earlier passing attempt already exists';
 END IF;
 IF p_expires_at IS NOT NULL AND
   (p_expires_at <= now() OR p_expires_at > now() + interval '10 years') THEN
   RAISE EXCEPTION 'Invalid certificate expiry';
 END IF;
 SELECT * INTO v_signature FROM public.tenant_signatures
  WHERE tenant_id=v_assignment.tenant_id AND is_default=true AND is_active=true
  AND signature_image_url IS NOT NULL ORDER BY created_at DESC LIMIT 1;
 SELECT signature_image_url INTO v_worker_signature
 FROM public.worker_signature_consents WHERE user_id=v_assignment.user_id
 ORDER BY accepted_at DESC LIMIT 1;
 IF v_worker_signature IS NULL THEN
  SELECT signature_image_url INTO v_worker_signature
  FROM public.ethics_acceptances WHERE user_id=v_assignment.user_id
  ORDER BY accepted_at DESC LIMIT 1;
 END IF;
 v_code := 'CIG-' || upper(right(regexp_replace(v_assignment.training_id,'[^A-Za-z0-9]','','g'),8))
  || '-' || replace(v_attempt.id::text,'-','');
 INSERT INTO public.certificates (
  assignment_id,user_id,training_id,tenant_id,certificate_code,
  worker_signature_url,company_signature_id,company_signature_url,
  company_signer_name,company_signer_role,issued_at,expires_at,status,
  test_score,test_attempts_count
 ) VALUES (
  v_assignment.id,v_assignment.user_id,v_assignment.training_id,v_assignment.tenant_id,v_code,
  v_worker_signature,v_signature.id,v_signature.signature_image_url,
  v_signature.signer_name,v_signature.signer_role,now(),p_expires_at,'valid',
  v_attempt.score,v_attempt.attempt_number
 ) RETURNING id INTO v_certificate_id;
 INSERT INTO public.training_test_certificate_links (
  certificate_id,assignment_id,attempt_id,audit_attempt_id,issued_by_profile_id
 ) VALUES (v_certificate_id,v_assignment.id,v_attempt.id,v_audit_id,v_profile.id);
 UPDATE public.training_assignments SET
  status='certificate_issued',completed_at=now(),progress_percentage=100,
  test_score=v_attempt.score,test_attempts_count=v_attempt.attempt_number,test_passed_at=now()
 WHERE id=v_assignment.id;
 RETURN v_certificate_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.issue_audited_test_certificate(uuid,timestamptz)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_audited_test_certificate(uuid,timestamptz) TO authenticated;

-- Existing certificates remain accessible, but ordinary users may no longer
-- insert new ones. The RPC (SECURITY DEFINER) issues them transactionally.
DROP POLICY IF EXISTS "Users can insert own certificates" ON public.certificates;
REVOKE INSERT ON public.certificates FROM authenticated, anon;

-- Prevent client-originated grade/status forgery while retaining normal
-- progress updates and admin assignment maintenance.
CREATE OR REPLACE FUNCTION public.guard_training_assignment_exam_result()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
 IF current_user <> 'postgres' AND (
   NEW.test_score IS DISTINCT FROM OLD.test_score OR
   NEW.test_attempts_count IS DISTINCT FROM OLD.test_attempts_count OR
   NEW.test_passed_at IS DISTINCT FROM OLD.test_passed_at OR
   (NEW.status='certificate_issued' AND OLD.status IS DISTINCT FROM NEW.status)
 ) THEN
   RAISE EXCEPTION 'Exam results and certificate issuance must be written by server RPC'
   USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS guard_training_assignment_exam_result ON public.training_assignments;
CREATE TRIGGER guard_training_assignment_exam_result
BEFORE UPDATE ON public.training_assignments FOR EACH ROW
EXECUTE FUNCTION public.guard_training_assignment_exam_result();

-- Do not allow fabricated legacy attempts to be inserted by clients.
DROP POLICY IF EXISTS "Users can insert own test attempts" ON public.training_test_attempts;
DROP POLICY IF EXISTS "Users can insert own test attempt answers" ON public.training_test_attempt_answers;
REVOKE INSERT ON public.training_test_attempts,public.training_test_attempt_answers FROM authenticated, anon;
COMMIT;
