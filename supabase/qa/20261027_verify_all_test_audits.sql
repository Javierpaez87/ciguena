-- CIGUENA QA: informe de trazabilidad transversal de exámenes.
-- SOLO LECTURA. Ejecutar en qa-ciguena (PREVIEW).
-- Un registro por intento auditado, para cualquier training.
WITH answer_totals AS (
  SELECT
    audit_attempt_id,
    count(*)::int AS answers_recorded,
    count(*) FILTER (WHERE is_correct)::int AS correct_recorded,
    count(DISTINCT question_id)::int AS distinct_questions,
    count(DISTINCT question_order)::int AS distinct_positions,
    bool_and(selected_option IS NOT NULL AND correct_option IS NOT NULL
      AND question_text IS NOT NULL AND jsonb_typeof(options_snapshot) = 'array') AS answers_complete,
    bool_and(is_correct = (selected_option = correct_option)) AS grading_matches_snapshot
  FROM public.training_test_audit_answers
  GROUP BY audit_attempt_id
),
certificates_by_assignment AS (
  SELECT assignment_id,
    count(*)::int AS certificate_count,
    max(test_score) AS certificate_score,
    max(issued_at) AS latest_certificate_issued_at
  FROM public.certificates
  GROUP BY assignment_id
)
SELECT
  v.test_id,
  v.training_id,
  a.assignment_id,
  a.user_id AS worker_profile_id,
  a.attempt_number,
  a.attempt_id,
  a.id AS audit_attempt_id,
  a.recorded_at AS audit_recorded_at,
  a.version_id,
  v.content_hash AS recorded_bank_sha256,
  jsonb_array_length(a.snapshot) AS served_questions,
  coalesce(r.answers_recorded,0) AS answers_recorded,
  coalesce(r.correct_recorded,0) AS correct_recorded,
  CASE WHEN coalesce(r.answers_recorded,0) > 0
    THEN round(100.0 * r.correct_recorded / r.answers_recorded)::int
    ELSE NULL END AS computed_score_from_audit,
  t.score AS saved_attempt_score,
  t.passed AS saved_attempt_passed,
  t.total_questions AS saved_total_questions,
  t.correct_answers AS saved_correct_answers,
  coalesce(c.certificate_count,0) AS certificates_for_assignment,
  c.certificate_score,
  CASE
    WHEN coalesce(r.answers_recorded,0)=0 THEN 'MISSING_ANSWERS'
    WHEN r.answers_recorded <> jsonb_array_length(a.snapshot) THEN 'ANSWER_COUNT_MISMATCH'
    WHEN r.distinct_questions <> r.answers_recorded OR r.distinct_positions <> r.answers_recorded THEN 'DUPLICATE_QUESTION_OR_ORDER'
    WHEN NOT coalesce(r.answers_complete,false) THEN 'INCOMPLETE_SNAPSHOT'
    WHEN NOT coalesce(r.grading_matches_snapshot,false) THEN 'ANSWER_GRADING_MISMATCH'
    WHEN t.id IS NULL THEN 'MISSING_ORIGINAL_ATTEMPT'
    WHEN t.score IS DISTINCT FROM round(100.0 * r.correct_recorded / r.answers_recorded)::int
      OR t.correct_answers IS DISTINCT FROM r.correct_recorded
      OR t.total_questions IS DISTINCT FROM r.answers_recorded THEN 'ATTEMPT_SCORE_MISMATCH'
    ELSE 'CONSISTENT_WITH_RECORDED_DATA'
  END AS audit_consistency
FROM public.training_test_audit_attempts a
JOIN public.training_test_audit_versions v ON v.id=a.version_id
LEFT JOIN public.training_test_attempts t ON t.id=a.attempt_id
LEFT JOIN answer_totals r ON r.audit_attempt_id=a.id
LEFT JOIN certificates_by_assignment c ON c.assignment_id=a.assignment_id
ORDER BY a.recorded_at DESC;

-- IMPORTANTE:
-- CONSISTENT_WITH_RECORDED_DATA NO significa corrección segura.
-- La V1 recibe el banco y las soluciones del navegador, por eso
-- este informe comprueba coherencia interna, NO autenticidad del resultado.
-- Tampoco prueba que un certificado pertenezca a ese intento específico:
-- el vínculo actual entre certificado e intento es por assignment_id.
