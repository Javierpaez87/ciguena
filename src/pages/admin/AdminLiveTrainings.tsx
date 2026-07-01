import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Video,
  XCircle,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

import type {
  LiveAttendanceStatus,
  LiveTraining,
  LiveTrainingParticipant,
  Profile,
} from '../../types';

import {
  addLiveTrainingParticipants,
  createLiveTraining,
  evaluateLiveTrainingAttendance,
  getAdminDeletedLiveTrainings,
  getAdminLiveTrainings,
  getLiveTrainingParticipants,
  getLiveTrainingStats,
  getTenantWorkersForLiveTraining,
  replaceLiveTrainingParticipants,
  restoreLiveTraining,
  softDeleteLiveTraining,
  updateLiveTraining,
  type LiveTrainingParticipantWithUser,
  type LiveTrainingStats,
} from '../../services/liveTrainingService';

interface AdminLiveTrainingsProps {
  onNavigate?: (view: string) => void;
}

interface LiveTrainingFormState {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  hasExam: boolean;
  certificateEnabled: boolean;
  asyncRecoveryEnabled: boolean;
  lateToleranceMinutes: number;
}

type ActiveSection = 'active' | 'trash';

const initialFormState: LiveTrainingFormState = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  hasExam: false,
  certificateEnabled: true,
  asyncRecoveryEnabled: true,
  lateToleranceMinutes: 15,
};

const DEFAULT_TRAINING_DURATION_MINUTES = 60;
const TIME_OPTION_INTERVAL_MINUTES = 15;
const DATE_OPTION_DAYS_AHEAD = 180;

function addMinutesToTime(time: string, minutesToAdd: number) {
  if (!time) return '';

  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';

  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalizedMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 45));
  const nextHours = Math.floor(normalizedMinutes / 60);
  const nextMinutes = normalizedMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function isEndTimeBeforeOrEqualStart(startTime: string, endTime: string) {
  if (!startTime || !endTime) return false;

  return endTime <= startTime;
}

function buildTimeOptions() {
  const options: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_OPTION_INTERVAL_MINUTES) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }

  return options;
}

function buildDateOptions() {
  return Array.from({ length: DATE_OPTION_DAYS_AHEAD }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const value = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return { value, label };
  });
}

const attendanceLabels: Record<LiveAttendanceStatus, string> = {
  invited: 'Invitado',
  on_time: 'On time',
  late: 'Tarde',
  absent: 'No asistió',
  invalid_after_event: 'Fuera de horario',
  excused_manual: 'Justificado manual',
};

const attendanceClasses: Record<LiveAttendanceStatus, string> = {
  invited: 'bg-steel-700 text-steel-200 border-steel-600',
  on_time: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  late: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  absent: 'bg-red-500/10 text-red-300 border-red-500/30',
  invalid_after_event: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  excused_manual: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'details' in error &&
    typeof (error as { details?: unknown }).details === 'string'
  ) {
    return (error as { details: string }).details;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Ocurrió un error inesperado.';
  }
}

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalDateTimeIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function toDateInputValue(value?: string | null) {
  if (!value) return getTodayInputDate();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return getTodayInputDate();

  return parsed.toISOString().slice(0, 10);
}

function toTimeInputValue(value?: string | null) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value?: string | null) {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProfileName(profile?: Profile | null) {
  if (!profile) return 'Usuario sin nombre';

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Usuario sin nombre'
  );
}

function getProfileSubtitle(profile?: Profile | null) {
  if (!profile) return '';

  return (
    profile.job_role ||
    profile.work_role ||
    profile.position ||
    profile.area ||
    profile.email ||
    ''
  );
}

function isPastTraining(training: LiveTraining) {
  return new Date(training.ends_at).getTime() < Date.now();
}

function getTrainingStatusLabel(training: LiveTraining) {
  if (training.status === 'draft') return 'Borrador';
  if (training.status === 'scheduled') return 'Programada';
  if (training.status === 'completed') return 'Finalizada';
  if (training.status === 'closed') return 'Cerrada';
  if (training.status === 'cancelled') return 'Cancelada';
  return training.status;
}

function getTrainingStatusClass(training: LiveTraining) {
  if (training.status === 'scheduled') {
    return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
  }

  if (training.status === 'completed' || training.status === 'closed') {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  }

  if (training.status === 'cancelled') {
    return 'bg-red-500/10 text-red-300 border-red-500/30';
  }

  return 'bg-steel-700 text-steel-200 border-steel-600';
}

