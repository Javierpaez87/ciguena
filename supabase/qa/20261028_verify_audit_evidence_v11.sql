-- Read-only QA verification. Run ONLY in qa-ciguena (PREVIEW).
-- 1. Each of 3 audit tables should have one enabled trigger protecting UPDATE and DELETE.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       t.tgname AS trigger_name,
       t.tgenabled AS enabled,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('training_test_audit_versions', 'training_test_audit_attempts', 'training_test_audit_answers')
  AND t.tgname LIKE '%_immutable'
  AND NOT t.tgisinternal
ORDER BY table_name;

-- 2. No direct write grants should appear for anon or authenticated on the audit tables.
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('training_test_audit_versions','training_test_audit_attempts','training_test_audit_answers')
  AND grantee IN ('anon','authenticated','PUBLIC')
  AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')
ORDER BY grantee,table_name,privilege_type;

-- 3. Read every recorded exam and compare saved totals/score with detailed audit answers.
SELECT v.test_id, a.assignment_id, a.user_id AS worker_profile_id,
       a.attempt_id, a.id AS audit_attempt_id, a.attempt_number,
       v.id AS version_id, v.content_hash,
       a.recorded_at AS attempt_recorded_at,
       COUNT(ans.id) AS recorded_questions,
       COUNT(ans.id) FILTER (WHERE ans.is_correct) AS correct_answers,
       MIN(ans.recorded_at) AS first_answer_recorded_at,
       MAX(ans.recorded_at) AS last_answer_recorded_at,
       t.total_questions AS result_total_questions,
       t.correct_answers AS result_correct_answers,
       t.score AS result_score,
       t.passed,
       CASE WHEN COUNT(ans.id)=t.total_questions
                 AND COUNT(ans.id) FILTER (WHERE ans.is_correct)=t.correct_answers
                 AND ROUND(100.0*COUNT(ans.id) FILTER (WHERE ans.is_correct) / NULLIF(COUNT(ans.id),0))=t.score
            THEN 'CONSISTENT_WITH_RECORDED_DATA'
            ELSE 'REVIEW_REQUIRED' END AS consistency
FROM public.training_test_audit_attempts a
JOIN public.training_test_audit_versions v ON v.id=a.version_id
JOIN public.training_test_attempts t ON t.id=a.attempt_id
LEFT JOIN public.training_test_audit_answers ans ON ans.audit_attempt_id=a.id
GROUP BY v.test_id,a.assignment_id,a.user_id,a.attempt_id,a.id,a.attempt_number,
         v.id,v.content_hash,a.recorded_at,t.total_questions,t.correct_answers,t.score,t.passed
ORDER BY a.recorded_at DESC;
