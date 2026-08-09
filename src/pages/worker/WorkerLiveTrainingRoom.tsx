import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Video,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import type { AuthUser, LiveTrainingParticipant } from '../../types';
import {
  getWorkerLiveTrainingParticipant,
  markLiveTrainingJoinClicked,
  markLiveTrainingRoomOpened,
} from '../../services/liveTrainingService';

interface WorkerLiveTrainingRoomProps {
  liveTrainingId?: string;
  onNavigate: (view: string, data?: unknown) => void;
}


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
  return 'No pudimos abrir la capacitación en vivo.';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha';

  return new Date(value).toLocaleString('es-AR', {
    weekday: 'long',
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

function getRoomState(participant: LiveTrainingParticipant | null) {
  const training = participant?.live_training;

  if (!training) {
    return {
      label: 'Sin datos',
      className: 'bg-steel-700 text-steel-200 border-steel-600',
      canJoin: false,
      helper: 'No encontramos los datos de esta capacitación.',
    };
  }

  if (training.status === 'cancelled') {
    return {
      label: 'Cancelada',
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
      canJoin: false,
      helper: 'Esta capacitación fue cancelada por el administrador.',
    };
  }

  const now = Date.now();
  const startsAt = new Date(training.starts_at).getTime();
  const endsAt = new Date(training.ends_at).getTime();
  const earlyAccessMs = 30 * 60 * 1000;

  if (now < startsAt - earlyAccessMs) {
    return {
      label: 'Programada',
      className: 'bg-steel-700 text-steel-200 border-steel-600',
      canJoin: false,
      helper: 'El ingreso se habilita 30 minutos antes del horario de inicio.',
    };
  }

  if (now >= startsAt - earlyAccessMs && now <= endsAt) {
    return {
      label: now < startsAt ? 'Sala habilitada' : 'En vivo ahora',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      canJoin: true,
      helper: 'Podés ingresar a la sala. Cigüeña va a registrar el click para la asistencia.',
    };
  }

  return {
    label: 'Finalizada',
    className: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    canJoin: true,
    helper: 'La capacitación ya finalizó. Si ingresás ahora, puede quedar marcada como fuera de horario.',
  };
}

export default function WorkerLiveTrainingRoom({
  liveTrainingId,
  onNavigate,
}: WorkerLiveTrainingRoomProps) {
  const { user } = useAuth();
  const userIdCandidates = useMemo(() => getCurrentUserIdCandidates(user), [user]);
  const [participant, setParticipant] = useState<LiveTrainingParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedWasRegistered, setOpenedWasRegistered] = useState(false);

  const roomState = useMemo(() => getRoomState(participant), [participant]);
  const training = participant?.live_training;

  useEffect(() => {
  let ignore = false;

  async function loadRoom() {
    if (userIdCandidates.length === 0 || !liveTrainingId) {
      setError('No encontramos la capacitación en vivo seleccionada.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const foundParticipant = await getWorkerLiveTrainingParticipant(
        liveTrainingId,
        userIdCandidates
      );

      if (!foundParticipant) {
        throw new Error('No tenés acceso asignado a esta capacitación en vivo.');
      }

      let nextParticipant = foundParticipant;

      if (!foundParticipant.room_opened_at) {
        const updatedParticipant = await markLiveTrainingRoomOpened(foundParticipant.id, {
          source: 'worker_live_room',
        });

        nextParticipant = {
          ...foundParticipant,
          ...updatedParticipant,
          live_training: foundParticipant.live_training,
        };

        setOpenedWasRegistered(true);
      }

      if (!ignore) {
        setParticipant(nextParticipant);
      }
    } catch (loadError) {
      if (!ignore) {
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (!ignore) {
        setIsLoading(false);
      }
    }
  }

  loadRoom();

  return () => {
    ignore = true;
  };
}, [userIdCandidates.join('|'), liveTrainingId]);

  const handleJoin = async () => {
    if (!participant || !training?.meeting_url) return;

    setIsJoining(true);
    setError(null);

    try {
      const updatedParticipant = await markLiveTrainingJoinClicked(participant.id, {
        source: 'worker_live_room',
      });

      setParticipant(current => ({
        ...(current ?? participant),
        ...updatedParticipant,
        live_training: training,
      }));

      window.open(training.meeting_url, '_blank', 'noopener,noreferrer');
    } catch (joinError) {
      setError(getErrorMessage(joinError));
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center gap-3 text-steel-300 py-12">
        <Loader2 size={20} className="animate-spin" />
        Abriendo capacitación en vivo...
      </div>
    );
  }

  if (error && !participant) {
    return (
      <div className="space-y-4">
        <button type="button" className="btn-secondary" onClick={() => onNavigate('worker-live-trainings')}>
          <ArrowLeft size={16} />
          Volver
        </button>

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200 flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold mb-1">No pudimos abrir esta capacitación</div>
            <div className="text-sm text-red-200/80">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button type="button" className="btn-secondary" onClick={() => onNavigate('worker-live-trainings')}>
        <ArrowLeft size={16} />
        Volver a mis vivos
      </button>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {openedWasRegistered && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <span>Cigüeña registró que abriste la sala interna.</span>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="min-w-0">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium mb-4 ${roomState.className}`}>
              {roomState.label}
            </span>

            <h2 className="text-2xl font-bold text-steel-100 mb-3">
              {training?.title ?? 'Capacitación en vivo'}
            </h2>

            {training?.description && (
              <p className="text-sm text-steel-400 mb-5 max-w-3xl">
                {training.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-steel-300">
                <CalendarClock size={17} className="text-amber-400" />
                <span>{formatDateTime(training?.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-steel-300">
                <Clock size={17} className="text-amber-400" />
                <span>{formatTimeRange(training?.starts_at, training?.ends_at)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining || !roomState.canJoin || !training?.meeting_url}
            className="btn-primary justify-center disabled:hover:bg-amber-500"
          >
            {isJoining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            Ingresar a Google Meet
            <ExternalLink size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark">
          <div className="text-sm font-semibold text-steel-100 mb-3">Registro de asistencia</div>
          <div className="space-y-3 text-sm text-steel-300">
            <div className="flex justify-between gap-3">
              <span className="text-steel-500">Sala interna abierta</span>
              <span>{participant?.room_opened_at ? formatDateTime(participant.room_opened_at) : 'Pendiente'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-steel-500">Click a Meet</span>
              <span>{participant?.join_clicked_at ? formatDateTime(participant.join_clicked_at) : 'Pendiente'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-steel-500">Estado actual</span>
              <span>{participant?.live_attendance_status ?? 'invited'}</span>
            </div>
          </div>
        </div>

        <div className="card-dark">
          <div className="text-sm font-semibold text-steel-100 mb-3">Cómo se calcula</div>
          <p className="text-sm text-steel-400">
            {roomState.helper} Después, el administrador puede evaluar asistencia: dentro de la tolerancia queda on time; tarde dentro del horario queda late; sin click queda absent.
          </p>
        </div>
      </div>

      {!training?.meeting_url && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            Esta capacitación todavía no tiene link de Google Meet cargado. Para el MVP interno se puede cargar manualmente desde Admin; después lo generamos automático con Google Calendar.
          </div>
        </div>
      )}
    </div>
  );
}
