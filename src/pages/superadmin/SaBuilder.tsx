import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Grip, Video, FileText, Link, Image, Edit, Trash2, BookOpen } from 'lucide-react';
import { mockTrainings, mockModules, mockLessons } from '../../lib/mockData';
import type { TrainingModule, TrainingLesson } from '../../types';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

export default function SaBuilder() {
  const [selectedTraining, setSelectedTraining] = useState(mockTrainings[0].id);
  const [modules, setModules] = useState<TrainingModule[]>(mockModules.map(m => ({
    ...m,
    lessons: mockLessons.filter(l => l.module_id === m.id),
  })));
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['m1', 'm2']));
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', lesson_type: 'video' as 'video' | 'pdf' | 'text' | 'link' | 'image',
    video_provider: 'bunny' as string, video_id: '', video_embed_url: '', duration_seconds: '',
    resource_url: '', is_required: true,
  });

  const training = mockTrainings.find(t => t.id === selectedTraining);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const addModule = () => {
    const newModule: TrainingModule = {
      id: `m${Date.now()}`, training_id: selectedTraining,
      title: moduleForm.title, description: moduleForm.description || null,
      order_index: modules.length + 1, created_at: new Date().toISOString(), lessons: [],
    };
    setModules(ms => [...ms, newModule]);
    setModuleForm({ title: '', description: '' });
    setShowAddModule(false);
  };

  const addLesson = (moduleId: string) => {
    const newLesson: TrainingLesson = {
      id: `l${Date.now()}`, module_id: moduleId,
      title: lessonForm.title, description: lessonForm.description || null,
      lesson_type: lessonForm.lesson_type,
      video_provider: lessonForm.lesson_type === 'video' ? lessonForm.video_provider as any : null,
      video_id: lessonForm.video_id || null,
      video_embed_url: lessonForm.video_embed_url || null,
      video_thumbnail_url: null,
      duration_seconds: lessonForm.duration_seconds ? Number(lessonForm.duration_seconds) : null,
      resource_url: lessonForm.resource_url || null,
      order_index: (modules.find(m => m.id === moduleId)?.lessons?.length ?? 0) + 1,
      is_required: lessonForm.is_required,
      created_at: new Date().toISOString(),
    };
    setModules(ms => ms.map(m => m.id === moduleId ? { ...m, lessons: [...(m.lessons ?? []), newLesson] } : m));
    setLessonForm({ title: '', description: '', lesson_type: 'video', video_provider: 'bunny', video_id: '', video_embed_url: '', duration_seconds: '', resource_url: '', is_required: true });
    setShowAddLesson(null);
  };

  const lessonTypeIcon = (type: string) => {
    if (type === 'video') return <Video size={14} className="text-blue-400" />;
    if (type === 'pdf') return <FileText size={14} className="text-red-400" />;
    if (type === 'link') return <Link size={14} className="text-emerald-400" />;
    return <Image size={14} className="text-amber-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Training selector */}
      <div className="card">
        <label className="label">Training a editar</label>
        <select value={selectedTraining} onChange={e => setSelectedTraining(e.target.value)} className="select max-w-md">
          {mockTrainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {training && (
        <div className="card bg-petroleum-900/40 border-petroleum-700">
          <div className="text-base font-semibold text-amber-400 mb-1">{training.title}</div>
          <div className="text-sm text-steel-400">{training.description}</div>
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3">
        {modules.filter(m => m.training_id === selectedTraining).length === 0 && (
          <EmptyState icon={<BookOpen size={28} />} title="Sin módulos" description="Este training no tiene módulos todavía." />
        )}
        {modules.filter(m => m.training_id === selectedTraining).map(module => (
          <div key={module.id} className="card">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleModule(module.id)}>
              <Grip size={16} className="text-steel-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-steel-100">{module.title}</div>
                <div className="text-xs text-steel-400">{module.lessons?.length ?? 0} lecciones</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setShowAddLesson(module.id); }} className="btn-secondary text-xs py-1">
                  <Plus size={12} /> Lección
                </button>
                {expandedModules.has(module.id) ? <ChevronUp size={16} className="text-steel-400" /> : <ChevronDown size={16} className="text-steel-400" />}
              </div>
            </div>

            {expandedModules.has(module.id) && (
              <div className="mt-4 space-y-2 pl-7">
                {(module.lessons ?? []).length === 0 && (
                  <p className="text-xs text-steel-500 py-2">Sin lecciones en este módulo.</p>
                )}
                {(module.lessons ?? []).map(lesson => (
                  <div key={lesson.id} className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors">
                    <Grip size={13} className="text-steel-600 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lessonTypeIcon(lesson.lesson_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-steel-100">{lesson.title}</div>
                      <div className="text-xs text-steel-500">
                        {lesson.lesson_type.toUpperCase()}
                        {lesson.duration_seconds && ` · ${Math.floor(lesson.duration_seconds / 60)} min`}
                        {lesson.is_required && ' · Obligatoria'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-steel-100 transition-colors">
                        <Edit size={13} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-500/10 text-steel-400 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setShowAddModule(true)} className="btn-secondary w-full justify-center py-3">
          <Plus size={16} /> Agregar módulo
        </button>
      </div>

      {/* Add module modal */}
      <Modal
        open={showAddModule}
        onClose={() => setShowAddModule(false)}
        title="Nuevo módulo"
        footer={
          <>
            <button onClick={() => setShowAddModule(false)} className="btn-ghost">Cancelar</button>
            <button onClick={addModule} disabled={!moduleForm.title} className="btn-primary"><Plus size={15} /> Crear módulo</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Título del módulo *</label>
            <input value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Ej: Introducción y marco legal" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Add lesson modal */}
      <Modal
        open={!!showAddLesson}
        onClose={() => setShowAddLesson(null)}
        title="Nueva lección"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowAddLesson(null)} className="btn-ghost">Cancelar</button>
            <button onClick={() => showAddLesson && addLesson(showAddLesson)} disabled={!lessonForm.title} className="btn-primary"><Plus size={15} /> Crear lección</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Título de la lección *</label>
            <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Ej: Introducción a HSE" />
          </div>
          <div>
            <label className="label">Tipo de lección</label>
            <select value={lessonForm.lesson_type} onChange={e => setLessonForm(f => ({ ...f, lesson_type: e.target.value as any }))} className="select">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="text">Texto</option>
              <option value="link">Link externo</option>
              <option value="image">Imagen</option>
            </select>
          </div>
          {lessonForm.lesson_type === 'video' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Proveedor de video</label>
                  <select value={lessonForm.video_provider} onChange={e => setLessonForm(f => ({ ...f, video_provider: e.target.value }))} className="select">
                    <option value="bunny">Bunny Stream</option>
                    <option value="cloudflare">Cloudflare Stream</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="external">Externo (URL)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Video ID</label>
                  <input value={lessonForm.video_id} onChange={e => setLessonForm(f => ({ ...f, video_id: e.target.value }))} className="input" placeholder="ID del video" />
                </div>
              </div>
              <div>
                <label className="label">URL de embed</label>
                <input value={lessonForm.video_embed_url} onChange={e => setLessonForm(f => ({ ...f, video_embed_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
              <div>
                <label className="label">Duración (segundos)</label>
                <input type="number" value={lessonForm.duration_seconds} onChange={e => setLessonForm(f => ({ ...f, duration_seconds: e.target.value }))} className="input" placeholder="600" />
              </div>
            </>
          )}
          {lessonForm.lesson_type !== 'video' && (
            <div>
              <label className="label">{lessonForm.lesson_type === 'pdf' ? 'URL del PDF' : lessonForm.lesson_type === 'link' ? 'URL del recurso' : 'URL de imagen'}</label>
              <input value={lessonForm.resource_url} onChange={e => setLessonForm(f => ({ ...f, resource_url: e.target.value }))} className="input" placeholder="https://..." />
            </div>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setLessonForm(f => ({ ...f, is_required: !f.is_required }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${lessonForm.is_required ? 'bg-amber-500' : 'bg-steel-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${lessonForm.is_required ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-steel-300">Lección obligatoria</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
