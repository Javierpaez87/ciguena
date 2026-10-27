-- =====================================================================================
-- CIGÜEÑA · BASELINE DEL ESQUEMA DE PRODUCCIÓN
-- =====================================================================================
-- Capturado: 2026-10-26 22:28 ART desde el proyecto Supabase `ciguena_dev` (rama main,
-- PRODUCCIÓN, Postgres 17) con supabase/scripts/export_production_schema.sql.
-- Incluye el cierre de INSERT en profiles (aplicado 22:17 del mismo día).
--
-- ⚠️  NO EJECUTAR EN PRODUCCIÓN: producción ya está en este estado.
--     Sirve para: (1) que el repo sea la fuente de verdad, (2) recrear el esquema en un
--     proyecto Supabase nuevo/QA, (3) comparar contra futuras exportaciones.
--
-- Contenido: extensiones, tablas, restricciones, índices, funciones, vista, triggers,
-- RLS, políticas (public + storage), permisos de tablas/funciones y buckets de storage.
-- No incluye: datos, schema auth, configuración de Auth/SMTP del dashboard, Realtime,
-- pg_cron, secretos de Vault.
--
-- Todas las migraciones anteriores a esta quedan en supabase/migrations_legacy/
-- como historial (no reconstruyen la base por sí solas).
-- Probado: aplicado sobre una base limpia y re-exportado → resultado idéntico.
-- =====================================================================================

SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE TABLE public.admin_signature_acceptances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  accepted_name text NOT NULL,
  accepted_document_number text,
  acceptance_text text NOT NULL,
  signature_image_url text NOT NULL,
  tenant_signature_id uuid,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.bulk_email_campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  created_by uuid,
  created_by_name text,
  created_by_email text,
  subject text NOT NULL,
  body_text text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb NOT NULL,
  recipient_count integer DEFAULT 0 NOT NULL,
  sent_count integer DEFAULT 0 NOT NULL,
  failed_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'sending'::text NOT NULL,
  include_platform_button boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE TABLE public.bulk_email_recipients (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  profile_id uuid,
  directory_id uuid,
  email text NOT NULL,
  full_name text,
  status text DEFAULT 'pending'::text NOT NULL,
  provider_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assignment_id uuid,
  user_id uuid NOT NULL,
  training_id text NOT NULL,
  tenant_id uuid,
  certificate_code text NOT NULL,
  worker_signature_url text,
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  status text DEFAULT 'valid'::text,
  test_score integer,
  test_attempts_count integer,
  created_at timestamp with time zone DEFAULT now(),
  company_signature_id uuid,
  company_signature_url text,
  company_signer_name text,
  company_signer_role text
);

CREATE TABLE public.email_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  profile_id uuid,
  assignment_id uuid,
  training_id text,
  type text DEFAULT 'training_assignment'::text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.employee_directory (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  source text DEFAULT 'csv'::text NOT NULL,
  external_id text,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  dni text,
  phone text,
  employee_code text,
  work_role text,
  area text,
  "position" text,
  contractor_company text,
  department text,
  supervisor_name text,
  supervisor_email text,
  status text DEFAULT 'preapproved'::text NOT NULL,
  invited_at timestamp with time zone,
  registered_at timestamp with time zone,
  profile_id uuid,
  raw_payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ethics_acceptances (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  ethics_code_id uuid NOT NULL,
  accepted_name text NOT NULL,
  accepted_document_number text,
  signature_image_url text NOT NULL,
  signature_hash text NOT NULL,
  acceptance_text text NOT NULL,
  accepted_at timestamp with time zone DEFAULT now(),
  user_agent text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ethics_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  version text DEFAULT '1.0'::text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  source text DEFAULT 'superadmin'::text NOT NULL,
  document_url text,
  published_at timestamp with time zone
);

CREATE TABLE public.live_training_certificates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  live_training_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  certificate_url text,
  certificate_code text NOT NULL,
  completion_mode text DEFAULT 'live_attendance'::text NOT NULL,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'valid'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.live_training_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  live_training_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  metadata jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.live_training_participants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  live_training_id uuid NOT NULL,
  user_id uuid NOT NULL,
  invited_at timestamp with time zone DEFAULT now() NOT NULL,
  calendar_invite_sent_at timestamp with time zone,
  room_opened_at timestamp with time zone,
  join_clicked_at timestamp with time zone,
  live_attendance_status text DEFAULT 'invited'::text NOT NULL,
  live_attendance_evaluated_at timestamp with time zone,
  live_attendance_overridden_by uuid,
  live_attendance_override_reason text,
  async_recovery_status text DEFAULT 'not_required'::text NOT NULL,
  recording_opened_at timestamp with time zone,
  recording_seen_at timestamp with time zone,
  exam_status text DEFAULT 'not_required'::text NOT NULL,
  exam_passed_at timestamp with time zone,
  certification_status text DEFAULT 'not_eligible'::text NOT NULL,
  certificate_id uuid,
  post_event_absence_email_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.live_trainings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  timezone text DEFAULT 'America/Argentina/Buenos_Aires'::text NOT NULL,
  meeting_provider text DEFAULT 'google_meet'::text NOT NULL,
  meeting_url text,
  meeting_external_id text,
  calendar_provider text DEFAULT 'google_calendar'::text NOT NULL,
  calendar_event_id text,
  calendar_status text DEFAULT 'pending'::text NOT NULL,
  calendar_error text,
  status text DEFAULT 'draft'::text NOT NULL,
  has_exam boolean DEFAULT false NOT NULL,
  certificate_enabled boolean DEFAULT true NOT NULL,
  async_recovery_enabled boolean DEFAULT true NOT NULL,
  late_tolerance_minutes integer DEFAULT 15 NOT NULL,
  recording_url text,
  recording_available_at timestamp with time zone,
  recording_due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  restored_at timestamp with time zone,
  restored_by uuid
);

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  tenant_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text DEFAULT 'worker'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  requested_admin boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  first_name text,
  last_name text,
  "position" text,
  area text,
  employee_code text,
  dni text,
  contractor_company text,
  preapproved boolean DEFAULT false,
  source text DEFAULT 'manual'::text,
  updated_at timestamp with time zone DEFAULT now(),
  job_role text,
  work_role text,
  invited_at timestamp with time zone,
  registered_at timestamp with time zone,
  profile_validated_at timestamp with time zone
);

CREATE TABLE public.support_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  user_id uuid,
  auth_user_id uuid,
  request_type text NOT NULL,
  priority text DEFAULT 'medium'::text NOT NULL,
  source text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  description text NOT NULL,
  attachment_path text,
  attachment_mime_type text,
  attachment_original_name text,
  attachment_original_size bigint,
  attachment_compressed_size bigint,
  status text DEFAULT 'new'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_branding (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  brand_name text DEFAULT 'Cigüeña'::text NOT NULL,
  logo_url text,
  logo_compact_url text,
  logo_negative_url text,
  favicon_url text,
  primary_color text DEFAULT '#F59E0B'::text NOT NULL,
  accent_color text DEFAULT '#FBBF24'::text NOT NULL,
  custom_domain text,
  is_custom_branding boolean DEFAULT false NOT NULL,
  show_powered_by_bondiapps boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid
);

