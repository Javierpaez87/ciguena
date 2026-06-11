import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  BellRing,
  ClipboardList,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'not_started', label: 'No iniciado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'pending_test', label: 'Pendiente test' },
  { value: 'passed', label: 'Aprobado' },
  { value: 'failed', label: 'Reprobado' },
  { value: 'certificate_issued', label: 'Certificado emitido' },
  { value: 'expired', label: 'Vencido' },
];

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
  assigned_at?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
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

function getInitial(profile?: Profile | null) {
  return getFullName(profile).trim().charAt(0).toUpperCase() || 'U';
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

function getAssignmentProgress(assignment: Assignment) {
  const directProgress =
    assignment.progress_percentage ??
    assignment.progress ??
    assignment.completion_percentage ??
    null;

  if (typeof directProgress === 'number') {
    return Math.max(0, Math.min(100, Math.round(directProgress)));
  }

  const status = normalize(assignment.status);

  if (['completed', 'passed', 'certificate_issued', 'approved'].includes(status)) return 100;
  if (['in_progress', 'started', 'pending_test'].includes(status)) return 50;

  return 0;
}

function getAssignedDate(assignment: Assignment) {
  return assignment.assigned_at || assignment.created_at || assignment.updated_at || null;
}

function formatDate(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('es-AR');
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((a, b) => {
    const dateA = new Date(
      a.assigned_at || a.created_at || a.updated_at || a.completed_at || ''
    ).getTime();

    const dateB = new Date(
      b.assigned_at || b.created_at || b.updated_at || b.completed_at || ''
    ).getTime();

    return dateB - dateA;
  });
}

function isReminderEligible(status?: string | null) {
  return ['not_started', 'in_progress', 'pending_test', 'assigned', 'started'].includes(
    normalize(status)
  );
}

export default function AdminAssignments() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [remindSent, setRemindSent] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadAssignments() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [assignmentsResult, usersResult, trainingsResult] = await Promise.all([
        supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (trainingsResult.error) throw trainingsResult.error;

      const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];
      const loadedUsers = (usersResult.data ?? []) as Profile[];
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

      setAssignments(sortAssignments(hydratedAssignments));
    } catch (error) {
      console.error('Error loading assignments:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las asignaciones desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [tenantId]);

  const filtered = useMemo(() => {
    const searchValue = normalize(search);

    return assignments.filter((assignment) => {
      const status = normalize(assignment.status);

      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const userName = getFullName(assignment.user);
      const userEmail = assignment.user?.email || '';
      const userArea = assignment.user?.area || '';
      const userPosition = assignment.user?.position || '';
      const trainingTitle = getTrainingTitle(assignment.training, assignment);

      const matchesSearch =
        !searchValue ||
        normalize(userName).includes(searchValue) ||
        normalize(userEmail).includes(searchValue) ||
        normalize(userArea).includes(searchValue) ||
        normalize(userPosition).includes(searchValue) ||
        normalize(trainingTitle).includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [assignments, search, statusFilter]);

  function getStatusCount(statusValue: string) {
    if (statusValue === 'all') return assignments.length;

    return assignments.filter((assignment) => normalize(assignment.status) === statusValue).length;
  }

  function sendReminder(id: string) {
    setRemindSent((previous) => new Set([...previous, id]));

    setSuccessMessage('Reminder marcado como enviado. El envío real por email/WhatsApp se conecta después.');

    setTimeout(() => {
      setRemindSent((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }, 3000);
  }

  function sendBulkReminder() {
    const eligible = filtered.filter((assignment) => isReminderEligible(assignment.status));

    if (eligible.length === 0) {
      setErrorMessage('No hay asignaciones pendientes en este filtro para enviar reminder.');
      setSuccessMessage(null);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(
      `Reminder masivo preparado para ${eligible.length} usuario(s). El envío real se conecta después.`
    );

    setRemindSent((previous) => {
      const next = new Set(previous);
      eligible.forEach((assignment) => next.add(assignment.id));
      return next;
    });

    setTimeout(() => {
      setRemindSent((previous) => {
        const next = new Set(previous);
        eligible.forEach((assignment) => next.delete(assignment.id));
        return next;
      });
    }, 3000);
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando asignaciones...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo las asignaciones reales desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && assignments.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />

          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar las asignaciones</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>

            <button onClick={loadAssignments} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(errorMessage || successMessage) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            errorMessage
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9"
            placeholder="Buscar usuario o training..."
          />
        </div>

        <div className="flex gap-2">
          <button onClick={loadAssignments} className="btn-secondary text-xs flex-shrink-0">
            <RefreshCw size={14} />
            Actualizar
          </button>

          <button onClick={sendBulkReminder} className="btn-secondary text-xs flex-shrink-0">
            <BellRing size={14} />
            Reminder masivo
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((statusFilterItem) => (
          <button
            key={statusFilterItem.value}
            onClick={() => setStatusFilter(statusFilterItem.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === statusFilterItem.value
                ? 'bg-amber-500 text-petroleum-950'
                : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
            }`}
          >
            {statusFilterItem.label}
            <span className="ml-1 opacity-70">
              ({getStatusCount(statusFilterItem.value)})
            </span>
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-steel-900 border-b border-steel-700">
                <th className="table-header">Usuario</th>
                <th className="table-header">Training</th>
                <th className="table-header hidden md:table-cell">Estado</th>
                <th className="table-header hidden lg:table-cell">Progreso</th>
                <th className="table-header hidden lg:table-cell">Asignado</th>
                <th className="table-header hidden xl:table-cell">Vence</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((assignment) => {
                const userName = getFullName(assignment.user);
                const trainingTitle = getTrainingTitle(assignment.training, assignment);
                const progress = getAssignmentProgress(assignment);
                const status = assignment.status || 'not_started';
                const assignedDate = getAssignedDate(assignment);

                return (
                  <tr key={assignment.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-petroleum-700 rounded-full flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                          {getInitial(assignment.user)}
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm font-medium text-steel-100 truncate max-w-[130px] block">
                            {userName}
                          </span>
                          {assignment.user?.email && (
                            <span className="text-xs text-steel-500 truncate max-w-[130px] block">
                              {assignment.user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="table-cell">
                      <span className="text-sm text-steel-200 truncate max-w-[180px] block">
                        {trainingTitle}
                      </span>
                    </td>

                    <td className="table-cell hidden md:table-cell">
                      <StatusBadge status={status} />
                    </td>

                    <td className="table-cell hidden lg:table-cell">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="progress-bar flex-1">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-steel-400 w-8 text-right">{progress}%</span>
                      </div>
                    </td>

                    <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                      {formatDate(assignedDate)}
                    </td>

                    <td className="table-cell hidden xl:table-cell text-xs text-steel-400">
                      {formatDate(assignment.due_date)}
                    </td>

                    <td className="table-cell text-right">
                      {isReminderEligible(status) && (
                        <button
                          onClick={() => sendReminder(assignment.id)}
                          className={`p-1.5 rounded transition-colors text-xs ${
                            remindSent.has(assignment.id)
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-steel-400 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title="Enviar reminder"
                        >
                          {remindSent.has(assignment.id) ? (
                            <BellRing size={14} />
                          ) : (
                            <Bell size={14} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="Sin asignaciones"
            description="No hay asignaciones con los filtros seleccionados."
          />
        )}
      </div>
    </div>
  );
}
