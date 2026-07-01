/*
  # CIGÜEÑA — Live Trainings / Capacitaciones en Vivo

  MVP:
  - Capacitaciones en vivo por Google Meet.
  - Calendarización desde cuenta BondiApps/Cigüeña.
  - Invitados por tenant.
  - Ingreso desde Cigüeña.
  - Clasificación automática posterior: on_time, late, absent, invalid_after_event.
  - Recuperación asincrónica opcional.
  - Certificados separados para live trainings, sin tocar la tabla certificates existente.
*/

-- ===========================
-- LIVE_TRAININGS
-- ===========================
CREATE TABLE IF NOT EXISTS live_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  title text NOT NULL,
  description text NOT NULL DEFAULT '',

  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',

  -- MVP: solo Google Meet, pero queda preparado para futuros providers.
  meeting_provider text NOT NULL DEFAULT 'google_meet'
    CHECK (meeting_provider IN ('google_meet', 'microsoft_teams', 'zoom', 'other')),

  meeting_url text,
  meeting_external_id text,

  -- MVP: calendarización desde Google Calendar de BondiApps/Cigüeña.
  calendar_provider text NOT NULL DEFAULT 'google_calendar'
    CHECK (calendar_provider IN ('google_calendar', 'microsoft_calendar', 'none')),

  calendar_event_id text,
  calendar_status text NOT NULL DEFAULT 'pending'
    CHECK (calendar_status IN ('pending', 'created', 'failed', 'cancelled', 'not_required')),

  calendar_error text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled', 'closed')),

  -- Reglas de cumplimiento/certificación.
  has_exam boolean NOT NULL DEFAULT false,
  certificate_enabled boolean NOT NULL DEFAULT true,
  async_recovery_enabled boolean NOT NULL DEFAULT true,

  -- Ingreso tarde tolerado. Ej: empieza 10:00, tolerancia 15 min => on_time hasta 10:15.
  late_tolerance_minutes integer NOT NULL DEFAULT 15 CHECK (late_tolerance_minutes >= 0),

  -- Recuperación asincrónica para ausentes.
  recording_url text,
  recording_available_at timestamptz,
  recording_due_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,

  CONSTRAINT live_trainings_valid_time_range CHECK (ends_at > starts_at)
);

ALTER TABLE live_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view live_trainings"
  ON live_trainings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_trainings"
  ON live_trainings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_trainings"
  ON live_trainings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete live_trainings"
  ON live_trainings FOR DELETE
  TO authenticated
  USING (true);


-- ===========================
-- LIVE_TRAINING_PARTICIPANTS
-- ===========================
CREATE TABLE IF NOT EXISTS live_training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  live_training_id uuid NOT NULL REFERENCES live_trainings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Invitación/calendarización.
  invited_at timestamptz NOT NULL DEFAULT now(),
  calendar_invite_sent_at timestamptz,

  -- Trazabilidad de ingreso desde Cigüeña.
  room_opened_at timestamptz,
  join_clicked_at timestamptz,

  -- Estado de asistencia al vivo.
  live_attendance_status text NOT NULL DEFAULT 'invited'
    CHECK (live_attendance_status IN (
      'invited',
      'on_time',
      'late',
      'absent',
      'invalid_after_event',
      'excused_manual'
    )),

  live_attendance_evaluated_at timestamptz,
  live_attendance_overridden_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  live_attendance_override_reason text,

  -- Recuperación asincrónica.
  async_recovery_status text NOT NULL DEFAULT 'not_required'
    CHECK (async_recovery_status IN (
      'not_required',
      'pending_recording',
      'available',
      'video_seen',
      'completed',
      'expired'
    )),

  recording_opened_at timestamptz,
  recording_seen_at timestamptz,

  -- Evaluación.
  exam_status text NOT NULL DEFAULT 'not_required'
    CHECK (exam_status IN ('not_required', 'pending', 'passed', 'failed')),

  exam_passed_at timestamptz,

  -- Certificación.
  certification_status text NOT NULL DEFAULT 'not_eligible'
    CHECK (certification_status IN (
      'not_eligible',
      'eligible',
      'pending_exam',
      'issued',
      'blocked'
    )),

  certificate_id uuid,

  -- Comunicación post evento.
  post_event_absence_email_sent_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,

  UNIQUE(live_training_id, user_id)
);

