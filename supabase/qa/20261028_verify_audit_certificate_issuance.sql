-- QA-only read-only verification for Patch 2.
SELECT p.proname, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='issue_audited_test_certificate';
SELECT policyname,cmd FROM pg_policies WHERE schemaname='public' AND tablename='certificates';
SELECT tgname,tgenabled FROM pg_trigger
WHERE tgrelid='public.training_assignments'::regclass AND tgname='guard_training_assignment_exam_result';
SELECT a.id AS assignment_id, t.test_id, t.score, t.passed,
 l.certificate_id, l.audit_attempt_id,l.evidence_level
FROM public.training_test_attempts t
JOIN public.training_assignments a ON a.id=t.assignment_id
LEFT JOIN public.training_test_certificate_links l ON l.attempt_id=t.id
ORDER BY t.completed_at DESC LIMIT 25;
