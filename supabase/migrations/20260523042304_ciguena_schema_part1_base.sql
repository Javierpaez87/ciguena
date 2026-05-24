/*
  # CIGÜEÑA — Schema base (Parte 1)
  Crea las tablas base: tenants, profiles, trainings, tenant_trainings,
  training_modules, training_lessons, quiz_questions, quiz_options.
  Sin RLS aún en profiles para evitar recursión en políticas.
*/

-- ===========================
-- TENANTS
-- ===========================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ===========================
-- PROFILES
-- ===========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'worker' CHECK (role IN ('super_admin', 'admin', 'worker')),
  position text,
  area text,
  contractor_company text,
  employee_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===========================
-- TRAININGS
-- ===========================
CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'HSE',
  duration_minutes integer NOT NULL DEFAULT 60,
  validity_months integer,
  certificate_enabled boolean NOT NULL DEFAULT true,
  passing_score integer NOT NULL DEFAULT 70,
  max_attempts integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- ===========================
-- TENANT_TRAININGS
-- ===========================
CREATE TABLE IF NOT EXISTS tenant_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, training_id)
);

ALTER TABLE tenant_trainings ENABLE ROW LEVEL SECURITY;

-- ===========================
-- TRAINING_MODULES
-- ===========================
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

-- ===========================
-- TRAINING_LESSONS
-- ===========================
CREATE TABLE IF NOT EXISTS training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  lesson_type text NOT NULL DEFAULT 'video' CHECK (lesson_type IN ('video', 'pdf', 'text', 'image', 'link')),
  video_provider text CHECK (video_provider IN ('bunny', 'cloudflare', 'vimeo', 'external')),
  video_id text,
  video_embed_url text,
  video_thumbnail_url text,
  duration_seconds integer,
  resource_url text,
  order_index integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;

-- ===========================
-- QUIZ_QUESTIONS
-- ===========================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- ===========================
-- QUIZ_OPTIONS
-- ===========================
CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;

-- Basic policies (no recursion)
CREATE POLICY "Authenticated can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Authenticated can view trainings"
  ON trainings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert trainings"
  ON trainings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update trainings"
  ON trainings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view tenant_trainings"
  ON tenant_trainings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage tenant_trainings"
  ON tenant_trainings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update tenant_trainings"
  ON tenant_trainings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view modules"
  ON training_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view lessons"
  ON training_lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage lessons"
  ON training_lessons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update lessons"
  ON training_lessons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view questions"
  ON quiz_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage questions"
  ON quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view options"
  ON quiz_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage options"
  ON quiz_options FOR INSERT
  TO authenticated
  WITH CHECK (true);
