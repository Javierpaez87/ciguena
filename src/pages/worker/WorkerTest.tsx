import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft,
  ClipboardList,
  Check,
  X,
  Award,
  RefreshCw,
  ChevronRight,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getTrainingTestByTrainingId } from '../../data/trainingTests';
import { baseTrainings } from '../../data/baseTrainings';
import { calculateCertificateExpirationISO } from '../../lib/trainingConfiguration';

interface WorkerTestProps {
  assignment?: {
    id?: string;
    user_id?: string;
    tenant_id?: string | null;
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

type ShuffledQuestion = {
  id: string;
  question: string;
  options: TestOption[];
  correctOption: string;
};

type CertificateContext = {
  tenantId: string | null;
  workerSignatureUrl: string | null;
  companySignature: {
    id: string;
    signature_image_url: string;
    signer_name: string | null;
    signer_role?: string | null;
  } | null;
};

const getOptionText = (option: TestOption) => {
  if (typeof option === 'string') return option;

  return option.text || option.option_text || option.label || '';
};

const getOptionKey = (option: TestOption, optionIndex: number) => {
  if (typeof option === 'string') return String(optionIndex);

  return option.key || String(optionIndex);
};

const getExpirationDate = async (trainingId: string, tenantId: string) => {
  const training = baseTrainings.find(item => item.id === trainingId) ?? null;

  const { data: tenantTrainingConfiguration, error } = await supabase
    .from('tenant_trainings')
    .select('certificate_validity_mode, certificate_validity_months')
    .eq('tenant_id', tenantId)
    .eq('training_id', trainingId)
    .maybeSingle();

  if (error) {
    console.warn(
      'No pudimos leer la vigencia específica del tenant. Se usará la vigencia del catálogo.',
      error
    );
  }

  return calculateCertificateExpirationISO({
    configuration: error ? null : tenantTrainingConfiguration,
    training,
  });
};

const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporary = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = temporary;
  }

  return shuffled;
};