CREATE TABLE public.tenant_domains (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  hostname text NOT NULL,
  domain_type text DEFAULT 'custom'::text NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_onboarding_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  source text NOT NULL,
  onboarding_mode text NOT NULL,
  ethics_code_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_signatures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  admin_user_id uuid,
  signer_name text NOT NULL,
  signer_role text,
  signature_image_url text NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tenant_trainings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  training_id text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  deadline_mode text DEFAULT 'days_after_assignment'::text NOT NULL,
  deadline_days integer DEFAULT 30 NOT NULL,
  certificate_validity_mode text DEFAULT 'inherit'::text NOT NULL,
  certificate_validity_months integer
);

CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  logo_url text,
  slug text
);

CREATE TABLE public.training_assignment_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid,
  assignment_id uuid,
  user_id uuid,
  training_id text NOT NULL,
  event_type text NOT NULL,
  event_detail text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.training_assignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  assigned_by uuid,
  status text DEFAULT 'not_started'::text NOT NULL,
  progress_percentage integer DEFAULT 0 NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  due_date timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  test_score integer,
  test_attempts_count integer,
  test_passed_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL,
  unassigned_at timestamp with time zone,
  unassigned_by uuid,
  reassigned_at timestamp with time zone,
  reassigned_by uuid,
  reassignment_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.training_test_attempt_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid,
  question_id text NOT NULL,
  selected_option text NOT NULL,
  correct_option text NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.training_test_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  assignment_id uuid,
  user_id uuid NOT NULL,
  training_id text NOT NULL,
  test_id text NOT NULL,
  attempt_number integer NOT NULL,
  score integer NOT NULL,
  correct_answers integer NOT NULL,
  total_questions integer NOT NULL,
  passed boolean DEFAULT false NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.training_test_audit_answers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  audit_attempt_id uuid NOT NULL,
  question_id text NOT NULL,
  question_text text NOT NULL,
  options_snapshot jsonb NOT NULL,
  selected_option text NOT NULL,
  correct_option text NOT NULL,
  is_correct boolean NOT NULL,
  question_order integer NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.training_test_audit_attempts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL,
  version_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.training_test_audit_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  test_id text NOT NULL,
  training_id text NOT NULL,
  content_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.worker_signature_consents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  signature_image_url text NOT NULL,
  signature_hash text NOT NULL,
  accepted_name text NOT NULL,
  accepted_document_number text,
  consent_text text NOT NULL,
  consent_version text DEFAULT '1.0'::text NOT NULL,
  profile_snapshot jsonb,
  accepted_at timestamp with time zone DEFAULT now() NOT NULL,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  legacy_ethics_acceptance_id uuid
);

ALTER TABLE public.admin_signature_acceptances ADD CONSTRAINT admin_signature_acceptances_pkey PRIMARY KEY (id);

ALTER TABLE public.bulk_email_campaigns ADD CONSTRAINT bulk_email_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE public.bulk_email_campaigns ADD CONSTRAINT bulk_email_campaigns_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'partial'::text, 'failed'::text])));

ALTER TABLE public.bulk_email_recipients ADD CONSTRAINT bulk_email_recipients_pkey PRIMARY KEY (id);

ALTER TABLE public.bulk_email_recipients ADD CONSTRAINT bulk_email_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])));

ALTER TABLE public.certificates ADD CONSTRAINT certificates_certificate_code_key UNIQUE (certificate_code);

ALTER TABLE public.certificates ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

ALTER TABLE public.email_notifications ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_pkey PRIMARY KEY (id);

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_source_check CHECK ((source = ANY (ARRAY['csv'::text, 'sap'::text, 'api'::text, 'manual'::text])));

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_status_check CHECK ((status = ANY (ARRAY['preapproved'::text, 'invited'::text, 'registered'::text, 'active'::text, 'inactive'::text, 'rejected'::text])));

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_tenant_email_unique UNIQUE (tenant_id, email);

ALTER TABLE public.ethics_acceptances ADD CONSTRAINT ethics_acceptances_pkey PRIMARY KEY (id);

ALTER TABLE public.ethics_acceptances ADD CONSTRAINT ethics_acceptances_user_id_ethics_code_id_key UNIQUE (user_id, ethics_code_id);

ALTER TABLE public.ethics_codes ADD CONSTRAINT ethics_codes_pkey PRIMARY KEY (id);

ALTER TABLE public.ethics_codes ADD CONSTRAINT ethics_codes_source_check CHECK ((source = ANY (ARRAY['superadmin'::text, 'admin'::text])));

ALTER TABLE public.ethics_codes ADD CONSTRAINT ethics_codes_tenant_id_version_key UNIQUE (tenant_id, version);

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_completion_mode_check CHECK ((completion_mode = ANY (ARRAY['live_attendance'::text, 'async_recovery'::text])));

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_participant_id_key UNIQUE (participant_id);

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_pkey PRIMARY KEY (id);

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_status_check CHECK ((status = ANY (ARRAY['valid'::text, 'revoked'::text])));

ALTER TABLE public.live_training_logs ADD CONSTRAINT live_training_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_async_recovery_status_check CHECK ((async_recovery_status = ANY (ARRAY['not_required'::text, 'pending_recording'::text, 'available'::text, 'video_seen'::text, 'completed'::text, 'expired'::text])));

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_certification_status_check CHECK ((certification_status = ANY (ARRAY['not_eligible'::text, 'eligible'::text, 'pending_exam'::text, 'issued'::text, 'blocked'::text])));

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_exam_status_check CHECK ((exam_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'passed'::text, 'failed'::text])));

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_live_attendance_status_check CHECK ((live_attendance_status = ANY (ARRAY['invited'::text, 'on_time'::text, 'late'::text, 'absent'::text, 'invalid_after_event'::text, 'excused_manual'::text])));

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_live_training_id_user_id_key UNIQUE (live_training_id, user_id);

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_pkey PRIMARY KEY (id);

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_calendar_provider_check CHECK ((calendar_provider = ANY (ARRAY['google_calendar'::text, 'microsoft_calendar'::text, 'none'::text])));

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_calendar_status_check CHECK ((calendar_status = ANY (ARRAY['pending'::text, 'created'::text, 'failed'::text, 'cancelled'::text, 'not_required'::text])));

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_late_tolerance_minutes_check CHECK ((late_tolerance_minutes >= 0));

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_meeting_provider_check CHECK ((meeting_provider = ANY (ARRAY['google_meet'::text, 'microsoft_teams'::text, 'zoom'::text, 'other'::text])));

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_pkey PRIMARY KEY (id);

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text, 'closed'::text])));

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_valid_time_range CHECK ((ends_at > starts_at));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'worker'::text])));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'rejected'::text])));

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'high'::text, 'medium'::text, 'low'::text])));

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_request_type_check CHECK ((request_type = ANY (ARRAY['problem'::text, 'suggestion'::text])));

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_source_check CHECK ((source = ANY (ARRAY['platform'::text, 'login'::text, 'register'::text])));

ALTER TABLE public.support_requests ADD CONSTRAINT support_requests_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_review'::text, 'resolved'::text, 'closed'::text])));

ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_custom_domain_key UNIQUE (custom_domain);

ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_tenant_id_key UNIQUE (tenant_id);

