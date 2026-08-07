// AdminDashboard.tsx · v4 real · Dashboard Admin conectado a Supabase
import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  BookOpen,
  CalendarClock,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity,
  XCircle,
  Download,
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CsvExportModal, { CsvExportColumn } from '../../components/ui/CsvExportModal';
import {
  EmployeeDirectoryRecord,
  getOperationalRole,
  mergeProfilesWithDirectory,
} from '../../lib/workerRoster';

interface ChartItem {
  label: string;
  value: number;
  className: string;
}

interface MiniMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: 'amber' | 'blue' | 'green' | 'red' | 'steel';
  chartType: 'donut' | 'bar' | 'spark';
  chartValue: number;
  chartLabel?: string;
}

interface Profile {
  id: string;
  tenant_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  work_role?: string | null;
  job_role?: string | null;
  position?: string | null;
  area?: string | null;
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
  status?: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
  assigned_at?: string | null;
  completed_at?: string | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  latestAttempt?: TestAttempt | null;
  [key: string]: any;
}

interface TestAttempt {
  id: string;
  assignment_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  test_id?: string | null;
  attempt_number?: number | null;
  score?: number | null;
  correct_answers?: number | null;
  total_questions?: number | null;
  passed?: boolean | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  [key: string]: any;
}

interface Certificate {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  assignment_id?: string | null;
  status?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
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
  [key: string]: any;
}

interface LiveTrainingCertificate {
  id: string;
  tenant_id?: string | null;
  live_training_id?: string | null;
  user_id?: string | null;
  status?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  [key: string]: any;
}

type DashboardExportRow = {
  profile: Profile;
  totalAssignments: number;
  completedAssignments: number;
  inProgressAssignments: number;
  pendingAssignments: number;
  avgProgress: number;
  certificates: number;
};

