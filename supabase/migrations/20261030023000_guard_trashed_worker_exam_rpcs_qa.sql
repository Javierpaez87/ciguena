-- QA ONLY: based on pg_get_functiondef export 2026-10-29T23:27:39.
-- Reject trashed/inactive profiles at the server boundary for audited exams and certificates.
-- Does NOT change scoring, audit snapshots, existing records, or the frontend.
-- IMPORTANT: correctOption is still received from the client; server-authoritative
-- question banking/scoring must be developed and tested before production rollout.
-- Verify these two function bodies still match current QA before applying.
BEGIN;
CREATE OR REPLACE FUNCTION public.record_training_test_attempt_audited(p_assignment_id uuid, p_test jsonb, p_questions jsonb, p_answers jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
 v_assignment record; v_test_id text; v_training_id text; v_user_id uuid;
 v_test_hash text; v_version_id uuid; v_attempt_id uuid; v_audit_id uuid;
 v_number int; v_total int; v_correct int; v_score int; v_pass boolean;
 v_q jsonb; v_key text; v_selected text; v_answer_count int;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT id, user_id, training_id::text AS training_id INTO v_assignment
 FROM public.training_assignments WHERE id=p_assignment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;
 -- The worker may use a profile id distinct from their Supabase auth user id.
 IF NOT EXISTS (SELECT 1 FROM public.profiles
   WHERE id=v_assignment.user_id
     AND (auth_user_id=auth.uid() OR id=auth.uid())
     AND status='active'
     AND deleted_at IS NULL
     AND tenant_id = (
       SELECT tenant_id FROM public.training_assignments WHERE id=p_assignment_id
     ))
 THEN RAISE EXCEPTION 'Assignment does not belong to an active authenticated worker'; END IF;
 v_user_id:=v_assignment.user_id;
 v_training_id:=p_test->>'trainingId'; v_test_id:=p_test->>'id';
 IF v_training_id IS NULL OR v_training_id<>v_assignment.training_id OR v_test_id IS NULL THEN
   RAISE EXCEPTION 'Mismatched test/training';
 END IF;
 IF jsonb_typeof(p_test->'questions')<>'array' OR jsonb_typeof(p_questions)<>'array' OR jsonb_typeof(p_answers)<>'object' THEN
   RAISE EXCEPTION 'Invalid test payload'; END IF;
 v_total:=jsonb_array_length(p_questions);
 IF v_total=0 OR v_total<>coalesce((p_test->>'questionsPerAttempt')::int,0) THEN RAISE EXCEPTION 'Invalid question count'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p_questions) q WHERE NOT EXISTS
     (SELECT 1 FROM jsonb_array_elements(p_test->'questions') full_q WHERE full_q->>'id'=q->>'id'))>0
 THEN RAISE EXCEPTION 'Question outside test bank'; END IF;
 SELECT count(*) INTO v_number FROM public.training_test_attempts
   WHERE assignment_id=p_assignment_id AND test_id=v_test_id;
 IF EXISTS (SELECT 1 FROM public.training_test_attempts WHERE assignment_id=p_assignment_id AND test_id=v_test_id AND passed) THEN
   RAISE EXCEPTION 'Exam already approved'; END IF;
 v_number:=v_number+1;
 IF v_number>coalesce((p_test->>'maxAttempts')::int,0) THEN RAISE EXCEPTION 'Maximum attempts reached'; END IF;
 -- Enforce correct sequential block even across reloads.
 IF (SELECT count(*) FROM jsonb_array_elements(p_questions) q WHERE NOT EXISTS
    (SELECT 1 FROM jsonb_array_elements(p_test->'questions') WITH ORDINALITY bank(question,ord)
       WHERE bank.question->>'id'=q->>'id'
       AND bank.ord BETWEEN (v_number-1)*v_total+1 AND v_number*v_total))>0
 THEN RAISE EXCEPTION 'Incorrect question batch'; END IF;
 v_answer_count:=0; v_correct:=0;
 FOR v_q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
   v_key:=v_q->>'id'; v_selected:=p_answers->>v_key;
   IF v_selected IS NULL OR NOT EXISTS
      (SELECT 1 FROM jsonb_array_elements(v_q->'options') opt WHERE opt->>'key'=v_selected)
   THEN RAISE EXCEPTION 'Incomplete/invalid answer for question %', v_key; END IF;
   v_answer_count:=v_answer_count+1;
   IF v_selected=v_q->>'correctOption' THEN v_correct:=v_correct+1; END IF;
 END LOOP;
 v_score:=round(100.0*v_correct/v_total);
 v_pass:=v_score>=coalesce((p_test->>'passingScore')::int,100);
 v_test_hash:=encode(digest(p_test::text,'sha256'),'hex');
 INSERT INTO public.training_test_audit_versions(test_id,training_id,content_hash,snapshot)
 VALUES(v_test_id,v_training_id,v_test_hash,p_test)
 ON CONFLICT (test_id,content_hash) DO NOTHING;
 SELECT id INTO v_version_id FROM public.training_test_audit_versions
 WHERE test_id=v_test_id AND content_hash=v_test_hash;
 INSERT INTO public.training_test_attempts(assignment_id,user_id,training_id,test_id,attempt_number,score,correct_answers,total_questions,passed)
 VALUES(p_assignment_id,v_user_id,v_training_id,v_test_id,v_number,v_score,v_correct,v_total,v_pass)
 RETURNING id INTO v_attempt_id;
 INSERT INTO public.training_test_audit_attempts(attempt_id,version_id,assignment_id,user_id,attempt_number,snapshot)
 VALUES(v_attempt_id,v_version_id,p_assignment_id,v_user_id,v_number,p_questions)
 RETURNING id INTO v_audit_id;
 INSERT INTO public.training_test_attempt_answers(attempt_id,question_id,selected_option,correct_option,is_correct)
 SELECT v_attempt_id, q->>'id',p_answers->>(q->>'id'),q->>'correctOption',
    (p_answers->>(q->>'id'))=(q->>'correctOption') FROM jsonb_array_elements(p_questions) q;
 INSERT INTO public.training_test_audit_answers(audit_attempt_id,question_id,question_text,options_snapshot,selected_option,correct_option,is_correct,question_order)
 SELECT v_audit_id,q->>'id',q->>'question',q->'options',p_answers->>(q->>'id'),q->>'correctOption',
   (p_answers->>(q->>'id'))=(q->>'correctOption'),ord::int
 FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS t(q,ord);
 RETURN v_attempt_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.issue_audited_test_certificate(p_attempt_id uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
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
 WHERE id=v_assignment.user_id AND auth_user_id=auth.uid() AND status='active' AND deleted_at IS NULL;
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
$function$
;
COMMIT;
