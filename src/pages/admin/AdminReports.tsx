// AdminReports.tsx · v3 real · reportes ejecutivos conectados a Supabase
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  Building,
  CalendarClock,
  CheckCircle,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  ChevronRight,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { getBrandSlug } from '../../lib/brandIdentity';
import { supabase } from '../../lib/supabase';
import CsvExportModal, { CsvExportColumn } from '../../components/ui/CsvExportModal';
import MetricDetailModal, { MetricDetailColumn } from '../../components/ui/MetricDetailModal';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  EmployeeDirectoryRecord,
  mergeProfilesWithDirectory,
} from '../../lib/workerRoster';
import {
  WORKER_FILTER_DEFINITIONS,
  filterWorkersByCriterion,
  getWorkerFilterDefinition,
  getWorkerFilterOptions,
  type WorkerFilterKey,
} from '../../lib/workerFilters';

type ReportType = 'user' | 'training' | 'area' | 'live';
type Accent = 'brand' | 'amber' | 'blue' | 'green' | 'red' | 'steel';
type ReportExportRow = Record<string, string | number | null | undefined>;

interface ChartItem {
  label: string;
  value: number;
  className: string;
}

interface ReportMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent: Accent;
  chartType: 'donut' | 'bar' | 'spark';
  chartValue: number;
  onClick?: () => void;
}

type ReportDetailKey =
  | 'completion'
  | 'avgProgress'
  | 'certificateRisk'
  | 'liveAttendance'
  | 'users';

interface Profile {
  id: string;
  tenant_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  position?: string | null;
  area?: string | null;
  work_role?: string | null;
  job_role?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  base?: string | null;
  site?: string | null;
  region?: string | null;
  oilfield?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  dni?: string | null;
  status?: string | null;
  [key: string]: any;
}

interface TenantTraining {
  id?: string;
  tenant_id?: string | null;
  training_id?: string | null;
  title?: string | null;
  name?: string | null;
  training_title?: string | null;
  category?: string | null;
  [key: string]: any;
}

interface Assignment {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_training_id?: string | null;
  status?: string | null;
  progress_percentage?: number | null;
  progress?: number | null;
  completion_percentage?: number | null;
  assigned_at?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

interface Certificate {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_training_id?: string | null;
  assignment_id?: string | null;
  certificate_code?: string | null;
  code?: string | null;
  status?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

interface LiveTraining {
  id: string;
  tenant_id?: string | null;
  title?: string | null;
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  calendar_status?: string | null;
  meeting_url?: string | null;
  deleted_at?: string | null;
  [key: string]: any;
}

interface LiveTrainingParticipant {
  id: string;
  tenant_id?: string | null;
  live_training_id?: string | null;
  user_id?: string | null;
  live_attendance_status?: string | null;
  certification_status?: string | null;
  room_opened_at?: string | null;
  join_clicked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: Profile | null;
  live_training?: LiveTraining | null;
  [key: string]: any;
}

const accentStyles: Record<Accent, { icon: string; bar: string; ring: string }> = {
  brand: {
    icon: 'brand-icon-surface',
    bar: 'brand-bg',
    ring: 'brand-text',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    bar: 'bg-amber-400',
    ring: 'text-amber-400',
  },
  blue: {
    icon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    bar: 'bg-blue-400',
    ring: 'text-blue-400',
  },
  green: {
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    bar: 'bg-emerald-400',
    ring: 'text-emerald-400',
  },
  red: {
    icon: 'bg-red-500/10 text-red-400 border-red-500/20',
    bar: 'bg-red-400',
    ring: 'text-red-400',
  },
  steel: {
    icon: 'bg-steel-700 text-steel-300 border-steel-600',
    bar: 'bg-steel-400',
    ring: 'text-steel-400',
  },
};

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR');
}

function hasLiveAttendanceEvidence(participant: LiveTrainingParticipant) {
  const status = normalize(participant.live_attendance_status);
  return status === 'on_time' || status === 'late' || Boolean(participant.join_clicked_at);
}

function isLiveParticipantPending(participant: LiveTrainingParticipant) {
  const status = normalize(participant.live_attendance_status);
  return status === 'invited' && !participant.join_clicked_at;
}

function getLiveAttendanceLabel(participant: LiveTrainingParticipant) {
  const status = normalize(participant.live_attendance_status);
  if (status === 'on_time') return 'Asistió a horario';
  if (status === 'late') return 'Asistió tarde';
  if (status === 'absent' || status === 'invalid_after_event') return 'Ausente';
  if (status === 'invited' && !participant.join_clicked_at) return 'Invitado / pendiente';
  if (participant.join_clicked_at) return 'Click Meet registrado';
  return participant.live_attendance_status || 'Sin registro';
}


function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function getFullName(profile?: Profile | null) {
  if (!profile) return 'Usuario sin nombre';

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Usuario sin nombre'
  );
}

function isAdminUser(profile: Profile) {
  const role = normalize(profile.role);
  return role === 'admin' || role === 'superadmin' || role === 'super_admin';
}

function getTrainingTitle(training?: TenantTraining | null, item?: Assignment | Certificate | null) {
  return (
    training?.title ||
    training?.training_title ||
    training?.name ||
    item?.training_title ||
    item?.training_name ||
    item?.training_id ||
    'Training sin título'
  );
}

function getTrainingCategory(training?: TenantTraining | null) {
  return training?.category || training?.type || training?.vertical || '—';
}

function getAssignmentProgress(assignment: Assignment) {
  const directProgress =
    assignment.progress_percentage ??
    assignment.progress ??
    assignment.completion_percentage ??
    null;

  if (typeof directProgress === 'number') {
    return clampPercent(directProgress);
  }

  const status = normalize(assignment.status);

  if (['completed', 'passed', 'certificate_issued', 'approved'].includes(status)) return 100;
  if (['in_progress', 'started', 'pending_test'].includes(status)) return 50;

  return 0;
}

function getCertificateStatus(certificate: Certificate) {
  const status = normalize(certificate.status);

  if (status === 'valid' || status === 'vigente') return 'valid';
  if (status === 'expiring_soon' || status === 'por_vencer') return 'expiring_soon';
  if (status === 'expired' || status === 'vencido') return 'expired';

  if (!certificate.expires_at) return status || 'valid';

  const expiresAt = new Date(certificate.expires_at).getTime();

  if (Number.isNaN(expiresAt)) return status || 'valid';

  const now = Date.now();
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;

  if (expiresAt < now) return 'expired';
  if (expiresAt <= now + thirtyDays) return 'expiring_soon';

  return 'valid';
}

