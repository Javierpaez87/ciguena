import React, { useState } from 'react';
import { Plus, Check, X, Eye, Trash2, ClipboardList } from 'lucide-react';
import { mockTrainings, mockQuestions, mockOptions } from '../../lib/mockData';
import type { QuizQuestion, QuizOption } from '../../types';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

export default function SaTests() {
  const [selectedTraining, setSelectedTraining] = useState(mockTrainings[0].id);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    mockQuestions.map(q => ({ ...q, options: mockOptions.filter(o => o.question_id === q.id) }))
  );
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [preview, setPreview] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice' as 'multiple_choice' | 'true_false',
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
  });

  const training = mockTrainings.find(t => t.id === selectedTraining);
  const filtered = questions.filter(q => q.training_id === selectedTraining);

  const setCorrect = (idx: number) => {
    setQuestionForm(f => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }));
  };

  const addQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q${Date.now()}`,
      training_id: selectedTraining,
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      order_index: filtered.length + 1,
      created_at: new Date().toISOString(),
      options: questionForm.options
        .filter(o => o.option_text.trim())
        .map((o, i) => ({
          id: `o${Date.now()}${i}`,
          question_id: `q${Date.now()}`,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: i + 1,
          created_at: new Date().toISOString(),
        })),
    };
    setQuestions(qs => [...qs, newQ]);
    setQuestionForm({
      question_text: '', question_type: 'multiple_choice',
      options: Array(4).fill(null).map(() => ({ option_text: '', is_correct: false })),
    });
    setShowAddQuestion(false);
  };

  const removeQuestion = (id: string) => setQuestions(qs => qs.filter(q => q.id !== id));

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Training</label>
            <select value={selectedTraining} onChange={e => setSelectedTraining(e.target.value)} className="select">
              {mockTrainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          {training && (
            <div className="text-right">
              <div className="text-xs text-steel-400">Puntaje mínimo</div>
              <div className="text-2xl font-bold text-amber-400">{training.passing_score}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-steel-50">{filtered.length}</div>
          <div className="text-xs text-steel-400 mt-1">Preguntas</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-amber-400">{training?.passing_score}%</div>
          <div className="text-xs text-steel-400 mt-1">Min. aprobación</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-steel-50">{training?.max_attempts ?? '∞'}</div>
          <div className="text-xs text-steel-400 mt-1">Intentos máx.</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-steel-300">Preguntas ({filtered.length})</h3>
        <div className="flex gap-2">
          <button onClick={() => setPreview(true)} className="btn-ghost text-xs"><Eye size={14} /> Vista previa</button>
          <button onClick={() => setShowAddQuestion(true)} className="btn-primary text-xs"><Plus size={14} /> Pregunta</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={<ClipboardList size={28} />} title="Sin preguntas" description="Agregá preguntas al test de este training." />
      )}

      <div className="space-y-3">
        {filtered.map((q, idx) => (
          <div key={q.id} className="card">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-steel-100 mb-3">{q.question_text}</p>
                <div className="space-y-1.5">
                  {(q.options ?? []).map(opt => (
                    <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${opt.is_correct ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-steel-900 border border-steel-700 text-steel-300'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${opt.is_correct ? 'bg-emerald-500' : 'border border-steel-600'}`}>
                        {opt.is_correct && <Check size={10} className="text-white" />}
                      </div>
                      {opt.option_text}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => removeQuestion(q.id)} className="p-1.5 rounded hover:bg-red-500/10 text-steel-500 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add question modal */}
      <Modal
        open={showAddQuestion}
        onClose={() => setShowAddQuestion(false)}
        title="Nueva pregunta"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowAddQuestion(false)} className="btn-ghost">Cancelar</button>
            <button onClick={addQuestion} disabled={!questionForm.question_text} className="btn-primary"><Plus size={15} /> Agregar</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Tipo de pregunta</label>
            <select value={questionForm.question_type} onChange={e => {
              const t = e.target.value as any;
              setQuestionForm(f => ({
                ...f, question_type: t,
                options: t === 'true_false'
                  ? [{ option_text: 'Verdadero', is_correct: true }, { option_text: 'Falso', is_correct: false }]
                  : Array(4).fill(null).map(() => ({ option_text: '', is_correct: false })),
              }));
            }} className="select">
              <option value="multiple_choice">Opción múltiple</option>
              <option value="true_false">Verdadero / Falso</option>
            </select>
          </div>
          <div>
            <label className="label">Texto de la pregunta *</label>
            <textarea value={questionForm.question_text} onChange={e => setQuestionForm(f => ({ ...f, question_text: e.target.value }))} className="input" rows={3} placeholder="Escribí la pregunta aquí..." />
          </div>
          <div>
            <label className="label">Opciones de respuesta <span className="text-steel-500">(marcá la correcta)</span></label>
            <div className="space-y-2">
              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button onClick={() => setCorrect(idx)} className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${opt.is_correct ? 'bg-emerald-500 border-emerald-500' : 'border-steel-600 hover:border-emerald-500'}`}>
                    {opt.is_correct && <Check size={11} className="text-white" />}
                  </button>
                  <input
                    value={opt.option_text}
                    onChange={e => setQuestionForm(f => ({
                      ...f,
                      options: f.options.map((o, i) => i === idx ? { ...o, option_text: e.target.value } : o),
                    }))}
                    className="input"
                    placeholder={`Opción ${idx + 1}`}
                    disabled={questionForm.question_type === 'true_false'}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-steel-500 mt-2">Hacé click en el círculo para marcar la respuesta correcta.</p>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal open={preview} onClose={() => setPreview(false)} title={`Vista previa — ${training?.title}`} size="lg">
        <div className="space-y-4">
          <div className="bg-steel-900 rounded-lg p-4 border border-steel-700">
            <p className="text-sm text-steel-300">Puntaje mínimo de aprobación: <span className="text-amber-400 font-semibold">{training?.passing_score}%</span></p>
          </div>
          {filtered.map((q, idx) => (
            <div key={q.id} className="bg-steel-900 rounded-lg p-4 border border-steel-700">
              <p className="text-sm font-medium text-steel-100 mb-3">{idx + 1}. {q.question_text}</p>
              <div className="space-y-2">
                {(q.options ?? []).map(opt => (
                  <div key={opt.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-700 text-xs text-steel-300 hover:bg-steel-800 transition-colors cursor-pointer">
                    <div className="w-4 h-4 rounded-full border border-steel-600 flex-shrink-0" />
                    {opt.option_text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
