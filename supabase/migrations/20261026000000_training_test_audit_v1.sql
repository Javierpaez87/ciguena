-- CIGUENA: auditoria de examenes V1. Aplicar primero en QA.
-- Los cuestionarios y registros nuevos son append-only para roles de app.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.training_test_audit_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 test_id text NOT NULL,
 training_id text NOT NULL,
 content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(test_id, content_hash)
);
CREATE TABLE IF NOT EXISTS public.training_test_audit_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL UNIQUE REFERENCES public.training_test_attempts(id),
 version_id uuid NOT NULL REFERENCES public.training_test_audit_versions(id),
 assignment_id uuid NOT NULL,
 user_id uuid NOT NULL,
 attempt_number integer NOT NULL,
 snapshot jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.training_test_audit_answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 audit_attempt_id uuid NOT NULL REFERENCES public.training_test_audit_attempts(id),
 question_id text NOT NULL,
 question_text text NOT NULL,
 options_snapshot jsonb NOT NULL,
 selected_option text NOT NULL,
 correct_option text NOT NULL,
 is_correct boolean NOT NULL,
 question_order integer NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(audit_attempt_id,question_id)
);
CREATE INDEX IF NOT EXISTS ix_test_audit_versions_test ON public.training_test_audit_versions(test_id);
CREATE INDEX IF NOT EXISTS ix_test_audit_attempts_assignment ON public.training_test_audit_attempts(assignment_id);

ALTER TABLE public.training_test_audit_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_test_audit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_test_audit_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_test_audit_versions, public.training_test_audit_attempts, public.training_test_audit_answers FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_training_test_attempt_audited(
 p_assignment_id uuid, p_test jsonb, p_questions jsonb, p_answers jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
   WHERE id=v_assignment.user_id AND (auth_user_id=auth.uid() OR id=auth.uid()))
 THEN RAISE EXCEPTION 'Assignment does not belong to authenticated worker'; END IF;
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
$$;
REVOKE ALL ON FUNCTION public.record_training_test_attempt_audited(uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_training_test_attempt_audited(uuid,jsonb,jsonb,jsonb) TO authenticated;

-- Roles de aplicación no pueden UPDATE/DELETE. No es inmutabilidad ante el owner/superuser.