ALTER TABLE public.tenant_domains ADD CONSTRAINT tenant_domains_domain_type_check CHECK ((domain_type = ANY (ARRAY['bondiapps'::text, 'custom'::text, 'legacy'::text])));

ALTER TABLE public.tenant_domains ADD CONSTRAINT tenant_domains_hostname_key UNIQUE (hostname);

ALTER TABLE public.tenant_domains ADD CONSTRAINT tenant_domains_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_ethics_mode_check CHECK (((onboarding_mode = 'signature_only'::text) OR (ethics_code_id IS NOT NULL)));

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_onboarding_mode_check CHECK ((onboarding_mode = ANY (ARRAY['signature_only'::text, 'ethics_and_signature'::text])));

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_source_check CHECK ((source = ANY (ARRAY['superadmin'::text, 'admin'::text])));

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_tenant_id_source_key UNIQUE (tenant_id, source);

ALTER TABLE public.tenant_signatures ADD CONSTRAINT tenant_signatures_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_certificate_validity_mode_check CHECK ((certificate_validity_mode = ANY (ARRAY['inherit'::text, 'fixed_months'::text, 'no_expiry'::text])));

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_certificate_validity_months_check CHECK (((certificate_validity_months IS NULL) OR (certificate_validity_months > 0)));

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_deadline_days_check CHECK ((deadline_days > 0));

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_deadline_mode_check CHECK ((deadline_mode = ANY (ARRAY['days_after_assignment'::text, 'no_deadline'::text])));

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_pkey PRIMARY KEY (id);

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_tenant_id_training_id_key UNIQUE (tenant_id, training_id);

ALTER TABLE public.tenants ADD CONSTRAINT tenants_name_key UNIQUE (name);

ALTER TABLE public.tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);

ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));

ALTER TABLE public.training_assignment_events ADD CONSTRAINT training_assignment_events_pkey PRIMARY KEY (id);

ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_tenant_id_training_id_user_id_key UNIQUE (tenant_id, training_id, user_id);

ALTER TABLE public.training_test_attempt_answers ADD CONSTRAINT training_test_attempt_answers_pkey PRIMARY KEY (id);

ALTER TABLE public.training_test_attempts ADD CONSTRAINT training_test_attempts_pkey PRIMARY KEY (id);

ALTER TABLE public.training_test_audit_answers ADD CONSTRAINT training_test_audit_answers_audit_attempt_id_question_id_key UNIQUE (audit_attempt_id, question_id);

ALTER TABLE public.training_test_audit_answers ADD CONSTRAINT training_test_audit_answers_pkey PRIMARY KEY (id);

ALTER TABLE public.training_test_audit_attempts ADD CONSTRAINT training_test_audit_attempts_attempt_id_key UNIQUE (attempt_id);

ALTER TABLE public.training_test_audit_attempts ADD CONSTRAINT training_test_audit_attempts_pkey PRIMARY KEY (id);

ALTER TABLE public.training_test_audit_versions ADD CONSTRAINT training_test_audit_versions_content_hash_check CHECK ((content_hash ~ '^[0-9a-f]{64}$'::text));

ALTER TABLE public.training_test_audit_versions ADD CONSTRAINT training_test_audit_versions_pkey PRIMARY KEY (id);

ALTER TABLE public.training_test_audit_versions ADD CONSTRAINT training_test_audit_versions_test_id_content_hash_key UNIQUE (test_id, content_hash);

ALTER TABLE public.worker_signature_consents ADD CONSTRAINT worker_signature_consents_legacy_ethics_acceptance_id_key UNIQUE (legacy_ethics_acceptance_id);

ALTER TABLE public.worker_signature_consents ADD CONSTRAINT worker_signature_consents_pkey PRIMARY KEY (id);

ALTER TABLE public.admin_signature_acceptances ADD CONSTRAINT admin_signature_acceptances_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.admin_signature_acceptances ADD CONSTRAINT admin_signature_acceptances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.admin_signature_acceptances ADD CONSTRAINT admin_signature_acceptances_tenant_signature_id_fkey FOREIGN KEY (tenant_signature_id) REFERENCES tenant_signatures(id) ON DELETE SET NULL;

ALTER TABLE public.bulk_email_campaigns ADD CONSTRAINT bulk_email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bulk_email_campaigns ADD CONSTRAINT bulk_email_campaigns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.bulk_email_recipients ADD CONSTRAINT bulk_email_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.bulk_email_recipients ADD CONSTRAINT bulk_email_recipients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bulk_email_recipients ADD CONSTRAINT bulk_email_recipients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.certificates ADD CONSTRAINT certificates_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.certificates ADD CONSTRAINT certificates_company_signature_id_fkey FOREIGN KEY (company_signature_id) REFERENCES tenant_signatures(id) ON DELETE SET NULL;

ALTER TABLE public.email_notifications ADD CONSTRAINT email_notifications_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE SET NULL;

ALTER TABLE public.email_notifications ADD CONSTRAINT email_notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.email_notifications ADD CONSTRAINT email_notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.employee_directory ADD CONSTRAINT employee_directory_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.ethics_acceptances ADD CONSTRAINT ethics_acceptances_ethics_code_id_fkey FOREIGN KEY (ethics_code_id) REFERENCES ethics_codes(id) ON DELETE RESTRICT;

