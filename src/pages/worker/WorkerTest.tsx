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
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getTrainingTestByTrainingId } from '../../data/trainingTests';
import { baseTrainings } from '../../data/baseTrainings';

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

const generateCertificateCode = (trainingId: string) => {
  const cleanTrainingId = trainingId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `CIG-${cleanTrainingId}-${Date.now()}`;
};

const getExpirationDate = (trainingId: string) => {
  const training = baseTrainings.find(item => item.id === trainingId);
  const validityMonths = training?.validity_months ?? 12;

  if (!validityMonths) return null;

  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + validityMonths);
  return expirationDate.toISOString();
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

  const maxAttempts = test ? Math.ceil(test.questions.length / test.questionsPerAttempt) : 0;

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
      const { data: ethicsAcceptances, error: ethicsError } = await supabase
        .from('ethics_acceptances')
        .select('signature_image_url')
        .in('user_id', signatureUserIds)
        .order('accepted_at', { ascending: false })
        .limit(1);

      if (ethicsError) {
        console.error('Error obteniendo firma del worker para certificado:', ethicsError);
      }

      workerSignatureUrl = ethicsAcceptances?.[0]?.signature_image_url ?? null;
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
      .select('id, company_signature_url')
      .eq('assignment_id', assignment.id)
      .maybeSingle();

    if (existingError) {
      console.error('Error verificando certificado existente:', existingError);
    }

    if (existingCertificate?.id) {
      return;
    }

    const { tenantId, workerSignatureUrl, companySignature } = await getCertificateContext();

    if (!tenantId) {
      setSaveWarning(
        'El examen fue aprobado, pero no se pudo emitir el certificado porque no encontramos la empresa asociada.'
      );
      console.error('No se pudo emitir certificado: tenant_id no encontrado.');
      return;
    }

    if (!companySignature?.signature_image_url) {
      setSaveWarning(
        'El certificado se emitirá sin firma responsable porque no se pudo leer la firma default activa de la empresa. Revisá tenant_signatures/RLS.'
      );
    }

    const certificatePayload = {
      assignment_id: assignment.id,
      user_id: assignment.user_id,
      training_id: assignment.training_id,
      tenant_id: tenantId,
      certificate_code: generateCertificateCode(assignment.training_id),
      worker_signature_url: workerSignatureUrl,
      company_signature_id: companySignature?.id ?? null,
      company_signature_url: companySignature?.signature_image_url ?? null,
      company_signer_name: companySignature?.signer_name ?? null,
      company_signer_role: companySignature?.signer_role ?? null,
      issued_at: new Date().toISOString(),
      expires_at: getExpirationDate(assignment.training_id),
      status: 'valid',
      test_score: score,
      test_attempts_count: attemptNumber,
    };

    console.log('Emitiendo certificado con payload:', certificatePayload);

    const { error } = await supabase.from('certificates').insert(certificatePayload);

    if (error) {
      console.error('Error emitiendo certificado:', error);
      setSaveWarning(`Aprobaste el examen, pero no pudimos emitir el certificado: ${error.message}`);
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
    if (isReadOnly) {
      setSaveWarning('Ghost View está en modo solo lectura. No se registrarán intentos ni certificados.');
      return;
    }
    if (!test || questionsForAttempt.length === 0) return;

    setSaveWarning(null);

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
      await issueCertificate({
        score,
        attemptNumber: attempt,
      });

      await markAssignmentAsCertificateIssued({
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