function sortByDateDesc<T extends { created_at?: string | null; updated_at?: string | null; issued_at?: string | null; assigned_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.issued_at || a.assigned_at || a.created_at || a.updated_at || '').getTime();
    const dateB = new Date(b.issued_at || b.assigned_at || b.created_at || b.updated_at || '').getTime();

    return dateB - dateA;
  });
}

function MiniChart({
  type,
  value,
  accent,
}: {
  type: ReportMetricCardProps['chartType'];
  value: number;
  accent: Accent;
}) {
  const safeValue = clampPercent(value);
  const styles = accentStyles[accent];
  const circumference = 100.53;
  const dash = (safeValue / 100) * circumference;
  const sparkBars = [28, 42, 58, 51, 74, safeValue || 8];

  if (type === 'donut') {
    return (
      <div className="relative h-16 w-16 flex-shrink-0">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-steel-800"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            className={styles.ring}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-steel-200">
          {safeValue}%
        </div>
      </div>
    );
  }

  if (type === 'spark') {
    return (
      <div className="flex h-14 w-20 items-end gap-1.5 rounded-xl bg-steel-950/40 px-2 py-2">
        {sparkBars.map((bar, index) => (
          <div key={index} className="flex-1 rounded-full bg-steel-700 overflow-hidden">
            <div
              className={`w-full rounded-full ${styles.bar}`}
              style={{ height: `${clampPercent(bar)}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-20">
      <div className="mb-1 flex items-center justify-between text-[10px] text-steel-500">
        <span>avance</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function ReportMetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  chartType,
  chartValue,
  onClick,
}: ReportMetricCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${styles.icon}`}
        >
          {icon}
        </div>
        <MiniChart type={chartType} value={chartValue} accent={accent} />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold leading-tight text-steel-100">{value}</div>
        <div className="mt-1 text-sm font-medium text-steel-300 leading-snug">{title}</div>
        <div className="mt-1 text-xs text-steel-500 leading-snug">{subtitle}</div>
        {onClick && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium brand-text">
            Ver detalle
            <ChevronRight size={14} />
          </div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="card p-4 min-h-[160px] w-full flex flex-col justify-between text-left transition-colors hover:border-steel-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-steel-950 focus:ring-[var(--brand-accent)]"
      >
        {content}
      </button>
    );
  }

  return <div className="card p-4 min-h-[160px] flex flex-col justify-between">{content}</div>;
}

function DonutChart({
  items,
  centerLabel,
  centerValue,
}: {
  items: ChartItem[];
  centerLabel: string;
  centerValue: string | number;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative h-32 w-32 flex-shrink-0 rounded-full bg-steel-800">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            className="text-steel-800"
          />
          {items.map((item) => {
            const dash = total ? (item.value / total) * 282.74 : 0;
            const offset = 282.74 - accumulated;
            accumulated += dash;

            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="18"
                strokeDasharray={`${dash} ${282.74 - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={item.className}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full px-3 text-center">
          <div className="text-2xl font-bold leading-none text-steel-100">{centerValue}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-steel-500">
            {centerLabel}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-3 min-w-0">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${item.className.replace(
                  'text-',
                  'bg-'
                )}`}
              />
              <span className="text-sm text-steel-300 truncate">{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-steel-100 whitespace-nowrap">
              {item.value}{' '}
              <span className="text-xs font-normal text-steel-500">
                ({percent(item.value, total)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalReportBars({
  items,
}: {
  items: Array<{ label: string; value: number; meta?: string; accent?: Accent }>;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <div className="text-sm text-steel-500">Todavía no hay datos para mostrar.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const styles = accentStyles[item.accent ?? 'amber'];
        const width = Math.max(5, percent(item.value, maxValue));

        return (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <span className="text-sm text-steel-300 truncate block">{item.label}</span>
                {item.meta && <span className="text-xs text-steel-500">{item.meta}</span>}
              </div>
              <span className="text-sm font-semibold text-steel-100 whitespace-nowrap">
                {item.value}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
              <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReports() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const brandSlug = getBrandSlug(branding);
  const tenantId = user?.tenant_id;

  const [reportType, setReportType] = useState<ReportType>('user');
  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<LiveTraining[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<LiveTrainingParticipant[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [workerFilterKey, setWorkerFilterKey] = useState<WorkerFilterKey>('work_role');
  const [workerFilterValue, setWorkerFilterValue] = useState('all');
  const [detailKey, setDetailKey] = useState<ReportDetailKey | null>(null);

  async function loadReportsData() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [
        usersResult,
        directoryResult,
        assignmentsResult,
        certificatesResult,
        trainingsResult,
        liveTrainingsResult,
        liveParticipantsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('employee_directory').select('*').eq('tenant_id', tenantId),
        supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
        supabase.from('certificates').select('*').eq('tenant_id', tenantId),
        supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
        supabase.from('live_trainings').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('live_training_participants').select('*').eq('tenant_id', tenantId),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (directoryResult.error) throw directoryResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;
      if (trainingsResult.error) throw trainingsResult.error;
      if (liveTrainingsResult.error) throw liveTrainingsResult.error;
      if (liveParticipantsResult.error) throw liveParticipantsResult.error;

      const rawUsers = (usersResult.data ?? []) as Profile[];
      const directoryRows = (directoryResult.data ?? []) as EmployeeDirectoryRecord[];
      const loadedUsers = mergeProfilesWithDirectory(rawUsers as any, directoryRows) as Profile[];
      const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];
      const loadedCertificatesRaw = (certificatesResult.data ?? []) as Certificate[];
      const loadedTrainings = (trainingsResult.data ?? []) as TenantTraining[];
      const loadedLiveTrainings = (liveTrainingsResult.data ?? []) as LiveTraining[];
      const loadedLiveParticipantsRaw = (liveParticipantsResult.data ?? []) as LiveTrainingParticipant[];

      const usersById = new Map<string, Profile>();
      loadedUsers.forEach((profile) => {
        if (profile.id) usersById.set(profile.id, profile);
      });

      const trainingsByAnyId = new Map<string, TenantTraining>();
      loadedTrainings.forEach((training) => {
        if (training.id) trainingsByAnyId.set(training.id, training);
        if (training.training_id) trainingsByAnyId.set(training.training_id, training);
      });

      const hydratedAssignments = loadedAssignmentsRaw.map((assignment) => {
        const trainingKey =
          assignment.tenant_training_id ||
          assignment.training_id ||
          assignment.training_key ||
          assignment.training_slug;

        return {
          ...assignment,
          user: assignment.user_id ? usersById.get(assignment.user_id) ?? null : null,
          training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
          progress_percentage: getAssignmentProgress(assignment),
        };
      });

      const hydratedCertificates = loadedCertificatesRaw.map((certificate) => {
        const trainingKey =
          certificate.tenant_training_id ||
          certificate.training_id ||
          certificate.training_key ||
          certificate.training_slug;

        return {
          ...certificate,
          user: certificate.user_id ? usersById.get(certificate.user_id) ?? null : null,
          training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
          status: getCertificateStatus(certificate),
        };
      });

      const liveTrainingsById = new Map<string, LiveTraining>();
      loadedLiveTrainings.forEach((training) => {
        if (training.id) liveTrainingsById.set(training.id, training);
      });

      const hydratedLiveParticipants = loadedLiveParticipantsRaw.map((participant) => ({
        ...participant,
        user: participant.user_id ? usersById.get(participant.user_id) ?? null : null,
        live_training: participant.live_training_id
          ? liveTrainingsById.get(participant.live_training_id) ?? null
          : null,
      }));

      setUsers(
        loadedUsers.sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );
      setAssignments(sortByDateDesc(hydratedAssignments));
      setCertificates(sortByDateDesc(hydratedCertificates));
      setLiveTrainings(sortByDateDesc(loadedLiveTrainings));
      setLiveParticipants(sortByDateDesc(hydratedLiveParticipants));
    } catch (error) {
      console.error('Error loading reports:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los reportes desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReportsData();
  }, [tenantId]);

  const completedStatuses = ['certificate_issued', 'completed', 'passed', 'approved'];

  const workerFilterOptions = useMemo(
    () => getWorkerFilterOptions(users as any, workerFilterKey),
    [users, workerFilterKey]
  );

  const filteredUsers = useMemo(
    () =>
      workerFilterValue === 'all'
        ? users
        : (filterWorkersByCriterion(users as any, workerFilterKey, [workerFilterValue]) as Profile[]),
    [users, workerFilterKey, workerFilterValue]
  );

  const filteredUserIds = useMemo(
    () => new Set(filteredUsers.map((profile) => profile.id).filter(Boolean)),
    [filteredUsers]
  );

  const filteredAssignments = useMemo(
    () =>
      workerFilterValue === 'all'
        ? assignments
        : assignments.filter(
            (assignment) => assignment.user_id && filteredUserIds.has(assignment.user_id)
          ),
    [assignments, filteredUserIds, workerFilterValue]
  );

  const filteredCertificates = useMemo(
    () =>
      workerFilterValue === 'all'
        ? certificates
        : certificates.filter(
            (certificate) => certificate.user_id && filteredUserIds.has(certificate.user_id)
          ),
    [certificates, filteredUserIds, workerFilterValue]
  );

  const filteredLiveParticipants = useMemo(
    () =>
      workerFilterValue === 'all'
        ? liveParticipants
        : liveParticipants.filter(
            (participant) => participant.user_id && filteredUserIds.has(participant.user_id)
          ),
    [liveParticipants, filteredUserIds, workerFilterValue]
  );

  const filteredLiveTrainingIds = useMemo(
    () =>
      new Set(
        filteredLiveParticipants
          .map((participant) => participant.live_training_id)
          .filter((value): value is string => Boolean(value))
      ),
    [filteredLiveParticipants]
  );

  const filteredLiveTrainings = useMemo(
    () =>
      workerFilterValue === 'all'
        ? liveTrainings
        : liveTrainings.filter((training) => filteredLiveTrainingIds.has(training.id)),
    [liveTrainings, filteredLiveTrainingIds, workerFilterValue]
  );

  const activeFilterSummary =
    workerFilterValue === 'all'
      ? 'Empresa completa'
      : `${getWorkerFilterDefinition(workerFilterKey).label}: ${workerFilterValue}`;

  const reports = useMemo(() => {
    const completedAssignmentRows = filteredAssignments.filter((assignment) =>
      completedStatuses.includes(normalize(assignment.status))
    );

    const inProgressAssignmentRows = filteredAssignments.filter((assignment) =>
      ['in_progress', 'started'].includes(normalize(assignment.status))
    );

    const pendingAssignmentRows = filteredAssignments.filter((assignment) =>
      ['not_started', 'pending', 'assigned'].includes(normalize(assignment.status))
    );

    const pendingTestAssignmentRows = filteredAssignments.filter(
      (assignment) => normalize(assignment.status) === 'pending_test'
    );

    const failedAssignmentRows = filteredAssignments.filter((assignment) =>
      ['failed', 'reproved', 'reprobado'].includes(normalize(assignment.status))
    );

    const completedAssignments = completedAssignmentRows.length;
    const inProgressAssignments = inProgressAssignmentRows.length;
    const pendingAssignments = pendingAssignmentRows.length;
    const pendingTestAssignments = pendingTestAssignmentRows.length;
    const failedAssignments = failedAssignmentRows.length;

    const avgProgress = filteredAssignments.length
      ? Math.round(
          filteredAssignments.reduce((sum, assignment) => sum + getAssignmentProgress(assignment), 0) /
            filteredAssignments.length
        )
      : 0;

    const completionRate = percent(completedAssignments, filteredAssignments.length);

    const validCertificateRows = filteredCertificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'valid'
    );

    const expiringSoonCertificateRows = filteredCertificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'expiring_soon'
    );

    const expiredCertificateRows = filteredCertificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'expired'
    );

    const validCerts = validCertificateRows.length;
    const expiringSoonCerts = expiringSoonCertificateRows.length;
    const expiredCerts = expiredCertificateRows.length;
    const certificateRiskRows = filteredCertificates.filter(
      (certificate) => getCertificateStatus(certificate) !== 'valid'
    );

    const certificateRiskRate = percent(
      expiringSoonCerts + expiredCerts,
      Math.max(filteredCertificates.length, 1)
    );

    const userReport = filteredUsers.map((profile) => {
      const userAssignments = filteredAssignments.filter((assignment) => assignment.user_id === profile.id);
      const userCerts = filteredCertificates.filter((certificate) => certificate.user_id === profile.id);

      const completed = userAssignments.filter((assignment) =>
        completedStatuses.includes(normalize(assignment.status))
      ).length;

      return {
        id: profile.id,
        name: getFullName(profile),
        position: profile.position,
        area: profile.area || 'Sin área',
        contractor: profile.contractor_company,
        total: userAssignments.length,
        completed,
        inProgress: userAssignments.filter((assignment) =>
          ['in_progress', 'started'].includes(normalize(assignment.status))
        ).length,
        pending: userAssignments.filter((assignment) =>
          ['not_started', 'pending', 'assigned'].includes(normalize(assignment.status))
        ).length,
        certificates: userCerts.length,
        avgProgress: userAssignments.length
          ? Math.round(
              userAssignments.reduce(
                (sum, assignment) => sum + getAssignmentProgress(assignment),
                0
              ) / userAssignments.length
            )
          : 0,
      };
    });

    const trainingIds = Array.from(
      new Set(
        filteredAssignments
          .map(
            (assignment) =>
              assignment.tenant_training_id || assignment.training_id || assignment.training?.id
          )
          .filter(Boolean)
      )
    );

    const trainingReport = trainingIds.map((trainingId) => {
      const trainingAssignments = filteredAssignments.filter((assignment) => {
        const assignmentTrainingId =
          assignment.tenant_training_id || assignment.training_id || assignment.training?.id;

        return assignmentTrainingId === trainingId;
      });

      const training = trainingAssignments.find((assignment) => assignment.training)?.training;

      return {
        id: String(trainingId),
        name: getTrainingTitle(training, trainingAssignments[0]),
        category: getTrainingCategory(training),
        assigned: trainingAssignments.length,
        completed: trainingAssignments.filter((assignment) =>
          completedStatuses.includes(normalize(assignment.status))
        ).length,
        inProgress: trainingAssignments.filter((assignment) =>
          ['in_progress', 'started'].includes(normalize(assignment.status))
        ).length,
        pending: trainingAssignments.filter((assignment) =>
          ['not_started', 'pending', 'assigned'].includes(normalize(assignment.status))
        ).length,
        failed: trainingAssignments.filter((assignment) =>
          ['failed', 'reproved', 'reprobado'].includes(normalize(assignment.status))
        ).length,
        avgProgress: trainingAssignments.length
          ? Math.round(
              trainingAssignments.reduce(
                (sum, assignment) => sum + getAssignmentProgress(assignment),
                0
              ) / trainingAssignments.length
            )
          : 0,
      };
    });

    const areaNames = Array.from(new Set(filteredUsers.map((profile) => profile.area || 'Sin área')));

    const areaReport = areaNames.map((area) => {
      const areaUsers = filteredUsers.filter((profile) => (profile.area || 'Sin área') === area);
      const areaUserIds = new Set(areaUsers.map((profile) => profile.id));
      const areaAssignments = filteredAssignments.filter(
        (assignment) => assignment.user_id && areaUserIds.has(assignment.user_id)
      );

      const completed = areaAssignments.filter((assignment) =>
        completedStatuses.includes(normalize(assignment.status))
      ).length;

      const progress = areaAssignments.length
        ? Math.round(
            areaAssignments.reduce(
              (sum, assignment) => sum + getAssignmentProgress(assignment),
              0
            ) / areaAssignments.length
          )
        : 0;

      return {
        name: area,
        users: areaUsers.length,
        assignments: areaAssignments.length,
        completed,
        pending: areaAssignments.filter((assignment) =>
          ['not_started', 'pending', 'assigned'].includes(normalize(assignment.status))
        ).length,
        completion: percent(completed, areaAssignments.length),
        progress,
      };
    });

    const liveTrainingReport = filteredLiveTrainings.map((training) => {
      const trainingParticipants = filteredLiveParticipants.filter(
        (participant) => participant.live_training_id === training.id
      );
      const attended = trainingParticipants.filter(hasLiveAttendanceEvidence).length;
      const absent = trainingParticipants.filter((participant) =>
        ['absent', 'invalid_after_event'].includes(normalize(participant.live_attendance_status))
      ).length;
      const invited = trainingParticipants.filter(isLiveParticipantPending).length;

      return {
        id: training.id,
        name: training.title || 'Capacitación en vivo',
        status: training.status || 'draft',
        calendarStatus: training.calendar_status || 'pending',
        startsAt: training.starts_at || '',
        participants: trainingParticipants.length,
        attended,
        absent,
        invited,
        attendanceRate: percent(attended, trainingParticipants.length),
      };
    });

    const liveAttendedRows = filteredLiveParticipants.filter(hasLiveAttendanceEvidence);
    const liveAttended = liveAttendedRows.length;
    const liveAttendanceRate = percent(liveAttended, filteredLiveParticipants.length);

    const criticalUsers = [...userReport]
      .filter((report) => report.total > 0)
      .sort((a, b) => a.avgProgress - b.avgProgress)
      .slice(0, 5);

    const criticalTrainings = [...trainingReport]
      .filter((report) => report.assigned > 0)
      .sort((a, b) => a.avgProgress - b.avgProgress)
      .slice(0, 5);

    const expiringCertificates = filteredCertificates
      .filter((certificate) => getCertificateStatus(certificate) !== 'valid')
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.expires_at || a.created_at || '').getTime();
        const dateB = new Date(b.expires_at || b.created_at || '').getTime();

        return dateA - dateB;
      })
      .slice(0, 5);

    const statusItems: ChartItem[] = [
      { label: 'Completados', value: completedAssignments, className: 'text-emerald-400' },
      { label: 'En curso', value: inProgressAssignments, className: 'text-blue-400' },
      { label: 'Pendientes', value: pendingAssignments, className: 'text-slate-500' },
      { label: 'Pend. examen', value: pendingTestAssignments, className: 'text-amber-400' },
      { label: 'Fallidos', value: failedAssignments, className: 'text-red-400' },
    ];

    const certItems: ChartItem[] = [
      { label: 'Vigentes', value: validCerts, className: 'text-emerald-400' },
      { label: 'Próx. a vencer', value: expiringSoonCerts, className: 'text-amber-400' },
      { label: 'Vencidos', value: expiredCerts, className: 'text-red-400' },
    ];

    return {
      completedAssignments,
      inProgressAssignments,
      pendingAssignments,
      pendingTestAssignments,
      failedAssignments,
      avgProgress,
      completionRate,
      validCerts,
      expiringSoonCerts,
      expiredCerts,
      completedAssignmentRows,
      inProgressAssignmentRows,
      pendingAssignmentRows,
      pendingTestAssignmentRows,
      failedAssignmentRows,
      validCertificateRows,
      expiringSoonCertificateRows,
      expiredCertificateRows,
      certificateRiskRows,
      liveAttendedRows,
      certificateRiskRate,
      userReport,
      trainingReport,
      areaReport,
      liveTrainingReport,
      liveAttended,
      liveAttendanceRate,
      criticalUsers,
      criticalTrainings,
      expiringCertificates,
      statusItems,
      certItems,
    };
  }, [
    filteredUsers,
    filteredAssignments,
    filteredCertificates,
    filteredLiveTrainings,
    filteredLiveParticipants,
  ]);

  const detailModalConfig = useMemo(() => {
    if (!detailKey) return null;

    const assignmentColumns: MetricDetailColumn<Assignment>[] = [
      {
        key: 'worker',
        label: 'Trabajador',
        render: (assignment) => (
          <div>
            <div className="font-medium text-steel-100">{getFullName(assignment.user)}</div>
            <div className="text-xs text-steel-500">{assignment.user?.email || '—'}</div>
          </div>
        ),
      },
      {
        key: 'training',
        label: 'Training',
        render: (assignment) => getTrainingTitle(assignment.training, assignment),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (assignment) => <StatusBadge status={assignment.status || 'assigned'} />,
      },
      {
        key: 'progress',
        label: 'Avance',
        render: (assignment) => `${getAssignmentProgress(assignment)}%`,
      },
      {
        key: 'due',
        label: 'Deadline',
        render: (assignment) => formatDate(assignment.due_date),
      },
    ];

    const certificateColumns: MetricDetailColumn<Certificate>[] = [
      {
        key: 'worker',
        label: 'Trabajador',
        render: (certificate) => (
          <div>
            <div className="font-medium text-steel-100">{getFullName(certificate.user)}</div>
            <div className="text-xs text-steel-500">{certificate.user?.email || '—'}</div>
          </div>
        ),
      },
      {
        key: 'training',
        label: 'Training / certificado',
        render: (certificate) => getTrainingTitle(certificate.training, certificate),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (certificate) => <StatusBadge status={getCertificateStatus(certificate)} />,
      },
      {
        key: 'issued',
        label: 'Emitido',
        render: (certificate) => formatDate(certificate.issued_at || certificate.created_at),
      },
      {
        key: 'expires',
        label: 'Vencimiento',
        render: (certificate) => formatDate(certificate.expires_at),
      },
    ];

    switch (detailKey) {
      case 'completion':
        return {
          title: 'Detalle de cumplimiento general',
          description: `${reports.completedAssignments} de ${filteredAssignments.length} asignación(es) están completadas. El porcentaje de la card se calcula sobre estas mismas filas.`,
          rows: filteredAssignments,
          columns: assignmentColumns,
          rowKey: (assignment: Assignment) => assignment.id,
        };

      case 'avgProgress':
        return {
          title: 'Detalle de avance promedio',
          description: `El ${reports.avgProgress}% se calcula promediando el avance de estas ${filteredAssignments.length} asignación(es).`,
          rows: filteredAssignments,
          columns: assignmentColumns,
          rowKey: (assignment: Assignment) => assignment.id,
        };

      case 'certificateRisk':
        return {
          title: 'Certificados en riesgo',
          description: `${reports.expiringSoonCerts} próximo(s) a vencer y ${reports.expiredCerts} vencido(s).`,
          rows: reports.certificateRiskRows,
          columns: certificateColumns,
          rowKey: (certificate: Certificate) => certificate.id,
        };

      case 'liveAttendance':
        return {
          title: 'Detalle de asistencia en vivo',
          description: `${reports.liveAttended} de ${filteredLiveParticipants.length} invitado(s) tienen evidencia de asistencia.`,
          rows: filteredLiveParticipants,
          columns: [
            {
              key: 'worker',
              label: 'Trabajador',
              render: (participant: LiveTrainingParticipant) => (
                <div>
                  <div className="font-medium text-steel-100">{getFullName(participant.user)}</div>
                  <div className="text-xs text-steel-500">{participant.user?.email || '—'}</div>
                </div>
              ),
            },
            {
              key: 'training',
              label: 'Capacitación en vivo',
              render: (participant: LiveTrainingParticipant) =>
                participant.live_training?.title || 'Capacitación en vivo',
            },
            {
              key: 'attendance',
              label: 'Asistencia',
              render: (participant: LiveTrainingParticipant) => getLiveAttendanceLabel(participant),
            },
            {
              key: 'click',
              label: 'Click Meet',
              render: (participant: LiveTrainingParticipant) => formatDate(participant.join_clicked_at),
            },
          ] as MetricDetailColumn<LiveTrainingParticipant>[],
          rowKey: (participant: LiveTrainingParticipant) => participant.id,
        };

      case 'users':
        return {
          title: 'Usuarios alcanzados',
          description: `${filteredUsers.length} trabajador(es) están incluidos en el reporte actual; ${reports.userReport.filter((report) => report.total > 0).length} tienen trainings asignados.`,
          rows: reports.userReport,
          columns: [
            { key: 'name', label: 'Trabajador', render: (row: typeof reports.userReport[number]) => row.name },
            { key: 'area', label: 'Área', render: (row: typeof reports.userReport[number]) => row.area || 'Sin área' },
            { key: 'position', label: 'Puesto', render: (row: typeof reports.userReport[number]) => row.position || '—' },
            { key: 'assigned', label: 'Asignaciones', render: (row: typeof reports.userReport[number]) => row.total },
            { key: 'completed', label: 'Completados', render: (row: typeof reports.userReport[number]) => row.completed },
            { key: 'pending', label: 'Pendientes', render: (row: typeof reports.userReport[number]) => row.pending },
          ] as MetricDetailColumn<typeof reports.userReport[number]>[],
          rowKey: (row: typeof reports.userReport[number]) => row.id,
        };
    }
  }, [detailKey, reports, filteredAssignments, filteredLiveParticipants, filteredUsers]);

  const reportExportConfig = useMemo(() => {
    let rows: ReportExportRow[] = [];
    let columns: CsvExportColumn<ReportExportRow>[] = [];

    if (reportType === 'user') {
      rows = reports.userReport.map((report) => ({
        name: report.name,
        position: report.position ?? '',
        area: report.area ?? '',
        contractor: report.contractor ?? '',
        total: report.total,
        completed: report.completed,
        inProgress: report.inProgress,
        pending: report.pending,
        avgProgress: report.avgProgress,
        certificates: report.certificates,
      }));
      columns = [
        { key: 'name', label: 'Nombre', getValue: (row) => row.name },
        { key: 'position', label: 'Puesto', getValue: (row) => row.position },
        { key: 'area', label: 'Área', getValue: (row) => row.area },
        { key: 'contractor', label: 'Contratista', getValue: (row) => row.contractor },
        { key: 'total', label: 'Total', getValue: (row) => row.total },
        { key: 'completed', label: 'Completados', getValue: (row) => row.completed },
        { key: 'inProgress', label: 'En curso', getValue: (row) => row.inProgress },
        { key: 'pending', label: 'Pendientes', getValue: (row) => row.pending },
        { key: 'avgProgress', label: 'Progreso promedio %', getValue: (row) => row.avgProgress },
        { key: 'certificates', label: 'Certificados', getValue: (row) => row.certificates },
      ];
    }

    if (reportType === 'training') {
      rows = reports.trainingReport.map((report) => ({
        name: report.name,
        category: report.category,
        assigned: report.assigned,
        completed: report.completed,
        inProgress: report.inProgress,
        pending: report.pending,
        failed: report.failed,
        avgProgress: report.avgProgress,
      }));
      columns = [
        { key: 'name', label: 'Training', getValue: (row) => row.name },
        { key: 'category', label: 'Categoría', getValue: (row) => row.category },
        { key: 'assigned', label: 'Asignados', getValue: (row) => row.assigned },
        { key: 'completed', label: 'Completados', getValue: (row) => row.completed },
        { key: 'inProgress', label: 'En curso', getValue: (row) => row.inProgress },
        { key: 'pending', label: 'Pendientes', getValue: (row) => row.pending },
        { key: 'failed', label: 'Fallidos', getValue: (row) => row.failed },
        { key: 'avgProgress', label: 'Avance promedio %', getValue: (row) => row.avgProgress },
      ];
    }

    if (reportType === 'area') {
      rows = reports.areaReport.map((report) => ({
        name: report.name,
        users: report.users,
        assignments: report.assignments,
        completed: report.completed,
        pending: report.pending,
        completion: report.completion,
        progress: report.progress,
      }));
      columns = [
        { key: 'name', label: 'Área', getValue: (row) => row.name },
        { key: 'users', label: 'Usuarios', getValue: (row) => row.users },
        { key: 'assignments', label: 'Asignaciones', getValue: (row) => row.assignments },
        { key: 'completed', label: 'Completados', getValue: (row) => row.completed },
        { key: 'pending', label: 'Pendientes', getValue: (row) => row.pending },
        { key: 'completion', label: 'Completitud %', getValue: (row) => row.completion },
        { key: 'progress', label: 'Avance promedio %', getValue: (row) => row.progress },
      ];
    }

    if (reportType === 'live') {
      rows = reports.liveTrainingReport.map((report) => ({
        name: report.name,
        status: report.status,
        calendarStatus: report.calendarStatus,
        startsAt: report.startsAt,
        participants: report.participants,
        attended: report.attended,
        absent: report.absent,
        invited: report.invited,
        attendanceRate: report.attendanceRate,
      }));
      columns = [
        { key: 'name', label: 'Capacitación en vivo', getValue: (row) => row.name },
        { key: 'status', label: 'Estado', getValue: (row) => row.status },
        { key: 'calendarStatus', label: 'Calendar', getValue: (row) => row.calendarStatus },
        { key: 'startsAt', label: 'Fecha inicio', getValue: (row) => row.startsAt },
        { key: 'participants', label: 'Invitados', getValue: (row) => row.participants },
        { key: 'attended', label: 'Asistieron', getValue: (row) => row.attended },
        { key: 'absent', label: 'Ausentes', getValue: (row) => row.absent },
        { key: 'invited', label: 'Pendientes', getValue: (row) => row.invited },
        { key: 'attendanceRate', label: 'Asistencia %', getValue: (row) => row.attendanceRate },
      ];
    }

    return {
      rows,
      columns,
      filename: `reporte-${reportType}-${brandSlug}.csv`,
    };
  }, [brandSlug, reportType, reports]);


  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando reportes...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo datos reales desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />
          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar los reportes</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>
            <button onClick={loadReportsData} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">
              Reportes ejecutivos
            </h2>
            <p className="text-sm text-steel-400 mt-1">
              Vista comercial del cumplimiento, riesgos y avance operativo de la empresa.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={loadReportsData} className="btn-secondary text-xs w-fit">
              <RefreshCw size={14} />
              Actualizar
            </button>

            <button onClick={() => setShowExportModal(true)} className="btn-secondary text-xs w-fit">
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="flex flex-col xl:flex-row xl:items-end gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-steel-500">
                  Filtrar por
                </span>
                <select
                  value={workerFilterKey}
                  onChange={(event) => {
                    setWorkerFilterKey(event.target.value as WorkerFilterKey);
                    setWorkerFilterValue('all');
                  }}
                  className="select w-full"
                >
                  {WORKER_FILTER_DEFINITIONS.map((definition) => (
                    <option key={definition.key} value={definition.key}>
                      {definition.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-steel-500">
                  Valor
                </span>
                <select
                  value={workerFilterValue}
                  onChange={(event) => setWorkerFilterValue(event.target.value)}
                  className="select w-full"
                >
                  <option value="all">Todos</option>
                  {workerFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:pb-0.5">
              <div className="text-xs text-steel-400">
                Mostrando <span className="font-semibold text-steel-100">{filteredUsers.length}</span> de{' '}
                <span className="font-semibold text-steel-100">{users.length}</span> trabajadores
                {workerFilterValue !== 'all' && (
                  <span>
                    {' '}· {getWorkerFilterDefinition(workerFilterKey).label}: {workerFilterValue}
                  </span>
                )}
              </div>

              {workerFilterValue !== 'all' && (
                <button
                  type="button"
                  onClick={() => setWorkerFilterValue('all')}
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  Limpiar filtro
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportMetricCard
            title="Cumplimiento general"
            value={`${reports.completionRate}%`}
            subtitle={`${reports.completedAssignments} de ${filteredAssignments.length} asignaciones completadas`}
            icon={<CheckCircle size={20} />}
            accent="green"
            chartType="donut"
            chartValue={reports.completionRate}
            onClick={() => setDetailKey('completion')}
          />

          <ReportMetricCard
            title="Avance promedio"
            value={`${reports.avgProgress}%`}
            subtitle="Promedio de progreso de trainings activos"
            icon={<TrendingUp size={20} />}
            accent="brand"
            chartType="spark"
            chartValue={reports.avgProgress}
            onClick={() => setDetailKey('avgProgress')}
          />

          <ReportMetricCard
            title="Certificados en riesgo"
            value={reports.expiringSoonCerts + reports.expiredCerts}
            subtitle={`${reports.expiringSoonCerts} próximos · ${reports.expiredCerts} vencidos`}
            icon={<AlertTriangle size={20} />}
            accent={reports.expiringSoonCerts + reports.expiredCerts > 0 ? 'red' : 'green'}
            chartType="bar"
            chartValue={reports.certificateRiskRate}
            onClick={() => setDetailKey('certificateRisk')}
          />

          <ReportMetricCard
            title="Asistencia en vivo"
            value={`${reports.liveAttendanceRate}%`}
            subtitle={`${reports.liveAttended} de ${filteredLiveParticipants.length} invitados a vivos`}
            icon={<CalendarClock size={20} />}
            accent="blue"
            chartType="donut"
            chartValue={reports.liveAttendanceRate}
            onClick={() => setDetailKey('liveAttendance')}
          />

          <ReportMetricCard
            title="Usuarios alcanzados"
            value={filteredUsers.length}
            subtitle={`${reports.userReport.filter((report) => report.total > 0).length} con trainings asignados`}
            icon={<Users size={20} />}
            accent="blue"
            chartType="donut"
            chartValue={percent(
              reports.userReport.filter((report) => report.total > 0).length,
              filteredUsers.length
            )}
            onClick={() => setDetailKey('users')}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BarChart2 size={16} className="brand-text" />
            Estado de asignaciones
          </h3>
          <p className="text-xs text-steel-500 mb-5">
            Distribución general por estado operativo.
          </p>
          <DonutChart items={reports.statusItems} centerLabel="total" centerValue={filteredAssignments.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Award size={16} className="brand-text" />
            Estado de certificados
          </h3>
          <p className="text-xs text-steel-500 mb-5">
            Vigencia y riesgos próximos para seguimiento HSE.
          </p>
          <DonutChart items={reports.certItems} centerLabel="certs" centerValue={filteredCertificates.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Building size={16} className="brand-text" />
            Cumplimiento por área
          </h3>
          <p className="text-xs text-steel-500 mb-5">Comparativo de avance por sector.</p>
          <HorizontalReportBars
            items={reports.areaReport.map((area) => ({
              label: area.name,
              value: area.progress,
              meta: `${area.users} usuarios · ${area.assignments} asignaciones`,
              accent: area.progress >= 70 ? 'green' : area.progress >= 40 ? 'amber' : 'red',
            }))}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Users size={16} className="brand-text" />
            Usuarios críticos
          </h3>
          <p className="text-xs text-steel-500 mb-4">
            Menor avance promedio para accionar reminders.
          </p>

          <div className="space-y-3">
            {reports.criticalUsers.length === 0 && (
              <div className="p-4 rounded-xl bg-steel-900 text-sm text-steel-400">
                No hay usuarios críticos todavía.
              </div>
            )}

            {reports.criticalUsers.map((userItem) => (
              <div key={userItem.id} className="p-3 rounded-xl bg-steel-900">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-steel-100 truncate">
                      {userItem.name}
                    </div>
                    <div className="text-xs text-steel-500 truncate">
                      {userItem.area ?? 'Sin área'} · {userItem.pending} pendientes
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-steel-100">
                    {userItem.avgProgress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                  <div
                    className="h-full rounded-full brand-bg"
                    style={{ width: `${userItem.avgProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BookOpen size={16} className="brand-text" />
            Trainings críticos
          </h3>
          <p className="text-xs text-steel-500 mb-4">Cursos con menor avance promedio.</p>

          <div className="space-y-3">
            {reports.criticalTrainings.length === 0 && (
              <div className="p-4 rounded-xl bg-steel-900 text-sm text-steel-400">
                No hay trainings críticos todavía.
              </div>
            )}

            {reports.criticalTrainings.map((training) => (
              <div key={training.id} className="p-3 rounded-xl bg-steel-900">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-steel-100 truncate">
                      {training.name}
                    </div>
                    <div className="text-xs text-steel-500 truncate">
                      {training.category} · {training.assigned} asignados
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-steel-100">
                    {training.avgProgress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${training.avgProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <CalendarClock size={16} className="brand-text" />
            Vencimientos próximos
          </h3>
          <p className="text-xs text-steel-500 mb-4">Certificados a revisar o renovar.</p>

          <div className="space-y-3">
            {reports.expiringCertificates.length > 0 ? (
              reports.expiringCertificates.map((cert) => {
                const status = getCertificateStatus(cert);

                return (
                  <div
                    key={cert.id}
                    className="p-3 rounded-xl bg-steel-900 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-steel-100 truncate">
                        {getFullName(cert.user)}
                      </div>
                      <div className="text-xs text-steel-500 truncate">
                        {getTrainingTitle(cert.training, cert)} ·{' '}
                        {cert.expires_at
                          ? new Date(cert.expires_at).toLocaleDateString('es-AR')
                          : 'Sin fecha'}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        status === 'expired'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {status === 'expired' ? 'Vencido' : 'Próximo'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-xl bg-steel-900 text-sm text-steel-400">
                No hay vencimientos críticos.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">
              Detalle exportable
            </h2>
            <p className="text-sm text-steel-400 mt-1">
              Tablas operativas para revisar por usuario, training o área.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'user', label: 'Por usuario', icon: <Users size={14} /> },
              { id: 'training', label: 'Por training', icon: <BookOpen size={14} /> },
              { id: 'area', label: 'Por área', icon: <Building size={14} /> },
              { id: 'live', label: 'Vivos', icon: <CalendarClock size={14} /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setReportType(item.id as ReportType)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  reportType === item.id
                    ? 'brand-bg'
                    : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>

        {reportType === 'user' && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-steel-900 border-b border-steel-700">
                    <th className="table-header">Usuario</th>
                    <th className="table-header hidden md:table-cell">Área</th>
                    <th className="table-header text-center">Total</th>
                    <th className="table-header text-center">Complet.</th>
                    <th className="table-header text-center">En curso</th>
                    <th className="table-header text-center">Pendiente</th>
                    <th className="table-header hidden lg:table-cell">Avance</th>
                    <th className="table-header text-center hidden xl:table-cell">Certs.</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.userReport.map((report) => (
                    <tr key={report.id} className="table-row">
                      <td className="table-cell font-medium text-steel-100">{report.name}</td>
                      <td className="table-cell hidden md:table-cell text-steel-300 text-xs">
                        {report.area ?? '—'}
                      </td>
                      <td className="table-cell text-center text-steel-300">{report.total}</td>
                      <td className="table-cell text-center">
                        <span className="text-emerald-400 font-medium">{report.completed}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-blue-400">{report.inProgress}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-steel-400">{report.pending}</span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 min-w-[60px]">
                            <div
                              className="progress-fill"
                              style={{ width: `${report.avgProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-steel-400">{report.avgProgress}%</span>
                        </div>
                      </td>
                      <td className="table-cell text-center hidden xl:table-cell text-amber-400">
                        {report.certificates}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'training' && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-steel-900 border-b border-steel-700">
                    <th className="table-header">Training</th>
                    <th className="table-header hidden md:table-cell">Categoría</th>
                    <th className="table-header text-center">Asignados</th>
                    <th className="table-header text-center">Completados</th>
                    <th className="table-header text-center">En curso</th>
                    <th className="table-header text-center hidden md:table-cell">Fallidos</th>
                    <th className="table-header hidden lg:table-cell">Avance</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.trainingReport.map((report) => (
                    <tr key={report.id} className="table-row">
                      <td className="table-cell font-medium text-steel-100">{report.name}</td>
                      <td className="table-cell hidden md:table-cell">
                        <span className="badge badge-info">{report.category}</span>
                      </td>
                      <td className="table-cell text-center text-steel-300">{report.assigned}</td>
                      <td className="table-cell text-center">
                        <span className="text-emerald-400 font-medium">{report.completed}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-blue-400">{report.inProgress}</span>
                      </td>
                      <td className="table-cell text-center hidden md:table-cell">
                        <span className="text-red-400">{report.failed}</span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 min-w-[60px]">
                            <div
                              className="progress-fill"
                              style={{ width: `${report.avgProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-steel-400">{report.avgProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'area' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.areaReport.map((report) => (
              <div key={report.name} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-semibold text-steel-100">{report.name}</div>
                  <span className="badge badge-neutral">{report.users} usuarios</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Asignaciones</span>
                    <span className="text-steel-200">{report.assignments}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Completados</span>
                    <span className="text-emerald-400">{report.completed}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Pendientes</span>
                    <span className="text-steel-400">{report.pending}</span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-steel-400 mb-1">
                      <span>Completitud</span>
                      <span>{report.completion}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${report.completion}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-steel-400 mb-1">
                      <span>Avance promedio</span>
                      <span>{report.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: `${report.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {reports.areaReport.length === 0 && (
              <div className="card text-sm text-steel-500">
                Todavía no hay áreas cargadas para reportar.
              </div>
            )}
          </div>
        )}

        {reportType === 'live' && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-steel-900 border-b border-steel-700">
                    <th className="table-header">Capacitación en vivo</th>
                    <th className="table-header hidden md:table-cell">Estado</th>
                    <th className="table-header hidden md:table-cell">Calendar</th>
                    <th className="table-header text-center">Invitados</th>
                    <th className="table-header text-center">Click Meet / asistieron</th>
                    <th className="table-header text-center hidden md:table-cell">Ausentes</th>
                    <th className="table-header hidden lg:table-cell">Asistencia</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.liveTrainingReport.map((report) => (
                    <tr key={report.id} className="table-row">
                      <td className="table-cell font-medium text-steel-100">
                        <div>{report.name}</div>
                        <div className="text-xs text-steel-500">{report.startsAt || 'Sin fecha'}</div>
                      </td>
                      <td className="table-cell hidden md:table-cell text-steel-300 text-xs">
                        {report.status}
                      </td>
                      <td className="table-cell hidden md:table-cell text-steel-300 text-xs">
                        {report.calendarStatus}
                      </td>
                      <td className="table-cell text-center text-steel-300">{report.participants}</td>
                      <td className="table-cell text-center">
                        <span className="text-emerald-400 font-medium">{report.attended}</span>
                      </td>
                      <td className="table-cell text-center hidden md:table-cell">
                        <span className="text-red-400">{report.absent}</span>
                      </td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 min-w-[60px]">
                            <div
                              className="progress-fill"
                              style={{ width: `${report.attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-steel-400">{report.attendanceRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reports.liveTrainingReport.length === 0 && (
              <div className="p-6 text-sm text-steel-500">
                Todavía no hay capacitaciones en vivo para reportar.
              </div>
            )}
          </div>
        )}
      </section>
      <CsvExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar reporte"
        filename={reportExportConfig.filename}
        rows={reportExportConfig.rows}
        columns={reportExportConfig.columns}
        description="Elegí las columnas a incluir. Se exportará el tipo de reporte que estás viendo actualmente."
      />

      {detailModalConfig && (
        <MetricDetailModal
          open={Boolean(detailKey)}
          onClose={() => setDetailKey(null)}
          title={detailModalConfig.title}
          description={detailModalConfig.description}
          context={activeFilterSummary}
          rows={detailModalConfig.rows as any[]}
          columns={detailModalConfig.columns as MetricDetailColumn<any>[]}
          rowKey={detailModalConfig.rowKey as (row: any, index: number) => React.Key}
        />
      )}

    </div>
  );
}