function getCalendarStatusLabel(training: LiveTraining) {
  if (training.calendar_status === 'created') return 'Calendar creado';
  if (training.calendar_status === 'failed') return 'Error Calendar';
  if (training.calendar_status === 'cancelled') return 'Cancelado';
  if (training.calendar_status === 'not_required') return 'No requerido';
  return 'Pendiente';
}

function getCalendarStatusClass(training: LiveTraining) {
  if (training.calendar_status === 'created') {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  }

  if (training.calendar_status === 'failed') {
    return 'bg-red-500/10 text-red-300 border-red-500/30';
  }

  return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
}

function trainingToFormState(training: LiveTraining): LiveTrainingFormState {
  return {
    title: training.title,
    description: training.description || '',
    date: toDateInputValue(training.starts_at),
    startTime: toTimeInputValue(training.starts_at),
    endTime: toTimeInputValue(training.ends_at),
    hasExam: training.has_exam,
    certificateEnabled: training.certificate_enabled,
    asyncRecoveryEnabled: training.async_recovery_enabled,
    lateToleranceMinutes: training.late_tolerance_minutes ?? 15,
  };
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-steel-700 bg-steel-800/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-steel-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-steel-100">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-steel-700 bg-steel-900 text-steel-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminLiveTrainings({ onNavigate }: AdminLiveTrainingsProps) {
  const { user, isReadOnly } = useAuth();

  const tenantId = user?.tenant_id || user?.profile?.tenant_id || null;
  const adminProfileId = user?.profile?.id || null;

  const [trainings, setTrainings] = useState<LiveTraining[]>([]);
  const [deletedTrainings, setDeletedTrainings] = useState<LiveTraining[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);

  const [selectedTraining, setSelectedTraining] = useState<LiveTraining | null>(null);
  const [participants, setParticipants] = useState<LiveTrainingParticipantWithUser[]>([]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('active');

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isEditParticipantsLoading, setIsEditParticipantsLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [form, setForm] = useState<LiveTrainingFormState>({
    ...initialFormState,
    date: getTodayInputDate(),
  });

  const [editForm, setEditForm] = useState<LiveTrainingFormState>({
    ...initialFormState,
    date: getTodayInputDate(),
  });

  const [editingTraining, setEditingTraining] = useState<LiveTraining | null>(null);

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');

  const [editSelectedWorkerIds, setEditSelectedWorkerIds] = useState<string[]>([]);
  const [editWorkerSearch, setEditWorkerSearch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedStats = useMemo<LiveTrainingStats>(() => {
    return getLiveTrainingStats(participants as LiveTrainingParticipant[]);
  }, [participants]);

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  const filteredWorkers = useMemo(() => {
    const query = workerSearch.trim().toLowerCase();

    if (!query) return workers;

    return workers.filter(worker => {
      const haystack = [
        worker.full_name,
        worker.first_name,
        worker.last_name,
        worker.email,
        worker.job_role,
        worker.work_role,
        worker.position,
        worker.area,
        worker.employee_code,
        worker.dni,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [workers, workerSearch]);

  const filteredEditWorkers = useMemo(() => {
    const query = editWorkerSearch.trim().toLowerCase();

    if (!query) return workers;

    return workers.filter(worker => {
      const haystack = [
        worker.full_name,
        worker.first_name,
        worker.last_name,
        worker.email,
        worker.job_role,
        worker.work_role,
        worker.position,
        worker.area,
        worker.employee_code,
        worker.dni,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [workers, editWorkerSearch]);

  const upcomingTrainings = useMemo(() => {
    return trainings.filter(training => !isPastTraining(training));
  }, [trainings]);

  const pastTrainings = useMemo(() => {
    return trainings.filter(training => isPastTraining(training));
  }, [trainings]);

  async function loadData() {
    if (!tenantId) {
      setIsLoading(false);
      setError('No se encontró tenant asociado al usuario.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [liveTrainings, trashTrainings, tenantWorkers] = await Promise.all([
        getAdminLiveTrainings(tenantId),
        getAdminDeletedLiveTrainings(tenantId),
        getTenantWorkersForLiveTraining(tenantId),
      ]);

      setTrainings(liveTrainings);
      setDeletedTrainings(trashTrainings);
      setWorkers(tenantWorkers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadParticipants(training: LiveTraining) {
    setSelectedTraining(training);
    setIsDetailLoading(true);
    setError(null);

    try {
      const rows = await getLiveTrainingParticipants(training.id);
      setParticipants(rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tenantId]);

  function resetCreateForm() {
    setForm({
      ...initialFormState,
      date: getTodayInputDate(),
    });
    setSelectedWorkerIds([]);
    setWorkerSearch('');
    setError(null);
    setSuccessMessage(null);
  }

  function openCreateModal() {
    resetCreateForm();
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isSaving) return;
    setCreateModalOpen(false);
  }

  async function openEditModal(training: LiveTraining) {
    setEditingTraining(training);
    setEditForm(trainingToFormState(training));
    setEditSelectedWorkerIds([]);
    setEditWorkerSearch('');
    setError(null);
    setSuccessMessage(null);
    setEditModalOpen(true);
    setIsEditParticipantsLoading(true);

    try {
      const rows = await getLiveTrainingParticipants(training.id);
      const assignedWorkerIds = rows
        .map(row => row.user_id)
        .filter((userId): userId is string => Boolean(userId));

      setEditSelectedWorkerIds(assignedWorkerIds);
    } catch (err) {
      setError(getErrorMessage(err));
      setEditSelectedWorkerIds([]);
    } finally {
      setIsEditParticipantsLoading(false);
    }
  }

  function closeEditModal() {
    if (isSaving) return;
    setEditModalOpen(false);
    setEditingTraining(null);
    setEditSelectedWorkerIds([]);
    setEditWorkerSearch('');
    setIsEditParticipantsLoading(false);
  }

  function toggleWorker(workerId: string) {
    setSelectedWorkerIds(current => {
      if (current.includes(workerId)) {
        return current.filter(id => id !== workerId);
      }

      return [...current, workerId];
    });
  }

  function selectAllFilteredWorkers() {
    const ids = filteredWorkers.map(worker => worker.id);
    setSelectedWorkerIds(current => Array.from(new Set([...current, ...ids])));
  }

  function clearSelectedWorkers() {
    setSelectedWorkerIds([]);
  }

  function toggleEditWorker(workerId: string) {
    setEditSelectedWorkerIds(current => {
      if (current.includes(workerId)) {
        return current.filter(id => id !== workerId);
      }

      return [...current, workerId];
    });
  }

  function selectAllFilteredEditWorkers() {
    const ids = filteredEditWorkers.map(worker => worker.id);
    setEditSelectedWorkerIds(current => Array.from(new Set([...current, ...ids])));
  }

  function clearEditSelectedWorkers() {
    setEditSelectedWorkerIds([]);
  }

  function handleStartTimeChange(
    value: string,
    setState: React.Dispatch<React.SetStateAction<LiveTrainingFormState>>
  ) {
    setState(current => {
      const suggestedEndTime = addMinutesToTime(value, DEFAULT_TRAINING_DURATION_MINUTES);

      return {
        ...current,
        startTime: value,
        endTime:
          !current.endTime || isEndTimeBeforeOrEqualStart(value, current.endTime)
            ? suggestedEndTime
            : current.endTime,
      };
    });
  }

  async function handleCreateTraining(event: React.FormEvent) {
    event.preventDefault();

    if (!tenantId || !adminProfileId) {
      setError('No se encontró tenant o profile admin asociado al usuario. Revisar AuthContext: necesitamos profile.id.');
      return;
    }

    if (!form.title.trim()) {
      setError('Ingresá un título para la capacitación.');
      return;
    }

    if (!form.date || !form.startTime || !form.endTime) {
      setError('Completá fecha, hora de inicio y hora de fin.');
      return;
    }

    const startsAt = toLocalDateTimeIso(form.date, form.startTime);
    const endsAt = toLocalDateTimeIso(form.date, form.endTime);

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const created = await createLiveTraining({
        tenant_id: tenantId,
        created_by: adminProfileId,
        title: form.title,
        description: form.description,
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: 'America/Argentina/Buenos_Aires',
        has_exam: form.hasExam,
        certificate_enabled: form.certificateEnabled,
        async_recovery_enabled: form.asyncRecoveryEnabled,
        late_tolerance_minutes: form.lateToleranceMinutes,
      });

      if (selectedWorkerIds.length > 0) {
        await addLiveTrainingParticipants({
          tenant_id: tenantId,
          live_training_id: created.id,
          user_ids: selectedWorkerIds,
        });
      }

      setCreateModalOpen(false);
      setSuccessMessage('Capacitación en vivo creada correctamente.');
      await loadData();
      await loadParticipants(created);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateTraining(event: React.FormEvent) {
    event.preventDefault();

    if (!editingTraining) return;

    if (!editForm.title.trim()) {
      setError('Ingresá un título para la capacitación.');
      return;
    }

    if (!editForm.date || !editForm.startTime || !editForm.endTime) {
      setError('Completá fecha, hora de inicio y hora de fin.');
      return;
    }

    const startsAt = toLocalDateTimeIso(editForm.date, editForm.startTime);
    const endsAt = toLocalDateTimeIso(editForm.date, editForm.endTime);

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateLiveTraining(editingTraining.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: 'America/Argentina/Buenos_Aires',
        has_exam: editForm.hasExam,
        certificate_enabled: editForm.certificateEnabled,
        async_recovery_enabled: editForm.asyncRecoveryEnabled,
        late_tolerance_minutes: editForm.lateToleranceMinutes,
      });

      if (tenantId) {
        await replaceLiveTrainingParticipants({
          tenant_id: tenantId,
          live_training_id: editingTraining.id,
          user_ids: editSelectedWorkerIds,
        });
      }

      setEditModalOpen(false);
      setEditingTraining(null);
      setSelectedTraining(updated);
      setSuccessMessage('Capacitación actualizada correctamente.');
      await loadData();
      await loadParticipants(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSoftDeleteTraining(training: LiveTraining) {
    if (!adminProfileId) {
      setError('No se encontró profile admin para borrar.');
      return;
    }

    const confirmed = window.confirm(
      `¿Querés enviar "${training.title}" a la papelera? Podrás restaurarla más adelante.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await softDeleteLiveTraining(training.id, adminProfileId);

      if (selectedTraining?.id === training.id) {
        setSelectedTraining(null);
        setParticipants([]);
      }

      setSuccessMessage('Capacitación enviada a la papelera.');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRestoreTraining(training: LiveTraining) {
    if (!adminProfileId) {
      setError('No se encontró profile admin para restaurar.');
      return;
    }

    setIsRestoring(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await restoreLiveTraining(training.id, adminProfileId);
      setSuccessMessage('Capacitación restaurada correctamente.');
      await loadData();
      setActiveSection('active');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleEvaluateAttendance() {
    if (!selectedTraining) return;

    setIsEvaluating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await evaluateLiveTrainingAttendance(selectedTraining.id);

      const refreshedTraining =
        trainings.find(training => training.id === selectedTraining.id) || selectedTraining;

      await loadParticipants({
        ...refreshedTraining,
        status: 'completed',
      });

      await loadData();
      setSuccessMessage('Asistencia evaluada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  }

  function renderTrainingRow(training: LiveTraining, isTrash = false) {
    const isSelected = selectedTraining?.id === training.id;

    return (
      <div
        key={training.id}
        className={`rounded-xl border p-4 transition-colors ${
          isSelected
            ? 'border-cyan-500/50 bg-cyan-500/10'
            : 'border-steel-700 bg-steel-800/70 hover:border-steel-600 hover:bg-steel-800'
        }`}
      >
        <button
          type="button"
          onClick={() => !isTrash && loadParticipants(training)}
          className="w-full text-left"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-steel-100">
                  {training.title}
                </h3>

                <Badge className={getTrainingStatusClass(training)}>
                  {getTrainingStatusLabel(training)}
                </Badge>
              </div>

              {training.description && (
                <p className="mt-1 line-clamp-2 text-xs text-steel-400">
                  {training.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-steel-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={14} />
                  {formatDateTime(training.starts_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  Fin: {formatTime(training.ends_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Video size={14} />
                  Google Meet
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge className={getCalendarStatusClass(training)}>
                {getCalendarStatusLabel(training)}
              </Badge>

              {training.has_exam && (
                <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                  Con examen
                </Badge>
              )}

              {training.async_recovery_enabled && (
                <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                  Recuperación
                </Badge>
              )}
            </div>
          </div>
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isTrash ? (
            <>
              <button
                type="button"
                onClick={() => openEditModal(training)}
                disabled={isReadOnly}
                className="inline-flex items-center gap-2 rounded-lg border border-steel-700 bg-steel-900 px-3 py-1.5 text-xs font-medium text-steel-200 hover:bg-steel-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Edit3 size={13} />
                Editar
              </button>

              <button
                type="button"
                onClick={() => handleSoftDeleteTraining(training)}
                disabled={isReadOnly || isDeleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={13} />
                Papelera
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleRestoreTraining(training)}
              disabled={isReadOnly || isRestoring}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={13} />
              Restaurar
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderParticipantRow(participant: LiveTrainingParticipantWithUser) {
    const userProfile = participant.user;
    const attendanceStatus = participant.live_attendance_status;

    return (
      <tr key={participant.id} className="border-b border-steel-800 last:border-0">
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium text-steel-100">
              {getProfileName(userProfile)}
            </p>
            <p className="text-xs text-steel-500">{userProfile?.email}</p>
          </div>
        </td>

        <td className="px-4 py-3">
          <p className="text-sm text-steel-300">{getProfileSubtitle(userProfile) || '—'}</p>
        </td>

        <td className="px-4 py-3">
          <Badge className={attendanceClasses[attendanceStatus]}>
            {attendanceLabels[attendanceStatus]}
          </Badge>
        </td>

        <td className="px-4 py-3 text-sm text-steel-300">
          {formatTime(participant.room_opened_at)}
        </td>

        <td className="px-4 py-3 text-sm text-steel-300">
          {formatTime(participant.join_clicked_at)}
        </td>

        <td className="px-4 py-3">
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-steel-300">
              Examen: <span className="text-steel-100">{participant.exam_status}</span>
            </span>
            <span className="text-steel-300">
              Certificado:{' '}
              <span className="text-steel-100">{participant.certification_status}</span>
            </span>
          </div>
        </td>
      </tr>
    );
  }

  function renderTrainingFormFields(
    state: LiveTrainingFormState,
    setState: React.Dispatch<React.SetStateAction<LiveTrainingFormState>>
  ) {
    return (
      <>
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
          <h3 className="text-sm font-semibold text-steel-100">
            Información general
          </h3>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-steel-400">
                Título
              </span>
              <input
                type="text"
                value={state.title}
                onChange={event => setState(current => ({ ...current, title: event.target.value }))}
                placeholder="Ej. Trabajo en Altura — capacitación en vivo"
                className="w-full rounded-xl border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-steel-100 outline-none transition-colors placeholder:text-steel-600 focus:border-cyan-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-steel-400">
                Descripción
              </span>
              <textarea
                value={state.description}
                onChange={event => setState(current => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Detalle breve de la capacitación, objetivos o indicaciones."
                className="w-full rounded-xl border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-steel-100 outline-none transition-colors placeholder:text-steel-600 focus:border-cyan-500"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-steel-400">
                  Fecha
                </span>
                <select
                  value={state.date}
                  onChange={event => setState(current => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-xl border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-steel-100 outline-none transition-colors focus:border-cyan-500"
                >
                  {dateOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-steel-400">
                  Hora inicio
                </span>
                <select
                  value={state.startTime}
                  onChange={event => handleStartTimeChange(event.target.value, setState)}
                  className="w-full rounded-xl border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-steel-100 outline-none transition-colors focus:border-cyan-500"
                >
                  <option value="">Seleccionar</option>
                  {timeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-steel-400">
                  Hora fin
                </span>
                <select
                  value={state.endTime}
                  onChange={event => setState(current => ({ ...current, endTime: event.target.value }))}
                  className="w-full rounded-xl border border-steel-700 bg-steel-900 px-3 py-2 text-sm text-steel-100 outline-none transition-colors focus:border-cyan-500"
                >
                  <option value="">Seleccionar</option>
                  {timeOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-steel-500">
                  Por defecto se sugiere una hora después del inicio.
                </p>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
          <h3 className="text-sm font-semibold text-steel-100">
            Plataforma
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
                <Video size={16} />
                Google Meet
              </div>
              <p className="mt-1 text-xs text-cyan-100/70">
                Disponible en este MVP.
              </p>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-800/70 p-4 opacity-60">
              <div className="text-sm font-semibold text-steel-300">
                Microsoft Teams
              </div>
              <p className="mt-1 text-xs text-steel-500">Próximamente</p>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-800/70 p-4 opacity-60">
              <div className="text-sm font-semibold text-steel-300">
                Zoom
              </div>
              <p className="mt-1 text-xs text-steel-500">Próximamente</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
          <h3 className="text-sm font-semibold text-steel-100">
            Reglas de cumplimiento
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900 p-3">
              <input
                type="checkbox"
                checked={state.hasExam}
                onChange={event => setState(current => ({ ...current, hasExam: event.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-steel-200">
                  Requiere examen
                </span>
                <span className="block text-xs text-steel-500">
                  El certificado se emite después de aprobar la evaluación.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900 p-3">
              <input
                type="checkbox"
                checked={state.certificateEnabled}
                onChange={event => setState(current => ({ ...current, certificateEnabled: event.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-steel-200">
                  Emitir certificado
                </span>
                <span className="block text-xs text-steel-500">
                  Habilita certificación por asistencia o examen.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900 p-3">
              <input
                type="checkbox"
                checked={state.asyncRecoveryEnabled}
                onChange={event => setState(current => ({ ...current, asyncRecoveryEnabled: event.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-steel-200">
                  Recuperación asincrónica
                </span>
                <span className="block text-xs text-steel-500">
                  Los ausentes podrán completar luego con grabación.
                </span>
              </span>
            </label>

            <label className="block rounded-xl border border-steel-700 bg-steel-900 p-3">
              <span className="mb-1 block text-sm font-medium text-steel-200">
                Tolerancia on time
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={state.lateToleranceMinutes}
                  onChange={event =>
                    setState(current => ({
                      ...current,
                      lateToleranceMinutes: Number(event.target.value || 0),
                    }))
                  }
                  className="w-24 rounded-lg border border-steel-700 bg-steel-950 px-3 py-2 text-sm text-steel-100 outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-steel-500">minutos</span>
              </div>
            </label>
          </div>
        </div>
      </>
    );
  }


  function renderWorkerSelector({
    title,
    selectedIds,
    search,
    filteredList,
    onSearchChange,
    onToggle,
    onSelectAllFiltered,
    onClear,
    isLoading = false,
  }: {
    title: string;
    selectedIds: string[];
    search: string;
    filteredList: Profile[];
    onSearchChange: (value: string) => void;
    onToggle: (workerId: string) => void;
    onSelectAllFiltered: () => void;
    onClear: () => void;
    isLoading?: boolean;
  }) {
    return (
      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-steel-100">
              {title}
            </h3>
            <p className="text-xs text-steel-500">
              Seleccionados: {selectedIds.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSelectAllFiltered}
              className="rounded-lg border border-steel-700 bg-steel-800 px-3 py-1.5 text-xs font-medium text-steel-200 hover:bg-steel-700"
            >
              Seleccionar visibles
            </button>

            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-steel-700 bg-steel-800 px-3 py-1.5 text-xs font-medium text-steel-200 hover:bg-steel-700"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, email, rol, área, legajo..."
            className="w-full rounded-xl border border-steel-700 bg-steel-900 py-2 pl-9 pr-3 text-sm text-steel-100 outline-none placeholder:text-steel-600 focus:border-cyan-500"
          />
        </div>

        {isLoading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            <Loader2 className="animate-spin" size={14} />
            Cargando participantes asignados...
          </div>
        )}

        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-steel-800">
          {filteredList.length === 0 ? (
            <div className="p-6 text-center text-sm text-steel-500">
              No encontramos workers activos para esta búsqueda.
            </div>
          ) : (
            <div className="divide-y divide-steel-800">
              {filteredList.map(worker => {
                const checked = selectedIds.includes(worker.id);

                return (
                  <label
                    key={worker.id}
                    className="flex cursor-pointer items-start gap-3 bg-steel-900 px-4 py-3 transition-colors hover:bg-steel-800"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(worker.id)}
                      className="mt-1"
                    />

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-steel-100">
                        {getProfileName(worker)}
                      </span>
                      <span className="block truncate text-xs text-steel-500">
                        {worker.email}
                        {getProfileSubtitle(worker) ? ` · ${getProfileSubtitle(worker)}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-steel-300">
          <Loader2 className="animate-spin" size={20} />
          Cargando capacitaciones en vivo...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-medium">No pudimos completar la acción</p>
            <p className="mt-1 text-red-200/80">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-medium">Listo</p>
            <p className="mt-1 text-emerald-200/80">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-steel-100">
            Capacitaciones en Vivo
          </h1>
          <p className="mt-1 text-sm text-steel-400">
            Creá capacitaciones por Google Meet, invitá trabajadores y registrá el ingreso desde Cigüeña.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-steel-700 bg-steel-800 px-4 py-2 text-sm font-medium text-steel-200 transition-colors hover:bg-steel-700"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={isReadOnly}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-steel-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Crear capacitación
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('active')}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            activeSection === 'active'
              ? 'bg-cyan-500 text-steel-950'
              : 'border border-steel-700 bg-steel-800 text-steel-200 hover:bg-steel-700'
          }`}
        >
          Activas
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('trash')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            activeSection === 'trash'
              ? 'bg-red-500 text-white'
              : 'border border-steel-700 bg-steel-800 text-steel-200 hover:bg-steel-700'
          }`}
        >
          <Trash2 size={16} />
          Papelera ({deletedTrainings.length})
        </button>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 shrink-0 text-amber-300" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-100">
              Etapa actual del módulo
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              Esta versión guarda capacitaciones, participantes y trazabilidad de ingreso.
              La creación automática de Google Calendar + Meet se conecta en el próximo paso con una Netlify Function.
            </p>
          </div>
        </div>
      </div>

      {activeSection === 'trash' ? (
        <div className="rounded-2xl border border-steel-700 bg-steel-900/40 p-4">
          <h2 className="text-sm font-semibold text-steel-100">
            Papelera
          </h2>
          <p className="mt-1 text-xs text-steel-500">
            Capacitaciones eliminadas lógicamente. Podés restaurarlas.
          </p>

          <div className="mt-4 space-y-3">
            {deletedTrainings.length === 0 ? (
              <EmptyState
                icon={<Trash2 size={26} />}
                title="La papelera está vacía"
                description="Las capacitaciones que borres aparecerán acá para poder restaurarlas."
              />
            ) : (
              deletedTrainings.map(training => renderTrainingRow(training, true))
            )}
          </div>
        </div>
      ) : trainings.length === 0 ? (
        <EmptyState
          icon={<Video size={26} />}
          title="Todavía no hay capacitaciones en vivo"
          description="Creá la primera capacitación para empezar a probar el flujo de invitación, acceso y asistencia."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              disabled={isReadOnly}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-steel-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Crear capacitación
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-steel-700 bg-steel-900/40 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-steel-100">
                  Próximas
                </h2>
                <p className="text-xs text-steel-500">
                  {upcomingTrainings.length} programadas o pendientes
                </p>
              </div>

              <div className="space-y-3">
                {upcomingTrainings.length === 0 ? (
                  <p className="rounded-xl border border-steel-800 bg-steel-900 p-4 text-sm text-steel-500">
                    No hay capacitaciones próximas.
                  </p>
                ) : (
                  upcomingTrainings.map(training => renderTrainingRow(training))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-steel-700 bg-steel-900/40 p-4">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-steel-100">
                  Realizadas
                </h2>
                <p className="text-xs text-steel-500">
                  {pastTrainings.length} capacitaciones pasadas
                </p>
              </div>

              <div className="space-y-3">
                {pastTrainings.length === 0 ? (
                  <p className="rounded-xl border border-steel-800 bg-steel-900 p-4 text-sm text-steel-500">
                    Todavía no hay capacitaciones realizadas.
                  </p>
                ) : (
                  pastTrainings.map(training => renderTrainingRow(training))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-steel-700 bg-steel-900/40">
            {!selectedTraining ? (
              <div className="flex min-h-[520px] items-center justify-center p-8">
                <EmptyState
                  icon={<CalendarClock size={26} />}
                  title="Seleccioná una capacitación"
                  description="Elegí una capacitación del listado para ver participantes, estado de ingreso y asistencia."
                />
              </div>
            ) : (
              <div>
                <div className="border-b border-steel-800 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-steel-100">
                          {selectedTraining.title}
                        </h2>
                        <Badge className={getTrainingStatusClass(selectedTraining)}>
                          {getTrainingStatusLabel(selectedTraining)}
                        </Badge>
                      </div>

                      {selectedTraining.description && (
                        <p className="mt-2 text-sm text-steel-400">
                          {selectedTraining.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-steel-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={14} />
                          {formatDateTime(selectedTraining.starts_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} />
                          Fin: {formatTime(selectedTraining.ends_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={14} />
                          {participants.length} invitados
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-steel-700 bg-steel-800 px-3 py-2 text-xs font-medium text-steel-500"
                        title="Se conectará en el próximo paso"
                      >
                        <ExternalLink size={14} />
                        Crear Calendar/Meet
                      </button>

                      <button
                        type="button"
                        onClick={handleEvaluateAttendance}
                        disabled={isEvaluating || isReadOnly}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isEvaluating ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <FileCheck2 size={14} />
                        )}
                        Evaluar asistencia
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-b border-steel-800 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Invitados" value={participants.length} icon={<Users size={18} />} />
                  <StatCard label="On time" value={selectedStats.on_time} icon={<CheckCircle2 size={18} />} />
                  <StatCard label="Tarde" value={selectedStats.late} icon={<Clock size={18} />} />
                  <StatCard label="No asistieron" value={selectedStats.absent} icon={<XCircle size={18} />} />
                </div>

                <div className="p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-steel-100">
                      Participantes
                    </h3>
                    <p className="text-xs text-steel-500">
                      La asistencia se calcula según el click en “Ingresar a Google Meet” desde Cigüeña.
                    </p>
                  </div>

                  {isDetailLoading ? (
                    <div className="flex min-h-[260px] items-center justify-center">
                      <div className="flex items-center gap-3 text-sm text-steel-400">
                        <Loader2 className="animate-spin" size={18} />
                        Cargando participantes...
                      </div>
                    </div>
                  ) : participants.length === 0 ? (
                    <EmptyState
                      icon={<Users size={26} />}
                      title="Sin participantes"
                      description="Esta capacitación todavía no tiene trabajadores invitados."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-steel-800">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-steel-800">
                          <thead className="bg-steel-900">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Worker</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Rol / Área</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Asistencia</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Abrió Cigüeña</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Click Meet</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-steel-500">Cumplimiento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-steel-800 bg-steel-900/40">
                            {participants.map(renderParticipantRow)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Crear capacitación en vivo"
        size="xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={isSaving}
              className="rounded-xl border border-steel-700 bg-steel-800 px-4 py-2 text-sm font-medium text-steel-200 transition-colors hover:bg-steel-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="create-live-training-form"
              disabled={isSaving || isReadOnly}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-steel-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Crear capacitación
            </button>
          </div>
        }
      >
        <form id="create-live-training-form" onSubmit={handleCreateTraining} className="space-y-6">
          {renderTrainingFormFields(form, setForm)}

          {renderWorkerSelector({
            title: 'Participantes',
            selectedIds: selectedWorkerIds,
            search: workerSearch,
            filteredList: filteredWorkers,
            onSearchChange: setWorkerSearch,
            onToggle: toggleWorker,
            onSelectAllFiltered: selectAllFilteredWorkers,
            onClear: clearSelectedWorkers,
          })}
        </form>
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Editar capacitación en vivo"
        size="xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isSaving}
              className="rounded-xl border border-steel-700 bg-steel-800 px-4 py-2 text-sm font-medium text-steel-200 transition-colors hover:bg-steel-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              form="edit-live-training-form"
              disabled={isSaving || isReadOnly}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-steel-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Guardar cambios
            </button>
          </div>
        }
      >
        <form id="edit-live-training-form" onSubmit={handleUpdateTraining} className="space-y-6">
          {renderTrainingFormFields(editForm, setEditForm)}

          {renderWorkerSelector({
            title: 'Participantes',
            selectedIds: editSelectedWorkerIds,
            search: editWorkerSearch,
            filteredList: filteredEditWorkers,
            onSearchChange: setEditWorkerSearch,
            onToggle: toggleEditWorker,
            onSelectAllFiltered: selectAllFilteredEditWorkers,
            onClear: clearEditSelectedWorkers,
            isLoading: isEditParticipantsLoading,
          })}
        </form>
      </Modal>
    </div>
  );
}
