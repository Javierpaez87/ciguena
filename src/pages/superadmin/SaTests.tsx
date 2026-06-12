import React, { useState } from 'react';import React, { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  ClipboardList,
  AlertCircle,
  BookOpen,
  Target,
  RotateCcw,
  Layers,
} from 'lucide-react';

import { baseTrainings } from '../../data/baseTrainings';
import {
  trainingTests,
  getTrainingTestByTrainingId,
  type TrainingTest,
  type TrainingTestQuestion,
} from '../../data/trainingTests';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

function getTrainingTitle(trainingId: string) {
  return baseTrainings.find((training) => training.id === trainingId)?.title || trainingId;
}

function getTrainingMeta(trainingId: string) {
  return baseTrainings.find((training) => training.id === trainingId) || null;
}

function getAttemptLabel(test: TrainingTest, questionIndex: number) {
  const attemptNumber = Math.floor(questionIndex / test.questionsPerAttempt) + 1;
  return `Intento ${attemptNumber}`;
}

function getQuestionsByAttempt(test: TrainingTest) {
  const attempts: Array<{
    attemptNumber: number;
    questions: TrainingTestQuestion[];
  }> = [];

  for (let index = 0; index < test.maxAttempts; index += 1) {
    const startIndex = index * test.questionsPerAttempt;
    const endIndex = startIndex + test.questionsPerAttempt;
    const questions = test.questions.slice(startIndex, endIndex);

    if (questions.length > 0) {
      attempts.push({
        attemptNumber: index + 1,
        questions,
      });
    }
  }

  return attempts;
}

