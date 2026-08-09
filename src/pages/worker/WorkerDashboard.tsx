import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  AlertTriangle,
  Play,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';

interface WorkerDashboardProps {
  onNavigate: (view: string, data?: unknown) => void;
}

type WorkerCertificate = {
  id: string;
  assignment_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_id?: string | null;
  certificate_code?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type WorkerTrainingAssignment = TrainingAssignment & {
  training?: Training;
  certificate?: WorkerCertificate | null;
  effective_status?: string;
};

function SimpleMetricCard({
  title,
  value,
  icon,
  subtitle,
  tone = 'neutral',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle?: string;
  tone?: 'neutral' | 'danger' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-300 bg-red-500/10'
      : tone === 'warning'
        ? 'text-amber-300 bg-amber-500/10'
        : tone === 'success'
          ? 'text-emerald-300 bg-emerald-500/10'
          : 'text-amber-400 bg-steel-800';

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-steel-400 mb-1">{title}</div>
          <div className="text-2xl font-bold text-steel-100">{value}</div>
          {subtitle && (
            <div
              className={`text-xs mt-1 ${
                tone === 'danger'
                  ? 'text-red-300'
                  : tone === 'warning'
                    ? 'text-amber-300'
                    : tone === 'success'
                      ? 'text-emerald-300'
                      : 'text-steel-500'
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const formatDateAR = (date?: string | null) => {
  if (!date) return 'Sin fecha';

  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date(date).toLocaleDateString('es-AR');
  }

  return new Date(year, month - 1, day).toLocaleDateString('es-AR');
};

const getDueDateInfo = (dueDate?: string | null) => {
  if (!dueDate) {
    return {
      isOverdue: false,
      isDueSoon: false,
      daysRemaining: null as number | null,
    };
  }

  const [year, month, day] = dueDate.split('-').map(Number);

  if (!year || !month || !day) {
    return {
      isOverdue: false,
      isDueSoon: false,
      daysRemaining: null as number | null,
    };
  }

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const dueDateOnly = new Date(year, month - 1, day);
  const diffMs = dueDateOnly.getTime() - todayOnly.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isOverdue: daysRemaining < 0,
    isDueSoon: daysRemaining >= 0 && daysRemaining <= 3,
    daysRemaining,
  };
};

const isCompletedStatus = (status?: string | null) => {
  return (
    status === 'completed' ||
    status === 'passed' ||
    status === 'certificate_issued'
  );
};

const getDueDateTimestamp = (dueDate?: string | null) => {
  if (!dueDate) return Number.POSITIVE_INFINITY;

  const [year, month, day] = dueDate.split('-').map(Number);

  if (!year || !month || !day) return Number.POSITIVE_INFINITY;

  return new Date(year, month - 1, day).getTime();
};

const hasCertificate = (assignment: WorkerTrainingAssignment) => {
  return Boolean(assignment.certificate?.id);
};

const getEffectiveStatus = (assignment: WorkerTrainingAssignment) => {
  if (hasCertificate(assignment)) return 'certificate_issued';
  return assignment.status ?? 'not_started';
};

const isEffectivelyCompleted = (assignment: WorkerTrainingAssignment) => {
  return hasCertificate(assignment) || isCompletedStatus(assignment.status);
};

const getEffectiveProgress = (assignment: WorkerTrainingAssignment) => {
  if (isEffectivelyCompleted(assignment)) return 100;
  return assignment.progress_percentage ?? 0;
};

const getUrgencyScore = (assignment: WorkerTrainingAssignment) => {
  if (isEffectivelyCompleted(assignment)) return 999;

  const dueInfo = getDueDateInfo(assignment.due_date);
  const status = getEffectiveStatus(assignment);

  if (dueInfo.isOverdue) return -100;
  if (status === 'pending_test') return -80;
  if (dueInfo.isDueSoon) return -50;
  if (status === 'in_progress') return 10;
  if (dueInfo.daysRemaining !== null) return dueInfo.daysRemaining;

  return 500;
};

const getStatusPill = (assignment: WorkerTrainingAssignment) => {
  const status = getEffectiveStatus(assignment);
  const dueInfo = getDueDateInfo(assignment.due_date);

  if (hasCertificate(assignment) || status === 'certificate_issued') {
    return {
      label: 'Certificado emitido',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    };
  }

  if (dueInfo.isOverdue) {
    return {
      label: 'Vencido',
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
    };
  }

  if (status === 'pending_test') {
    return {
      label: 'Pendiente de examen',
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
    };
  }

  if (status === 'not_started') {
    return {
      label: 'Pendiente',
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
    };
  }

  if (status === 'in_progress') {
    return {
      label: 'En curso',
      className: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    };
  }

  return {
    label: status || 'Pendiente',
    className: 'bg-steel-800 text-steel-300 border-steel-700',
  };
};

const getActionLabel = (assignment: WorkerTrainingAssignment) => {
  const status = getEffectiveStatus(assignment);

  if (hasCertificate(assignment) || status === 'certificate_issued') return 'Ver certificado';
  if (status === 'not_started') return 'Comenzar';
  if (status === 'pending_test') return 'Rendir examen';
  return 'Continuar';
};

const getActionView = (assignment: WorkerTrainingAssignment) => {
  const status = getEffectiveStatus(assignment);

  if (hasCertificate(assignment) || status === 'certificate_issued') {
    return 'worker-certificates';
  }

  if (status === 'pending_test') return 'worker-test';

  return 'worker-player';
};

export default function WorkerDashboard({ onNavigate }: WorkerDashboardProps) {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<WorkerTrainingAssignment[]>([]);
  const [certificates, setCertificates] = useState<WorkerCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setLoadError(null);

    if (!user?.id) {
      setAssignments([]);
      setCertificates([]);
      setLoadError('No pudimos identificar el perfil del trabajador.');
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('profileError:', profileError);
      setAssignments([]);
      setCertificates([]);
      setLoadError('No pudimos encontrar el perfil del trabajador.');
      setIsLoading(false);
      return;
    }

    const profileId = profile.id as string;
    const authUserId = profile.auth_user_id as string | null;
    const tenantId = profile.tenant_id as string | null;

    const userIds = Array.from(
      new Set([profileId, authUserId].filter(Boolean) as string[])
    );

    const [assignmentsResult, certificatesResult] = await Promise.all([
      supabase
        .from('training_assignments')
        .select('*')
        .eq('user_id', profileId)
        .order('assigned_at', { ascending: false }),

      supabase
        .from('certificates')
        .select('*')
        .in('user_id', userIds)
        .order('issued_at', { ascending: false }),
    ]);

    if (assignmentsResult.error) {
      console.error('Error cargando dashboard worker:', assignmentsResult.error);
      setAssignments([]);
      setCertificates([]);
      setLoadError('No pudimos cargar tus trainings asignados: ' + assignmentsResult.error.message);
      setIsLoading(false);
      return;
    }

    if (certificatesResult.error) {
      console.error('Error cargando certificados worker:', certificatesResult.error);
      setAssignments([]);
      setCertificates([]);
      setLoadError('No pudimos cargar tus certificados: ' + certificatesResult.error.message);
      setIsLoading(false);
      return;
    }

    const allCertificates = ((certificatesResult.data ?? []) as WorkerCertificate[])
      .filter(certificate => {
        if (!tenantId) return true;
        return !certificate.tenant_id || certificate.tenant_id === tenantId;
      })
      .sort((a, b) => {
        const dateA = new Date(a.issued_at || a.created_at || '').getTime();
        const dateB = new Date(b.issued_at || b.created_at || '').getTime();

        return dateB - dateA;
      });

    const certificateByAssignmentId = new Map<string, WorkerCertificate>();
    const certificateByTrainingId = new Map<string, WorkerCertificate>();

    allCertificates.forEach(certificate => {
      if (certificate.assignment_id && !certificateByAssignmentId.has(certificate.assignment_id)) {
        certificateByAssignmentId.set(certificate.assignment_id, certificate);
      }

      if (certificate.training_id && !certificateByTrainingId.has(certificate.training_id)) {
        certificateByTrainingId.set(certificate.training_id, certificate);
      }
    });

    const trainingById = new Map(baseTrainings.map(training => [training.id, training]));

    const hydratedAssignments = ((assignmentsResult.data ?? []) as TrainingAssignment[])
      .map(row => {
        const trainingId = row.training_id as string;
        const certificate =
          certificateByAssignmentId.get(row.id) ||
          certificateByTrainingId.get(trainingId) ||
          null;

        const assignment: WorkerTrainingAssignment = {
          ...row,
          training: trainingById.get(trainingId),
          certificate,
          effective_status: certificate ? 'certificate_issued' : row.status,
        };

        return assignment;
      })
      .filter(assignment => Boolean(assignment.training)) as WorkerTrainingAssignment[];

    const sortedAssignments = hydratedAssignments.sort((a, b) => {
      const urgencyDiff = getUrgencyScore(a) - getUrgencyScore(b);

      if (urgencyDiff !== 0) return urgencyDiff;

      const aAssigned = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const bAssigned = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;

      return bAssigned - aAssigned;
    });

    setAssignments(sortedAssignments);
    setCertificates(allCertificates);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const activeAssignments = useMemo(() => {
    return assignments.filter(assignment => !isEffectivelyCompleted(assignment));
  }, [assignments]);

  const certifiedAssignments = useMemo(() => {
    return assignments.filter(assignment => isEffectivelyCompleted(assignment));
  }, [assignments]);

  const pendingCourse = activeAssignments.filter(assignment => {
    return getEffectiveStatus(assignment) === 'not_started';
  }).length;

  const inProgress = activeAssignments.filter(assignment => {
    return getEffectiveStatus(assignment) === 'in_progress';
  }).length;

  const pendingExam = activeAssignments.filter(assignment => {
    return getEffectiveStatus(assignment) === 'pending_test';
  }).length;

  const completed = assignments.filter(assignment => {
    return isEffectivelyCompleted(assignment);
  }).length;

  const overdueCount = activeAssignments.filter(assignment => {
    return getDueDateInfo(assignment.due_date).isOverdue;
  }).length;

  const dueSoonCount = activeAssignments.filter(assignment => {
    const dueInfo = getDueDateInfo(assignment.due_date);
    return dueInfo.isDueSoon && !dueInfo.isOverdue;
  }).length;

  const nextDeadlineAssignment = activeAssignments
    .filter(assignment => Boolean(assignment.due_date))
    .sort((a, b) => {
      return getDueDateTimestamp(a.due_date) - getDueDateTimestamp(b.due_date);
    })[0];

  const now = new Date();
  const inThirtyDays = new Date();
  inThirtyDays.setDate(now.getDate() + 30);

  const expiringSoon = certificates.filter(certificate => {
    if (!certificate.expires_at) return false;

    const expiresAt = new Date(certificate.expires_at);

    return expiresAt >= now && expiresAt <= inThirtyDays;
  }).length;

  const avgProgress = assignments.length
    ? Math.round(
        assignments.reduce((sum, assignment) => {
          return sum + getEffectiveProgress(assignment);
        }, 0) / assignments.length
      )
    : 0;

  const recentCertifiedAssignments = certifiedAssignments.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
          Cargando tu dashboard...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />

          <div>
            <div className="font-semibold">No pudimos cargar tu dashboard</div>
            <div className="text-red-200/90">{loadError}</div>

            <button
              onClick={loadDashboardData}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
            >
              <RefreshCw size={13} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(overdueCount > 0 || dueSoonCount > 0 || pendingExam > 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />

          <div>
            <div className="text-sm font-semibold text-amber-300">
              Tenés trainings que requieren atención
            </div>

            <p className="text-xs text-steel-400 mt-1">
              {overdueCount > 0 && `${overdueCount} vencido(s). `}
              {dueSoonCount > 0 && `${dueSoonCount} con deadline próximo. `}
              {pendingExam > 0 && `${pendingExam} pendiente(s) de examen. `}
              {nextDeadlineAssignment?.due_date &&
                `Próximo deadline: ${formatDateAR(nextDeadlineAssignment.due_date)}.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleMetricCard
          title="Pendientes"
          value={pendingCourse}
          icon={<Clock size={20} />}
          subtitle={overdueCount > 0 ? `${overdueCount} vencido(s)` : undefined}
          tone={pendingCourse > 0 || overdueCount > 0 ? 'danger' : 'neutral'}
        />

        <SimpleMetricCard
          title="En curso"
          value={inProgress}
          icon={<Play size={20} />}
          subtitle={dueSoonCount > 0 ? `${dueSoonCount} deadline próximo` : undefined}
          tone={dueSoonCount > 0 ? 'warning' : 'neutral'}
        />

        <SimpleMetricCard
          title="Pendientes de examen"
          value={pendingExam}
          icon={<AlertTriangle size={20} />}
          subtitle={pendingExam > 0 ? 'Listos para rendir' : undefined}
          tone={pendingExam > 0 ? 'danger' : 'neutral'}
        />

        <SimpleMetricCard
          title="Certificados"
          value={certificates.length || completed}
          icon={<Award size={20} />}
          subtitle={expiringSoon > 0 ? expiringSoon + ' próximos a vencer' : undefined}
          tone="success"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-steel-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" />
            Tu progreso general
          </h3>

          <span className="text-2xl font-bold text-amber-400">
            {avgProgress}%
          </span>
        </div>

        <div className="progress-bar h-2.5">
          <div className="progress-fill h-full" style={{ width: avgProgress + '%' }} />
        </div>

        <div className="flex justify-between text-xs text-steel-500 mt-2">
          <span>{completed} completados</span>
          <span>{assignments.length} total</span>
        </div>
      </div>

      {assignments.length === 0 && (
        <div className="card text-center py-10">
          <BookOpen size={32} className="mx-auto mb-3 text-steel-500 opacity-60" />

          <div className="text-sm font-semibold text-steel-200 mb-1">
            Todavía no tenés trainings asignados
          </div>

          <p className="text-xs text-steel-500">
            Cuando tu empresa te asigne un training, va a aparecer acá.
          </p>
        </div>
      )}

      {activeAssignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-steel-300">
            Trainings pendientes y en curso
          </h3>

          {activeAssignments.map(assignment => {
            const dueInfo = getDueDateInfo(assignment.due_date);
            const progress = getEffectiveProgress(assignment);
            const pill = getStatusPill(assignment);
            const status = getEffectiveStatus(assignment);
            const isPendingExam = status === 'pending_test';

            return (
              <div
                key={assignment.id}
                className={`card hover:border-amber-500/40 transition-all cursor-pointer ${
                  dueInfo.isOverdue
                    ? 'border-red-500/40'
                    : dueInfo.isDueSoon
                      ? 'border-amber-500/40'
                      : ''
                }`}
                onClick={() => onNavigate(getActionView(assignment), { assignment })}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-petroleum-200" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="text-sm font-semibold text-steel-100 leading-snug">
                        {assignment.training?.title}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pill.className}`}>
                          {pill.label}
                        </span>

                        {dueInfo.isDueSoon && !dueInfo.isOverdue && !isPendingExam && (
                          <span className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            Deadline próximo
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-steel-500 line-clamp-2 mb-3">
                      {assignment.training?.description}
                    </p>

                    {assignment.due_date && (
                      <div
                        className={`flex items-center gap-2 text-xs mb-3 ${
                          dueInfo.isOverdue || status === 'not_started'
                            ? 'text-red-300'
                            : dueInfo.isDueSoon
                              ? 'text-amber-300'
                              : 'text-steel-400'
                        }`}
                      >
                        <CalendarDays size={13} className="flex-shrink-0" />

                        <span>
                          Fecha límite: {formatDateAR(assignment.due_date)}
                          {dueInfo.daysRemaining === 0
                            ? ' · vence hoy'
                            : dueInfo.daysRemaining && dueInfo.daysRemaining > 0
                              ? ` · faltan ${dueInfo.daysRemaining} días`
                              : dueInfo.isOverdue
                                ? ' · vencido'
                                : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="progress-bar flex-1">
                        <div
                          className="progress-fill"
                          style={{ width: progress + '%' }}
                        />
                      </div>

                      <span className="text-xs text-steel-400 flex-shrink-0">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto sm:flex-shrink-0">
                    <button
                      className={`w-full sm:w-auto text-xs py-2 px-3 ${
                        status === 'pending_test' || status === 'not_started'
                          ? 'btn-primary'
                          : 'btn-secondary'
                      }`}
                      onClick={event => {
                        event.stopPropagation();
                        onNavigate(getActionView(assignment), { assignment });
                      }}
                    >
                      {getActionLabel(assignment)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeAssignments.length === 0 && assignments.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />

          <div>
            <div className="text-sm font-semibold text-emerald-300">
              No tenés trainings pendientes
            </div>

            <p className="text-xs text-steel-400 mt-1">
              Tus trainings asignados figuran como completados o con certificado emitido.
            </p>
          </div>
        </div>
      )}

      {recentCertifiedAssignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-steel-300">
              Certificados recientes
            </h3>

            <button
              onClick={() => onNavigate('worker-certificates')}
              className="btn-ghost text-xs"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2">
            {recentCertifiedAssignments.map(assignment => (
              <div
                key={`certified-${assignment.id}`}
                className="rounded-xl border border-steel-700 bg-steel-900/60 p-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Award size={18} className="text-emerald-300" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-steel-100">
                      {assignment.training?.title}
                    </div>

                    <div className="text-xs text-steel-500 mt-0.5">
                      {assignment.certificate?.certificate_code
                        ? `Certificado ${assignment.certificate.certificate_code}`
                        : 'Certificado emitido'}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('worker-certificates', { assignment })}
                    className="btn-secondary text-xs w-full sm:w-auto"
                  >
                    <FileText size={13} />
                    Ver certificado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiringSoon > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />

          <div>
            <div className="text-sm font-semibold text-amber-300">
              Certificados próximos a vencer
            </div>

            <p className="text-xs text-steel-400 mt-1">
              Tenés {expiringSoon} certificado(s) que vencen pronto. Verificá tus certificados y renovalos a tiempo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