ALTER TABLE public.ethics_acceptances ADD CONSTRAINT ethics_acceptances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.ethics_acceptances ADD CONSTRAINT ethics_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ethics_codes ADD CONSTRAINT ethics_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE public.ethics_codes ADD CONSTRAINT ethics_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_live_training_id_fkey FOREIGN KEY (live_training_id) REFERENCES live_trainings(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES live_training_participants(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_certificates ADD CONSTRAINT live_training_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_logs ADD CONSTRAINT live_training_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.live_training_logs ADD CONSTRAINT live_training_logs_live_training_id_fkey FOREIGN KEY (live_training_id) REFERENCES live_trainings(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_logs ADD CONSTRAINT live_training_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_logs ADD CONSTRAINT live_training_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES live_training_certificates(id) ON DELETE SET NULL;

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_live_attendance_overridden_by_fkey FOREIGN KEY (live_attendance_overridden_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_live_training_id_fkey FOREIGN KEY (live_training_id) REFERENCES live_trainings(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.live_training_participants ADD CONSTRAINT live_training_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.live_trainings ADD CONSTRAINT live_trainings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tenant_branding ADD CONSTRAINT tenant_branding_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_domains ADD CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_ethics_code_id_fkey FOREIGN KEY (ethics_code_id) REFERENCES ethics_codes(id) ON DELETE RESTRICT;

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tenant_onboarding_settings ADD CONSTRAINT tenant_onboarding_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_signatures ADD CONSTRAINT tenant_signatures_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tenant_signatures ADD CONSTRAINT tenant_signatures_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tenant_trainings ADD CONSTRAINT tenant_trainings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.training_assignment_events ADD CONSTRAINT training_assignment_events_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.training_assignment_events ADD CONSTRAINT training_assignment_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.training_assignment_events ADD CONSTRAINT training_assignment_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.training_test_attempt_answers ADD CONSTRAINT training_test_attempt_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES training_test_attempts(id) ON DELETE CASCADE;

ALTER TABLE public.training_test_attempts ADD CONSTRAINT training_test_attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.training_test_audit_answers ADD CONSTRAINT training_test_audit_answers_audit_attempt_id_fkey FOREIGN KEY (audit_attempt_id) REFERENCES training_test_audit_attempts(id);

ALTER TABLE public.training_test_audit_attempts ADD CONSTRAINT training_test_audit_attempts_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES training_test_attempts(id);

ALTER TABLE public.training_test_audit_attempts ADD CONSTRAINT training_test_audit_attempts_version_id_fkey FOREIGN KEY (version_id) REFERENCES training_test_audit_versions(id);

ALTER TABLE public.worker_signature_consents ADD CONSTRAINT worker_signature_consents_legacy_ethics_acceptance_id_fkey FOREIGN KEY (legacy_ethics_acceptance_id) REFERENCES ethics_acceptances(id) ON DELETE SET NULL;

ALTER TABLE public.worker_signature_consents ADD CONSTRAINT worker_signature_consents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public.worker_signature_consents ADD CONSTRAINT worker_signature_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_admin_signature_acceptances_admin_user_id ON public.admin_signature_acceptances USING btree (admin_user_id);

CREATE INDEX idx_admin_signature_acceptances_tenant_id ON public.admin_signature_acceptances USING btree (tenant_id);

CREATE INDEX idx_bulk_email_campaigns_tenant_created ON public.bulk_email_campaigns USING btree (tenant_id, created_at DESC);

CREATE INDEX idx_bulk_email_recipients_campaign ON public.bulk_email_recipients USING btree (campaign_id);

CREATE INDEX idx_bulk_email_recipients_tenant_email ON public.bulk_email_recipients USING btree (tenant_id, lower(email));

CREATE INDEX idx_employee_directory_email ON public.employee_directory USING btree (lower(email));

CREATE INDEX idx_employee_directory_profile_id ON public.employee_directory USING btree (profile_id);

CREATE INDEX idx_employee_directory_source ON public.employee_directory USING btree (source);

CREATE INDEX idx_employee_directory_status ON public.employee_directory USING btree (status);

CREATE INDEX idx_employee_directory_tenant_email ON public.employee_directory USING btree (tenant_id, lower(email));

CREATE INDEX idx_employee_directory_tenant_id ON public.employee_directory USING btree (tenant_id);

CREATE INDEX idx_ethics_acceptances_code_id ON public.ethics_acceptances USING btree (ethics_code_id);

CREATE INDEX idx_ethics_acceptances_tenant_id ON public.ethics_acceptances USING btree (tenant_id);

CREATE INDEX idx_ethics_acceptances_user_id ON public.ethics_acceptances USING btree (user_id);

CREATE INDEX idx_ethics_codes_active ON public.ethics_codes USING btree (tenant_id, is_active);

CREATE INDEX idx_ethics_codes_tenant_id ON public.ethics_codes USING btree (tenant_id);

CREATE INDEX idx_ethics_codes_tenant_source ON public.ethics_codes USING btree (tenant_id, source, created_at DESC);

CREATE INDEX idx_live_training_certificates_tenant_id ON public.live_training_certificates USING btree (tenant_id);

CREATE INDEX idx_live_training_certificates_training_id ON public.live_training_certificates USING btree (live_training_id);

CREATE INDEX idx_live_training_certificates_user_id ON public.live_training_certificates USING btree (user_id);

CREATE INDEX idx_live_training_logs_event_type ON public.live_training_logs USING btree (event_type);

CREATE INDEX idx_live_training_logs_training_id ON public.live_training_logs USING btree (live_training_id);

CREATE INDEX idx_live_training_logs_user_id ON public.live_training_logs USING btree (user_id);

CREATE INDEX idx_live_training_participants_async_recovery ON public.live_training_participants USING btree (async_recovery_status);

CREATE INDEX idx_live_training_participants_attendance ON public.live_training_participants USING btree (live_attendance_status);

CREATE INDEX idx_live_training_participants_certification ON public.live_training_participants USING btree (certification_status);

CREATE INDEX idx_live_training_participants_tenant_id ON public.live_training_participants USING btree (tenant_id);

CREATE INDEX idx_live_training_participants_training_id ON public.live_training_participants USING btree (live_training_id);

CREATE INDEX idx_live_training_participants_user_id ON public.live_training_participants USING btree (user_id);

CREATE INDEX idx_live_trainings_calendar_status ON public.live_trainings USING btree (calendar_status);

CREATE INDEX idx_live_trainings_created_by ON public.live_trainings USING btree (created_by);

CREATE INDEX idx_live_trainings_deleted_at ON public.live_trainings USING btree (deleted_at);

CREATE INDEX idx_live_trainings_starts_at ON public.live_trainings USING btree (starts_at);

CREATE INDEX idx_live_trainings_status ON public.live_trainings USING btree (status);

CREATE INDEX idx_live_trainings_tenant_id ON public.live_trainings USING btree (tenant_id);

CREATE INDEX idx_support_requests_created_at ON public.support_requests USING btree (created_at DESC);

CREATE INDEX idx_support_requests_status ON public.support_requests USING btree (status);

CREATE INDEX idx_support_requests_tenant_id ON public.support_requests USING btree (tenant_id);

CREATE INDEX idx_support_requests_user_id ON public.support_requests USING btree (user_id);

CREATE INDEX tenant_domains_tenant_id_idx ON public.tenant_domains USING btree (tenant_id);

CREATE INDEX idx_tenant_onboarding_settings_tenant ON public.tenant_onboarding_settings USING btree (tenant_id, source);

CREATE INDEX ix_test_audit_attempts_assignment ON public.training_test_audit_attempts USING btree (assignment_id);

CREATE INDEX ix_test_audit_versions_test ON public.training_test_audit_versions USING btree (test_id);

CREATE INDEX idx_worker_signature_consents_tenant ON public.worker_signature_consents USING btree (tenant_id, accepted_at DESC);

CREATE INDEX idx_worker_signature_consents_user ON public.worker_signature_consents USING btree (user_id, accepted_at DESC);

CREATE OR REPLACE FUNCTION public.complete_worker_profile_onboarding(p_full_name text, p_dni text, p_employee_code text, p_work_role text, p_phone text, p_area text DEFAULT NULL::text, p_position text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
  v_full_name text := btrim(COALESCE(p_full_name, ''));
  v_dni text := btrim(COALESCE(p_dni, ''));
  v_employee_code text := btrim(COALESCE(p_employee_code, ''));
  v_work_role text := btrim(COALESCE(p_work_role, ''));
  v_phone text := btrim(COALESCE(p_phone, ''));
  v_area text := NULLIF(btrim(COALESCE(p_area, '')), '');
  v_position text := NULLIF(btrim(COALESCE(p_position, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión inválida.';
  END IF;

  IF v_full_name = '' OR v_dni = '' OR v_employee_code = '' OR v_work_role = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'Faltan datos obligatorios del perfil.';
  END IF;

  SELECT p.*
  INTO v_profile
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.role = 'worker'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró un perfil worker asociado a la sesión.';
  END IF;

  UPDATE public.profiles p
  SET
    full_name = v_full_name,
    dni = v_dni,
    employee_code = v_employee_code,
    work_role = v_work_role,
    job_role = v_work_role,
    phone = v_phone,
    area = v_area,
    position = COALESCE(v_position, v_work_role),
    profile_validated_at = v_now
  WHERE p.id = v_profile.id
  RETURNING p.* INTO v_profile;

  -- Sincroniza la nómina existente, ya sea vinculada por profile_id
  -- o todavía identificada solamente por tenant + email.
  UPDATE public.employee_directory ed
  SET
    full_name = v_full_name,
    dni = v_dni,
    employee_code = v_employee_code,
    work_role = v_work_role,
    phone = v_phone,
    area = v_area,
    position = COALESCE(v_position, v_work_role),
    status = 'registered',
    registered_at = COALESCE(ed.registered_at, v_now),
    profile_id = v_profile.id
  WHERE ed.tenant_id = v_profile.tenant_id
    AND (
      ed.profile_id = v_profile.id
      OR lower(ed.email) = lower(v_profile.email)
    );

  RETURN to_jsonb(v_profile);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_default_tenant_branding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tenant_branding (
    tenant_id,
    brand_name,
    primary_color,
    accent_color,
    is_custom_branding,
    show_powered_by_bondiapps
  )
  VALUES (
    NEW.id,
    'Cigüeña',
    '#F59E0B',
    '#FBBF24',
    false,
    true
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.publish_tenant_ethics_code(p_tenant_id uuid, p_source text, p_title text, p_version text, p_content text DEFAULT ''::text, p_document_url text DEFAULT NULL::text)
 RETURNS SETOF ethics_codes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_user_tenant_id uuid;
  v_code_id uuid;
  v_title text := btrim(COALESCE(p_title, ''));
  v_version text := btrim(COALESCE(p_version, ''));
  v_content text := COALESCE(p_content, '');
  v_document_url text := NULLIF(btrim(COALESCE(p_document_url, '')), '');
  v_hash text;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_user_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un perfil activo para el usuario autenticado.';
  END IF;

  IF p_source = 'superadmin' THEN
    IF v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Solo Superadmin puede publicar el Código de Ética default.';
    END IF;

  ELSIF p_source = 'admin' THEN
    IF v_role <> 'admin'
       OR v_user_tenant_id IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Solo el Admin del tenant puede publicar su Código de Ética.';
    END IF;

  ELSE
    RAISE EXCEPTION 'Source inválido.';
  END IF;

  IF v_title = '' THEN
    RAISE EXCEPTION 'Ingresá un título para el Código de Ética.';
  END IF;

  IF v_version = '' THEN
    RAISE EXCEPTION 'Ingresá una versión.';
  END IF;

  IF btrim(v_content) = '' AND v_document_url IS NULL THEN
    RAISE EXCEPTION 'Ingresá el contenido o adjuntá un PDF.';
  END IF;

  v_hash := encode(
    extensions.digest(
      v_content || '|' || COALESCE(v_document_url, ''),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.ethics_codes (
    tenant_id,
    title,
    version,
    content,
    content_hash,
    is_active,
    created_by,
    source,
    document_url,
    published_at,
    created_at
  )
  VALUES (
    p_tenant_id,
    v_title,
    v_version,
    v_content,
    v_hash,
    true,
    v_profile_id,
    p_source,
    v_document_url,
    now(),
    now()
  )
  RETURNING id INTO v_code_id;

  -- Dejar vigente solamente esta versión para este source.
  UPDATE public.ethics_codes
  SET is_active = false
  WHERE tenant_id = p_tenant_id
    AND source = p_source
    AND id <> v_code_id;

  -- IMPORTANTE:
  -- publicar un Código de Ética activa automáticamente
  -- la modalidad ethics_and_signature para ese source.
  INSERT INTO public.tenant_onboarding_settings (
    tenant_id,
    source,
    onboarding_mode,
    ethics_code_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_source,
    'ethics_and_signature',
    v_code_id,
    true,
    v_profile_id,
    v_profile_id,
    now(),
    now()
  )
  ON CONFLICT (tenant_id, source)
  DO UPDATE SET
    onboarding_mode = 'ethics_and_signature',
    ethics_code_id = v_code_id,
    is_active = true,
    updated_by = v_profile_id,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.ethics_codes ec
  WHERE ec.id = v_code_id;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.reset_tenant_onboarding_admin_override()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_tenant_id uuid;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL OR v_role <> 'admin' OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Solo un Admin de tenant puede eliminar su override.';
  END IF;

  DELETE FROM public.tenant_onboarding_settings
  WHERE tenant_id = v_tenant_id
    AND source = 'admin';

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_public_tenant_branding(p_hostname text)
 RETURNS TABLE(tenant_id uuid, tenant_name text, matched_hostname text, brand_name text, logo_url text, logo_compact_url text, logo_negative_url text, favicon_url text, primary_color text, accent_color text, custom_domain text, is_custom_branding boolean, show_powered_by_bondiapps boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hostname text;
  v_tenant_id uuid;
BEGIN
  v_hostname := lower(trim(trailing '.' from btrim(COALESCE(p_hostname, ''))));
  v_hostname := regexp_replace(v_hostname, '^https?://', '');
  v_hostname := split_part(v_hostname, '/', 1);
  v_hostname := split_part(v_hostname, ':', 1);

  IF v_hostname = '' THEN
    RETURN;
  END IF;

  SELECT td.tenant_id
  INTO v_tenant_id
  FROM public.tenant_domains td
  JOIN public.tenants t ON t.id = td.tenant_id
  WHERE td.hostname = v_hostname
    AND td.is_active = true
    AND t.status = 'active'
  ORDER BY td.is_primary DESC, td.updated_at DESC
  LIMIT 1;

  -- Compatibilidad inmediata con filas tenant_branding anteriores al backfill.
  IF v_tenant_id IS NULL THEN
    SELECT tb.tenant_id
    INTO v_tenant_id
    FROM public.tenant_branding tb
    JOIN public.tenants t ON t.id = tb.tenant_id
    WHERE lower(trim(trailing '.' from btrim(COALESCE(tb.custom_domain, '')))) = v_hostname
      AND t.status = 'active'
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    v_hostname,
    tb.brand_name,
    tb.logo_url,
    tb.logo_compact_url,
    tb.logo_negative_url,
    tb.favicon_url,
    tb.primary_color,
    tb.accent_color,
    tb.custom_domain,
    COALESCE(tb.is_custom_branding, false),
    COALESCE(tb.show_powered_by_bondiapps, true)
  FROM public.tenants t
  LEFT JOIN public.tenant_branding tb ON tb.tenant_id = t.id
  WHERE t.id = v_tenant_id
    AND t.status = 'active'
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_tenant_onboarding_setting(p_tenant_id uuid, p_source text, p_mode text, p_ethics_code_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF tenant_onboarding_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_profile_id uuid;
  v_role text;
  v_user_tenant_id uuid;
BEGIN
  SELECT p.id, p.role, p.tenant_id
    INTO v_profile_id, v_role, v_user_tenant_id
  FROM public.profiles p
  WHERE p.auth_user_id = auth.uid()
    AND p.status = 'active'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un perfil activo para el usuario autenticado.';
  END IF;

  IF p_source NOT IN ('superadmin', 'admin') THEN
    RAISE EXCEPTION 'Source inválido.';
  END IF;

  IF p_mode NOT IN ('signature_only', 'ethics_and_signature') THEN
    RAISE EXCEPTION 'Modalidad de onboarding inválida.';
  END IF;

  IF p_source = 'superadmin' THEN
    IF v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Solo Superadmin puede modificar el default de onboarding.';
    END IF;
  ELSE
    IF v_role <> 'admin' OR v_user_tenant_id IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION 'Solo el Admin del tenant puede modificar su override.';
    END IF;
  END IF;

  IF p_mode = 'ethics_and_signature' THEN
    IF p_ethics_code_id IS NULL THEN
      RAISE EXCEPTION 'Seleccioná o publicá un Código de Ética para usar esta modalidad.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.ethics_codes ec
      WHERE ec.id = p_ethics_code_id
        AND ec.tenant_id = p_tenant_id
        AND ec.source = p_source
        AND ec.is_active = true
    ) THEN
      RAISE EXCEPTION 'El Código de Ética seleccionado no pertenece a esta configuración.';
    END IF;
  ELSE
    p_ethics_code_id := NULL;
  END IF;

  RETURN QUERY
  INSERT INTO public.tenant_onboarding_settings (
    tenant_id,
    source,
    onboarding_mode,
    ethics_code_id,
    is_active,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_source,
    p_mode,
    p_ethics_code_id,
    true,
    v_profile_id,
    v_profile_id,
    now(),
    now()
  )
  ON CONFLICT (tenant_id, source)
  DO UPDATE SET
    onboarding_mode = EXCLUDED.onboarding_mode,
    ethics_code_id = EXCLUDED.ethics_code_id,
    is_active = true,
    updated_by = v_profile_id,
    updated_at = now()
  RETURNING *;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_employee_directory_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_live_training_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_tenant_branding_domain_alias()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hostname text;
  v_domain_type text;
BEGIN
  v_hostname := lower(trim(trailing '.' from btrim(COALESCE(NEW.custom_domain, ''))));

  IF v_hostname = '' THEN
    RETURN NEW;
  END IF;

  -- Defensive cleanup in case a URL was pasted instead of a hostname.
  v_hostname := regexp_replace(v_hostname, '^https?://', '');
  v_hostname := split_part(v_hostname, '/', 1);
  v_hostname := split_part(v_hostname, ':', 1);

  v_domain_type := CASE
    WHEN v_hostname LIKE '%.bondiapps.com' THEN 'bondiapps'
    ELSE 'custom'
  END;

  INSERT INTO public.tenant_domains AS td (
    tenant_id,
    hostname,
    domain_type,
    is_primary,
    is_active,
    updated_at
  ) VALUES (
    NEW.tenant_id,
    v_hostname,
    v_domain_type,
    true,
    true,
    now()
  )
  ON CONFLICT (hostname)
  DO UPDATE SET
    is_active = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN true
      ELSE td.is_active
    END,
    is_primary = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN true
      ELSE td.is_primary
    END,
    updated_at = CASE
      WHEN td.tenant_id = EXCLUDED.tenant_id THEN now()
      ELSE td.updated_at
    END;

  -- El custom_domain actual es el preferido, pero no apagamos aliases históricos.
  UPDATE public.tenant_domains
  SET is_primary = (hostname = v_hostname),
      updated_at = now()
  WHERE tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE VIEW public.worker_onboarding_diagnostics AS  SELECT id AS user_id,
    tenant_id,
    email,
    full_name,
    status,
    profile_validated_at,
        CASE
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(full_name, ''::text)), ''::text) IS NULL THEN false
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(dni, ''::text)), ''::text) IS NULL THEN false
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(employee_code, ''::text)), ''::text) IS NULL THEN false
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(work_role, job_role, "position", ''::text)), ''::text) IS NULL THEN false
            WHEN NULLIF(TRIM(BOTH FROM COALESCE(phone, ''::text)), ''::text) IS NULL THEN false
            ELSE true
        END AS required_profile_fields_complete,
    (EXISTS ( SELECT 1
           FROM worker_signature_consents wsc
          WHERE wsc.user_id = p.id)) AS has_signature_consent
   FROM profiles p
  WHERE role = 'worker'::text;

CREATE TRIGGER trg_employee_directory_updated_at BEFORE UPDATE ON public.employee_directory FOR EACH ROW EXECUTE FUNCTION set_employee_directory_updated_at();

CREATE TRIGGER trg_live_training_participants_updated_at BEFORE UPDATE ON public.live_training_participants FOR EACH ROW EXECUTE FUNCTION set_live_training_updated_at();

CREATE TRIGGER trg_live_trainings_updated_at BEFORE UPDATE ON public.live_trainings FOR EACH ROW EXECUTE FUNCTION set_live_training_updated_at();

CREATE TRIGGER tenant_branding_sync_domain_alias AFTER INSERT OR UPDATE OF custom_domain ON public.tenant_branding FOR EACH ROW EXECUTE FUNCTION sync_tenant_branding_domain_alias();

CREATE TRIGGER trigger_create_default_tenant_branding AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION create_default_tenant_branding();

ALTER TABLE public.admin_signature_acceptances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bulk_email_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bulk_email_recipients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employee_directory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ethics_acceptances ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ethics_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_training_certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_training_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_training_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_trainings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_onboarding_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_signatures ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_trainings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_assignment_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_test_attempt_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_test_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_test_audit_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_test_audit_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_test_audit_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.worker_signature_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert own signature acceptances" ON public.admin_signature_acceptances AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))) AND (admin_user_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Admins can read own signature acceptances" ON public.admin_signature_acceptances AS PERMISSIVE FOR SELECT TO authenticated
  USING (((admin_user_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid()))) OR (tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));

CREATE POLICY "Admins can view bulk email campaigns" ON public.bulk_email_campaigns AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles requester
  WHERE ((requester.auth_user_id = auth.uid()) AND (requester.status = 'active'::text) AND ((requester.role = 'super_admin'::text) OR ((requester.role = 'admin'::text) AND (requester.tenant_id = bulk_email_campaigns.tenant_id)))))));

CREATE POLICY "Admins can view bulk email recipients" ON public.bulk_email_recipients AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles requester
  WHERE ((requester.auth_user_id = auth.uid()) AND (requester.status = 'active'::text) AND ((requester.role = 'super_admin'::text) OR ((requester.role = 'admin'::text) AND (requester.tenant_id = bulk_email_recipients.tenant_id)))))));

