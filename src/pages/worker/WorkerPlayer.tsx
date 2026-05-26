import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, FileText, Check, Lock, Video, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { mockModules, mockLessons, mockTrainings } from '../../lib/mockData';
import type { TrainingLesson } from '../../types';

interface WorkerPlayerProps {
  assignment?: { training_id: string; training?: { title: string } };
  onNavigate: (view: string) => void;
}

export default function WorkerPlayer({ assignment, onNavigate }: WorkerPlayerProps) {
  const trainingId = assignment?.training_id ?? 'tr1';
  const training = mockTrainings.find(t => t.id === trainingId);
  const modules = mockModules.filter(m => m.training_id === trainingId).map(m => ({
    ...m, lessons: mockLessons.filter(l => l.module_id === m.id),
  }));

  const allLessons = modules.flatMap(m => m.lessons);
  const [currentLesson, setCurrentLesson] = useState<TrainingLesson>(allLessons[0]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map(m => m.id)));

  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
  const progress = allLessons.length ? Math.round((completedLessons.size / allLessons.length) * 100) : 0;

  const markCompleted = () => {
    setCompletedLessons(prev => new Set([...prev, currentLesson.id]));
    if (currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  if (!currentLesson) return (
    <div className="text-center py-16 text-steel-500">
      <Video size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">No hay lecciones disponibles en este training.</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Main content */}
      <div className="flex-1 space-y-4 min-w-0">
        <button onClick={() => onNavigate('worker-trainings')} className="btn-ghost text-xs">
          <ChevronLeft size={14} /> Volver a mis trainings
        </button>

        <div className="card">
          <h2 className="text-lg font-semibold text-steel-100 mb-1">{training?.title}</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="progress-bar flex-1 h-2">
              <div className="progress-fill h-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-amber-400 font-medium flex-shrink-0">{progress}%</span>
          </div>

          {/* Lesson content */}
          <div className="bg-steel-900 rounded-xl overflow-hidden mb-4">
            {currentLesson.lesson_type === 'video' ? (
              <div className="relative aspect-video bg-petroleum-950">
                {currentLesson.video_embed_url ? (
                  currentLesson.video_embed_url.endsWith('.mp4') ? (
                    <video
                      controls
                      className="w-full h-full object-contain bg-petroleum-950"
                      poster={currentLesson.video_thumbnail_url ?? undefined}
                    >
                      <source src={currentLesson.video_embed_url} type="video/mp4" />
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  ) : (
                    <iframe
                      src={currentLesson.video_embed_url}
                      title={currentLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-steel-600">
                    <Video size={40} />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 min-h-[200px] flex items-center justify-center">
                <div className="text-center">
                  <FileText size={32} className="text-steel-500 mx-auto mb-3" />
                  <p className="text-steel-300 text-sm">{currentLesson.title}</p>
                  {currentLesson.resource_url && (
                    <a href={currentLesson.resource_url} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-3 text-xs inline-flex">
                      <Download size={12} /> Descargar recurso
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <h3 className="text-base font-semibold text-steel-100 mb-1">{currentLesson.title}</h3>
          {currentLesson.description && <p className="text-sm text-steel-400 mb-4">{currentLesson.description}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={() => currentIndex > 0 && setCurrentLesson(allLessons[currentIndex - 1])}
              disabled={currentIndex === 0}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button onClick={markCompleted} className="btn-primary flex-1 justify-center text-sm py-2.5">
              <Check size={16} />
              {completedLessons.has(currentLesson.id) ? 'Completada ✓' : 'Marcar como completada'}
            </button>
            {currentIndex === allLessons.length - 1 && completedLessons.size === allLessons.length && (
              <button onClick={() => onNavigate('worker-test')} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500">
                Ir al test <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - modules/lessons */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-steel-700 bg-steel-900">
            <div className="text-sm font-semibold text-steel-100">Contenido del training</div>
            <div className="text-xs text-steel-400">{completedLessons.size}/{allLessons.length} lecciones</div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {modules.map(module => (
              <div key={module.id}>
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 border-b border-steel-700 hover:bg-steel-700/30 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="text-xs font-semibold text-steel-200">{module.title}</div>
                    <div className="text-xs text-steel-500">{module.lessons.length} lecciones</div>
                  </div>
                  {expandedModules.has(module.id) ? <ChevronUp size={12} className="text-steel-500" /> : <ChevronDown size={12} className="text-steel-500" />}
                </button>
                {expandedModules.has(module.id) && module.lessons.map(lesson => {
                  const isCompleted = completedLessons.has(lesson.id);
                  const isCurrent = currentLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLesson(lesson)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-steel-700/50 transition-colors text-left ${isCurrent ? 'bg-amber-500/10' : 'hover:bg-steel-700/30'}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500' : 'border border-steel-600'}`}>
                        {isCompleted ? <Check size={10} className="text-white" /> : isCurrent ? <Play size={8} className="text-petroleum-950" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs truncate ${isCurrent ? 'text-amber-300 font-medium' : 'text-steel-300'}`}>{lesson.title}</div>
                        {lesson.duration_seconds && (
                          <div className="text-xs text-steel-500">{Math.floor(lesson.duration_seconds / 60)} min</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
