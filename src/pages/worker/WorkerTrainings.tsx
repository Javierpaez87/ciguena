import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  BookOpen,
  Clock,
  Award,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  FileText,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';
import EmptyState from '../../components/ui/EmptyState';

interface WorkerTrainingsProps {
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

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'not_started', label: 'Pendientes' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'pending_test', label: 'Para rendir' },
  { value: 'certificate_issued', label: 'Completados' },
];

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

const getDueDateTimestamp = (dueDate?: string | null) => {
  if (!dueDate) return Number.POSITIVE_INFINITY;

  const [year, month, day] = dueDate.split('-').map(Number);

  if (!year || !month || !day) return Number.POSITIVE_INFINITY;

  return new Date(year, month - 1, day).getTime();
};

const isCompletedStatus = (status?: string | null) => {
  return (
    status === 'completed' ||
    status === 'passed' ||
    status === 'certificate_issued'
  );
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

const getPrimaryActionLabel = (assignment: WorkerTrainingAssignment) => {
  const status = getEffectiveStatus(assignment);

  if (hasCertificate(assignment) || status === 'certificate_issued') return 'Ver certificado';
  if (status === 'not_started') return 'Comenzar';
  if (status === 'pending_test') return 'Rendir test';
  return 'Continuar';
};

const getPrimaryActionView = (assignment: WorkerTrainingAssignment) => {
  const status = getEffectiveStatus(assignment);

  if (hasCertificate(assignment) || status === 'certificate_issued') {
    return 'worker-certificates';
  }

  if (status === 'pending_test') return 'worker-test';

  return 'worker-player';
};

export default function WorkerTrainings({ onNavigate }: WorkerTrainingsProps) {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<WorkerTrainingAssignment[]>([]);
  const [certificates, setCertificates] = useState<WorkerCertificate[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAssignments = async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('authError:', authError);
      setAssignments([]);
      setCertificates([]);
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
      setCertificates([]);
      setLoadError('No pudimos encontrar tu perfil de trabajador.');
      setIsLoading(false);
      return;
    }

    const profileId = profile.id as string;
    const tenantId = profile.tenant_id as string | null;
    const userIds = Array.from(new Set([profileId, authUserId].filter(Boolean)));

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
      console.error('Error cargando trainings asignados:', assignmentsResult.error);
      setAssignments([]);
      setCertificates([]);
      setLoadError(`No pudimos cargar tus trainings asignados: ${assignmentsResult.error.message}`);
      setIsLoading(false);
      return;
    }

    if (certificatesResult.error) {
      console.error('Error cargando certificados:', certificatesResult.error);
      setAssignments([]);
      setCertificates([]);
      setLoadError(`No pudimos cargar tus certificados: ${certificatesResult.error.message}`);
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

      const aDue = getDueDateTimestamp(a.due_date);
      const bDue = getDueDateTimestamp(b.due_date);

      if (aDue !== bDue) return aDue - bDue;

      const aAssigned = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const bAssigned = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;

      return bAssigned - aAssigned;
    });

    setAssignments(sortedAssignments);
    setCertificates(allCertificates);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAssignments();
  }, [user?.id]);

  const filterCounts = useMemo(() => {
    return STATUS_FILTERS.reduce<Record<string, number>>((acc, filter) => {
      if (filter.value === 'all') {
        acc[filter.value] = assignments.length;
        return acc;
      }

      if (filter.value === 'certificate_issued') {
        acc[filter.value] = assignments.filter(assignment =>
          isEffectivelyCompleted(assignment)
        ).length;

        return acc;
      }

      acc[filter.value] = assignments.filter(assignment => {
        return getEffectiveStatus(assignment) === filter.value && !isEffectivelyCompleted(assignment);
      }).length;

      return acc;
    }, {});
  }, [assignments]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return assignments;

    if (statusFilter === 'certificate_issued') {
      return assignments.filter(assignment => isEffectivelyCompleted(assignment));
    }

    return assignments.filter(assignment => {
      return getEffectiveStatus(assignment) === statusFilter && !isEffectivelyCompleted(assignment);
    });
  }, [assignments, statusFilter]);

  const completedCount = assignments.filter(assignment => isEffectivelyCompleted(assignment)).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
        <div className="text-sm font-semibold text-steel-100">
          Mis trainings asignados
        </div>
        <div className="text-xs text-steel-500">
          Acá vas a ver los cursos que tu empresa te asignó para completar. Si ya existe certificado,
          el training figura como completado aunque la asignación haya quedado pendiente.
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
          Cargando tus trainings asignados...
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">No pudimos cargar tus trainings</div>
            <div className="text-red-200/90">{loadError}</div>

            <button
              onClick={loadAssignments}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
            >
              <RefreshCw size={13} />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
              <div className="text-xs text-steel-500">Total asignados</div>
              <div className="text-xl font-bold text-steel-100 mt-1">{assignments.length}</div>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <div className="text-xs text-red-300">Pendientes</div>
              <div className="text-xl font-bold text-red-200 mt-1">
                {(filterCounts.not_started ?? 0) + (filterCounts.pending_test ?? 0)}
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
              <div className="text-xs text-blue-300">En curso</div>
              <div className="text-xl font-bold text-blue-200 mt-1">
                {filterCounts.in_progress ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-300">Completados</div>
              <div className="text-xl font-bold text-emerald-200 mt-1">
                {completedCount}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(statusItem => (
              <button
                key={statusItem.value}
                onClick={() => setStatusFilter(statusItem.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === statusItem.value
                    ? 'bg-amber-500 text-petroleum-950'
                    : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
                }`}
              >
                {statusItem.label} ({filterCounts[statusItem.value] ?? 0})
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title="Sin trainings"
              description={
                assignments.length === 0
                  ? 'Todavía no tenés trainings asignados.'
                  : 'No tenés trainings con ese estado.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(assignment => {
                const dueInfo = getDueDateInfo(assignment.due_date);
                const isCompleted = isEffectivelyCompleted(assignment);
                const progress = getEffectiveProgress(assignment);
                const statusPill = getStatusPill(assignment);
                const effectiveStatus = getEffectiveStatus(assignment);
                const issuedDate = assignment.certificate?.issued_at || assignment.certificate?.created_at;
                const expiresDate = assignment.certificate?.expires_at;

                return (
                  <div
                    key={assignment.id}
                    className={`card hover:border-steel-600 transition-all ${
                      dueInfo.isOverdue && !isCompleted
                        ? 'border-red-500/40'
                        : dueInfo.isDueSoon && !isCompleted
                          ? 'border-amber-500/40'
                          : isCompleted
                            ? 'border-emerald-500/20'
                            : ''
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : 'bg-petroleum-700'
                          }`}
                        >
                          {isCompleted ? (
                            <Award size={20} className="text-emerald-300" />
                          ) : (
                            <BookOpen size={20} className="text-petroleum-200" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-base font-semibold text-steel-100 mb-1 leading-snug">
                            {assignment.training?.title}
                          </div>

                          <p className="text-xs text-steel-400 line-clamp-2 mb-2">
                            {assignment.training?.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPill.className}`}
                            >
                              {statusPill.label}
                            </span>

                            <span className="badge badge-neutral flex items-center gap-1">
                              <Clock size={9} /> {assignment.training?.duration_minutes} min
                            </span>

                            {assignment.training?.category && (
                              <span className="badge badge-info">
                                {assignment.training.category}
                              </span>
                            )}

                            {assignment.training?.certificate_enabled && (
                              <span className="badge badge-warning flex items-center gap-1">
                                <Award size={9} /> Certifica
                              </span>
                            )}

                            {dueInfo.isDueSoon && !dueInfo.isOverdue && !isCompleted && effectiveStatus !== 'pending_test' && (
                              <span className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                                Vence pronto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-steel-400 mb-1.5">
                          <span>Progreso</span>
                          <span>{progress}%</span>
                        </div>

                        <div className="progress-bar h-2">
                          <div
                            className="progress-fill h-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-steel-500">
                          Asignado:{' '}
                          {assignment.assigned_at
                            ? new Date(assignment.assigned_at).toLocaleDateString('es-AR')
                            : 'Sin fecha'}
                        </div>

                        {!isCompleted && assignment.due_date && (
                          <div
                            className={`flex items-center gap-1.5 text-xs ${
                              dueInfo.isOverdue || effectiveStatus === 'not_started' || effectiveStatus === 'pending_test'
                                ? 'text-red-300'
                                : dueInfo.isDueSoon
                                  ? 'text-amber-300'
                                  : 'text-steel-400'
                            }`}
                          >
                            <CalendarDays size={13} />
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

                        {isCompleted && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                              <CheckCircle2 size={13} />
                              <span>
                                Certificado emitido
                                {issuedDate ? ` el ${new Date(issuedDate).toLocaleDateString('es-AR')}` : ''}
                              </span>
                            </div>

                            {expiresDate && (
                              <div className="flex items-center gap-1.5 text-xs text-steel-400">
                                <CalendarDays size={13} />
                                <span>
                                  Vence: {new Date(expiresDate).toLocaleDateString('es-AR')}
                                </span>
                              </div>
                            )}

                            {assignment.certificate?.certificate_code && (
                              <div className="text-xs text-steel-500">
                                Código: {assignment.certificate.certificate_code}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isCompleted ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => onNavigate('worker-certificates', { assignment })}
                            className="btn-primary w-full justify-center py-2.5"
                          >
                            <FileText size={14} />
                            Ver certificado
                          </button>

                          <button
                            onClick={() =>
                              onNavigate('worker-test', {
                                assignment,
                                forceRetake: true,
                              })
                            }
                            className="btn-secondary w-full justify-center py-2.5"
                          >
                            <RotateCcw size={14} />
                            Volver a rendir
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onNavigate(getPrimaryActionView(assignment), { assignment })}
                          className={`w-full justify-center py-2.5 ${
                            effectiveStatus === 'not_started' || effectiveStatus === 'pending_test'
                              ? 'btn-primary'
                              : 'btn-secondary'
                          }`}
                        >
                          <Play size={14} />
                          {getPrimaryActionLabel(assignment)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