export default function SaTests() {
  const [selectedTraining, setSelectedTraining] = useState(
    baseTrainings.find((training) => training.id === 'tr_working_at_heights')?.id ||
      baseTrainings[0]?.id ||
      ''
  );

  const [preview, setPreview] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);

  const training = useMemo(() => {
    return selectedTraining ? getTrainingMeta(selectedTraining) : null;
  }, [selectedTraining]);

  const test = useMemo(() => {
    return selectedTraining ? getTrainingTestByTrainingId(selectedTraining) : null;
  }, [selectedTraining]);

  const trainingsWithTest = useMemo(() => {
    return new Set(trainingTests.map((item) => item.trainingId));
  }, []);

  const questionsByAttempt = useMemo(() => {
    if (!test) return [];
    return getQuestionsByAttempt(test);
  }, [test]);

  const totalQuestions = test?.questions.length ?? 0;
  const configuredAttempts = test?.maxAttempts ?? training?.max_attempts ?? 0;
  const passingScore = test?.passingScore ?? training?.passing_score ?? 0;
  const questionsPerAttempt = test?.questionsPerAttempt ?? 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="label">Training</label>

            <select
              value={selectedTraining}
              onChange={(event) => setSelectedTraining(event.target.value)}
              className="select"
            >
              {baseTrainings
                .filter((trainingItem) => trainingItem.certificate_enabled)
                .map((trainingItem) => {
                  const hasTest = trainingsWithTest.has(trainingItem.id);

                  return (
                    <option key={trainingItem.id} value={trainingItem.id}>
                      {trainingItem.title} {hasTest ? '· Test cargado' : '· Sin test'}
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAnswers((value) => !value)}
              className="btn-secondary text-xs"
              disabled={!test}
            >
              <Check size={14} />
              {showAnswers ? 'Ocultar respuestas' : 'Mostrar respuestas'}
            </button>

            <button
              onClick={() => setPreview(true)}
              className="btn-ghost text-xs"
              disabled={!test}
            >
              <Eye size={14} />
              Vista previa
            </button>
          </div>
        </div>
      </div>

      {training && !test && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />

          <div>
            <div className="font-semibold">Este training todavía no tiene test cargado</div>
            <div className="text-amber-100/80 mt-1">
              El catálogo del training existe en <span className="font-mono">baseTrainings.ts</span>,
              pero todavía no hay preguntas reales en{' '}
              <span className="font-mono">src/data/trainingTests</span>.
            </div>
          </div>
        </div>
      )}

      {training && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card text-center">
            <BookOpen size={20} className="text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-steel-50">{training.duration_minutes}</div>
            <div className="text-xs text-steel-400 mt-1">Minutos</div>
          </div>

          <div className="metric-card text-center">
            <Target size={20} className="text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-400">{passingScore}%</div>
            <div className="text-xs text-steel-400 mt-1">Min. aprobación</div>
          </div>

          <div className="metric-card text-center">
            <RotateCcw size={20} className="text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-steel-50">
              {configuredAttempts || '—'}
            </div>
            <div className="text-xs text-steel-400 mt-1">Intentos máx.</div>
          </div>

          <div className="metric-card text-center">
            <ClipboardList size={20} className="text-steel-300 mx-auto mb-2" />
            <div className="text-2xl font-bold text-steel-50">{totalQuestions}</div>
            <div className="text-xs text-steel-400 mt-1">Preguntas reales</div>
          </div>
        </div>
      )}

      {test ? (
        <>
          <div className="card border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check size={18} className="text-emerald-400" />
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold text-steel-100">
                  {test.title}
                </div>

                <div className="text-xs text-steel-400 mt-1">
                  {test.description || 'Evaluación cargada desde el repo.'}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-success">Test real cargado</span>
                  <span className="badge badge-info">{test.questions.length} preguntas</span>
                  <span className="badge badge-neutral">
                    {test.questionsPerAttempt} preguntas por intento
                  </span>
                  <span className="badge badge-neutral">
                    {test.maxAttempts} intentos
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-steel-300">
              Preguntas ({test.questions.length})
            </h3>

            <div className="text-xs text-steel-500">
              Fuente: <span className="font-mono">src/data/trainingTests</span>
            </div>
          </div>

          <div className="space-y-4">
            {questionsByAttempt.map((attempt) => (
              <div key={attempt.attemptNumber} className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={15} className="text-amber-400" />
                  <div className="text-sm font-semibold text-steel-100">
                    Intento {attempt.attemptNumber}
                  </div>
                  <div className="text-xs text-steel-500">
                    {attempt.questions.length} preguntas
                  </div>
                </div>

                <div className="space-y-3">
                  {attempt.questions.map((question, index) => {
                    const globalIndex =
                      (attempt.attemptNumber - 1) * test.questionsPerAttempt + index;

                    return (
                      <div
                        key={question.id}
                        className="rounded-xl border border-steel-700 bg-steel-900 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                            {globalIndex + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <p className="text-sm font-medium text-steel-100">
                                {question.question}
                              </p>

                              <span className="text-xs text-steel-500 font-mono flex-shrink-0">
                                {question.id} · {getAttemptLabel(test, globalIndex)}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {question.options.map((option) => {
                                const isCorrect = option.key === question.correctOption;

                                return (
                                  <div
                                    key={option.key}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                                      showAnswers && isCorrect
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : 'bg-steel-950 border-steel-700 text-steel-300'
                                    }`}
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase ${
                                        showAnswers && isCorrect
                                          ? 'bg-emerald-500 text-white'
                                          : 'border border-steel-600 text-steel-400'
                                      }`}
                                    >
                                      {showAnswers && isCorrect ? (
                                        <Check size={11} className="text-white" />
                                      ) : (
                                        option.key
                                      )}
                                    </div>

                                    <span>
                                      <span className="uppercase font-semibold mr-1">
                                        {option.key}.
                                      </span>
                                      {option.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Sin preguntas reales"
          description="Este training todavía no tiene evaluación cargada en el repo."
        />
      )}

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title={`Vista previa — ${training ? training.title : getTrainingTitle(selectedTraining)}`}
        size="lg"
      >
        {!test ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="Sin test para previsualizar"
            description="Todavía no hay preguntas cargadas para este training."
          />
        ) : (
          <div className="space-y-4">
            <div className="bg-steel-900 rounded-lg p-4 border border-steel-700">
              <p className="text-sm text-steel-300">
                Puntaje mínimo de aprobación:{' '}
                <span className="text-amber-400 font-semibold">{test.passingScore}%</span>
              </p>

              <p className="text-xs text-steel-500 mt-1">
                Este preview simula cómo ve el trabajador las preguntas, sin marcar respuestas
                correctas.
              </p>
            </div>

            {test.questions.slice(0, test.questionsPerAttempt).map((question, index) => (
              <div
                key={question.id}
                className="bg-steel-900 rounded-lg p-4 border border-steel-700"
              >
                <p className="text-sm font-medium text-steel-100 mb-3">
                  {index + 1}. {question.question}
                </p>

                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-700 text-xs text-steel-300 hover:bg-steel-800 transition-colors cursor-pointer"
                    >
                      <div className="w-4 h-4 rounded-full border border-steel-600 flex-shrink-0" />

                      <span>
                        <span className="uppercase font-semibold mr-1">{option.key}.</span>
                        {option.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {test.questions.length > test.questionsPerAttempt && (
              <div className="text-xs text-steel-500">
                Vista previa mostrando el primer intento: {test.questionsPerAttempt} preguntas de{' '}
                {test.questions.length} totales.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
