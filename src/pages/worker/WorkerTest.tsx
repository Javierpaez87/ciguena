import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ClipboardList,
  Check,
  X,
  Award,
  RefreshCw,
  ChevronRight,
  Play,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getTrainingTestByTrainingId } from '../../data/trainingTests';

interface WorkerTestProps {
  assignment?: {
    id?: string;
    user_id?: string;
    training_id: string;
    training?: { title: string };
  };
  onNavigate: (view: string) => void;
}

type TestState = 'intro' | 'taking' | 'result';

type TestOption =
  | string
  | {
      key?: string;
      text?: string;
      label?: string;
      option_text?: string;
    };

const getOptionText = (option: TestOption) => {
  if (typeof option === 'string') return option;

  return option.text || option.option_text || option.label || '';
};

const getOptionKey = (option: TestOption, optionIndex: number) => {
  if (typeof option === 'string') return String(optionIndex);

  return option.key || String(optionIndex);
};

const generateCertificateCode = (trainingId: string) => {
  const cleanTrainingId = trainingId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `CIG-${cleanTrainingId}-${Date.now()}`;
};

const getDefaultExpirationDate = () => {
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  return expirationDate.toISOString();
};

export default function WorkerTest({ assignment, onNavigate }: WorkerTestProps) {
  const trainingId = assignment?.training_id ?? '';
  const test = getTrainingTestByTrainingId(trainingId);

  const [state, setState] = useState<TestState>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const questionsForAttempt = useMemo(() => {
    if (!test) return [];

    const questionsPerAttempt = test.questionsPerAttempt;
    const startIndex = (attempt - 1) * questionsPerAttempt;
    const endIndex = startIndex + questionsPerAttempt;

    return test.questions.slice(startIndex, endIndex);
  }, [test, attempt]);

  const maxAttempts = test ? Math.ceil(test.questions.length / test.questionsPerAttempt) : 0;

  const selectAnswer = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const getCertificateContext = async () => {
    if (!assignment?.user_id) {
      return {
        tenantId: null as string | null,
        workerSignatureUrl: null as string | null,
      };
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, tenant_id')
      .or(`id.eq.${assignment.user_id},auth_user_id.eq.${assignment.user_id}`)
      .limit(1);

    if (profileError) {
      console.error('Error obteniendo perfil para certificado:', profileError);
    }

    const profile = profiles?.[0];

    const profileIdForSignature = profile?.id ?? assignment.user_id;

    const { data: ethicsAcceptance, error: ethicsError } = await supabase
      .from('ethics_acceptances')
      .select('signature_image_url')
      .or(`user_id.eq.${assignment.user_id},profile_id.eq.${profileIdForSignature}`)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ethicsError) {
      console.error('Error obteniendo firma del worker para certificado:', ethicsError);
    }

    return {
      tenantId: profile?.tenant_id ?? null,
      workerSignatureUrl: ethicsAcceptance?.signature_image_url ?? null,
    };
  };

  const issueCertificate = async ({
    score,
    attemptNumber,
  }: {
    score: number;
    attemptNumber: number;
  }) => {
    if (!assignment?.id || !assignment?.user_id || !assignment?.training_id) return;

    const { data: existingCertificate, error: existingError } = await supabase
      .from('certificates')
      .select('id')
      .eq('assignment_id', assignment.id)
      .maybeSingle();

    if (existingError) {
      console.error('Error verificando certificado existente:', existingError);
    }

    if (existingCertificate?.id) return;

    const { tenantId, workerSignatureUrl } = await getCertificateContext();

    if (!tenantId) {
      console.error('No se pudo emitir certificado: tenant_id no encontrado para el usuario.');
      return;
    }

    const { error } = await supabase.from('certificates').insert({
      assignment_id: assignment.id,
      user_id: assignment.user_id,
      training_id: assignment.training_id,
      tenant_id: tenantId,
      certificate_code: generateCertificateCode(assignment.training_id),
      worker_signature_url: workerSignatureUrl,
      issued_at: new Date().toISOString(),
      expires_at: getDefaultExpirationDate(),
      status: 'valid',
      test_score: score,
      test_attempts_count: attemptNumber,
    });

    if (error) {
      console.error('Error emitiendo certificado:', error);
    }
  };

  const markAssignmentAsCertificateIssued = async ({
    score,
    attemptNumber,
  }: {
    score: number;
    attemptNumber: number;
  }) => {
    if (!assignment?.id) return;

    const { error } = await supabase
      .from('training_assignments')
      .update({
        status: 'certificate_issued',
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        test_score: score,
        test_attempts_count: attemptNumber,
        test_passed_at: new Date().toISOString(),
      })
      .eq('id', assignment.id);

    if (error) {
      console.error('Error actualizando assignment al aprobar examen:', error);
    }
  };

  const registerTestAttempt = async ({
    score,
    passed,
    correct,
  }: {
    score: number;
    passed: boolean;
    correct: number;
  }) => {
    if (!assignment?.id || !assignment?.user_id || !test) return;

    const { data: attemptData, error: attemptError } = await supabase
      .from('training_test_attempts')
      .insert({
        assignment_id: assignment.id,
        user_id: assignment.user_id,
        training_id: assignment.training_id,
        test_id: test.id,
        attempt_number: attempt,
        score,
        correct_answers: correct,
        total_questions: questionsForAttempt.length,
        passed,
      })
      .select('id')
      .single();

    if (attemptError) {
      console.error('Error registrando intento de examen:', attemptError);
      return;
    }

    const attemptId = attemptData?.id;

    if (!attemptId) return;

    const answersPayload = questionsForAttempt.map((question) => {
      const selectedOption = answers[question.id] ?? '';

      return {
        attempt_id: attemptId,
        question_id: question.id,
        selected_option: selectedOption,
        correct_option: question.correctOption,
        is_correct: selectedOption === question.correctOption,
      };
    });

    const { error: answersError } = await supabase
      .from('training_test_attempt_answers')
      .insert(answersPayload);

    if (answersError) {
      console.error('Error registrando respuestas del examen:', answersError);
    }
  };

  const submitTest = async () => {
    if (!test || questionsForAttempt.length === 0) return;

    let correct = 0;

    questionsForAttempt.forEach((question) => {
      const selectedOptionKey = answers[question.id];

      if (selectedOptionKey === question.correctOption) {
        correct++;
      }
    });

    const score = Math.round((correct / questionsForAttempt.length) * 100);
    const passed = score >= test.passingScore;

    setResult({
      score,
      passed,
      correct,
      total: questionsForAttempt.length,
    });

    setIsSaving(true);

    await registerTestAttempt({
      score,
      passed,
      correct,
    });

    if (passed) {
      await markAssignmentAsCertificateIssued({
        score,
        attemptNumber: attempt,
      });

      await issueCertificate({
        score,
        attemptNumber: attempt,
      });
    }

    setIsSaving(false);
    setState('result');
  };

  const retry = () => {
    const nextAttempt = attempt + 1;

    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setAttempt(nextAttempt);
    setState('intro');
  };

  const q = questionsForAttempt[currentQ];

  const answeredAll = questionsForAttempt.every((question) => {
    return answers[question.id] !== undefined;
  });

  const hasMoreAttempts = attempt < maxAttempts;

  if (!test) {
    return (
      <div className="text-center py-16">
        <ClipboardList size={32} className="mx-auto mb-3 text-steel-600" />
        <p className="text-steel-500">Este training no tiene test configurado.</p>
        <button
          onClick={() => onNavigate('worker-trainings')}
          className="btn-secondary mt-4 mx-auto"
        >
          <ChevronLeft size={14} /> Volver
        </button>
      </div>
    );
  }

  if (questionsForAttempt.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList size={32} className="mx-auto mb-3 text-steel-600" />
        <p className="text-steel-500">No quedan más preguntas disponibles para este examen.</p>
        <button
          onClick={() => onNavigate('worker-trainings')}
          className="btn-secondary mt-4 mx-auto"
        >
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

      {state === 'intro' && (
        <div className="card text-center py-8">
          <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-steel-100 mb-2">{test.title}</h2>

          <p className="text-steel-400 text-sm mb-6">
            Evaluación final · {assignment?.training?.title ?? 'Training'}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-steel-50">
                {questionsForAttempt.length}
              </div>
              <div className="text-xs text-steel-400">Preguntas</div>
            </div>

            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-400">{test.passingScore}%</div>
              <div className="text-xs text-steel-400">Para aprobar</div>
            </div>

            <div className="bg-steel-900 rounded-xl p-3">
              <div className="text-2xl font-bold text-steel-50">
                {attempt}/{maxAttempts}
              </div>
              <div className="text-xs text-steel-400">Intento</div>
            </div>
          </div>

          {attempt > 1 && (
            <p className="text-xs text-amber-400 mb-4">
              Nuevo intento: se mostrarán otras preguntas del banco.
            </p>
          )}

          <button onClick={() => setState('taking')} className="btn-primary mx-auto px-8 py-3 text-base">
            <Play size={18} /> Comenzar evaluación
          </button>
        </div>
      )}

      {state === 'taking' && q && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-steel-400 font-medium">
                Pregunta {currentQ + 1} de {questionsForAttempt.length}
              </span>

              <div className="flex gap-1">
                {questionsForAttempt.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < currentQ ? 'bg-emerald-500' : i === currentQ ? 'bg-amber-500' : 'bg-steel-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="progress-bar h-1.5 mb-6">
              <div
                className="progress-fill"
                style={{
                  width: `${(currentQ / questionsForAttempt.length) * 100}%`,
                }}
              />
            </div>

            <h3 className="text-base font-semibold text-steel-100 mb-6 leading-relaxed">
              {q.question}
            </h3>

            <div className="space-y-2.5">
              {q.options.map((option: TestOption, optionIndex: number) => {
                const optionKey = getOptionKey(option, optionIndex);
                const optionText = getOptionText(option);
                const selected = answers[q.id] === optionKey;

                return (
                  <button
                    key={optionKey}
                    onClick={() => selectAnswer(q.id, optionKey)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      selected
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                        : 'bg-steel-900 border-steel-700 text-steel-300 hover:border-steel-500 hover:bg-steel-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        selected ? 'bg-amber-500 border-amber-500' : 'border-steel-600'
                      }`}
                    >
                      {selected && <div className="w-2 h-2 bg-petroleum-950 rounded-full" />}
                    </div>

                    <span className="text-sm">{optionText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQ((questionIndex) => Math.max(0, questionIndex - 1))}
              disabled={currentQ === 0 || isSaving}
              className="btn-secondary disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Anterior
            </button>

            {currentQ < questionsForAttempt.length - 1 ? (
              <button
                onClick={() => setCurrentQ((questionIndex) => questionIndex + 1)}
                disabled={answers[q.id] === undefined || isSaving}
                className="btn-primary disabled:opacity-40"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!answeredAll || isSaving}
                className="btn-primary bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              >
                <Check size={14} />
                {isSaving ? 'Guardando...' : 'Enviar respuestas'}
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'result' && result && (
        <div className="card text-center py-10">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${
              result.passed
                ? 'bg-emerald-500/20 border-2 border-emerald-500'
                : 'bg-red-500/20 border-2 border-red-500'
            }`}
          >
            {result.passed ? (
              <Award size={36} className="text-emerald-400" />
            ) : (
              <X size={36} className="text-red-400" />
            )}
          </div>

          <h2
            className={`text-2xl font-bold mb-2 ${
              result.passed ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {result.passed ? '¡Aprobado!' : 'No aprobado'}
          </h2>

          <p className="text-steel-400 text-sm mb-6">
            {result.passed
              ? 'Felicitaciones, superaste la evaluación. Tu certificado fue emitido correctamente.'
              : hasMoreAttempts
                ? 'No alcanzaste el puntaje mínimo requerido. Podés volver a intentarlo con otras preguntas.'
                : 'No alcanzaste el puntaje mínimo requerido y ya no quedan más intentos disponibles.'}
          </p>

          <div className="inline-block bg-steel-900 rounded-2xl px-8 py-5 mb-6 border border-steel-700">
            <div
              className={`text-5xl font-bold mb-1 ${
                result.passed ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {result.score}%
            </div>

            <div className="text-sm text-steel-400">
              {result.correct}/{result.total} correctas
            </div>

            <div className="text-xs text-steel-500 mt-1">
              Mínimo requerido: {test.passingScore}%
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!result.passed && hasMoreAttempts && (
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