CREATE POLICY "Admins can read tenant certificates" ON public.certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = certificates.tenant_id) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (p.status = 'active'::text)))));

CREATE POLICY "Users can insert own certificates" ON public.certificates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = certificates.user_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Users can view own certificates" ON public.certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = certificates.user_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Workers can read own certificates" ON public.certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.id = certificates.user_id) AND (p.status = 'active'::text)))));

CREATE POLICY "Admins can insert employee directory" ON public.employee_directory AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = employee_directory.tenant_id) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (p.status = 'active'::text)))));

CREATE POLICY "Admins can select employee directory" ON public.employee_directory AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = employee_directory.tenant_id) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (p.status = 'active'::text)))));

CREATE POLICY "Admins can update employee directory" ON public.employee_directory AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = employee_directory.tenant_id) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (p.status = 'active'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = employee_directory.tenant_id) AND (p.role = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND (p.status = 'active'::text)))));

CREATE POLICY "Authenticated can delete employee_directory" ON public.employee_directory AS PERMISSIVE FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert employee_directory" ON public.employee_directory AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update employee_directory" ON public.employee_directory AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view employee_directory" ON public.employee_directory AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view own ethics acceptances" ON public.ethics_acceptances AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid()))) OR (tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));

CREATE POLICY "Workers can insert own ethics acceptance" ON public.ethics_acceptances AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid()))));