export default function WorkerTest({ assignment, onNavigate }: WorkerTestProps) {
  const { isReadOnly } = useAuth();
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
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [attemptHistoryLoaded, setAttemptHistoryLoaded] = useState(false);
  const [completedEarlier, setCompletedEarlier] = useState(false);

  useEffect(() => {
    let active = true;
    setAttemptHistoryLoaded(false);
    setCompletedEarlier(false);
    setAttempt(1);
    if (!assignment?.id || !test) {
      setAttemptHistoryLoaded(true);
      return;
    }
    supabase.from('training_test_attempts')
      .select('attempt_number, passed')
      .eq('assignment_id', assignment.id)
      .eq('test_id', test.id)
      .order('attempt_number', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('No se pudo recuperar historial de intentos:', error);
          setSaveWarning('No pudimos verificar los intentos anteriores. Contactá a soporte antes de rendir.');
          return;
        }
        setCompletedEarlier(Boolean(data?.some(item => item.passed)));
        setAttempt((data?.[0]?.attempt_number ?? 0) + 1);
        setAttemptHistoryLoaded(true);
      });
    return () => { active = false; };
  }, [assignment?.id, test?.id]);


  const questionsForAttempt = useMemo<ShuffledQuestion[]>(() => {
    if (!test) return [];

    const questionsPerAttempt = test.questionsPerAttempt;
    const startIndex = (attempt - 1) * questionsPerAttempt;
    const endIndex = startIndex + questionsPerAttempt;

    return test.questions.slice(startIndex, endIndex).map(question => ({
      ...question,
      options: shuffleArray(question.options),
    }));
  }, [test, attempt]);

  const maxAttempts = test
    ? Math.min(
        test.maxAttempts,
        Math.ceil(test.questions.length / test.questionsPerAttempt)
      )
    : 0;

  const selectAnswer = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const getCurrentProfile = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('Error obteniendo auth user para certificado:', authError);
      return null;
    }

    const authUserId = authData.user.id;

    const candidateIds = Array.from(
      new Set([authUserId, assignment?.user_id].filter(Boolean) as string[])
    );

    const orFilters = candidateIds
      .flatMap(id => [`id.eq.${id}`, `auth_user_id.eq.${id}`])
      .join(',');

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, tenant_id, full_name, email')
      .or(orFilters)
      .limit(1);

    if (profileError) {
      console.error('Error obteniendo perfil para certificado:', profileError);
      return null;
    }

    return profiles?.[0] ?? null;
  };

  const getCertificateContext = async (): Promise<CertificateContext> => {
    const profile = await getCurrentProfile();

    const tenantId =
      assignment?.tenant_id ||
      (profile?.tenant_id as string | null | undefined) ||
      null;

    const signatureUserIds = Array.from(
      new Set([
        assignment?.user_id,
        profile?.id,
        profile?.auth_user_id,
      ].filter(Boolean) as string[])
    );

    let workerSignatureUrl: string | null = null;

    if (signatureUserIds.length > 0) {
      const { data: signatureConsents, error: signatureConsentError } = await supabase
        .from('worker_signature_consents')
        .select('signature_image_url')
        .in('user_id', signatureUserIds)
        .order('accepted_at', { ascending: false })
        .limit(1);

      if (signatureConsentError) {
        console.error('Error obteniendo firma independiente del worker:', signatureConsentError);
      }

      workerSignatureUrl = signatureConsents?.[0]?.signature_image_url ?? null;

      // Compatibilidad histórica: certificados de workers que firmaron antes de 3A.1.
      if (!workerSignatureUrl) {
        const { data: ethicsAcceptances, error: ethicsError } = await supabase
          .from('ethics_acceptances')
          .select('signature_image_url')
          .in('user_id', signatureUserIds)
          .order('accepted_at', { ascending: false })
          .limit(1);

        if (ethicsError) {
          console.error('Error obteniendo firma histórica del worker:', ethicsError);
        }

        workerSignatureUrl = ethicsAcceptances?.[0]?.signature_image_url ?? null;
      }
    }

    let companySignature: CertificateContext['companySignature'] = null;

    if (tenantId) {
      const { data: signatureData, error: signatureError } = await supabase
        .from('tenant_signatures')
        .select('id, signature_image_url, signer_name, signer_role')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .eq('is_active', true)
        .not('signature_image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (signatureError) {
        console.error('Error obteniendo firma de empresa para certificado:', signatureError);
      }

      if (signatureData?.signature_image_url) {
        companySignature = {
          id: signatureData.id,
          signature_image_url: signatureData.signature_image_url,
          signer_name: signatureData.signer_name,
          signer_role: signatureData.signer_role,
        };
      }
    }

    if (!tenantId) {
      console.error('No se encontró tenant_id para emitir certificado.');
    }

    if (tenantId && !companySignature) {
      console.warn(
        'No se encontró firma default activa para el tenant. Revisar tenant_signatures o RLS.',
        { tenantId }
      );
    }

    return {
      tenantId,
      workerSignatureUrl,
      companySignature,
    };
  };

  // Certificate issuance and the final assignment transition are atomic in PostgreSQL.
  // Only the ID of the already-audited attempt (not a client-supplied score) is trusted.
  const registerTestAttempt = async (): Promise<{
    id: string;
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null> => {
    if (!assignment?.id || !test) {
      setSaveWarning('No encontramos los datos de la asignación para auditar el examen.');
      return null;
    }

    const { data: attemptId, error } = await supabase.rpc('record_training_test_attempt_audited', {
      p_assignment_id: assignment.id,
      p_test: test,
      p_questions: questionsForAttempt,
      p_answers: answers,
    });
    if (error || !attemptId) {
      console.error('No se pudo registrar el examen auditado:', error);
      setSaveWarning('No pudimos guardar la evidencia del examen. No se emitió ningún certificado. Contactá a soporte antes de reintentar.');
      return null;
    }

    const { data: recorded, error: readError } = await supabase
      .from('training_test_attempts')
      .select('id, score, passed, correct_answers, total_questions')
      .eq('id', attemptId)
      .single();
    if (readError || !recorded) {
      console.error('No se pudo consultar el resultado registrado:', readError);
      setSaveWarning('El intento quedó registrado, pero no pudimos consultar el resultado. No vuelvas a rendirlo: contactá a soporte.');
      return null;
    }
    return {
      id: recorded.id,
      score: recorded.score,
      passed: recorded.passed,
      correct: recorded.correct_answers,
      total: recorded.total_questions,
    };
  };

  const submitTest = async () => {
    if (isReadOnly) {
      setSaveWarning('Ghost View está en modo solo lectura. No se registrarán intentos ni certificados.');
      return;
    }
    if (!test || questionsForAttempt.length === 0 || !attemptHistoryLoaded || completedEarlier || isSaving) return;

    setSaveWarning(null);

    setIsSaving(true);
    const recorded = await registerTestAttempt();
    if (!recorded) {
      setIsSaving(false);
      return;
    }

    setResult({
      score: recorded.score,
      passed: recorded.passed,
      correct: recorded.correct,
      total: recorded.total,
    });

    if (recorded.passed) {
      try {
        // Certificate expiry is retained from the existing catalog / tenant configuration.
        // The database validates the exam evidence and derives issuance time itself.
        const { tenantId } = await getCertificateContext();
        const expiresAt = tenantId && assignment?.training_id
          ? await getExpirationDate(assignment.training_id, tenantId)
          : null;
        const { error: certificateError } = await supabase.rpc('issue_audited_test_certificate', {
          p_attempt_id: recorded.id,
          p_expires_at: expiresAt,
        });
        if (certificateError) {
          console.error('No se pudo emitir certificado auditado:', certificateError);
          setSaveWarning(`Tu examen se guardó y aprobaste, pero no pudimos emitir el certificado: ${certificateError.message}`);
        }
      } catch (certificateError) {
        console.error('Error emitiendo certificado:', certificateError);
        setSaveWarning('Tu examen se guardó, pero hubo un problema al emitir el certificado. Contactá a soporte.');
      }
    }

    setIsSaving(false);
    setState('result');
  };

  const retry = () => {
    const nextAttempt = attempt + 1;

    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setSaveWarning(null);
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

  if (!attemptHistoryLoaded) {
    return <div className="text-center py-16">{saveWarning || 'Verificando historial de intentos...'}</div>;
  }

  if (completedEarlier) {
    return (
      <div className="text-center py-16">
        <Award size={32} className="mx-auto mb-3" />
        <p>Este examen ya fue aprobado. Consultá tu certificado.</p>
        <button onClick={() => onNavigate('worker-certificates')} className="btn-primary mt-4 mx-auto">Ver certificados</button>
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

      {saveWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Atención</div>
            <div className="text-amber-100/90">{saveWarning}</div>
          </div>
        </div>
      )}

      {state === 'intro' && (
        <div className="card text-center py-8">
          <div className="w-16 h-16 brand-bg-soft border brand-border-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="brand-text" />
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
              <div className="text-2xl font-bold brand-text">{test.passingScore}%</div>
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

          <p className="text-xs text-steel-500 mb-5">
            Las opciones se muestran en orden aleatorio para evitar patrones de respuesta.
          </p>

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
                      i < currentQ ? 'bg-emerald-500' : i === currentQ ? 'brand-bg' : 'bg-steel-600'
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
                        ? 'brand-bg-soft brand-border brand-text'
                        : 'bg-steel-900 border-steel-700 text-steel-300 hover:border-steel-500 hover:bg-steel-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        selected ? 'brand-bg brand-border' : 'border-steel-600'
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
              ? saveWarning
                ? 'Aprobaste la evaluación. Revisá el aviso superior sobre la emisión del certificado.'
                : 'Felicitaciones, superaste la evaluación. Tu certificado fue emitido correctamente.'
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
