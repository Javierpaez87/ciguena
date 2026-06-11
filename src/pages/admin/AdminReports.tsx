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
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type ReportType = 'user' | 'training' | 'area';
type Accent = 'amber' | 'blue' | 'green' | 'red' | 'steel';

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
}

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

const accentStyles: Record<Accent, { icon: string; bar: string; ring: string }> = {
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

function csvEscape(value: string | number | null | undefined) {
  const safeValue = value === null || value === undefined ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
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
}: ReportMetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="card p-4 min-h-[160px] flex flex-col justify-between">
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
      </div>
    </div>
  );
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
  const tenantId = user?.tenant_id;

  const [reportType, setReportType] = useState<ReportType>('user');
  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadReportsData() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [usersResult, assignmentsResult, certificatesResult, trainingsResult] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('tenant_id', tenantId),
          supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
          supabase.from('certificates').select('*').eq('tenant_id', tenantId),
          supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
        ]);

      if (usersResult.error) throw usersResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;
      if (trainingsResult.error) throw trainingsResult.error;

      const loadedUsers = ((usersResult.data ?? []) as Profile[]).filter(
        (profile) => !isAdminUser(profile)
      );
      const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];
      const loadedCertificatesRaw = (certificatesResult.data ?? []) as Certificate[];
      const loadedTrainings = (trainingsResult.data ?? []) as TenantTraining[];

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

      setUsers(
        loadedUsers.sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );
      setAssignments(sortByDateDesc(hydratedAssignments));
      setCertificates(sortByDateDesc(hydratedCertificates));
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

  const reports = useMemo(() => {
    const completedAssignments = assignments.filter((assignment) =>
      completedStatuses.includes(normalize(assignment.status))
    ).length;

    const inProgressAssignments = assignments.filter((assignment) =>
      ['in_progress', 'started'].includes(normalize(assignment.status))
    ).length;

    const pendingAssignments = assignments.filter((assignment) =>
      ['not_started', 'pending', 'assigned'].includes(normalize(assignment.status))
    ).length;

    const pendingTestAssignments = assignments.filter(
      (assignment) => normalize(assignment.status) === 'pending_test'
    ).length;

    const failedAssignments = assignments.filter((assignment) =>
      ['failed', 'reproved', 'reprobado'].includes(normalize(assignment.status))
    ).length;

    const avgProgress = assignments.length
      ? Math.round(
          assignments.reduce((sum, assignment) => sum + getAssignmentProgress(assignment), 0) /
            assignments.length
        )
      : 0;

    const completionRate = percent(completedAssignments, assignments.length);

    const validCerts = certificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'valid'
    ).length;

    const expiringSoonCerts = certificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'expiring_soon'
    ).length;

    const expiredCerts = certificates.filter(
      (certificate) => getCertificateStatus(certificate) === 'expired'
    ).length;

    const certificateRiskRate = percent(
      expiringSoonCerts + expiredCerts,
      Math.max(certificates.length, 1)
    );

    const userReport = users.map((profile) => {
      const userAssignments = assignments.filter((assignment) => assignment.user_id === profile.id);
      const userCerts = certificates.filter((certificate) => certificate.user_id === profile.id);

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
        assignments
          .map(
            (assignment) =>
              assignment.tenant_training_id || assignment.training_id || assignment.training?.id
          )
          .filter(Boolean)
      )
    );

    const trainingReport = trainingIds.map((trainingId) => {
      const trainingAssignments = assignments.filter((assignment) => {
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

    const areaNames = Array.from(new Set(users.map((profile) => profile.area || 'Sin área')));

    const areaReport = areaNames.map((area) => {
      const areaUsers = users.filter((profile) => (profile.area || 'Sin área') === area);
      const areaUserIds = new Set(areaUsers.map((profile) => profile.id));
      const areaAssignments = assignments.filter(
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

    const criticalUsers = [...userReport]
      .filter((report) => report.total > 0)
      .sort((a, b) => a.avgProgress - b.avgProgress)
      .slice(0, 5);

    const criticalTrainings = [...trainingReport]
      .filter((report) => report.assigned > 0)
      .sort((a, b) => a.avgProgress - b.avgProgress)
      .slice(0, 5);

    const expiringCertificates = certificates
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
      certificateRiskRate,
      userReport,
      trainingReport,
      areaReport,
      criticalUsers,
      criticalTrainings,
      expiringCertificates,
      statusItems,
      certItems,
    };
  }, [users, assignments, certificates]);

  function downloadCSV() {
    let headers: string[] = [];
    let rows: Array<Array<string | number | null | undefined>> = [];

    if (reportType === 'user') {
      headers = [
        'Nombre',
        'Puesto',
        'Área',
        'Contratista',
        'Total',
        'Completados',
        'En curso',
        'Pendientes',
        'Progreso promedio',
        'Certificados',
      ];

      rows = reports.userReport.map((report) => [
        report.name,
        report.position ?? '',
        report.area ?? '',
        report.contractor ?? '',
        report.total,
        report.completed,
        report.inProgress,
        report.pending,
        `${report.avgProgress}%`,
        report.certificates,
      ]);
    }

    if (reportType === 'training') {
      headers = [
        'Training',
        'Categoría',
        'Asignados',
        'Completados',
        'En curso',
        'Pendientes',
        'Fallidos',
        'Avance promedio',
      ];

      rows = reports.trainingReport.map((report) => [
        report.name,
        report.category,
        report.assigned,
        report.completed,
        report.inProgress,
        report.pending,
        report.failed,
        `${report.avgProgress}%`,
      ]);
    }

    if (reportType === 'area') {
      headers = [
        'Área',
        'Usuarios',
        'Asignaciones',
        'Completados',
        'Pendientes',
        '% Completitud',
        'Avance promedio',
      ];

      rows = reports.areaReport.map((report) => [
        report.name,
        report.users,
        report.assignments,
        report.completed,
        report.pending,
        `${report.completion}%`,
        `${report.progress}%`,
      ]);
    }

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${reportType}-ciguena.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

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

            <button onClick={downloadCSV} className="btn-secondary text-xs w-fit">
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportMetricCard
            title="Cumplimiento general"
            value={`${reports.completionRate}%`}
            subtitle={`${reports.completedAssignments} de ${assignments.length} asignaciones completadas`}
            icon={<CheckCircle size={20} />}
            accent="green"
            chartType="donut"
            chartValue={reports.completionRate}
          />

          <ReportMetricCard
            title="Avance promedio"
            value={`${reports.avgProgress}%`}
            subtitle="Promedio de progreso de trainings activos"
            icon={<TrendingUp size={20} />}
            accent="amber"
            chartType="spark"
            chartValue={reports.avgProgress}
          />

          <ReportMetricCard
            title="Certificados en riesgo"
            value={reports.expiringSoonCerts + reports.expiredCerts}
            subtitle={`${reports.expiringSoonCerts} próximos · ${reports.expiredCerts} vencidos`}
            icon={<AlertTriangle size={20} />}
            accent={reports.expiringSoonCerts + reports.expiredCerts > 0 ? 'red' : 'green'}
            chartType="bar"
            chartValue={reports.certificateRiskRate}
          />

          <ReportMetricCard
            title="Usuarios alcanzados"
            value={users.length}
            subtitle={`${reports.userReport.filter((report) => report.total > 0).length} con trainings asignados`}
            icon={<Users size={20} />}
            accent="blue"
            chartType="donut"
            chartValue={percent(
              reports.userReport.filter((report) => report.total > 0).length,
              users.length
            )}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BarChart2 size={16} className="text-amber-400" />
            Estado de asignaciones
          </h3>
          <p className="text-xs text-steel-500 mb-5">
            Distribución general por estado operativo.
          </p>
          <DonutChart items={reports.statusItems} centerLabel="total" centerValue={assignments.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            Estado de certificados
          </h3>
          <p className="text-xs text-steel-500 mb-5">
            Vigencia y riesgos próximos para seguimiento HSE.
          </p>
          <DonutChart items={reports.certItems} centerLabel="certs" centerValue={certificates.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Building size={16} className="text-amber-400" />
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
            <Users size={16} className="text-amber-400" />
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
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${userItem.avgProgress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
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
            <CalendarClock size={16} className="text-amber-400" />
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
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setReportType(item.id as ReportType)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  reportType === item.id
                    ? 'bg-amber-500 text-petroleum-950'
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
      </section>
    </div>
  );
}