CREATE POLICY "Authorized can publish ethics codes" ON public.ethics_codes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (((p.role = 'super_admin'::text) AND (ethics_codes.source = 'superadmin'::text)) OR ((p.role = 'admin'::text) AND (p.tenant_id = ethics_codes.tenant_id) AND (ethics_codes.source = 'admin'::text)))))));

CREATE POLICY "Tenant users can view relevant ethics codes" ON public.ethics_codes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.tenant_id = ethics_codes.tenant_id) AND ((p.role = 'admin'::text) OR (ethics_codes.is_active = true))))))));

CREATE POLICY "Authenticated can insert live_training_certificates" ON public.live_training_certificates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_training_certificates" ON public.live_training_certificates AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view live_training_certificates" ON public.live_training_certificates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_training_logs" ON public.live_training_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view live_training_logs" ON public.live_training_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete live_training_participants" ON public.live_training_participants AS PERMISSIVE FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_training_participants" ON public.live_training_participants AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_training_participants" ON public.live_training_participants AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view live_training_participants" ON public.live_training_participants AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete live_trainings" ON public.live_trainings AS PERMISSIVE FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert live_trainings" ON public.live_trainings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update live_trainings" ON public.live_trainings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can view live_trainings" ON public.live_trainings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can read own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = auth_user_id));

