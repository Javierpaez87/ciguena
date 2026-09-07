export type UserRole = 'super_admin' | 'admin' | 'worker';

export type TenantStatus = 'active' | 'inactive';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type EmployeeDirectoryStatus = 'pending' | 'invited' | 'registered' | 'active' | 'inactive';
export type EmployeeDirectorySource = 'csv' | 'manual' | 'email_invite' | 'sap' | 'api' | 'self_register';
export type TrainingStatus = 'active' | 'inactive';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'pending_test' | 'passed' | 'failed' | 'completed' | 'certificate_issued' | 'expired';
export type CertificateStatus = 'valid' | 'expiring_soon' | 'expired';
export type FeedbackType = 'platform' | 'training';
export type ReminderType = 'invitation' | 'training_pending' | 'training_in_progress' | 'certificate_expiring' | 'certificate_expired' | 'certificate_issued';

export type LiveTrainingStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled' | 'closed';

export type LiveMeetingProvider = 'google_meet' | 'microsoft_teams' | 'zoom' | 'other';

export type LiveCalendarProvider = 'google_calendar' | 'microsoft_calendar' | 'none';

export type LiveCalendarStatus = 'pending' | 'created' | 'failed' | 'cancelled' | 'not_required';

export type LiveAttendanceStatus =
  | 'invited'
  | 'on_time'
  | 'late'
  | 'absent'
  | 'invalid_after_event'
  | 'excused_manual';

export type AsyncRecoveryStatus =
  | 'not_required'
  | 'pending_recording'
  | 'available'
  | 'video_seen'
  | 'completed'
  | 'expired';

export type LiveTrainingExamStatus = 'not_required' | 'pending' | 'passed' | 'failed';

export type LiveTrainingCertificationStatus =
  | 'not_eligible'
  | 'eligible'
  | 'pending_exam'
  | 'issued'
  | 'blocked';

export type LiveTrainingCompletionMode = 'live_attendance' | 'async_recovery';

export type LiveTrainingCertificateStatus = 'valid' | 'revoked';

export type VideoProvider = 'bunny' | 'cloudflare' | 'vimeo' | 'youtube' | 'local' | 'external';
export type LessonType = 'video' | 'pdf' | 'text' | 'image' | 'link';
export type TrainingContentType = 'video' | 'youtube' | 'document' | 'external' | 'local_video' | null;

export interface Tenant {
  id: string;
  name: string;
  logo_url: string | null;
  status: TenantStatus;
  created_at: string;
  user_count?: number;
  training_count?: number;
}

export interface Profile {
  id: string;
  tenant_id: string;
  auth_user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  dni?: string | null;
  role: UserRole;
  job_role?: string | null;
  work_role?: string | null;
  position: string | null;
  area: string | null;
  contractor_company: string | null;
  employee_code: string | null;
  status: UserStatus;
  preapproved?: boolean | null;
  requested_admin?: boolean | null;
  source?: string | null;
  created_at: string;
  updated_at?: string | null;
  profile_validated_at?: string | null;
}

export interface EmployeeDirectory {
  id: string;
  tenant_id: string;
  profile_id?: string | null;
  auth_user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  dni?: string | null;
  work_role?: string | null;
  job_role?: string | null;
  position?: string | null;
  area?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  status: EmployeeDirectoryStatus;
  source?: EmployeeDirectorySource | string | null;
  invited_at?: string | null;
  registered_at?: string | null;
  last_synced_at?: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  validity_months: number | null;
  certificate_enabled: boolean;
  passing_score: number;
  max_attempts: number | null;
  status: TrainingStatus;
  created_at: string;
  module_count?: number;
  tenant_count?: number;

  /**
   * Campos opcionales para mostrar o previsualizar el contenido principal
   * desde el catálogo. Más adelante, el consumo real del training puede
   * seguir usando TrainingModule + TrainingLesson.
   */
  content_type?: TrainingContentType;
  content_url?: string | null;
  thumbnail_url?: string | null;
}

export interface TenantTraining {
  id: string;
  tenant_id: string;
  training_id: string;
  enabled: boolean;
  created_at: string;
  training?: Training;
}

export interface TrainingModule {
  id: string;
  training_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  lessons?: TrainingLesson[];
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  lesson_type: LessonType;
  video_provider: VideoProvider | null;
  video_id: string | null;
  video_embed_url: string | null;
  video_thumbnail_url: string | null;
  duration_seconds: number | null;
  resource_url: string | null;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  training_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  order_index: number;
  created_at: string;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  training_id: string;
  user_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  progress_percentage: number;
  assigned_at: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  training?: Training;
  user?: Profile;
}