ALTER TABLE live_training_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view live_training_participants"
  ON live_training_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_training_participants"
  ON live_training_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_training_participants"
  ON live_training_participants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete live_training_participants"
  ON live_training_participants FOR DELETE
  TO authenticated
  USING (true);


-- ===========================
-- LIVE_TRAINING_LOGS
-- ===========================
CREATE TABLE IF NOT EXISTS live_training_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  live_training_id uuid NOT NULL REFERENCES live_trainings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  metadata jsonb,

  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE live_training_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view live_training_logs"
  ON live_training_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_training_logs"
  ON live_training_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ===========================
-- LIVE_TRAINING_CERTIFICATES
-- ===========================
CREATE TABLE IF NOT EXISTS live_training_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  live_training_id uuid NOT NULL REFERENCES live_trainings(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES live_training_participants(id) ON DELETE CASCADE,

  certificate_url text,
  certificate_code text NOT NULL,

  -- live_attendance o async_recovery
  completion_mode text NOT NULL DEFAULT 'live_attendance'
    CHECK (completion_mode IN ('live_attendance', 'async_recovery')),

  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'revoked')),

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(participant_id)
);

ALTER TABLE live_training_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view live_training_certificates"
  ON live_training_certificates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_training_certificates"
  ON live_training_certificates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_training_certificates"
  ON live_training_certificates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- Link certificate_id back to live_training_certificates.
ALTER TABLE live_training_participants
  ADD CONSTRAINT live_training_participants_certificate_id_fkey
  FOREIGN KEY (certificate_id)
  REFERENCES live_training_certificates(id)
  ON DELETE SET NULL;


-- ===========================
-- INDEXES
-- ===========================
CREATE INDEX IF NOT EXISTS idx_live_trainings_tenant_id
  ON live_trainings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_live_trainings_created_by
  ON live_trainings(created_by);

CREATE INDEX IF NOT EXISTS idx_live_trainings_status
  ON live_trainings(status);

CREATE INDEX IF NOT EXISTS idx_live_trainings_starts_at
  ON live_trainings(starts_at);

CREATE INDEX IF NOT EXISTS idx_live_trainings_calendar_status
  ON live_trainings(calendar_status);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_tenant_id
  ON live_training_participants(tenant_id);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_training_id
  ON live_training_participants(live_training_id);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_user_id
  ON live_training_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_attendance
  ON live_training_participants(live_attendance_status);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_async_recovery
  ON live_training_participants(async_recovery_status);

CREATE INDEX IF NOT EXISTS idx_live_training_participants_certification
  ON live_training_participants(certification_status);

CREATE INDEX IF NOT EXISTS idx_live_training_logs_training_id
  ON live_training_logs(live_training_id);

CREATE INDEX IF NOT EXISTS idx_live_training_logs_user_id
  ON live_training_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_live_training_logs_event_type
  ON live_training_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_live_training_certificates_tenant_id
  ON live_training_certificates(tenant_id);

CREATE INDEX IF NOT EXISTS idx_live_training_certificates_user_id
  ON live_training_certificates(user_id);

CREATE INDEX IF NOT EXISTS idx_live_training_certificates_training_id
  ON live_training_certificates(live_training_id);


-- ===========================
-- UPDATED_AT TRIGGER
-- ===========================
CREATE OR REPLACE FUNCTION set_live_training_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_trainings_updated_at ON live_trainings;
CREATE TRIGGER trg_live_trainings_updated_at
  BEFORE UPDATE ON live_trainings
  FOR EACH ROW
  EXECUTE FUNCTION set_live_training_updated_at();

DROP TRIGGER IF EXISTS trg_live_training_participants_updated_at ON live_training_participants;
CREATE TRIGGER trg_live_training_participants_updated_at
  BEFORE UPDATE ON live_training_participants
  FOR EACH ROW
  EXECUTE FUNCTION set_live_training_updated_at();