CREATE POLICY "Users can view own support requests" ON public.support_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'admin'::text) AND (p.tenant_id = support_requests.tenant_id))))))));

CREATE POLICY "Authenticated can view tenant branding" ON public.tenant_branding AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Superadmin can delete tenant branding" ON public.tenant_branding AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));

CREATE POLICY "Superadmin can insert tenant branding" ON public.tenant_branding AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));

CREATE POLICY "Superadmin can update tenant branding" ON public.tenant_branding AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));

CREATE POLICY tenant_domains_superadmin_delete ON public.tenant_domains AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.status = 'active'::text) AND (p.role = 'super_admin'::text)))));

CREATE POLICY tenant_domains_superadmin_insert ON public.tenant_domains AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.status = 'active'::text) AND (p.role = 'super_admin'::text)))));

CREATE POLICY tenant_domains_superadmin_select ON public.tenant_domains AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.status = 'active'::text) AND (p.role = 'super_admin'::text)))));

CREATE POLICY tenant_domains_superadmin_update ON public.tenant_domains AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.status = 'active'::text) AND (p.role = 'super_admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.status = 'active'::text) AND (p.role = 'super_admin'::text)))));

CREATE POLICY "Authenticated can view tenant onboarding settings" ON public.tenant_onboarding_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (((tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE (p.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'super_admin'::text))))));

CREATE POLICY "Superadmin can insert default onboarding settings" ON public.tenant_onboarding_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((source = 'superadmin'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'super_admin'::text))))));

CREATE POLICY "Superadmin can update default onboarding settings" ON public.tenant_onboarding_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((source = 'superadmin'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'super_admin'::text))))))
  WITH CHECK (((source = 'superadmin'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'super_admin'::text))))));

CREATE POLICY "Tenant admin can delete onboarding override" ON public.tenant_onboarding_settings AS PERMISSIVE FOR DELETE TO authenticated
  USING (((source = 'admin'::text) AND (tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "Tenant admin can insert onboarding override" ON public.tenant_onboarding_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((source = 'admin'::text) AND (tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "Tenant admin can update onboarding override" ON public.tenant_onboarding_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((source = 'admin'::text) AND (tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'admin'::text))))))
  WITH CHECK (((source = 'admin'::text) AND (tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "Admins can insert tenant signatures" ON public.tenant_signatures AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))) AND (admin_user_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Admins can read tenant signatures" ON public.tenant_signatures AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));

CREATE POLICY "Admins can update tenant signatures" ON public.tenant_signatures AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
  WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));

CREATE POLICY "Workers can read active default tenant signature" ON public.tenant_signatures AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND (is_default = true) AND (tenant_id IN ( SELECT profiles.tenant_id
   FROM profiles
  WHERE (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Authenticated users can delete tenant_trainings" ON public.tenant_trainings AS PERMISSIVE FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tenant_trainings" ON public.tenant_trainings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read tenant_trainings" ON public.tenant_trainings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update tenant_trainings" ON public.tenant_trainings AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view active tenants" ON public.tenants AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((status = 'active'::text));

CREATE POLICY "Super admins can insert tenants" ON public.tenants AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text) AND (profiles.status = 'active'::text)))));

CREATE POLICY "Super admins can update tenants" ON public.tenants AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text) AND (profiles.status = 'active'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text) AND (profiles.status = 'active'::text)))));

CREATE POLICY "Authenticated users can insert training_assignments" ON public.training_assignments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read training_assignments" ON public.training_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update training_assignments" ON public.training_assignments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert own test attempt answers" ON public.training_test_attempt_answers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (training_test_attempts
     JOIN profiles ON ((profiles.id = training_test_attempts.user_id)))
  WHERE ((training_test_attempts.id = training_test_attempt_answers.attempt_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Users can view own test attempt answers" ON public.training_test_attempt_answers AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (training_test_attempts
     JOIN profiles ON ((profiles.id = training_test_attempts.user_id)))
  WHERE ((training_test_attempts.id = training_test_attempt_answers.attempt_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Users can insert own test attempts" ON public.training_test_attempts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = training_test_attempts.user_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Users can view own test attempts" ON public.training_test_attempts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = training_test_attempts.user_id) AND (profiles.auth_user_id = auth.uid())))));

CREATE POLICY "Users can view relevant worker signatures" ON public.worker_signature_consents AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id IN ( SELECT p.id
   FROM profiles p
  WHERE (p.auth_user_id = auth.uid()))) OR (tenant_id IN ( SELECT p.tenant_id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.role = 'super_admin'::text))))));

CREATE POLICY "Workers can insert own signature consent" ON public.worker_signature_consents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id IN ( SELECT p.id
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND (p.tenant_id = worker_signature_consents.tenant_id)))));

CREATE POLICY "Authenticated can upload signature images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'signature-images'::text));

CREATE POLICY "Authenticated can view signature images" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'signature-images'::text));