export interface LiveTraining {
  id: string;
  tenant_id: string;
  created_by: string;

  title: string;
  description: string;

  starts_at: string;
  ends_at: string;
  timezone: string;

  meeting_provider: LiveMeetingProvider;
  meeting_url: string | null;
  meeting_external_id: string | null;

  calendar_provider: LiveCalendarProvider;
  calendar_event_id: string | null;
  calendar_status: LiveCalendarStatus;
  calendar_error: string | null;

  status: LiveTrainingStatus;

  has_exam: boolean;
  certificate_enabled: boolean;
  async_recovery_enabled: boolean;
  late_tolerance_minutes: number;

  recording_url: string | null;
  recording_available_at: string | null;
  recording_due_at: string | null;

  created_at: string;
  updated_at: string | null;

  deleted_at?: string | null;
  deleted_by?: string | null;
  restored_at?: string | null;
  restored_by?: string | null;

  creator?: Profile;
  tenant?: Tenant;
  participants?: LiveTrainingParticipant[];
}

export interface LiveTrainingParticipant {
  id: string;
  tenant_id: string;
  live_training_id: string;
  user_id: string;

  invited_at: string;
  calendar_invite_sent_at: string | null;

  room_opened_at: string | null;
  join_clicked_at: string | null;

  live_attendance_status: LiveAttendanceStatus;
  live_attendance_evaluated_at: string | null;
  live_attendance_overridden_by: string | null;
  live_attendance_override_reason: string | null;

  async_recovery_status: AsyncRecoveryStatus;
  recording_opened_at: string | null;
  recording_seen_at: string | null;

  exam_status: LiveTrainingExamStatus;
  exam_passed_at: string | null;

  certification_status: LiveTrainingCertificationStatus;
  certificate_id: string | null;

  post_event_absence_email_sent_at: string | null;

  created_at: string;
  updated_at: string | null;

  user?: Profile;
  live_training?: LiveTraining;
  certificate?: LiveTrainingCertificate;
}

export interface LiveTrainingLog {
  id: string;
  tenant_id: string | null;
  live_training_id: string;
  user_id: string | null;

  event_type: string;
  metadata: Record<string, unknown> | null;

  created_by: string | null;
  created_at: string;

  user?: Profile;
  live_training?: LiveTraining;
  creator?: Profile;
}

export interface LiveTrainingCertificate {
  id: string;
  tenant_id: string;
  user_id: string;

  live_training_id: string;
  participant_id: string;

  certificate_url: string | null;
  certificate_code: string;

  completion_mode: LiveTrainingCompletionMode;

  issued_at: string;
  status: LiveTrainingCertificateStatus;

  created_at: string;

  user?: Profile;
  live_training?: LiveTraining;
  participant?: LiveTrainingParticipant;
}

export interface LessonProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  training_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_seconds: number;
  completed_at: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  tenant_id: string;
  user_id: string;
  training_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  attempted_at: string;
}

export interface Certificate {
  id: string;
  tenant_id: string;
  user_id: string;
  training_id: string;
  assignment_id: string;
  certificate_url: string | null;
  certificate_code: string;
  worker_signature_url?: string | null;
  company_signature_id?: string | null;
  company_signature_url?: string | null;
  company_signer_name?: string | null;
  company_signer_role?: string | null;
  issued_at: string;
  expires_at: string | null;
  status: CertificateStatus;
  created_at: string;
  training?: Training;
  user?: Profile;
}

export interface EmailReminder {
  id: string;
  tenant_id: string;
  user_id: string;
  training_id: string | null;
  reminder_type: ReminderType;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  tenant_id: string;
  user_id: string;
  training_id: string | null;
  feedback_type: FeedbackType;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Profile;
  training?: Training;
}

export interface ActivityLog {
  id: string;
  tenant_id: string | null;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  full_name: string;
  profile: Profile;
}

export interface EthicsCode {
  id: string;
  tenant_id: string;
  title: string;
  version: string;
  content: string;
  content_hash?: string | null;
  is_active?: boolean;
  created_at?: string;
  created_by?: string | null;
  source?: 'superadmin' | 'admin';
  document_url?: string | null;
  published_at?: string | null;
}

export interface EthicsAcceptance {
  id: string;
  tenant_id: string;
  user_id: string;
  ethics_code_id?: string | null;
  accepted_name?: string | null;
  accepted_document_number?: string | null;
  signature_image_url?: string | null;
  signature_hash?: string | null;
  acceptance_text?: string | null;
  accepted_at?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
}