const accentStyles = {
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

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

function getDateValue(item: any) {
  return (
    item?.created_at ||
    item?.updated_at ||
    item?.assigned_at ||
    item?.completed_at ||
    item?.issued_at ||
    item?.started_at ||
    ''
  );
}

function normalizeStatus(status?: string | null) {
  return (status || '').toLowerCase();
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

  const status = normalizeStatus(assignment.status);

  if (['completed', 'passed', 'certificate_issued'].includes(status)) return 100;
  if (status === 'in_progress') return 50;

  return 0;
}

function getTrainingTitle(training?: TenantTraining | null, assignment?: Assignment | null) {
  return (
    training?.title ||
    training?.training_title ||
    training?.name ||
    assignment?.training_title ||
    assignment?.training_name ||
    assignment?.training_id ||
    'Training sin título'
  );
}

function isWorker(profile: Profile) {
  const role = normalizeStatus(profile.role);
  return role === 'worker' || role === 'trabajador' || role === 'employee';
}

function hasLiveAttendanceEvidence(participant: LiveTrainingParticipant) {
  const status = normalizeStatus(participant.live_attendance_status);
  return status === 'on_time' || status === 'late' || Boolean(participant.join_clicked_at);
}

function isLiveParticipantPending(participant: LiveTrainingParticipant) {
  const status = normalizeStatus(participant.live_attendance_status);
  return status === 'invited' && !participant.join_clicked_at;
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
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative h-36 w-36 flex-shrink-0 rounded-full bg-steel-800">
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

function HorizontalBars({ items, total }: { items: ChartItem[]; total: number }) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = percent(item.value, total);

        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-steel-300">{item.label}</span>
              <span className="text-sm font-semibold text-steel-100">{item.value}</span>
            </div>

            <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${item.className.replace('text-', 'bg-')}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniChart({
  type,
  value,
  accent,
}: {
  type: MiniMetricCardProps['chartType'];
  value: number;
  accent: MiniMetricCardProps['accent'];
}) {
  const safeValue = clampPercent(value);
  const styles = accentStyles[accent];
  const circumference = 100.53;
  const dash = (safeValue / 100) * circumference;
  const sparkBars = [38, 55, 44, 72, 58, safeValue || 8];

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

function MiniMetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  chartType,
  chartValue,
  chartLabel,
}: MiniMetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="card p-4 min-h-[170px] flex flex-col justify-between">
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

        {subtitle && <div className="mt-1 text-xs text-steel-500 leading-snug">{subtitle}</div>}

        {chartLabel && (
          <div className="mt-2 text-[10px] uppercase tracking-wide text-steel-600">
            {chartLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [users, setUsers] = useState<Profile[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<LiveTraining[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<LiveTrainingParticipant[]>([]);
  const [liveCertificates, setLiveCertificates] = useState<LiveTrainingCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
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
          tenantTrainingsResult,
          assignmentsResult,
          certificatesResult,
          liveTrainingsResult,
          liveParticipantsResult,
          liveCertificatesResult,
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('tenant_id', tenantId),
          supabase.from('employee_directory').select('*').eq('tenant_id', tenantId),
          supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
          supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
          supabase.from('certificates').select('*').eq('tenant_id', tenantId),
          supabase.from('live_trainings').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
          supabase.from('live_training_participants').select('*').eq('tenant_id', tenantId),
          supabase.from('live_training_certificates').select('*').eq('tenant_id', tenantId),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (directoryResult.error) throw directoryResult.error;
        if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;
        if (certificatesResult.error) throw certificatesResult.error;
        if (liveTrainingsResult.error) throw liveTrainingsResult.error;
        if (liveParticipantsResult.error) throw liveParticipantsResult.error;
        if (liveCertificatesResult.error) throw liveCertificatesResult.error;

        const rawUsers = (usersResult.data ?? []) as Profile[];
        const directoryRows = (directoryResult.data ?? []) as EmployeeDirectoryRecord[];
        const loadedUsers = mergeProfilesWithDirectory(rawUsers as any, directoryRows) as Profile[];
        const loadedTenantTrainings = (tenantTrainingsResult.data ?? []) as TenantTraining[];
        const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];
        const loadedCertificates = (certificatesResult.data ?? []) as Certificate[];
        const loadedLiveTrainings = (liveTrainingsResult.data ?? []) as LiveTraining[];
        const loadedLiveParticipants = (liveParticipantsResult.data ?? []) as LiveTrainingParticipant[];
        const loadedLiveCertificates = (liveCertificatesResult.data ?? []) as LiveTrainingCertificate[];

        const userIds = rawUsers.map((profile) => profile.id).filter(Boolean);

        let loadedAttempts: TestAttempt[] = [];

        if (userIds.length > 0) {
          const attemptsResult = await supabase
            .from('training_test_attempts')
            .select('*')
            .in('user_id', userIds);

          if (attemptsResult.error) {
            console.warn('No se pudieron cargar intentos de examen:', attemptsResult.error.message);
          } else {
            loadedAttempts = (attemptsResult.data ?? []) as TestAttempt[];
          }
        }

        const usersById = new Map(loadedUsers.map((profile) => [profile.id, profile]));

        const trainingsByAnyId = new Map<string, TenantTraining>();

        loadedTenantTrainings.forEach((training) => {
          if (training.id) trainingsByAnyId.set(training.id, training);
          if (training.training_id) trainingsByAnyId.set(training.training_id, training);
        });

        const attemptsByAssignmentId = new Map<string, TestAttempt>();

        loadedAttempts
          .slice()
          .sort((a, b) => {
            const dateA = new Date(getDateValue(a)).getTime();
            const dateB = new Date(getDateValue(b)).getTime();
            return dateB - dateA;
          })
          .forEach((attempt) => {
            if (attempt.assignment_id && !attemptsByAssignmentId.has(attempt.assignment_id)) {
              attemptsByAssignmentId.set(attempt.assignment_id, attempt);
            }
          });

        const loadedAssignments = loadedAssignmentsRaw
          .map((assignment) => {
            const trainingKey =
              assignment.tenant_training_id ||
              assignment.training_id ||
              assignment.training_key ||
              assignment.training_slug;

            return {
              ...assignment,
              progress_percentage: getAssignmentProgress(assignment),
              user: assignment.user_id ? usersById.get(assignment.user_id) ?? null : null,
              training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
              latestAttempt: attemptsByAssignmentId.get(assignment.id) ?? null,
            };
          })
          .sort((a, b) => {
            const dateA = new Date(getDateValue(a)).getTime();
            const dateB = new Date(getDateValue(b)).getTime();
            return dateB - dateA;
          });

        const sortedCertificates = loadedCertificates.sort((a, b) => {
          const dateA = new Date(getDateValue(a)).getTime();
          const dateB = new Date(getDateValue(b)).getTime();
          return dateB - dateA;
        });

        const sortedAttempts = loadedAttempts.sort((a, b) => {
          const dateA = new Date(getDateValue(a)).getTime();
          const dateB = new Date(getDateValue(b)).getTime();
          return dateB - dateA;
        });

        setUsers(loadedUsers);
        setTenantTrainings(loadedTenantTrainings);
        setAssignments(loadedAssignments);
        setCertificates(sortedCertificates);
        setAttempts(sortedAttempts);
        setLiveTrainings(loadedLiveTrainings);
        setLiveParticipants(loadedLiveParticipants);
        setLiveCertificates(loadedLiveCertificates);
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los datos reales del dashboard.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [tenantId]);

  const workerUsers = useMemo(() => {
    const workers = users.filter(isWorker);
    return workers.length > 0 ? workers : users.filter((u) => normalizeStatus(u.role) !== 'admin');
  }, [users]);

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    workerUsers.forEach((profile) => {
      const role = getOperationalRole(profile as any);
      counts.set(role, (counts.get(role) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [workerUsers]);

  const filteredWorkerUsers = useMemo(
    () =>
      roleFilter === 'all'
        ? workerUsers
        : workerUsers.filter((profile) => getOperationalRole(profile as any) === roleFilter),
    [workerUsers, roleFilter]
  );

  const selectedWorkerIds = useMemo(
    () => new Set(filteredWorkerUsers.map((profile) => profile.id)),
    [filteredWorkerUsers]
  );

  const filteredAssignments = useMemo(
    () => roleFilter === 'all' ? assignments : assignments.filter((item) => Boolean(item.user_id && selectedWorkerIds.has(item.user_id))),
    [assignments, roleFilter, selectedWorkerIds]
  );
  const filteredCertificates = useMemo(
    () => roleFilter === 'all' ? certificates : certificates.filter((item) => Boolean(item.user_id && selectedWorkerIds.has(item.user_id))),
    [certificates, roleFilter, selectedWorkerIds]
  );
  const filteredAttempts = useMemo(
    () => roleFilter === 'all' ? attempts : attempts.filter((item) => Boolean(item.user_id && selectedWorkerIds.has(item.user_id))),
    [attempts, roleFilter, selectedWorkerIds]
  );
  const filteredLiveParticipants = useMemo(
    () => roleFilter === 'all' ? liveParticipants : liveParticipants.filter((item) => Boolean(item.user_id && selectedWorkerIds.has(item.user_id))),
    [liveParticipants, roleFilter, selectedWorkerIds]
  );
  const filteredLiveCertificates = useMemo(
    () => roleFilter === 'all' ? liveCertificates : liveCertificates.filter((item) => Boolean(item.user_id && selectedWorkerIds.has(item.user_id))),
    [liveCertificates, roleFilter, selectedWorkerIds]
  );

  const metrics = useMemo(() => {
    const activeUsers = filteredWorkerUsers.filter((u) => {
      const status = normalizeStatus(u.status);
      return !status || status === 'active' || status === 'activo';
    }).length;

    const notStarted = filteredAssignments.filter((a) => {
      const status = normalizeStatus(a.status);
      return status === 'not_started' || status === 'pending' || status === 'assigned';
    }).length;

    const inProgress = filteredAssignments.filter((a) => {
      const status = normalizeStatus(a.status);
      return status === 'in_progress' || status === 'started';
    }).length;

    const completed = filteredAssignments.filter((a) => {
      const status = normalizeStatus(a.status);
      return ['completed', 'passed', 'certificate_issued', 'approved'].includes(status);
    }).length;

    const passedAttempts = filteredAttempts.filter((attempt) => attempt.passed === true).length;

    const validCerts = filteredCertificates.filter((certificate) => {
      const status = normalizeStatus(certificate.status);

      if (status === 'valid' || status === 'vigente') return true;
      if (status === 'expired' || status === 'vencido') return false;

      if (certificate.expires_at) {
        return new Date(certificate.expires_at).getTime() >= Date.now();
      }

      return true;
    }).length;

    const expiredCerts = filteredCertificates.filter((certificate) => {
      const status = normalizeStatus(certificate.status);

      if (status === 'expired' || status === 'vencido') return true;

      if (certificate.expires_at) {
        return new Date(certificate.expires_at).getTime() < Date.now();
      }

      return false;
    }).length;

    const expiringSoon = filteredCertificates.filter((certificate) => {
      if (!certificate.expires_at) return false;

      const expiresAt = new Date(certificate.expires_at).getTime();
      const now = Date.now();
      const thirtyDays = 1000 * 60 * 60 * 24 * 30;

      return expiresAt >= now && expiresAt <= now + thirtyDays;
    }).length;

    const avgProgress = filteredAssignments.length
      ? Math.round(
          filteredAssignments.reduce((sum, assignment) => sum + getAssignmentProgress(assignment), 0) /
            filteredAssignments.length
        )
      : 0;

    const completionRate = percent(completed, filteredAssignments.length);
    const activeUserRate = percent(activeUsers, filteredWorkerUsers.length);
    const inProgressRate = percent(inProgress, filteredAssignments.length);
    const notStartedRate = percent(notStarted, filteredAssignments.length);
    const validCertRate = percent(validCerts, filteredCertificates.length);
    const expiredCertRate = percent(expiredCerts, Math.max(filteredCertificates.length, 1));
    const expiringSoonRate = percent(expiringSoon, Math.max(filteredCertificates.length, 1));

    const liveScheduled = liveTrainings.filter((training) =>
      ['draft', 'scheduled'].includes(normalizeStatus(training.status))
    ).length;
    const liveCompleted = liveTrainings.filter((training) =>
      ['completed', 'closed'].includes(normalizeStatus(training.status))
    ).length;
    const liveAttended = filteredLiveParticipants.filter(hasLiveAttendanceEvidence).length;
    const liveAbsent = filteredLiveParticipants.filter((participant) =>
      ['absent', 'invalid_after_event'].includes(normalizeStatus(participant.live_attendance_status))
    ).length;
    const liveInvited = filteredLiveParticipants.filter(isLiveParticipantPending).length;
    const liveAttendanceRate = percent(liveAttended, filteredLiveParticipants.length);

    return {
      activeUsers,
      notStarted,
      inProgress,
      completed,
      passedAttempts,
      validCerts,
      expiredCerts,
      expiringSoon,
      avgProgress,
      completionRate,
      activeUserRate,
      inProgressRate,
      notStartedRate,
      validCertRate,
      expiredCertRate,
      expiringSoonRate,
      liveScheduled,
      liveCompleted,
      liveAttended,
      liveAbsent,
      liveInvited,
      liveAttendanceRate,
      liveCertificates: filteredLiveCertificates.length,
    };
  }, [filteredWorkerUsers, filteredAssignments, filteredCertificates, filteredAttempts, liveTrainings, filteredLiveParticipants, filteredLiveCertificates]);

  const trainingStatusItems: ChartItem[] = [
    { label: 'Completados', value: metrics.completed, className: 'text-emerald-400' },
    { label: 'En curso', value: metrics.inProgress, className: 'text-sky-400' },
    { label: 'No iniciados', value: metrics.notStarted, className: 'text-slate-500' },
  ];

  const liveAttendanceItems: ChartItem[] = [
    { label: 'Click Meet / asistieron', value: metrics.liveAttended, className: 'text-emerald-400' },
    { label: 'Invitados', value: metrics.liveInvited, className: 'text-sky-400' },
    { label: 'Ausentes', value: metrics.liveAbsent, className: 'text-red-400' },
  ];

  const certificateItems: ChartItem[] = [
    { label: 'Vigentes', value: metrics.validCerts, className: 'text-emerald-400' },
    { label: 'Próx. a vencer', value: metrics.expiringSoon, className: 'text-amber-400' },
    { label: 'Vencidos', value: metrics.expiredCerts, className: 'text-red-400' },
  ];

  const areaItems = useMemo(() => {
    const areaProgress = filteredWorkerUsers.reduce<
      Record<string, { users: number; progress: number; assignments: number }>
    >((acc, profile) => {
      const area = profile.area || profile.department || profile.sector || 'Sin área';

      const userAssignments = filteredAssignments.filter((assignment) => assignment.user_id === profile.id);

      const userProgress = userAssignments.length
        ? Math.round(
            userAssignments.reduce(
              (sum, assignment) => sum + getAssignmentProgress(assignment),
              0
            ) / userAssignments.length
          )
        : 0;

      acc[area] = acc[area] ?? { users: 0, progress: 0, assignments: 0 };
      acc[area].users += 1;
      acc[area].progress += userProgress;
      acc[area].assignments += userAssignments.length;

      return acc;
    }, {});

    return Object.entries(areaProgress).map(([area, data]) => ({
      label: area,
      value: data.users ? Math.round(data.progress / data.users) : 0,
      users: data.users,
      assignments: data.assignments,
    }));
  }, [filteredWorkerUsers, filteredAssignments]);

  const recentActivity = useMemo(() => {
    const assignmentActivity = filteredAssignments.slice(0, 4).map((assignment) => ({
      id: `assignment-${assignment.id}`,
      type: 'assignment',
      title: assignment.user?.full_name || assignment.user?.email || 'Usuario sin nombre',
      subtitle: getTrainingTitle(assignment.training, assignment),
      date: getDateValue(assignment),
      status: assignment.status || 'assigned',
      progress: getAssignmentProgress(assignment),
    }));

    const attemptActivity = filteredAttempts.slice(0, 4).map((attempt) => {
      const user = attempt.user_id ? users.find((profile) => profile.id === attempt.user_id) : null;

      return {
        id: `attempt-${attempt.id}`,
        type: 'attempt',
        title: user?.full_name || user?.email || 'Usuario sin nombre',
        subtitle: attempt.passed
          ? `Aprobó examen · ${attempt.score ?? 0}%`
          : `Intentó examen · ${attempt.score ?? 0}%`,
        date: getDateValue(attempt),
        status: attempt.passed ? 'passed' : 'failed',
        progress: attempt.score ?? 0,
      };
    });

    const certificateActivity = filteredCertificates.slice(0, 4).map((certificate) => {
      const user = certificate.user_id
        ? users.find((profile) => profile.id === certificate.user_id)
        : null;

      return {
        id: `certificate-${certificate.id}`,
        type: 'certificate',
        title: user?.full_name || user?.email || 'Usuario sin nombre',
        subtitle: 'Certificado emitido',
        date: getDateValue(certificate),
        status: certificate.status || 'valid',
        progress: 100,
      };
    });

    return [...assignmentActivity, ...attemptActivity, ...certificateActivity]
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [filteredAssignments, filteredAttempts, filteredCertificates, users]);


  const dashboardExportRows = useMemo<DashboardExportRow[]>(
    () =>
      filteredWorkerUsers.map((profile) => {
        const userAssignments = filteredAssignments.filter((item) => item.user_id === profile.id);
        const userCertificates = filteredCertificates.filter((item) => item.user_id === profile.id);
        const completedAssignments = userAssignments.filter((item) =>
          ['completed', 'passed', 'certificate_issued', 'approved'].includes(normalizeStatus(item.status))
        ).length;
        const inProgressAssignments = userAssignments.filter((item) =>
          ['in_progress', 'started'].includes(normalizeStatus(item.status))
        ).length;
        const pendingAssignments = userAssignments.filter((item) =>
          ['not_started', 'pending', 'assigned'].includes(normalizeStatus(item.status))
        ).length;
        const avgProgress = userAssignments.length
          ? Math.round(userAssignments.reduce((sum, item) => sum + getAssignmentProgress(item), 0) / userAssignments.length)
          : 0;

        return {
          profile,
          totalAssignments: userAssignments.length,
          completedAssignments,
          inProgressAssignments,
          pendingAssignments,
          avgProgress,
          certificates: userCertificates.length,
        };
      }),
    [filteredWorkerUsers, filteredAssignments, filteredCertificates]
  );

  const dashboardExportColumns = useMemo<CsvExportColumn<DashboardExportRow>[]>(
    () => [
      { key: 'name', label: 'Trabajador', getValue: (row) => row.profile.full_name || row.profile.email || '' },
      { key: 'email', label: 'Email', getValue: (row) => row.profile.email || '' },
      { key: 'role', label: 'Rol operativo', getValue: (row) => getOperationalRole(row.profile as any) },
      { key: 'position', label: 'Puesto', getValue: (row) => row.profile.position || '' },
      { key: 'area', label: 'Área', getValue: (row) => row.profile.area || '' },
      { key: 'status', label: 'Estado', getValue: (row) => row.profile.status || '' },
      { key: 'assignments', label: 'Asignaciones', getValue: (row) => row.totalAssignments },
      { key: 'completed', label: 'Completados', getValue: (row) => row.completedAssignments },
      { key: 'in_progress', label: 'En curso', getValue: (row) => row.inProgressAssignments },
      { key: 'pending', label: 'Pendientes', getValue: (row) => row.pendingAssignments },
      { key: 'progress', label: 'Progreso promedio %', getValue: (row) => row.avgProgress },
      { key: 'certificates', label: 'Certificados', getValue: (row) => row.certificates },
      { key: 'employee_code', label: 'Legajo', getValue: (row) => row.profile.employee_code || '', defaultSelected: false },
      { key: 'dni', label: 'DNI', getValue: (row) => row.profile.dni || '', defaultSelected: false },
    ],
    []
  );

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando dashboard...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo los datos reales de Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="text-red-400 font-semibold">No se pudo cargar el dashboard</div>
        <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>
        <div className="text-xs text-steel-500 mt-4">
          Revisá nombres de tablas, columnas y políticas RLS de Supabase.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-steel-100">Filtrar dashboard por rol operativo</div>
          <div className="text-xs text-steel-500 mt-1">El filtro se aplica a trabajadores, asignaciones, certificados, exámenes y asistencia.</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="select sm:min-w-[240px]"
          >
            <option value="all">Todos los roles ({workerUsers.length})</option>
            {roleOptions.map((option) => (
              <option key={option.role} value={option.role}>
                {option.role} ({option.count})
              </option>
            ))}
          </select>
          <button onClick={() => setShowExportModal(true)} className="btn-secondary text-xs">
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">
            Indicadores principales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetricCard
            title="Usuarios totales"
            value={filteredWorkerUsers.length}
            icon={<Users size={20} />}
            accent="amber"
            subtitle={`${metrics.activeUsers} activos`}
            chartType="donut"
            chartValue={metrics.activeUserRate}
            chartLabel="usuarios activos"
          />

          <MiniMetricCard
            title="Trainings asignados"
            value={filteredAssignments.length}
            icon={<BookOpen size={20} />}
            accent="blue"
            subtitle={`${metrics.completed} completados`}
            chartType="bar"
            chartValue={metrics.completionRate}
            chartLabel="cumplimiento"
          />

          <MiniMetricCard
            title="Vivos programados"
            value={metrics.liveScheduled}
            icon={<CalendarClock size={20} />}
            accent="blue"
            subtitle={`${liveTrainings.length} capacitaciones en vivo totales`}
            chartType="bar"
            chartValue={percent(metrics.liveScheduled, Math.max(liveTrainings.length, 1))}
            chartLabel="en agenda"
          />

          <MiniMetricCard
            title="Asistencia en vivo"
            value={`${metrics.liveAttendanceRate}%`}
            icon={<CheckCircle size={20} />}
            accent="green"
            subtitle={`${metrics.liveAttended} de ${filteredLiveParticipants.length} invitados`}
            chartType="donut"
            chartValue={metrics.liveAttendanceRate}
            chartLabel="asistencia"
          />

          <MiniMetricCard
            title="Certs. vivo"
            value={metrics.liveCertificates}
            icon={<Award size={20} />}
            accent="green"
            subtitle="certificados emitidos por vivos"
            chartType="bar"
            chartValue={percent(metrics.liveCertificates, Math.max(filteredLiveParticipants.length, 1))}
            chartLabel="certificación live"
          />

          <MiniMetricCard
            title="Certificados vigentes"
            value={metrics.validCerts}
            icon={<Award size={20} />}
            accent="green"
            subtitle={`${filteredCertificates.length} certificados en la vista`}
            chartType="donut"
            chartValue={metrics.validCertRate}
            chartLabel="vigencia"
          />

          <MiniMetricCard
            title="Avance promedio"
            value={`${metrics.avgProgress}%`}
            icon={<TrendingUp size={20} />}
            accent="amber"
            subtitle={roleFilter === 'all' ? 'promedio de la empresa' : `promedio · ${roleFilter}`}
            chartType="bar"
            chartValue={metrics.avgProgress}
            chartLabel="avance general"
          />

          <MiniMetricCard
            title="No iniciados"
            value={metrics.notStarted}
            icon={<Clock size={20} />}
            accent="steel"
            subtitle={`${metrics.notStartedRate}% de asignaciones`}
            chartType="bar"
            chartValue={metrics.notStartedRate}
            chartLabel="pendientes"
          />

          <MiniMetricCard
            title="En curso"
            value={metrics.inProgress}
            icon={<Activity size={20} />}
            accent="blue"
            subtitle={`${metrics.inProgressRate}% de asignaciones`}
            chartType="bar"
            chartValue={metrics.inProgressRate}
            chartLabel="actividad"
          />

          <MiniMetricCard
            title="Completados"
            value={metrics.completed}
            icon={<CheckCircle size={20} />}
            accent="green"
            subtitle={`${metrics.completionRate}% de cumplimiento`}
            chartType="donut"
            chartValue={metrics.completionRate}
            chartLabel="finalizados"
          />

          <MiniMetricCard
            title="Certs. vencidos"
            value={metrics.expiredCerts}
            icon={<XCircle size={20} />}
            accent="red"
            subtitle={`${metrics.expiringSoon} próximos a vencer`}
            chartType="bar"
            chartValue={
              metrics.expiredCerts > 0 ? metrics.expiredCertRate : metrics.expiringSoonRate
            }
            chartLabel={metrics.expiredCerts > 0 ? 'riesgo vencido' : 'riesgo próximo'}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            Estado de trainings
          </h3>

          <p className="text-xs text-steel-500 mb-5">
            Distribución general de asignaciones activas.
          </p>

          <DonutChart
            items={trainingStatusItems}
            centerLabel="total"
            centerValue={filteredAssignments.length}
          />
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <CalendarClock size={16} className="text-amber-400" />
            Asistencia en vivo
          </h3>

          <p className="text-xs text-steel-500 mb-5">
            Distribución de participantes de capacitaciones en vivo.
          </p>

          <DonutChart
            items={liveAttendanceItems}
            centerLabel="invitados"
            centerValue={filteredLiveParticipants.length}
          />
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            Estado de certificados
          </h3>

          <p className="text-xs text-steel-500 mb-5">
            Vigencia, vencimientos próximos y certificados vencidos.
          </p>

          <HorizontalBars items={certificateItems} total={Math.max(filteredCertificates.length, 1)} />
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Users size={16} className="text-amber-400" />
            Avance por área
          </h3>

          <p className="text-xs text-steel-500 mb-5">
            Promedio de avance por sector de la empresa.
          </p>

          <div className="space-y-4">
            {areaItems.length === 0 && (
              <div className="text-sm text-steel-500">
                Todavía no hay trabajadores con área.
              </div>
            )}

            {areaItems.map((area) => (
              <div key={area.label}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <span className="text-sm text-steel-300">{area.label}</span>
                    <span className="text-xs text-steel-500 ml-2">
                      {area.users} usuarios · {area.assignments} asignaciones
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-steel-100 whitespace-nowrap">
                    {area.value}%
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${area.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            Asignaciones recientes
          </h3>

          <div className="space-y-2">
            {filteredAssignments.length === 0 && (
              <div className="text-sm text-steel-500">
                Todavía no hay asignaciones para esta empresa.
              </div>
            )}

            {filteredAssignments.slice(0, 6).map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-2.5 bg-steel-900 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-steel-100 truncate">
                    {assignment.user?.full_name ||
                      assignment.user?.email ||
                      'Usuario sin nombre'}
                  </div>

                  <div className="text-xs text-steel-400 truncate">
                    {getTrainingTitle(assignment.training, assignment)}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <StatusBadge status={assignment.status || 'assigned'} />
                  <div className="text-xs text-steel-500 mt-1">
                    {getAssignmentProgress(assignment)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            Actividad reciente
          </h3>

          <div className="space-y-2">
            {recentActivity.length === 0 && (
              <div className="text-sm text-steel-500">
                Todavía no hay actividad registrada para esta empresa.
              </div>
            )}

            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2.5 bg-steel-900 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Activity size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm text-steel-200 truncate">{item.title}</div>
                  <div className="text-xs text-steel-500 truncate">{item.subtitle}</div>
                  {item.date && (
                    <div className="text-[11px] text-steel-600 mt-1">
                      {new Date(item.date).toLocaleDateString('es-AR')}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
          <CheckCircle size={16} className="text-amber-400" />
          Exámenes recientes
        </h3>

        <div className="space-y-2">
          {filteredAttempts.length === 0 && (
            <div className="text-sm text-steel-500">
              Todavía no hay intentos de examen registrados.
            </div>
          )}

          {filteredAttempts.slice(0, 6).map((attempt) => {
            const profile = attempt.user_id
              ? users.find((userProfile) => userProfile.id === attempt.user_id)
              : null;

            return (
              <div key={attempt.id} className="flex items-center gap-3 p-2.5 bg-steel-900 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-steel-100 truncate">
                    {profile?.full_name || profile?.email || 'Usuario sin nombre'}
                  </div>

                  <div className="text-xs text-steel-400 truncate">
                    {attempt.training_id || attempt.test_id || 'Examen'}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <StatusBadge status={attempt.passed ? 'passed' : 'failed'} />
                  <div className="text-xs text-steel-500 mt-1">
                    {attempt.score ?? 0}% · {attempt.correct_answers ?? 0}/
                    {attempt.total_questions ?? 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CsvExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar dashboard"
        filename="dashboard-ciguena.csv"
        rows={dashboardExportRows}
        columns={dashboardExportColumns}
        description={`Se exportarán ${dashboardExportRows.length} trabajador(es) respetando el filtro de rol operativo actual.`}
      />

      <div className="text-xs text-steel-600">
        Datos reales desde Supabase · {filteredWorkerUsers.length} usuarios en la vista · {tenantTrainings.length}{' '}
        trainings habilitados · {filteredAssignments.length} asignaciones · {filteredAttempts.length} exámenes ·{' '}
        {filteredCertificates.length} certificados
      </div>
    </div>
  );
}