CREATE POLICY "Authenticated users can read company signatures" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'company-signatures'::text));

CREATE POLICY "Authenticated users can update company signatures" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'company-signatures'::text))
  WITH CHECK ((bucket_id = 'company-signatures'::text));

CREATE POLICY "Authenticated users can upload company signatures" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'company-signatures'::text));

CREATE POLICY "Authorized can upload ethics documents" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'ethics-documents'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.auth_user_id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'admin'::text) AND ((p.tenant_id)::text = (storage.foldername(objects.name))[1]))))))));

CREATE POLICY "Superadmin can delete tenant branding" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'tenant-branding'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text))))));

CREATE POLICY "Superadmin can update tenant branding" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'tenant-branding'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text))))))
  WITH CHECK (((bucket_id = 'tenant-branding'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text))))));

CREATE POLICY "Superadmin can upload tenant branding" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'tenant-branding'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.auth_user_id = auth.uid()) AND (profiles.role = 'super_admin'::text))))));

REVOKE ALL ON TABLE public.admin_signature_acceptances FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.bulk_email_campaigns FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.bulk_email_recipients FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.certificates FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.email_notifications FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.employee_directory FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.ethics_acceptances FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.ethics_codes FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.live_training_certificates FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.live_training_logs FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.live_training_participants FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.live_trainings FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.support_requests FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenant_branding FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenant_domains FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenant_onboarding_settings FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenant_signatures FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenant_trainings FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.tenants FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_assignment_events FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_assignments FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_test_attempt_answers FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_test_attempts FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_test_audit_answers FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_test_audit_attempts FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.training_test_audit_versions FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.worker_onboarding_diagnostics FROM anon, authenticated, service_role;

REVOKE ALL ON TABLE public.worker_signature_consents FROM anon, authenticated, service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_signature_acceptances TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_signature_acceptances TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_signature_acceptances TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_campaigns TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_campaigns TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_campaigns TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_recipients TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_recipients TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bulk_email_recipients TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.certificates TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.certificates TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.certificates TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.email_notifications TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.email_notifications TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.email_notifications TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.employee_directory TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.employee_directory TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.employee_directory TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_acceptances TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_acceptances TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_acceptances TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_codes TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_codes TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ethics_codes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_certificates TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_certificates TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_certificates TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_logs TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_logs TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_logs TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_participants TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_participants TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_training_participants TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_trainings TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_trainings TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.live_trainings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.support_requests TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.support_requests TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.support_requests TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_branding TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_branding TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_branding TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_domains TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_domains TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_domains TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_onboarding_settings TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_onboarding_settings TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_onboarding_settings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_signatures TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_signatures TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_signatures TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_trainings TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_trainings TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenant_trainings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenants TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenants TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tenants TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignment_events TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignment_events TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignment_events TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignments TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignments TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_assignments TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempt_answers TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempt_answers TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempt_answers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempts TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempts TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_attempts TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_audit_answers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_audit_attempts TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.training_test_audit_versions TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_onboarding_diagnostics TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_onboarding_diagnostics TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_onboarding_diagnostics TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_signature_consents TO anon;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_signature_consents TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.worker_signature_consents TO service_role;

REVOKE ALL ON FUNCTION public.complete_worker_profile_onboarding(p_full_name text, p_dni text, p_employee_code text, p_work_role text, p_phone text, p_area text, p_position text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_default_tenant_branding() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.publish_tenant_ethics_code(p_tenant_id uuid, p_source text, p_title text, p_version text, p_content text, p_document_url text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_training_test_attempt_audited(p_assignment_id uuid, p_test jsonb, p_questions jsonb, p_answers jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.reset_tenant_onboarding_admin_override() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_public_tenant_branding(p_hostname text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_tenant_onboarding_setting(p_tenant_id uuid, p_source text, p_mode text, p_ethics_code_id uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_employee_directory_updated_at() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_live_training_updated_at() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_tenant_branding_domain_alias() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.complete_worker_profile_onboarding(p_full_name text, p_dni text, p_employee_code text, p_work_role text, p_phone text, p_area text, p_position text) TO anon;

GRANT EXECUTE ON FUNCTION public.complete_worker_profile_onboarding(p_full_name text, p_dni text, p_employee_code text, p_work_role text, p_phone text, p_area text, p_position text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.complete_worker_profile_onboarding(p_full_name text, p_dni text, p_employee_code text, p_work_role text, p_phone text, p_area text, p_position text) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_default_tenant_branding() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_default_tenant_branding() TO anon;

GRANT EXECUTE ON FUNCTION public.create_default_tenant_branding() TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_default_tenant_branding() TO service_role;

GRANT EXECUTE ON FUNCTION public.publish_tenant_ethics_code(p_tenant_id uuid, p_source text, p_title text, p_version text, p_content text, p_document_url text) TO anon;

GRANT EXECUTE ON FUNCTION public.publish_tenant_ethics_code(p_tenant_id uuid, p_source text, p_title text, p_version text, p_content text, p_document_url text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.publish_tenant_ethics_code(p_tenant_id uuid, p_source text, p_title text, p_version text, p_content text, p_document_url text) TO service_role;

GRANT EXECUTE ON FUNCTION public.record_training_test_attempt_audited(p_assignment_id uuid, p_test jsonb, p_questions jsonb, p_answers jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_training_test_attempt_audited(p_assignment_id uuid, p_test jsonb, p_questions jsonb, p_answers jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.reset_tenant_onboarding_admin_override() TO anon;

GRANT EXECUTE ON FUNCTION public.reset_tenant_onboarding_admin_override() TO authenticated;

GRANT EXECUTE ON FUNCTION public.reset_tenant_onboarding_admin_override() TO service_role;

GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_branding(p_hostname text) TO anon;

GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_branding(p_hostname text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_branding(p_hostname text) TO service_role;

GRANT EXECUTE ON FUNCTION public.save_tenant_onboarding_setting(p_tenant_id uuid, p_source text, p_mode text, p_ethics_code_id uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.save_tenant_onboarding_setting(p_tenant_id uuid, p_source text, p_mode text, p_ethics_code_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_tenant_onboarding_setting(p_tenant_id uuid, p_source text, p_mode text, p_ethics_code_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_employee_directory_updated_at() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_employee_directory_updated_at() TO anon;

GRANT EXECUTE ON FUNCTION public.set_employee_directory_updated_at() TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_employee_directory_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.set_live_training_updated_at() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_live_training_updated_at() TO anon;

GRANT EXECUTE ON FUNCTION public.set_live_training_updated_at() TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_live_training_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_tenant_branding_domain_alias() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_tenant_branding_domain_alias() TO anon;

GRANT EXECUTE ON FUNCTION public.sync_tenant_branding_domain_alias() TO authenticated;

GRANT EXECUTE ON FUNCTION public.sync_tenant_branding_domain_alias() TO service_role;

INSERT INTO storage.buckets (id, name, public) VALUES ('company-signatures', 'company-signatures', 't') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('ethics-documents', 'ethics-documents', 't') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('signature-images', 'signature-images', 't') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', 'f') ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-branding', 'tenant-branding', 't') ON CONFLICT (id) DO NOTHING;
