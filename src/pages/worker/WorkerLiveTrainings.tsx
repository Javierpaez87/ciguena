import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Video,
} from 'lucide-react';

import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthUser, LiveAttendanceStatus, LiveTrainingParticipant } from '../../types';
import {
  getWorkerLiveTrainings,
  type LiveTrainingParticipantWithUser,
} from '../../services/liveTrainingService';

interface WorkerLiveTrainingsProps {
  onNavigate: (view: string, data?: unknown) => void;
}

const attendanceLabels: Record<LiveAttendanceStatus, string> = {
  invited: 'Invitado',
  on_time: 'Asistencia registrada',
  late: 'Ingreso tarde',
  absent: 'Ausente',
  invalid_after_event: 'Fuera de horario',
  excused_manual: 'Justificado',
};

const attendanceClasses: Record<LiveAttendanceStatus, string> = {
  invited: 'bg-steel-700 text-steel-200 border-steel-600',
  on_time: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  late: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  absent: 'bg-red-500/10 text-red-300 border-red-500/30',
  invalid_after_event: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  excused_manual: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};


function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(value => value?.trim()).filter(Boolean))) as string[];
}

function getCurrentUserIdCandidates(user: AuthUser | null) {
  const profile = user?.profile as { id?: string | null; auth_user_id?: string | null } | undefined;

  return uniqueIds([
    user?.id,
    profile?.id,
    profile?.auth_user_id,
  ]);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'No pudimos cargar tus capacitaciones en vivo.';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha';

  return new Date(value).toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeRange(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) return 'Horario no definido';

  const start = new Date(startsAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = new Date(endsAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${start} a ${end}`;
}

function getTemporalLabel(participant: LiveTrainingParticipant) {
  const training = participant.live_training;

  if (!training) return 'Sin datos de la capacitación';

  const now = Date.now();
  const startsAt = new Date(training.starts_at).getTime();
  const endsAt = new Date(training.ends_at).getTime();

  if (now < startsAt) return 'Programada';
  if (now >= startsAt && now <= endsAt) return 'En vivo ahora';
  return 'Finalizada';
}

function canOpenTraining(participant: LiveTrainingParticipant) {
  const training = participant.live_training;

  if (!training) return false;
  if (training.status === 'cancelled') return false;
  if (participant.live_attendance_status === 'absent') return false;

  return true;
}

function WorkerLiveTrainingCard({
  participant,
  onOpen,
}: {
  participant: LiveTrainingParticipant;
  onOpen: () => void;
}) {
  const training = participant.live_training;
  const attendanceStatus = participant.live_attendance_status ?? 'invited';
  const disabled = !canOpenTraining(participant);

  return (
    <div className="card hover:border-steel-600 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${attendanceClasses[attendanceStatus]}`}>
              {attendanceLabels[attendanceStatus]}
            </span>
            <span className="inline-flex items-center rounded-full border border-steel-600 bg-steel-900 px-2.5 py-1 text-xs font-medium text-steel-300">
              {getTemporalLabel(participant)}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-steel-100 mb-2">
            {training?.title ?? 'Capacitación en vivo'}
          </h3>

          {training?.description && (
            <p className="text-sm text-steel-400 mb-4 line-clamp-2">
              {training.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-steel-300">
              <CalendarClock size={16} className="text-amber-400" />
              <span>{formatDateTime(training?.starts_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-steel-300">
              <Clock size={16} className="text-amber-400" />
              <span>{formatTimeRange(training?.starts_at, training?.ends_at)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-steel-500">
            <div>
              Pantalla abierta:{' '}
              <span className="text-steel-300">
                {participant.room_opened_at ? formatDateTime(participant.room_opened_at) : 'No'}
              </span>
            </div>
            <div>
              Click a Meet:{' '}
              <span className="text-steel-300">
                {participant.join_clicked_at ? formatDateTime(participant.join_clicked_at) : 'No'}
              </span>
            </div>
            <div>
              Certificación:{' '}
              <span className="text-steel-300">
                {participant.certification_status === 'eligible'
                  ? 'Habilitada'
                  : participant.certification_status === 'issued'
                    ? 'Emitida'
                    : 'Pendiente'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          className="btn-primary justify-center disabled:hover:bg-amber-500"
        >
          <Video size={16} />
          Ingresar a capacitación
          <ExternalLink size={15} />
        </button>
      </div>
    </div>
  );
}

export default function WorkerLiveTrainings({ onNavigate }: WorkerLiveTrainingsProps) {
  const { user } = useAuth();
  const userIdCandidates = useMemo(() => getCurrentUserIdCandidates(user), [user]);
  const [items, setItems] = useState<LiveTrainingParticipantWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLiveTrainings = async () => {
    if (userIdCandidates.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getWorkerLiveTrainings(userIdCandidates);
      setItems(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveTrainings();
  }, [userIdCandidates.join('|')]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aStartsAt = a.live_training?.starts_at
        ? new Date(a.live_training.starts_at).getTime()
        : Number.POSITIVE_INFINITY;
      const bStartsAt = b.live_training?.starts_at
        ? new Date(b.live_training.starts_at).getTime()
        : Number.POSITIVE_INFINITY;

      return aStartsAt - bStartsAt;
    });
  }, [items]);

  const upcomingCount = sortedItems.filter(item => {
    const startsAt = item.live_training?.starts_at;
    return startsAt ? new Date(startsAt).getTime() >= Date.now() : false;
  }).length;

  const completedCount = sortedItems.filter(item =>
    item.live_training?.ends_at
      ? new Date(item.live_training.ends_at).getTime() < Date.now()
      : false
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-steel-100">Mis capacitaciones en vivo</h2>
          <p className="text-sm text-steel-400 mt-1">
            Entrá siempre desde Cigüeña para que podamos registrar tu asistencia.
          </p>
        </div>

        <button type="button" onClick={loadLiveTrainings} className="btn-secondary">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="text-xs text-steel-400 mb-1">Asignadas</div>
          <div className="text-2xl font-bold text-steel-100">{items.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-steel-400 mb-1">Próximas</div>
          <div className="text-2xl font-bold text-steel-100">{upcomingCount}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-steel-400 mb-1">Finalizadas</div>
          <div className="text-2xl font-bold text-steel-100">{completedCount}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card flex items-center justify-center gap-3 text-steel-300 py-12">
          <Loader2 size={20} className="animate-spin" />
          Cargando capacitaciones en vivo...
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} />}
          title="No tenés capacitaciones en vivo asignadas"
          description="Cuando tu empresa te asigne una capacitación sincrónica, la vas a ver acá."
        />
      ) : (
        <div className="space-y-4">
          {sortedItems.map(participant => (
            <WorkerLiveTrainingCard
              key={participant.id}
              participant={participant}
              onOpen={() =>
                onNavigate('worker-live-room', {
                  liveTrainingId: participant.live_training_id,
                })
              }
            />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3">
        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold mb-1">Importante para tu asistencia</div>
          <div className="text-amber-100/80">
            No entres directo desde Google Meet. Usá el botón de Cigüeña para que quede registrada la apertura de sala y el click de ingreso.
          </div>
        </div>
      </div>
    </div>
  );
}
