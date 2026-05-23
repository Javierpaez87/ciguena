import React, { useState } from 'react';
import { ChevronLeft, ClipboardList, Check, X, Award, RefreshCw, ChevronRight } from 'lucide-react';
import { mockTrainings, mockQuestions, mockOptions } from '../../lib/mockData';

interface WorkerTestProps {
  assignment?: { training_id: string; training?: { title: string } };
  onNavigate: (view: string) => void;
}

type TestState = 'intro' | 'taking' | 'result';

export default function WorkerTest({ assignment, onNavigate }: WorkerTestProps) {
  const trainingId = assignment?.training_id ?? 'tr1';
  const training = mockTrainings.find(t => t.id === trainingId);
  const questions = mockQuestions
    .filter(q => q.training_id === trainingId)
    .map(q => ({ ...q, options: mockOptions.filter(o => o.question_id === q.id) }));

  const [state, setState] = useState<TestState>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(1);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const submitTest = () => {
    let correct = 0;
    questions.forEach(q => {
      const selectedId = answers[q.id];
      const correctOption = q.options?.find(o => o.is_correct);
      if (selectedId === correctOption?.id) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (training?.passing_score ?? 70);
    setResult({ score, passed });
    setState('result');
  };

  const retry = () => {
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setAttempt(a => a + 1);
    setState('intro');
  };

  const q = questions[currentQ];
  const answeredAll = questions.every(q => answers[q.id]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList size={32} className="mx-auto mb-3 text-steel-600" />
        <p className="text-steel-500">Este training no tiene test configurado.</p>
        <button onClick={() => onNavigate('worker-trainings')} className="btn-secondary mt-4 mx-auto">
          <ChevronLeft size={14} /> Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => onNavigate('worker-trainings')} className="btn-ghost text-xs">
        <ChevronLeft size={14} /> Volver a mis trainings
      </button>

      {/* Intro */}
      {state === 'intro' && (
        <div className="card text-center py-8">
          <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-steel-100 mb-2">{training?.title}</h2>
          <p className="text-steel-400 text-sm mb-6">Evaluación final</p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-steel-50">{questions.length}</div>
              <div className="text-xs text-steel-400">Preguntas</div>
            </div>
            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-400">{training?.passing_score}%</div>
              <div className="text-xs text-steel-400">Para aprobar</div>
            </div>
            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-steel-50">{training?.max_attempts ?? '∞'}</div>
              <div className="text-xs text-steel-400">Intentos</div>
            </div>
          </div>

          {attempt > 1 && (
            <p className="text-xs text-amber-400 mb-4">Intento #{attempt}</p>
          )}

          <button onClick={() => setState('taking')} className="btn-primary mx-auto px-8 py-3 text-base">
            <Play size={18} /> Comenzar evaluación
          </button>
        </div>
      )}

      {/* Taking test */}
      {state === 'taking' && q && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-steel-400 font-medium">Pregunta {currentQ + 1} de {questions.length}</span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < currentQ ? 'bg-emerald-500' : i === currentQ ? 'bg-amber-500' : 'bg-steel-600'}`} />
                ))}
              </div>
            </div>

            <div className="progress-bar h-1.5 mb-6">
              <div className="progress-fill" style={{ width: `${((currentQ) / questions.length) * 100}%` }} />
            </div>

            <h3 className="text-base font-semibold text-steel-100 mb-6 leading-relaxed">{q.question_text}</h3>

            <div className="space-y-2.5">
              {(q.options ?? []).map(opt => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectAnswer(q.id, opt.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selected ? 'bg-amber-500/15 border-amber-500/60 text-amber-200' : 'bg-steel-900 border-steel-700 text-steel-300 hover:border-steel-500 hover:bg-steel-800'}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${selected ? 'bg-amber-500 border-amber-500' : 'border-steel-600'}`}>
                      {selected && <div className="w-2 h-2 bg-petroleum-950 rounded-full" />}
                    </div>
                    <span className="text-sm">{opt.option_text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0} className="btn-secondary disabled:opacity-40">
              <ChevronLeft size={14} /> Anterior
            </button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(q => q + 1)} disabled={!answers[q.id]} className="btn-primary disabled:opacity-40">
                Siguiente <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={submitTest} disabled={!answeredAll} className="btn-primary bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40">
                <Check size={14} /> Enviar respuestas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {state === 'result' && result && (
        <div className="card text-center py-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${result.passed ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
            {result.passed
              ? <Award size={36} className="text-emerald-400" />
              : <X size={36} className="text-red-400" />}
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.passed ? '¡Aprobado!' : 'No aprobado'}
          </h2>
          <p className="text-steel-400 text-sm mb-6">
            {result.passed
              ? 'Felicitaciones, superaste la evaluación. Tu certificado será emitido en breve.'
              : `No alcanzaste el puntaje mínimo requerido. Podés volver a intentarlo.`}
          </p>

          <div className="inline-block bg-steel-900 rounded-2xl px-8 py-5 mb-6 border border-steel-700">
            <div className={`text-5xl font-bold mb-1 ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>{result.score}%</div>
            <div className="text-sm text-steel-400">Puntaje obtenido</div>
            <div className="text-xs text-steel-500 mt-1">Mínimo requerido: {training?.passing_score}%</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!result.passed && (
              <button onClick={retry} className="btn-secondary">
                <RefreshCw size={14} /> Reintentar
              </button>
            )}
            {result.passed && (
              <button onClick={() => onNavigate('worker-certificates')} className="btn-primary">
                <Award size={14} /> Ver mi certificado
              </button>
            )}
            <button onClick={() => onNavigate('worker-trainings')} className="btn-ghost">
              <ChevronLeft size={14} /> Mis trainings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
