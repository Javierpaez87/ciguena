import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';

interface WorkerDashboardProps {
  onNavigate: (view: string, data?: unknown) => void;
}

type WorkerTrainingAssignment = TrainingAssignment & {
  training?: Training;
};

function SimpleMetricCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-steel-400 mb-1">{title}</div>
          <div className="text-2xl font-bold text-steel-100">{value}</div>
          {subtitle && (
            <div className="text-xs text-amber-300 mt-1">{subtitle}</div>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-steel-800 flex items-center justify-center text-amber-400">
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

const getUrgencyScore = (assignment: WorkerTrainingAssignment) => {
  if (isCompletedStatus(assignment.status)) return 999;

  const dueInfo = getDueDateInfo(assignment.due_date);

  if (dueInfo.isOverdue) return -100;
  if (dueInfo.isDueSoon) return -50;
  if (dueInfo.daysRemaining !== null) return dueInfo.daysRemaining;

  return 500;
};

export default function WorkerDashboard({ onNavigate }: WorkerDashboardProps) {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<WorkerTrainingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('authError:', authError);
      setAssignments([]);
      setLoadError('No pudimos identificar tu sesión.');
      setIsLoading(false);
      return;
    }

    const authUserId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, email, full_name, tenant_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (profileError || !profile) {
      console.error('profileError:', profileError);
      setAssignments([]);
      setLoadError('No pudimos encontrar tu perfil de trabajador.');
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('training_assignments')
      .select('*')
      .eq('user_id', profile.id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error cargando dashboard worker:', error);
      setAssignments([]);
      setLoadError('No pudimos cargar tus trainings asignados: ' + error.message);
      setIsLoading(false);
      return;
    }

    const trainingById = new Map(baseTrainings.map(training => [training.id, training]));

    const hydratedAssignments = (data ?? [])
      .map(row => {
        const trainingId = row.training_id as string;

        return {
          ...(row as TrainingAssignment),
          training: trainingById.get(trainingId),
        };
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
    setIsLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const pendingCourse = assignments.filter(assignment => {
    return assignment.status === 'not_started';
  }).length;

  const inProgress = assignments.filter(assignment => {
    return assignment.status === 'in_progress';
  }).length;

  const pendingExam = assignments.filter(assignment => {
    return assignment.status === 'pending_test';
  }).length;

  const completed = assignments.filter(assignment => {
    return isCompletedStatus(assignment.status);
  }).length;

  const certificates = assignments.filter(assignment => {
    return assignment.status === 'certificate_issued';
  });

  const activeAssignments = assignments.filter(assignment => {
    return !isCompletedStatus(assignment.status);
  });

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

  const expiringSoon = certificates.filter(assignment => {
    if (!assignment.expires_at) return false;

    const expiresAt = new Date(assignment.expires_at);

    return expiresAt >= now && expiresAt <= inThirtyDays;
  }).length;

  const avgProgress = assignments.length
    ? Math.round(
        assignments.reduce((sum, assignment) => {
          return sum + (assignment.progress_percentage ?? 0);
        }, 0) / assignments.length
      )
    : 0;

  const getActionLabel = (assignment: WorkerTrainingAssignment) => {
    if (assignment.status === 'not_started') return 'Comenzar';
    if (assignment.status === 'pending_test') return 'Examen no disponible';
    if (assignment.status === 'certificate_issued') return 'Ver certificado';
    return 'Continuar';
  };

  const getActionView = (assignment: WorkerTrainingAssignment) => {
    if (assignment.status === 'pending_test') return 'worker-trainings';
    if (assignment.status === 'certificate_issued') return 'worker-certificates';
    return 'worker-player';
  };

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
          title="Pendientes de curso"
          value={pendingCourse}
          icon={<Clock size={20} />}
          subtitle={overdueCount > 0 ? `${overdueCount} vencido(s)` : undefined}
        />

        <SimpleMetricCard
          title="En curso"
          value={inProgress}
          icon={<Play size={20} />}
          subtitle={dueSoonCount > 0 ? `${dueSoonCount} deadline próximo` : undefined}
        />

        <SimpleMetricCard
          title="Pendientes de examen"
          value={pendingExam}
          icon={<AlertTriangle size={20} />}
          subtitle={pendingExam > 0 ? 'Exámenes aún no cargados' : undefined}
        />

        <SimpleMetricCard
          title="Certificados"
          value={certificates.length}
          icon={<Award size={20} />}
          subtitle={expiringSoon > 0 ? expiringSoon + ' próximos a vencer' : undefined}
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
            const isPendingExam = assignment.status === 'pending_test';

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
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-petroleum-200" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-steel-100 truncate">
                        {assignment.training?.title}
                      </div>

                      {isPendingExam && (
                        <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Pendiente de examen
                        </span>
                      )}

                      {dueInfo.isOverdue && (
                        <span className="badge bg-red-500/15 text-red-300 border border-red-500/30">
                          Vencido
                        </span>
                      )}

                      {dueInfo.isDueSoon && !dueInfo.isOverdue && (
                        <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Deadline próximo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-steel-500 line-clamp-1 mb-2">
                      {assignment.training?.description}
                    </p>

                    {isPendingExam && (
                      <div className="text-xs text-amber-300 mb-2">
                        Ya completaste el contenido. El examen todavía no está disponible.
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs mb-2">
                      <CalendarDays size={13} className="text-red-300" />

                      <span className="text-red-300">
                        Fecha límite: {formatDateAR(assignment.due_date)}
                        {dueInfo.daysRemaining === 0
                          ? ' · vence hoy'
                          : dueInfo.daysRemaining && dueInfo.daysRemaining > 0
                            ? ` · faltan ${dueInfo.daysRemaining} días`
                            : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="progress-bar flex-1">
                        <div
                          className="progress-fill"
                          style={{ width: (assignment.progress_percentage ?? 0) + '%' }}
                        />
                      </div>

                      <span className="text-xs text-steel-400 flex-shrink-0">
                        {assignment.progress_percentage ?? 0}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={assignment.status} />

                    <button
                      className={`text-xs py-1 px-3 ${
                        isPendingExam
                          ? 'rounded-lg border border-amber-500/30 text-amber-300 cursor-not-allowed'
                          : 'btn-primary'
                      }`}
                      disabled={isPendingExam}
                      onClick={event => {
                        event.stopPropagation();

                        if (isPendingExam) return;

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
