export type UserRole = 'super_admin' | 'admin' | 'worker';

export type TenantStatus = 'active' | 'inactive';
export type UserStatus = 'active' | 'inactive';
export type TrainingStatus = 'active' | 'inactive';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'pending_test' | 'passed' | 'failed' | 'completed' | 'certificate_issued' | 'expired';
export type CertificateStatus = 'valid' | 'expiring_soon' | 'expired';
export type FeedbackType = 'platform' | 'training';
export type ReminderType = 'invitation' | 'training_pending' | 'training_in_progress' | 'certificate_expiring' | 'certificate_expired' | 'certificate_issued';
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
  full_name: string;
  email: string;
  role: UserRole;
  position: string | null;
  area: string | null;
  contractor_company: string | null;
  employee_code: string | null;
  status: UserStatus;
  created_at: string;
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
