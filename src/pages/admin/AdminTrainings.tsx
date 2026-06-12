import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  Clock,
  Award,
  Plus,
  ChevronRight,
  PlayCircle,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import {
  getTrainingTestByTrainingId,
  type TrainingTest,
  type TrainingTestQuestion,
} from '../../data/trainingTests';
import type { Profile, Training } from '../../types';
import Modal from '../../components/ui/Modal';

type AssignMode = 'all' | 'role' | 'individual';

type AssignmentRow = {
  id: string;
  user_id: string;
  status: string | null;
  progress_percentage: number | null;
  assigned_at: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
};

type EmailNotificationRow = {
  id: string;
  assignment_id: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
};

function getWorkerRole(profile: Profile) {
  const workerJobRole = (profile as any).job_role as string | null | undefined;

  return (
    workerJobRole?.trim() ||
    profile.position?.trim() ||
    'Sin rol definido'
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isAssignmentCompleted(assignment?: AssignmentRow) {
  if (!assignment) return false;

  const status = (assignment.status || '').toLowerCase();

  return (
    Boolean(assignment.completed_at) ||
    status === 'completed' ||
    status === 'certificate_issued' ||
    Number(assignment.progress_percentage ?? 0) >= 100
  );
}

function getAssignmentVisualState(assignment?: AssignmentRow) {
  if (!assignment) {
    return {
      label: 'No asignado',
      shortLabel: 'No asignado',
      className: 'border-steel-700 bg-steel-900 hover:border-steel-600',
      badgeClassName: 'badge badge-neutral',
      dotClassName: 'bg-steel-500',
      checkboxClassName: 'accent-amber-500',
    };
  }

  if (isAssignmentCompleted(assignment)) {
    return {
      label: 'Completado',
      shortLabel: 'Completado',
      className: 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50',
      badgeClassName: 'badge badge-success',
      dotClassName: 'bg-emerald-500',
      checkboxClassName: 'accent-emerald-500',
    };
  }

  const daysUntilDeadline = getDaysUntil(assignment.due_date);

  if (daysUntilDeadline !== null && daysUntilDeadline <= 7) {
    return {
      label: daysUntilDeadline < 0 ? 'Pendiente · vencido' : 'Pendiente · deadline cercano',
      shortLabel: daysUntilDeadline < 0 ? 'Vencido' : 'Deadline cercano',
      className: 'border-red-500/30 bg-red-500/10 hover:border-red-500/50',
      badgeClassName: 'badge badge-danger',
      dotClassName: 'bg-red-500',
      checkboxClassName: 'accent-red-500',
    };
  }

  return {
    label: 'Pendiente',
    shortLabel: 'Pendiente',
    className: 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50',
    badgeClassName: 'badge badge-warning',
    dotClassName: 'bg-amber-500',
    checkboxClassName: 'accent-amber-500',
  };
}

function getStatusLabel(status?: string | null) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'not_started') return 'No iniciado';
  if (normalized === 'in_progress') return 'En progreso';
  if (normalized === 'completed') return 'Completado';
  if (normalized === 'certificate_issued') return 'Certificado emitido';

  return status || 'Sin estado';
}

