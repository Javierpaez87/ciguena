import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  Check,
  Video,
  Download,
  Award,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Training, TrainingAssignment } from '../../types';

interface WorkerPlayerProps {
  assignment?: (TrainingAssignment & { training?: Training });
  onNavigate: (view: string, data?: unknown) => void;
}

type PlayerLesson = {
  id: string;
  title: string;
  description?: string | null;
  lesson_type: 'video' | 'document' | 'external' | 'empty';
  content_url?: string | null;
  duration_seconds?: number | null;
};

export default function WorkerPlayer({ assignment, onNavigate }: WorkerPlayerProps) {
  const trainingId = assignment?.training_id;
  const training =
    assignment?.training ??
    baseTrainings.find(t => t.id === trainingId);

  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(assignment?.status ?? 'not_started');

  const lesson: PlayerLesson | null = useMemo(() => {
    if (!training) return null;

    const isVideo =
      training.content_type === 'local_video' ||
      training.content_type === 'video' ||
      training.content_type === 'youtube';

    const isDocument =
      training.content_type === 'document';

    const isExternal =
      training.content_type === 'external';

    return {
      id: `lesson-${training.id}`,
      title: training.title,
      description: training.description,
      lesson_type: isVideo
        ? 'video'
        : isDocument
          ? 'document'
          : isExternal
            ? 'external'
            : training.content_url
              ? 'external'
              : 'empty',
      content_url: training.content_url ?? null,
      duration_seconds: training.duration_minutes
        ? training.duration_minutes * 60
        : null,
    };
  }, [training]);

  const allLessons = lesson ? [lesson] : [];
  const currentLesson = lesson;
  const progress = allLessons.length
    ? Math.round((completedLessons.size / allLessons.length) * 100)
    : assignment?.progress_percentage ?? 0;

  const hasExam = Boolean(training && training.passing_score > 0);
  const isCompleted = currentLesson ? completedLessons.has(currentLesson.id) : false;

  useEffect(() => {
    const markAsStarted = async () => {
      if (!assignment?.id) return;
      if (assignment.status !== 'not_started') return;

      const { error } = await supabase
        .from('training_assignments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) {
        console.error('Error marcando training como iniciado:', error);
        return;
      }

      setCurrentStatus('in_progress');
    };

    markAsStarted();
  }, [assignment?.id, assignment?.status]);

  const markCompleted = async () => {
    if (!currentLesson || !assignment?.id) return;

    setIsSavingProgress(true);
    setPlayerError(null);

    const nextCompletedLessons = new Set(completedLessons);
    nextCompletedLessons.add(currentLesson.id);

    const nextProgress = 100;
    const nextStatus = hasExam ? 'pending_test' : 'certificate_issued';

    const updatePayload = hasExam
      ? {
          progress_percentage: nextProgress,
          status: nextStatus,
        }
      : {
          progress_percentage: nextProgress,
          status: nextStatus,
          completed_at: new Date().toISOString(),
        };

    const { error } = await supabase
      .from('training_assignments')
      .update(updatePayload)
      .eq('id', assignment.id);

    setIsSavingProgress(false);

    if (error) {
      console.error('Error guardando progreso:', error);
      setPlayerError(`No pudimos guardar el progreso: ${error.message}`);
      return;
    }

    setCompletedLessons(nextCompletedLessons);
    setCurrentStatus(nextStatus);
  };

  const renderContent = () => {
    if (!currentLesson || !training) {
      return (
        <div className="p-6 min-h-[260px] flex items-center justify-center">
          <div className="text-center">
            <Video size={36} className="text-steel-500 mx-auto mb-3" />
            <p className="text-steel-300 text-sm">
              No encontramos el contenido de este training.
            </p>
          </div>
        </div>
      );
    }

    if (!currentLesson.content_url) {
      return (
        <div className="p-6 min-h-[260px] flex items-center justify-center">
          <div className="text-center">
            <FileText size={36} className="text-steel-500 mx-auto mb-3" />
            <p className="text-steel-300 text-sm">
              Este training todavía no tiene contenido cargado.
            </p>
          </div>
        </div>
      );
    }

    if (training.content_type === 'local_video' || training.content_type === 'video') {
      return (
        <div className="relative aspect-video bg-petroleum-950">
          <video
            src={currentLesson.content_url}
            controls
            className="w-full h-full object-contain bg-petroleum-950"
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>
      );
    }

    if (training.content_type === 'youtube') {
      return (
        <div className="relative aspect-video bg-petroleum-950">
          <iframe
            src={currentLesson.content_url}
            title={currentLesson.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="p-6 min-h-[260px] flex items-center justify-center">
        <div className="text-center">
          <FileText size={36} className="text-steel-500 mx-auto mb-3" />
          <p className="text-steel-300 text-sm mb-4">
            Este contenido se abre como recurso externo.
          </p>

          <a
            href={currentLesson.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs inline-flex"
          >
            <Download size={12} /> Abrir contenido
          </a>
        </div>
      </div>
    );
  };

  if (!training || !currentLesson) {
    return (
      <div className="text-center py-16 text-steel-500">
        <Video size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No hay contenido disponible en este training.</p>

        <button
          onClick={() => onNavigate('worker-trainings')}
          className="btn-ghost text-xs mt-4"
        >
          <ChevronLeft size={14} /> Volver a mis trainings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <div className="flex-1 space-y-4 min-w-0">
        <button onClick={() => onNavigate('worker-trainings')} className="btn-ghost text-xs">
          <ChevronLeft size={14} /> Volver a mis trainings
        </button>

        <div className="card">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-steel-100 mb-1">
                {training.title}
              </h2>
              <p className="text-sm text-steel-400">
                {training.description}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {training.certificate_enabled && (
                <span className="badge badge-warning flex items-center gap-1">
                  <Award size={10} /> Certifica
                </span>
              )}

              {hasExam && (
                <span className="badge badge-info flex items-center gap-1">
                  <ClipboardCheck size={10} /> Requiere test
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="progress-bar flex-1 h-2">
              <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-amber-400 font-medium flex-shrink-0">
              {progress}%
            </span>
          </div>

          {playerError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-4">
              {playerError}
            </div>
          )}

          <div className="bg-steel-900 rounded-xl overflow-hidden mb-4">
            {renderContent()}
          </div>

          <h3 className="text-base font-semibold text-steel-100 mb-1">
            {currentLesson.title}
          </h3>

          {currentLesson.description && (
            <p className="text-sm text-steel-400 mb-4">
              {currentLesson.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('worker-trainings')}
              className="btn-secondary text-xs"
            >
              <ChevronLeft size={14} /> Volver
            </button>

            <button
              onClick={markCompleted}
              disabled={isSavingProgress || isCompleted || currentStatus === 'pending_test' || currentStatus === 'certificate_issued'}
              className="btn-primary flex-1 justify-center text-sm py-2.5 disabled:opacity-50"
            >
              <Check size={16} />
              {isSavingProgress
                ? 'Guardando...'
                : isCompleted || currentStatus === 'pending_test' || currentStatus === 'certificate_issued'
                  ? 'Contenido completado ✓'
                  : 'Marcar contenido como completado'}
            </button>

            {(isCompleted || currentStatus === 'pending_test') && hasExam && (
              <button
                onClick={() => onNavigate('worker-test', { assignment: { ...assignment, training } })}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                Ir al test <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:w-72 flex-shrink-0">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-steel-700 bg-steel-900">
            <div className="text-sm font-semibold text-steel-100">
              Contenido del training
            </div>
            <div className="text-xs text-steel-400">
              {completedLessons.size}/{allLessons.length} lecciones
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-steel-700/50 transition-colors text-left bg-amber-500/10"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted || currentStatus === 'pending_test' || currentStatus === 'certificate_issued'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              >
                {isCompleted || currentStatus === 'pending_test' || currentStatus === 'certificate_issued'
                  ? <Check size={10} className="text-white" />
                  : <Play size={8} className="text-petroleum-950" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs truncate text-amber-300 font-medium">
                  {currentLesson.title}
                </div>

                {currentLesson.duration_seconds && (
                  <div className="text-xs text-steel-500">
                    {Math.floor(currentLesson.duration_seconds / 60)} min
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
