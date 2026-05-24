/*
  # CIGÜEÑA — Schema operacional (Parte 2)
  Crea las tablas de asignaciones, progreso, intentos, certificados,
  reminders, feedback y activity_log con políticas básicas.
*/

-- ===========================
-- TRAINING_ASSIGNMENTS
-- ===========================
CREATE TABLE IF NOT EXISTS training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','pending_test','passed','failed','completed','certificate_issued','expired')),
  progress_percentage integer NOT NULL DEFAULT 0,
  assigned_at timestamptz DEFAULT now(),
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assignments"
  ON training_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create assignments"
  ON training_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update assignments"
  ON training_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================
-- LESSON_PROGRESS
-- ===========================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  progress_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lesson_progress"
  ON lesson_progress FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage lesson_progress"
  ON lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update lesson_progress"
  ON lesson_progress FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================
-- QUIZ_ATTEMPTS
-- ===========================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempt_number integer NOT NULL DEFAULT 1,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view quiz_attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert quiz_attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================
-- CERTIFICATES
-- ===========================
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
  certificate_url text,
  certificate_code text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','expiring_soon','expired')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert certificates"
  ON certificates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update certificates"
  ON certificates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================
-- EMAIL_REMINDERS
-- ===========================
CREATE TABLE IF NOT EXISTS email_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid REFERENCES trainings(id) ON DELETE SET NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('invitation','training_pending','training_in_progress','certificate_expiring','certificate_expired','certificate_issued')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reminders"
  ON email_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert reminders"
  ON email_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================
-- FEEDBACK
-- ===========================
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid REFERENCES trainings(id) ON DELETE SET NULL,
  feedback_type text NOT NULL DEFAULT 'platform' CHECK (feedback_type IN ('platform','training')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================
-- ACTIVITY_LOG
-- ===========================
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================
-- INDEXES
-- ===========================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_tenant_trainings_tenant_id ON tenant_trainings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_tenant_id ON training_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user_id ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