export default function AdminTrainings() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? '';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState<Training | null>(null);
  const [showAssign, setShowAssign] = useState<Training | null>(null);
  const [showQuestions, setShowQuestions] = useState<Training | null>(null);

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [assignmentsByUserId, setAssignmentsByUserId] = useState<Record<string, AssignmentRow>>({});
  const [emailNotificationsByAssignmentId, setEmailNotificationsByAssignmentId] = useState<Record<string, EmailNotificationRow>>({});
  const [expandedAssignmentUserIds, setExpandedAssignmentUserIds] = useState<Set<string>>(new Set());

  const [assignMode, setAssignMode] = useState<AssignMode>('individual');
  const [selectedRole, setSelectedRole] = useState('');

  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminTrainings = async () => {
      if (!tenantId) {
        setTrainings([]);
        setUsers([]);
        setIsLoading(false);
        setLoadError('Tu usuario no tiene una empresa asociada.');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      const { data: tenantTrainings, error: tenantTrainingsError } = await supabase
        .from('tenant_trainings')
        .select('training_id, enabled')
        .eq('tenant_id', tenantId)
        .eq('enabled', true);

      if (tenantTrainingsError) {
        console.error('tenantTrainingsError:', tenantTrainingsError);
        setTrainings([]);
        setIsLoading(false);
        setLoadError(`No pudimos cargar los trainings habilitados: ${tenantTrainingsError.message}`);
        return;
      }

      const enabledTrainingIds = new Set(
        (tenantTrainings ?? []).map(row => row.training_id as string)
      );

      const enabledTrainings = baseTrainings.filter(training =>
        training.status === 'active' && enabledTrainingIds.has(training.id)
      );

      setTrainings(enabledTrainings);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'worker')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (profilesError) {
        console.error('profilesError:', profilesError);
        setUsers([]);
        setLoadError('Cargamos los trainings, pero no pudimos cargar los usuarios de tu empresa.');
        setIsLoading(false);
        return;
      }

      setUsers((profiles ?? []) as Profile[]);
      setIsLoading(false);
    };

    loadAdminTrainings();
  }, [tenantId]);

  const filtered = trainings.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const detailTest = useMemo(() => {
    if (!showDetail) return null;
    return getTrainingTestByTrainingId(showDetail.id);
  }, [showDetail]);

  const questionsTest = useMemo(() => {
    if (!showQuestions) return null;
    return getTrainingTestByTrainingId(showQuestions.id);
  }, [showQuestions]);

  const roleGroups = useMemo(() => {
    const map = new Map<string, Profile[]>();

    users.forEach(worker => {
      const workerRole = getWorkerRole(worker);

      if (!map.has(workerRole)) {
        map.set(workerRole, []);
      }

      map.get(workerRole)?.push(worker);
    });

    return Array.from(map.entries())
      .map(([role, workers]) => ({
        role,
        workers,
        count: workers.length,
      }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [users]);

  const selectedRoleUsers = useMemo(() => {
    if (!selectedRole) return [];
    return users.filter(worker => getWorkerRole(worker) === selectedRole);
  }, [users, selectedRole]);

  const getTargetUserIds = () => {
    if (assignMode === 'all') {
      return users.map(worker => worker.id);
    }

    if (assignMode === 'role') {
      return selectedRoleUsers.map(worker => worker.id);
    }

    return Array.from(selectedUsers);
  };

  const getAssignTargetCount = () => {
    const targets = getTargetUserIds();
    return targets.filter(userId => !assignedUserIds.has(userId)).length;
  };

  const getQuestionsByAttempt = (test: TrainingTest) => {
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
  };

  const resetAssignModal = () => {
    setShowAssign(null);
    setSelectedUsers(new Set());
    setAssignedUserIds(new Set());
    setAssignmentsByUserId({});
    setEmailNotificationsByAssignmentId({});
    setExpandedAssignmentUserIds(new Set());
    setAssignMode('individual');
    setSelectedRole('');
    setAssignMessage(null);
    setAssignError(null);
  };

  const loadAssignmentsForTraining = async (trainingId: string) => {
    if (!tenantId) {
      return {
        assignedIds: new Set<string>(),
        assignmentsMap: {} as Record<string, AssignmentRow>,
      };
    }

    const { data, error } = await supabase
      .from('training_assignments')
      .select('id, user_id, status, progress_percentage, assigned_at, due_date, started_at, completed_at, expires_at')
      .eq('tenant_id', tenantId)
      .eq('training_id', trainingId);

    if (error) {
      console.error('Error cargando asignaciones existentes:', error);
      setAssignError(`No pudimos cargar asignaciones existentes: ${error.message}`);

      return {
        assignedIds: new Set<string>(),
        assignmentsMap: {} as Record<string, AssignmentRow>,
      };
    }

    const assignments = (data ?? []) as AssignmentRow[];

    const existingAssignedIds = new Set(
      assignments.map(row => row.user_id as string)
    );

    const assignmentsMap = assignments.reduce<Record<string, AssignmentRow>>((acc, assignment) => {
      acc[assignment.user_id] = assignment;
      return acc;
    }, {});

    const assignmentIds = assignments.map(assignment => assignment.id).filter(Boolean);

    let notificationsMap: Record<string, EmailNotificationRow> = {};

    if (assignmentIds.length > 0) {
      const { data: notificationData, error: notificationError } = await supabase
        .from('email_notifications')
        .select('id, assignment_id, status, sent_at, created_at')
        .eq('type', 'training_assignment')
        .in('assignment_id', assignmentIds)
        .order('created_at', { ascending: false });

      if (notificationError) {
        console.warn('No pudimos cargar email_notifications:', notificationError);
      } else {
        notificationsMap = ((notificationData ?? []) as EmailNotificationRow[]).reduce<Record<string, EmailNotificationRow>>(
          (acc, notification) => {
            if (notification.assignment_id && !acc[notification.assignment_id]) {
              acc[notification.assignment_id] = notification;
            }

            return acc;
          },
          {}
        );
      }
    }

    setAssignedUserIds(existingAssignedIds);
    setAssignmentsByUserId(assignmentsMap);
    setEmailNotificationsByAssignmentId(notificationsMap);

    return {
      assignedIds: existingAssignedIds,
      assignmentsMap,
    };
  };

  const openAssignModal = async (training: Training) => {
    setShowAssign(training);
    setSelectedUsers(new Set());
    setAssignedUserIds(new Set());
    setAssignmentsByUserId({});
    setEmailNotificationsByAssignmentId({});
    setExpandedAssignmentUserIds(new Set());
    setAssignMode('individual');
    setSelectedRole('');
    setAssignMessage(null);
    setAssignError(null);

    if (!tenantId) {
      setAssignError('Tu usuario no tiene una empresa asociada.');
      return;
    }

    const { assignedIds } = await loadAssignmentsForTraining(training.id);

    setSelectedUsers(assignedIds);
    setAssignMode('individual');
    setSelectedRole('');
  };

  const sendAssignmentEmails = async (assignmentIds: string[]) => {
    if (assignmentIds.length === 0) {
      console.warn('No hay assignmentIds para enviar emails.');
      return {
        sent: 0,
        failed: 0,
      };
    }

    console.log('Enviando emails para assignmentIds:', assignmentIds);

    const results = await Promise.allSettled(
      assignmentIds.map(async assignmentId => {
        console.log('Enviando mail de asignación para assignmentId:', assignmentId);

        const response = await fetch('/.netlify/functions/send-training-assignment-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignmentId }),
        });

        const responseBody = await response.json().catch(() => null);

        if (!response.ok) {
          console.error('Falló send-training-assignment-email:', response.status, responseBody);
          throw new Error(responseBody?.error || 'No se pudo enviar el email.');
        }

        return responseBody;
      })
    );

    let sent = 0;
    let failed = 0;

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        sent += 1;
      } else {
        failed += 1;
        console.warn('Falló el envío de una notificación:', result.reason);
      }
    });

    return {
      sent,
      failed,
    };
  };

  const handleAssign = async () => {
    if (!showAssign || !tenantId || !user?.id) {
      setAssignError('No pudimos asignar el training. Falta información del usuario o empresa.');
      return;
    }

    let targets: string[] = [];

    if (assignMode === 'all') {
      targets = users.map(worker => worker.id);
    }

    if (assignMode === 'role') {
      if (!selectedRole) {
        setAssignError('Seleccioná un rol para asignar el training.');
        return;
      }

      targets = selectedRoleUsers.map(worker => worker.id);
    }

    if (assignMode === 'individual') {
      targets = Array.from(selectedUsers);
    }

    if (targets.length === 0) {
      setAssignError('No hay usuarios para asignar con esta selección.');
      return;
    }

    const newTargets = targets.filter(userId => !assignedUserIds.has(userId));

    if (newTargets.length === 0) {
      setAssignMessage(
        `El training "${showAssign.title}" ya estaba asignado a los usuarios seleccionados. No se enviaron nuevos emails.`
      );
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    setAssignMessage(null);

    const assignments = newTargets.map(userId => ({
      tenant_id: tenantId,
      training_id: showAssign.id,
      user_id: userId,
      assigned_by: user.id,
      status: 'not_started',
      progress_percentage: 0,
      assigned_at: new Date().toISOString(),
      due_date: null,
      started_at: null,
      completed_at: null,
      expires_at: null,
    }));

    const { error } = await supabase
      .from('training_assignments')
      .upsert(assignments, {
        onConflict: 'tenant_id,training_id,user_id',
      });

    if (error) {
      console.error('Error asignando training:', error);
      setIsAssigning(false);
      setAssignError(`No pudimos asignar el training: ${error.message}`);
      return;
    }

    const { data: createdAssignments, error: createdAssignmentsError } = await supabase
      .from('training_assignments')
      .select('id, user_id')
      .eq('tenant_id', tenantId)
      .eq('training_id', showAssign.id)
      .in('user_id', newTargets);

    if (createdAssignmentsError) {
      console.error('Error buscando asignaciones para enviar emails:', createdAssignmentsError);
      setIsAssigning(false);
      setAssignError(
        `El training fue asignado, pero no pudimos preparar los emails: ${createdAssignmentsError.message}`
      );
      return;
    }

    const assignmentIds = (createdAssignments ?? [])
      .map(row => row.id as string)
      .filter(Boolean);

    console.log('Assignment IDs para enviar mail:', assignmentIds);

    const emailResult = await sendAssignmentEmails(assignmentIds);

    await loadAssignmentsForTraining(showAssign.id);

    setIsAssigning(false);

    const refreshedAssignedIds = new Set([...Array.from(assignedUserIds), ...newTargets]);
    setSelectedUsers(refreshedAssignedIds);

    const modeLabel =
      assignMode === 'all'
        ? 'todos los usuarios activos'
        : assignMode === 'role'
          ? `el rol "${selectedRole}"`
          : 'los usuarios seleccionados';

    const emailText =
      emailResult.failed > 0
        ? ` Se enviaron ${emailResult.sent} email(s), pero fallaron ${emailResult.failed}.`
        : ` Se enviaron ${emailResult.sent} email(s) de notificación.`;

    setAssignMessage(
      `Training "${showAssign.title}" asignado a ${newTargets.length} usuario(s) de ${modeLabel}.${emailText}`
    );

    setTimeout(() => {
      resetAssignModal();
    }, 1400);
  };

  const getContentLabel = (training: Training) => {
    if (training.content_type === 'local_video') return 'Video local';
    if (training.content_type === 'video') return 'Video';
    if (training.content_type === 'youtube') return 'YouTube';
    if (training.content_type === 'document') return 'Documento';
    if (training.content_type === 'external') return 'Recurso externo';
    return 'No definido';
  };

  const renderAssignmentDetails = (worker: Profile) => {
    const assignment = assignmentsByUserId[worker.id];

    if (!assignment) {
      return (
        <div className="mt-3 rounded-lg border border-steel-700 bg-steel-950 p-3 text-xs text-steel-400">
          Este usuario todavía no tiene este training asignado.
        </div>
      );
    }

    const notification = emailNotificationsByAssignmentId[assignment.id];

    return (
      <div className="mt-3 rounded-lg border border-steel-700 bg-steel-950 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-steel-500">Asignado / enviado</div>
            <div className="text-steel-200">{formatDateTime(assignment.assigned_at)}</div>
          </div>

          <div>
            <div className="text-steel-500">Email de asignación</div>
            <div className="text-steel-200">
              {notification?.sent_at
                ? formatDateTime(notification.sent_at)
                : notification?.status
                  ? `Estado: ${notification.status}`
                  : 'Sin registro'}
            </div>
          </div>

          <div>
            <div className="text-steel-500">Deadline</div>
            <div className="text-steel-200">{formatDate(assignment.due_date)}</div>
          </div>

          <div>
            <div className="text-steel-500">Inicio</div>
            <div className="text-steel-200">{formatDateTime(assignment.started_at)}</div>
          </div>

          <div>
            <div className="text-steel-500">Realizado</div>
            <div className="text-steel-200">{formatDateTime(assignment.completed_at)}</div>
          </div>

          <div>
            <div className="text-steel-500">Vencimiento certificado</div>
            <div className="text-steel-200">{formatDate(assignment.expires_at)}</div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          Para administrar deadlines, desasignar, reasignar, reenviar mails o revisar el
          historial completo de evidencias, ingresá a la sección <strong>Asignaciones</strong>.
        </div>
      </div>
    );
  };

  const renderWorkerAssignmentRow = (worker: Profile, options?: { withCheckbox?: boolean }) => {
    const withCheckbox = options?.withCheckbox ?? false;
    const assignment = assignmentsByUserId[worker.id];
    const visual = getAssignmentVisualState(assignment);
    const isAssigned = Boolean(assignment);
    const isCompleted = isAssignmentCompleted(assignment);
    const notification = assignment ? emailNotificationsByAssignmentId[assignment.id] : null;
    const isExpanded = expandedAssignmentUserIds.has(worker.id);

    const statusLine = assignment
      ? isCompleted
        ? `Completado · Realizado: ${formatDate(assignment.completed_at)}`
        : `${visual.label} · Deadline: ${formatDate(assignment.due_date)}`
      : 'No asignado';

    const assignedLine = assignment
      ? `Asignado: ${formatDate(assignment.assigned_at)}`
      : 'Disponible para asignar';

    const emailLine = assignment
      ? notification?.sent_at
        ? `Email: ${formatDate(notification.sent_at)}`
        : 'Email: sin registro'
      : null;

    return (
      <div
        key={worker.id}
        className={`rounded-xl border p-3 transition-colors ${visual.className}`}
      >
        <div className="flex items-start gap-3">
          {withCheckbox && (
            <input
              type="checkbox"
              checked={selectedUsers.has(worker.id)}
              disabled={isAssigning || isAssigned}
              onChange={event => {
                if (isAssigned) return;

                setSelectedUsers(previousUsers => {
                  const nextUsers = new Set(previousUsers);

                  if (event.target.checked) {
                    nextUsers.add(worker.id);
                  } else {
                    nextUsers.delete(worker.id);
                  }

                  return nextUsers;
                });
              }}
              className={`mt-1 w-4 h-4 ${visual.checkboxClassName}`}
            />
          )}

          {!withCheckbox && (
            <div className={`mt-1 w-4 h-4 rounded-full ${visual.dotClassName} flex items-center justify-center flex-shrink-0`}>
              {isAssigned && <Check size={10} className="text-white" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium text-steel-100">
                    {worker.full_name}
                  </div>

                  <span className={visual.badgeClassName}>
                    {visual.shortLabel}
                  </span>

                  {isAssigned && (
                    <span className="rounded-full border border-steel-600 bg-steel-950 px-2 py-0.5 text-[10px] font-semibold text-steel-300">
                      {getStatusLabel(assignment?.status)}
                    </span>
                  )}
                </div>

                <div className="text-xs text-steel-400 mt-0.5">
                  {getWorkerRole(worker)} · {worker.email}
                </div>
              </div>

              {isAssigned && (
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => {
                    setExpandedAssignmentUserIds(previousIds => {
                      const nextIds = new Set(previousIds);

                      if (nextIds.has(worker.id)) {
                        nextIds.delete(worker.id);
                      } else {
                        nextIds.add(worker.id);
                      }

                      return nextIds;
                    });
                  }}
                  className="btn-ghost text-xs py-1.5 px-2 self-start"
                >
                  <ChevronRight
                    size={13}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  Detalle / opciones
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-steel-500">Estado</div>
                <div className="text-steel-200">{statusLine}</div>
              </div>

              <div>
                <div className="text-steel-500">Asignación</div>
                <div className="text-steel-200">{assignedLine}</div>
              </div>

              <div>
                <div className="text-steel-500">Progreso</div>
                <div className="text-steel-200">
                  {assignment ? `${assignment.progress_percentage ?? 0}%` : '-'}
                </div>
              </div>
            </div>

            {emailLine && (
              <div className="mt-2 text-xs text-steel-400">
                {emailLine}
              </div>
            )}

            {isExpanded && renderAssignmentDetails(worker)}
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewContent = (training: Training) => {
    if (!training.content_url) {
      return (
        <div className="rounded-xl border border-steel-700 bg-steel-900 p-6 text-center">
          <PlayCircle size={28} className="mx-auto mb-3 text-steel-500" />
          <p className="text-sm font-medium text-steel-200 mb-1">
            Este training todavía no tiene contenido cargado.
          </p>
          <p className="text-xs text-steel-500">
            El contenido podrá ser un video, documento o recurso externo.
          </p>
        </div>
      );
    }

    if (training.content_type === 'local_video' || training.content_type === 'video') {
      return (
        <video
          src={training.content_url}
          controls
          className="w-full rounded-xl border border-steel-700 bg-black"
        />
      );
    }

    if (training.content_type === 'youtube') {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-steel-700 bg-black">
          <iframe
            src={training.content_url}
            title={training.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-steel-700 bg-steel-900 p-6">
        <p className="text-sm text-steel-300 mb-4">
          Este contenido se abre como recurso externo.
        </p>
        <a
          href={training.content_url}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-flex"
        >
          Abrir contenido
        </a>
      </div>
    );
  };

  const renderQuestionsModalContent = (training: Training, test: TrainingTest | null) => {
    if (!test) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Este training todavía no tiene test cargado</div>
              <div className="text-amber-100/80 mt-1">
                El training está habilitado para tu empresa, pero todavía no existen preguntas
                cargadas en el repo para esta capacitación.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-steel-700 bg-steel-900 p-4">
            <div className="text-xs text-steel-500 mb-1">Training</div>
            <div className="text-sm font-semibold text-steel-100">{training.title}</div>
            <div className="text-xs text-steel-400 mt-1">
              Puntaje mínimo configurado: {training.passing_score}%
            </div>
          </div>
        </div>
      );
    }

    const attempts = getQuestionsByAttempt(test);

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck size={18} className="text-emerald-400" />
            </div>

            <div className="flex-1">
              <div className="text-sm font-semibold text-steel-100">{test.title}</div>
              <div className="text-xs text-steel-400 mt-1">
                {test.description || 'Evaluación cargada desde el repo.'}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-success">Test real cargado</span>
                <span className="badge badge-info">{test.questions.length} preguntas</span>
                <span className="badge badge-neutral">
                  {test.questionsPerAttempt} preguntas por intento
                </span>
                <span className="badge badge-neutral">{test.maxAttempts} intentos</span>
                <span className="badge badge-warning">{test.passingScore}% aprobación</span>
              </div>
            </div>
          </div>
        </div>

        {attempts.map((attempt) => (
          <div
            key={attempt.attemptNumber}
            className="rounded-xl border border-steel-700 bg-steel-950 p-4"
          >
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
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <p className="text-sm font-medium text-steel-100">
                            {question.question}
                          </p>

                          <span className="text-xs text-steel-500 font-mono flex-shrink-0">
                            {question.id}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {question.options.map((option) => {
                            const isCorrect = option.key === question.correctOption;

                            return (
                              <div
                                key={option.key}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                                  isCorrect
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-steel-950 border-steel-700 text-steel-300'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase ${
                                    isCorrect
                                      ? 'bg-emerald-500 text-white'
                                      : 'border border-steel-600 text-steel-400'
                                  }`}
                                >
                                  {isCorrect ? <Check size={11} className="text-white" /> : option.key}
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
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Buscar training..."
        />
      </div>

      {isLoading && (
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
          Cargando trainings habilitados para tu empresa...
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
            <div className="text-sm font-semibold text-steel-100">
              Trainings habilitados para tu empresa
            </div>
            <div className="text-xs text-steel-500">
              Estos son los cursos que BondiApps habilitó para este tenant desde SuperAdmin.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(tr => {
              const test = getTrainingTestByTrainingId(tr.id);

              return (
                <div key={tr.id} className="card hover:border-steel-600 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-petroleum-200" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-steel-100 mb-1">
                        {tr.title}
                      </div>
                      <p className="text-xs text-steel-400 line-clamp-2">
                        {tr.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="badge badge-info">{tr.category}</span>

                    <span className="badge badge-neutral flex items-center gap-1">
                      <Clock size={10} /> {tr.duration_minutes} min
                    </span>

                    {tr.certificate_enabled && (
                      <span className="badge badge-warning flex items-center gap-1">
                        <Award size={10} /> Certifica
                      </span>
                    )}

                    {tr.validity_months && (
                      <span className="badge badge-neutral">
                        {tr.validity_months}m vigencia
                      </span>
                    )}

                    {tr.content_type && (
                      <span className="badge badge-neutral">
                        {getContentLabel(tr)}
                      </span>
                    )}

                    {test ? (
                      <span className="badge badge-success">
                        Test cargado
                      </span>
                    ) : (
                      <span className="badge badge-neutral">
                        Sin test
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                      <div className="text-sm font-bold text-steel-100">
                        {test?.passingScore ?? tr.passing_score}%
                      </div>
                      <div className="text-xs text-steel-500">Min. aprobación</div>
                    </div>

                    <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                      <div className="text-sm font-bold text-steel-100">
                        {test?.maxAttempts ?? tr.max_attempts ?? '∞'}
                      </div>
                      <div className="text-xs text-steel-500">Intentos</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDetail(tr)}
                      className="btn-ghost text-xs flex-1 justify-center"
                    >
                      <ChevronRight size={13} /> Detalle
                    </button>

                    <button
                      onClick={() => openAssignModal(tr)}
                      className="btn-primary text-xs flex-1 justify-center"
                    >
                      <Plus size={13} /> Asignar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-steel-500">
              <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay trainings habilitados para tu empresa.</p>
            </div>
          )}
        </>
      )}

      {showDetail && (
        <Modal
          open={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={showDetail.title}
          size="lg"
        >
          <div className="space-y-5">
            <div>
              <p className="text-sm text-steel-300">
                {showDetail.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PlayCircle size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-steel-100">
                  Contenido del training
                </h3>
              </div>

              {renderPreviewContent(showDetail)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-steel-100">
                    Evaluación
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuestions(showDetail)}
                  className="btn-secondary text-xs py-2"
                >
                  <Eye size={13} />
                  Preguntas
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Requiere examen',
                    value: showDetail.passing_score > 0 ? 'Sí' : 'No',
                  },
                  {
                    label: 'Preguntas configuradas',
                    value: detailTest ? `${detailTest.questions.length}` : 'Sin test cargado',
                  },
                  {
                    label: 'Puntaje mínimo',
                    value: `${detailTest?.passingScore ?? showDetail.passing_score}%`,
                  },
                  {
                    label: 'Intentos máx.',
                    value:
                      detailTest?.maxAttempts?.toString() ??
                      showDetail.max_attempts?.toString() ??
                      'Ilimitado',
                  },
                ].map(item => (
                  <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                    <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-steel-200">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-steel-100">
                  Certificación
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Categoría', value: showDetail.category },
                  { label: 'Duración', value: `${showDetail.duration_minutes} minutos` },
                  {
                    label: 'Vigencia',
                    value: showDetail.validity_months
                      ? `${showDetail.validity_months} meses`
                      : 'Sin vigencia',
                  },
                  { label: 'Emite certificado', value: showDetail.certificate_enabled ? 'Sí' : 'No' },
                  { label: 'Tipo de contenido', value: getContentLabel(showDetail) },
                ].map(item => (
                  <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                    <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                    <div className="text-sm font-medium text-steel-200">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showQuestions && (
        <Modal
          open={!!showQuestions}
          onClose={() => setShowQuestions(null)}
          title={`Preguntas — ${showQuestions.title}`}
          size="lg"
        >
          {renderQuestionsModalContent(showQuestions, questionsTest)}
        </Modal>
      )}

      {showAssign && (
        <Modal
          open={!!showAssign}
          onClose={() => {
            if (isAssigning) return;
            resetAssignModal();
          }}
          title={`Asignar: ${showAssign.title}`}
          size="lg"
          footer={
            <>
              <button
                onClick={() => {
                  if (isAssigning) return;
                  resetAssignModal();
                }}
                className="btn-ghost"
                disabled={isAssigning}
              >
                Cancelar
              </button>

              <button
                onClick={handleAssign}
                disabled={
                  isAssigning ||
                  getAssignTargetCount() === 0 ||
                  (assignMode === 'role' && !selectedRole)
                }
                className="btn-primary"
              >
                <Plus size={15} />
                {isAssigning ? 'Asignando...' : `Asignar (${getAssignTargetCount()})`}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            {assignMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Asignación creada</div>
                  <div className="text-emerald-200/90">{assignMessage}</div>
                </div>
              </div>
            )}

            {assignError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">No se pudo asignar</div>
                  <div className="text-red-200/90">{assignError}</div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-steel-700 bg-steel-900/70 p-3 text-xs text-steel-300">
              Esta vista permite asignar trainings rápidamente desde el catálogo.
              Para administrar deadlines, desasignar, reasignar, reenviar mails o revisar
              evidencias completas, ingresá a la sección <strong className="text-steel-100">Asignaciones</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignMode('all');
                  setSelectedRole('');
                  setSelectedUsers(new Set(users.map(worker => worker.id)));
                }}
                disabled={isAssigning}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  assignMode === 'all'
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-steel-900 border-steel-700 hover:border-steel-600'
                }`}
              >
                <div className="text-sm font-semibold text-steel-100">Todos</div>
                <div className="text-xs text-steel-400 mt-1">
                  {users.length} usuarios activos · {users.filter(worker => !assignedUserIds.has(worker.id)).length} nuevos
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssignMode('role');
                  setSelectedUsers(new Set(assignedUserIds));
                }}
                disabled={isAssigning}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  assignMode === 'role'
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-steel-900 border-steel-700 hover:border-steel-600'
                }`}
              >
                <div className="text-sm font-semibold text-steel-100">Por rol</div>
                <div className="text-xs text-steel-400 mt-1">
                  {roleGroups.length} roles detectados
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssignMode('individual');
                  setSelectedRole('');
                  setSelectedUsers(new Set(assignedUserIds));
                }}
                disabled={isAssigning}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  assignMode === 'individual'
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-steel-900 border-steel-700 hover:border-steel-600'
                }`}
              >
                <div className="text-sm font-semibold text-steel-100">Individual</div>
                <div className="text-xs text-steel-400 mt-1">
                  Elegir personas
                </div>
              </button>
            </div>

            {assignMode === 'role' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Rol / puesto</label>
                  <select
                    value={selectedRole}
                    onChange={event => setSelectedRole(event.target.value)}
                    className="select"
                    disabled={isAssigning}
                  >
                    <option value="">Seleccionar rol...</option>
                    {roleGroups.map(group => {
                      const newCount = group.workers.filter(worker => !assignedUserIds.has(worker.id)).length;

                      return (
                        <option key={group.role} value={group.role}>
                          {group.role} · {group.count} usuario(s) · {newCount} nuevos
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedRole && (
                  <div className="space-y-2">
                    <p className="text-xs text-steel-400 font-medium">
                      Usuarios incluidos en este rol:
                    </p>

                    {selectedRoleUsers.map(worker => renderWorkerAssignmentRow(worker))}
                  </div>
                )}

                {!selectedRole && (
                  <div className="rounded-lg border border-steel-700 bg-steel-900 p-3 text-sm text-steel-400">
                    Seleccioná un rol para ver qué usuarios serán asignados.
                  </div>
                )}
              </div>
            )}

            {assignMode === 'individual' && (
              <div className="space-y-2">
                <p className="text-xs text-steel-400 font-medium">
                  Seleccioná usuarios individuales:
                </p>

                {users.length === 0 && (
                  <div className="rounded-lg border border-steel-700 bg-steel-900 p-3 text-sm text-steel-400">
                    No hay usuarios activos para asignar en esta empresa.
                  </div>
                )}

                {users.map(worker => renderWorkerAssignmentRow(worker, { withCheckbox: true }))}
              </div>
            )}

            {assignMode === 'all' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Se asignará este training a todos los usuarios activos que todavía no lo tengan asignado:
                  <span className="font-semibold"> {users.filter(worker => !assignedUserIds.has(worker.id)).length} usuario(s) nuevo(s)</span>.
                </div>

                <div className="space-y-2">
                  {users.map(worker => renderWorkerAssignmentRow(worker))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
