import React, { useEffect, useState } from 'react';
import {
  Play,
  BookOpen,
  Clock,
  Award,
  RefreshCw,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

interface WorkerTrainingsProps {
  onNavigate: (view: string, data?: unknown) => void;
}

type WorkerTrainingAssignment = TrainingAssignment & {
  training?: Training;
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

const getUrgencyScore = (assignment: WorkerTrainingAssignment) => {
  if (assignment.status === 'certificate_issued') return 999;

  const dueInfo = getDueDateInfo(assignment.due_date);

  if (dueInfo.isOverdue) return -100;
  if (dueInfo.isDueSoon) return -50;

  if (dueInfo.daysRemaining !== null) return dueInfo.daysRemaining;

  return 500;
};

export default function WorkerTrainings({ onNavigate }: WorkerTrainingsProps) {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<WorkerTrainingAssignment[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAssignments = async () => {
    if (!user?.id) {
      setAssignments([]);
      setIsLoading(false);
      setLoadError('No pudimos identificar tu usuario.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('training_assignments')
      .select('*')
      .eq('user_id', user.id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error cargando trainings asignados:', error);
      setAssignments([]);
      setLoadError(`No pudimos cargar tus trainings asignados: ${error.message}`);
      setIsLoading(false);
      return;
    }

    const trainingById = new Map(baseTrainings.map(training => [training.id, training]));

    const hydratedAssignments = (data ?? [])
      .map(row => ({
        ...(row as TrainingAssignment),
        training: trainingById.get(row.training_id as string),
      }))
      .filter(a => Boolean(a.training)) as WorkerTrainingAssignment[];

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
    loadAssignments();
  }, [user?.id]);

  const filtered = assignments.filter(a =>
    statusFilter === 'all' || a.status === statusFilter
  );

  const getActionLabel = (a: WorkerTrainingAssignment) => {
    if (a.status === 'not_started') return 'Comenzar';
    if (a.status === 'pending_test') return 'Rendir test';
    if (a.status === 'certificate_issued') return 'Ver certificado';
    return 'Continuar';
  };

  const getActionView = (a: WorkerTrainingAssignment) => {
    if (a.status === 'pending_test') return 'worker-test';
    if (a.status === 'certificate_issued') return 'worker-certificates';
    return 'worker-player';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
        <div className="text-sm font-semibold text-steel-100">
          Mis trainings asignados
        </div>
        <div className="text-xs text-steel-500">
          Acá vas a ver los cursos que tu empresa te asignó para completar.
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
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === sf.value
                    ? 'bg-amber-500 text-petroleum-950'
                    : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
                }`}
              >
                {sf.label} (
                {sf.value === 'all'
                  ? assignments.length
                  : assignments.filter(a => a.status === sf.value).length}
                )
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
              {filtered.map(a => {
                const dueInfo = getDueDateInfo(a.due_date);
                const isCompleted = a.status === 'certificate_issued';

                return (
                  <div
                    key={a.id}
                    className={`card hover:border-steel-600 transition-all ${
                      dueInfo.isOverdue && !isCompleted
                        ? 'border-red-500/40'
                        : dueInfo.isDueSoon && !isCompleted
                          ? 'border-amber-500/40'
                          : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen size={20} className="text-petroleum-200" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-steel-100 mb-1">
                          {a.training?.title}
                        </div>

                        <p className="text-xs text-steel-400 line-clamp-2 mb-2">
                          {a.training?.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge badge-neutral flex items-center gap-1">
                            <Clock size={9} /> {a.training?.duration_minutes} min
                          </span>

                          {a.training?.category && (
                            <span className="badge badge-info">
                              {a.training.category}
                            </span>
                          )}

                          {a.training?.certificate_enabled && (
                            <span className="badge badge-warning flex items-center gap-1">
                              <Award size={9} /> Certifica
                            </span>
                          )}

                          {dueInfo.isOverdue && !isCompleted && (
                            <span className="badge bg-red-500/15 text-red-300 border border-red-500/30">
                              Vencido
                            </span>
                          )}

                          {dueInfo.isDueSoon && !dueInfo.isOverdue && !isCompleted && (
                            <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Vence pronto
                            </span>
                          )}
                        </div>
                      </div>

                      <StatusBadge status={a.status} />
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-steel-400 mb-1.5">
                        <span>Progreso</span>
                        <span>{a.progress_percentage ?? 0}%</span>
                      </div>

                      <div className="progress-bar h-2">
                        <div
                          className="progress-fill h-full"
                          style={{ width: `${a.progress_percentage ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 mb-4">
                      <div className="text-xs text-steel-500">
                        Asignado:{' '}
                        {a.assigned_at
                          ? new Date(a.assigned_at).toLocaleDateString('es-AR')
                          : 'Sin fecha'}
                      </div>

                      <div
                        className={`flex items-center gap-1.5 text-xs ${
                          dueInfo.isOverdue && !isCompleted
                            ? 'text-red-300'
                            : dueInfo.isDueSoon && !isCompleted
                              ? 'text-amber-300'
                              : 'text-steel-400'
                        }`}
                      >
                        <CalendarDays size={13} />
                        <span>
                          Fecha límite: {formatDateAR(a.due_date)}
                          {dueInfo.daysRemaining === 0 && !isCompleted
                            ? ' · vence hoy'
                            : dueInfo.daysRemaining && dueInfo.daysRemaining > 0 && !isCompleted
                              ? ` · faltan ${dueInfo.daysRemaining} días`
                              : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate(getActionView(a), { assignment: a })}
                      className="btn-primary w-full justify-center py-2.5"
                    >
                      <Play size={14} /> {getActionLabel(a)}
                    </button>
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
