import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  BellRing,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Users,
  BookOpen,
  CalendarDays,
  Send,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  XCircle,
  CalendarClock,
  Mail,
  CheckCircle2,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'not_started', label: 'No iniciado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'pending_test', label: 'Pendiente test' },
  { value: 'passed', label: 'Aprobado' },
  { value: 'failed', label: 'Reprobado' },
  { value: 'certificate_issued', label: 'Certificado emitido' },
  { value: 'expired', label: 'Vencido' },
  { value: 'unassigned', label: 'Desasignado' },
];

type AssignTargetMode = 'filtered' | 'role' | 'all_workers';
type AssignmentAction = 'deadline' | 'unassign' | 'reassign' | null;
type NotificationType = 'assignment' | 'reminder' | 'unassignment' | 'reassignment';

interface Profile {
  id: string;
  tenant_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  job_role?: string | null;
  position?: string | null;
  area?: string | null;
  employee_code?: string | null;
  dni?: string | null;
  status?: string | null;
  [key: string]: any;
}

interface TenantTraining {
  id?: string;
  tenant_id?: string | null;
  training_id?: string | null;
  title?: string | null;
  name?: string | null;
  training_title?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  [key: string]: any;
}

interface Assignment {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_training_id?: string | null;
  status?: string | null;
  progress_percentage?: number | null;
  progress?: number | null;
  assigned_at?: string | null;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
  unassigned_at?: string | null;
  unassigned_by?: string | null;
  reassigned_at?: string | null;
  reassigned_by?: string | null;
  reassignment_count?: number | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

interface Certificate {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  assignment_id?: string | null;
  certificate_code?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
  [key: string]: any;
}

interface TrainingOption {
  id: string;
  title: string;
  category?: string | null;
  duration_minutes?: number | null;
  certificate_enabled?: boolean | null;
}

interface EmailEvidence {
  requested: boolean;
  sent: boolean;
  recipient_count: number;
  admin_email?: string | null;
  message?: string;
  error?: string;
  type?: NotificationType;
  provider_response?: unknown;
}

interface AssignmentReviewItem {
  profile: Profile;
  existingAssignment?: Assignment | null;
  existingCertificate?: Certificate | null;
  classification: 'new' | 'active' | 'completed' | 'certified' | 'unassigned';
}

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function getFullName(profile?: Profile | null) {
  if (!profile) return 'Usuario sin nombre';

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Usuario sin nombre'
  );
}

function getInitial(profile?: Profile | null) {
  return getFullName(profile).trim().charAt(0).toUpperCase() || 'U';
}

function getWorkerRole(profile?: Profile | null) {
  return (
    profile?.job_role?.trim() ||
    profile?.position?.trim() ||
    'Sin rol definido'
  );
}

function getTrainingTitle(training?: TenantTraining | null, assignment?: Assignment | null) {
  const trainingId = training?.training_id || assignment?.training_id || '';
  const baseTraining = baseTrainings.find((item) => item.id === trainingId);

  return (
    training?.title ||
    training?.training_title ||
    training?.name ||
    baseTraining?.title ||
    assignment?.training_title ||
    assignment?.training_name ||
    assignment?.training_id ||
    'Training sin título'
  );
}

function getAssignmentProgress(assignment: Assignment) {
  const directProgress =
    assignment.progress_percentage ??
    assignment.progress ??
    assignment.completion_percentage ??
    null;

  if (typeof directProgress === 'number') {
    return Math.max(0, Math.min(100, Math.round(directProgress)));
  }

  const status = normalize(assignment.status);

  if (['completed', 'passed', 'certificate_issued', 'approved'].includes(status)) return 100;
  if (['in_progress', 'started', 'pending_test'].includes(status)) return 50;

  return 0;
}

function getAssignedDate(assignment: Assignment) {
  return assignment.assigned_at || assignment.created_at || assignment.updated_at || null;
}

function formatDate(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('es-AR');
}

function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDueDateISODate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function getUserTrainingKey(userId?: string | null, trainingId?: string | null) {
  return `${userId || ''}:${trainingId || ''}`;
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((a, b) => {
    const dateA = new Date(
      a.assigned_at || a.created_at || a.updated_at || a.completed_at || ''
    ).getTime();

    const dateB = new Date(
      b.assigned_at || b.created_at || b.updated_at || b.completed_at || ''
    ).getTime();

    return dateB - dateA;
  });
}

function isActiveAssignment(assignment: Assignment) {
  return assignment.is_active !== false && normalize(assignment.status) !== 'unassigned';
}

function isReminderEligible(status?: string | null) {
  return ['not_started', 'in_progress', 'pending_test', 'assigned', 'started'].includes(
    normalize(status)
  );
}

function isCompletedAssignmentStatus(status?: string | null) {
  return ['completed', 'passed', 'certificate_issued', 'approved'].includes(normalize(status));
}

function isWorker(profile: Profile) {
  return normalize(profile.role) === 'worker';
}

function isActiveProfile(profile: Profile) {
  const status = normalize(profile.status);
  return !status || status === 'active' || status === 'enabled';
}

function getDeadlineVisualClass(assignment: Assignment) {
  if (!isActiveAssignment(assignment)) {
    return 'border-steel-600 bg-steel-800/60 text-steel-300';
  }

  if (isCompletedAssignmentStatus(assignment.status)) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (!assignment.due_date) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  const dueDate = new Date(assignment.due_date);
  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function AdminAssignments() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [remindSent, setRemindSent] = useState<Set<string>>(new Set());

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStep, setAssignStep] = useState<'select' | 'due_date' | 'confirm'>('select');
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [assignTargetMode, setAssignTargetMode] = useState<AssignTargetMode>('filtered');
  const [assignRole, setAssignRole] = useState('all');
  const [dueDate, setDueDate] = useState(getDefaultDueDateISODate());
  const [sendEmail, setSendEmail] = useState(true);
  const [includeCertifiedUsers, setIncludeCertifiedUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentAction, setAssignmentAction] = useState<AssignmentAction>(null);
  const [actionDueDate, setActionDueDate] = useState(getDefaultDueDateISODate());
  const [actionSendEmail, setActionSendEmail] = useState(true);
  const [isUpdatingAction, setIsUpdatingAction] = useState(false);

  const [lastEmailEvidence, setLastEmailEvidence] = useState<EmailEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadAssignments() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [assignmentsResult, usersResult, trainingsResult, certificatesResult] =
        await Promise.all([
          supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
          supabase.from('profiles').select('*').eq('tenant_id', tenantId),
          supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
          supabase.from('certificates').select('*').eq('tenant_id', tenantId),
        ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (trainingsResult.error) throw trainingsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;

      const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];
      const loadedUsers = (usersResult.data ?? []) as Profile[];
      const loadedTrainings = (trainingsResult.data ?? []) as TenantTraining[];
      const loadedCertificates = (certificatesResult.data ?? []) as Certificate[];

      const usersById = new Map<string, Profile>();
      loadedUsers.forEach((profile) => {
        if (profile.id) usersById.set(profile.id, profile);
      });

      const trainingsByAnyId = new Map<string, TenantTraining>();
      loadedTrainings.forEach((training) => {
        if (training.id) trainingsByAnyId.set(training.id, training);
        if (training.training_id) trainingsByAnyId.set(training.training_id, training);
      });

      const hydratedAssignments = loadedAssignmentsRaw.map((assignment) => {
        const trainingKey =
          assignment.tenant_training_id ||
          assignment.training_id ||
          assignment.training_key ||
          assignment.training_slug;

        return {
          ...assignment,
          user: assignment.user_id ? usersById.get(assignment.user_id) ?? null : null,
          training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
          progress_percentage: getAssignmentProgress(assignment),
          status: assignment.is_active === false ? 'unassigned' : assignment.status || 'not_started',
        };
      });

      setUsers(loadedUsers);
      setTenantTrainings(loadedTrainings);
      setAssignments(sortAssignments(hydratedAssignments));
      setCertificates(loadedCertificates);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las asignaciones desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [tenantId]);

  const workerUsers = useMemo(() => {
    return users.filter((profile) => isWorker(profile) && isActiveProfile(profile));
  }, [users]);

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();

    workerUsers.forEach((profile) => {
      const role = getWorkerRole(profile);
      counts.set(role, (counts.get(role) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [workerUsers]);

  const enabledTrainingOptions = useMemo<TrainingOption[]>(() => {
    const enabledRows = tenantTrainings.filter((training) => {
      if (!training.training_id) return false;
      return training.enabled !== false;
    });

    return enabledRows
      .map((row) => {
        const baseTraining = baseTrainings.find((training) => training.id === row.training_id);

        return {
          id: row.training_id as string,
          title:
            row.title ||
            row.training_title ||
            row.name ||
            baseTraining?.title ||
            row.training_id ||
            'Training sin título',
          category: baseTraining?.category,
          duration_minutes: baseTraining?.duration_minutes,
          certificate_enabled: baseTraining?.certificate_enabled,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tenantTrainings]);

  const filtered = useMemo(() => {
    const searchValue = normalize(search);

    return assignments.filter((assignment) => {
      const status = normalize(assignment.status);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const userName = getFullName(assignment.user);
      const userEmail = assignment.user?.email || '';
      const userArea = assignment.user?.area || '';
      const userJobRole = assignment.user?.job_role || '';
      const userPosition = assignment.user?.position || '';
      const userRole = getWorkerRole(assignment.user);
      const trainingTitle = getTrainingTitle(assignment.training, assignment);

      const matchesRole = roleFilter === 'all' || userRole === roleFilter;

      const matchesSearch =
        !searchValue ||
        normalize(userName).includes(searchValue) ||
        normalize(userEmail).includes(searchValue) ||
        normalize(userArea).includes(searchValue) ||
        normalize(userJobRole).includes(searchValue) ||
        normalize(userPosition).includes(searchValue) ||
        normalize(trainingTitle).includes(searchValue);

      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [assignments, search, statusFilter, roleFilter]);

  const filteredUsersFromCurrentView = useMemo(() => {
    const userMap = new Map<string, Profile>();

    filtered.forEach((assignment) => {
      if (assignment.user?.id && isWorker(assignment.user) && isActiveProfile(assignment.user)) {
        userMap.set(assignment.user.id, assignment.user);
      }
    });

    return Array.from(userMap.values());
  }, [filtered]);

  const assignTargets = useMemo(() => {
    if (assignTargetMode === 'all_workers') return workerUsers;
    if (assignTargetMode === 'role') {
      if (assignRole === 'all') return [];
      return workerUsers.filter((profile) => getWorkerRole(profile) === assignRole);
    }
    return filteredUsersFromCurrentView;
  }, [assignTargetMode, assignRole, workerUsers, filteredUsersFromCurrentView]);

  const selectedTraining = useMemo(() => {
    return enabledTrainingOptions.find((training) => training.id === selectedTrainingId) ?? null;
  }, [enabledTrainingOptions, selectedTrainingId]);

  const assignmentsByUserTraining = useMemo(() => {
    const map = new Map<string, Assignment>();

    assignments.forEach((assignment) => {
      if (!assignment.user_id || !assignment.training_id) return;

      const key = getUserTrainingKey(assignment.user_id, assignment.training_id);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, assignment);
        return;
      }

      const existingDate = new Date(
        existing.updated_at || existing.assigned_at || existing.created_at || ''
      ).getTime();

      const nextDate = new Date(
        assignment.updated_at || assignment.assigned_at || assignment.created_at || ''
      ).getTime();

      if (nextDate > existingDate) map.set(key, assignment);
    });

    return map;
  }, [assignments]);

  const certificatesByUserTraining = useMemo(() => {
    const map = new Map<string, Certificate>();

    certificates.forEach((certificate) => {
      if (!certificate.user_id || !certificate.training_id) return;

      const key = getUserTrainingKey(certificate.user_id, certificate.training_id);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, certificate);
        return;
      }

      const existingDate = new Date(existing.issued_at || existing.created_at || '').getTime();
      const nextDate = new Date(certificate.issued_at || certificate.created_at || '').getTime();

      if (nextDate > existingDate) map.set(key, certificate);
    });

    return map;
  }, [certificates]);

  const assignmentReview = useMemo<AssignmentReviewItem[]>(() => {
    if (!selectedTraining) return [];

    return assignTargets.map((profile) => {
      const key = getUserTrainingKey(profile.id, selectedTraining.id);
      const existingAssignment = assignmentsByUserTraining.get(key) ?? null;
      const existingCertificate = certificatesByUserTraining.get(key) ?? null;

      let classification: AssignmentReviewItem['classification'] = 'new';

      if (existingAssignment && !isActiveAssignment(existingAssignment)) {
        classification = 'unassigned';
      } else if (existingCertificate?.id) {
        classification = 'certified';
      } else if (existingAssignment && isCompletedAssignmentStatus(existingAssignment.status)) {
        classification = 'completed';
      } else if (existingAssignment) {
        classification = 'active';
      }

      return { profile, existingAssignment, existingCertificate, classification };
    });
  }, [assignTargets, selectedTraining, assignmentsByUserTraining, certificatesByUserTraining]);

  const reviewCounts = useMemo(() => {
    return {
      total: assignmentReview.length,
      new: assignmentReview.filter((item) => item.classification === 'new').length,
      unassigned: assignmentReview.filter((item) => item.classification === 'unassigned').length,
      active: assignmentReview.filter((item) => item.classification === 'active').length,
      completed: assignmentReview.filter((item) => item.classification === 'completed').length,
      certified: assignmentReview.filter((item) => item.classification === 'certified').length,
    };
  }, [assignmentReview]);

  const finalAssignmentTargets = useMemo(() => {
    return assignmentReview.filter((item) => {
      if (item.classification === 'new') return true;
      if (item.classification === 'unassigned') return true;
      if (item.classification === 'active') return true;
      if (item.classification === 'completed' || item.classification === 'certified') {
        return includeCertifiedUsers;
      }
      return false;
    });
  }, [assignmentReview, includeCertifiedUsers]);

  const finalRecipientsWithEmail = useMemo(() => {
    return finalAssignmentTargets.map((item) => item.profile).filter((profile) => Boolean(profile.email));
  }, [finalAssignmentTargets]);

  function getStatusCount(statusValue: string) {
    if (statusValue === 'all') return assignments.length;
    return assignments.filter((assignment) => normalize(assignment.status) === statusValue).length;
  }

  function getRoleCount(roleValue: string) {
    if (roleValue === 'all') return assignments.length;
    return assignments.filter((assignment) => getWorkerRole(assignment.user) === roleValue).length;
  }

  function openAssignModal() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastEmailEvidence(null);
    setAssignStep('select');
    setSelectedTrainingId(enabledTrainingOptions[0]?.id ?? '');
    setAssignTargetMode(roleFilter !== 'all' ? 'role' : 'filtered');
    setAssignRole(roleFilter !== 'all' ? roleFilter : 'all');
    setDueDate(getDefaultDueDateISODate());
    setSendEmail(true);
    setIncludeCertifiedUsers(false);
    setShowAssignModal(true);
  }

  function closeAssignModal() {
    if (isAssigning) return;
    setShowAssignModal(false);
    setAssignStep('select');
  }

  function openAssignmentAction(action: AssignmentAction, assignment: Assignment) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastEmailEvidence(null);
    setSelectedAssignment(assignment);
    setAssignmentAction(action);
    setActionDueDate(assignment.due_date || getDefaultDueDateISODate());
    setActionSendEmail(true);
  }

  function closeAssignmentAction() {
    if (isUpdatingAction) return;
    setSelectedAssignment(null);
    setAssignmentAction(null);
  }

  async function createAssignmentEvent({
    assignment,
    eventType,
    eventDetail,
  }: {
    assignment: Assignment;
    eventType: string;
    eventDetail: string;
  }) {
    if (!tenantId || !assignment.id || !assignment.user_id || !assignment.training_id) return;

    const { error } = await supabase.from('training_assignment_events').insert({
      tenant_id: tenantId,
      assignment_id: assignment.id,
      user_id: assignment.user_id,
      training_id: assignment.training_id,
      event_type: eventType,
      event_detail: eventDetail,
      created_by: user?.id || null,
    });

    if (error) {
      console.warn('No se pudo registrar training_assignment_events:', error);
    }
  }

  async function sendTrainingNotificationEmail({
    assignmentId,
    type,
  }: {
    assignmentId: string;
    type: NotificationType;
  }) {
    const response = await fetch('/.netlify/functions/send-training-notification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, type, createdBy: user?.id || null }),
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(responseBody?.error || 'No se pudo enviar el email.');
    }

    return responseBody;
  }

  async function notifyAssignmentsByEmail({
    assignmentsToNotify,
    type,
  }: {
    assignmentsToNotify: Assignment[];
    type: NotificationType;
  }): Promise<EmailEvidence> {
    const adminEmail = user?.email || null;
    const validAssignments = assignmentsToNotify.filter((assignment) => Boolean(assignment.user?.email));

    if (validAssignments.length === 0) {
      return {
        requested: true,
        sent: false,
        recipient_count: 0,
        admin_email: adminEmail,
        type,
        error: 'No hay usuarios con email válido para notificar.',
      };
    }

    const results = await Promise.allSettled(
      validAssignments.map((assignment) =>
        sendTrainingNotificationEmail({ assignmentId: assignment.id, type })
      )
    );

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - sent;
    const firstError = results.find((result) => result.status === 'rejected') as
      | PromiseRejectedResult
      | undefined;

    return {
      requested: true,
      sent: sent > 0,
      recipient_count: sent,
      admin_email: adminEmail,
      type,
      error: failed > 0 ? firstError?.reason?.message || `${failed} email(s) fallaron.` : undefined,
      message: failed > 0
        ? `Se enviaron ${sent} email(s), pero fallaron ${failed}.`
        : `Email enviado a ${sent} persona(s).`,
    };
  }

  async function confirmBulkAssignment() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para crear asignaciones.');
      return;
    }

    if (!selectedTraining) {
      setErrorMessage('Seleccioná un training para asignar.');
      return;
    }

    if (finalAssignmentTargets.length === 0) {
      setErrorMessage('No hay usuarios para asignar con la configuración seleccionada.');
      return;
    }

    setIsAssigning(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastEmailEvidence(null);

    try {
      const now = new Date().toISOString();

      const payload = finalAssignmentTargets.map((item) => ({
        tenant_id: tenantId,
        user_id: item.profile.id,
        training_id: selectedTraining.id,
        status: 'not_started',
        progress_percentage: 0,
        assigned_at: now,
        due_date: dueDate || getDefaultDueDateISODate(),
        started_at: null,
        completed_at: null,
        expires_at: null,
        is_active: true,
        reassigned_at:
          item.classification === 'active' ||
          item.classification === 'completed' ||
          item.classification === 'certified' ||
          item.classification === 'unassigned'
            ? now
            : null,
        reassigned_by:
          item.classification === 'active' ||
          item.classification === 'completed' ||
          item.classification === 'certified' ||
          item.classification === 'unassigned'
            ? user?.id || null
            : null,
        reassignment_count:
          item.existingAssignment?.id
            ? Number(item.existingAssignment.reassignment_count ?? 0) + 1
            : 0,
      }));

      const { error } = await supabase
        .from('training_assignments')
        .upsert(payload, {
          onConflict: 'tenant_id,training_id,user_id',
        });

      if (error) throw error;

      const targetUserIds = finalAssignmentTargets.map((item) => item.profile.id);

      const { data: refreshedAssignments, error: refreshedError } = await supabase
        .from('training_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('training_id', selectedTraining.id)
        .in('user_id', targetUserIds);

      if (refreshedError) throw refreshedError;

      const userById = new Map(workerUsers.map((profile) => [profile.id, profile]));
      const refreshed = ((refreshedAssignments ?? []) as Assignment[]).map((assignment) => ({
        ...assignment,
        user: assignment.user_id ? userById.get(assignment.user_id) ?? null : null,
      }));

      const classificationByUserId = new Map(
        finalAssignmentTargets.map((item) => [item.profile.id, item.classification])
      );

      await Promise.all(
        refreshed.map((assignment) =>
          createAssignmentEvent({
            assignment,
            eventType:
              classificationByUserId.get(assignment.user_id || '') === 'new'
                ? 'assigned'
                : 'reassigned',
            eventDetail:
              classificationByUserId.get(assignment.user_id || '') === 'new'
                ? `Asignación creada con deadline ${formatDate(dueDate)}.`
                : `Asignación actualizada/reasignada con deadline ${formatDate(dueDate)}.`,
          })
        )
      );

      let emailEvidence: EmailEvidence = {
        requested: false,
        sent: false,
        recipient_count: refreshed.filter((assignment) => Boolean(assignment.user?.email)).length,
        admin_email: user?.email || null,
        message: 'El envío de email fue desactivado para esta asignación.',
      };

      if (sendEmail) {
        const assignmentEmails = refreshed.filter(
          (assignment) => classificationByUserId.get(assignment.user_id || '') === 'new'
        );
        const reassignmentEmails = refreshed.filter(
          (assignment) => classificationByUserId.get(assignment.user_id || '') !== 'new'
        );

        const assignmentEvidence = assignmentEmails.length > 0
          ? await notifyAssignmentsByEmail({ assignmentsToNotify: assignmentEmails, type: 'assignment' })
          : null;
        const reassignmentEvidence = reassignmentEmails.length > 0
          ? await notifyAssignmentsByEmail({ assignmentsToNotify: reassignmentEmails, type: 'reassignment' })
          : null;

        const sentCount =
          (assignmentEvidence?.recipient_count ?? 0) +
          (reassignmentEvidence?.recipient_count ?? 0);
        const errorText = [assignmentEvidence?.error, reassignmentEvidence?.error]
          .filter(Boolean)
          .join(' | ');

        emailEvidence = {
          requested: true,
          sent: sentCount > 0,
          recipient_count: sentCount,
          admin_email: user?.email || null,
          type: 'assignment',
          error: errorText || undefined,
          message: `Se enviaron ${sentCount} email(s).`,
        };
      }

      setLastEmailEvidence(emailEvidence);

      const skipped = assignmentReview.length - finalAssignmentTargets.length;

      setSuccessMessage(
        `Training asignado/reasignado a ${finalAssignmentTargets.length} usuario(s). Se omitieron ${skipped}. ${
          emailEvidence.requested
            ? emailEvidence.sent
              ? `Email enviado a ${emailEvidence.recipient_count} persona(s).`
              : `Atención: el email no pudo confirmarse${emailEvidence.error ? ` (${emailEvidence.error})` : '.'}`
            : 'Email no solicitado.'
        }`
      );

      setShowAssignModal(false);
      setAssignStep('select');
      await loadAssignments();
    } catch (error) {
      console.error('Error creando asignaciones masivas:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron crear las asignaciones masivas.'
      );
    } finally {
      setIsAssigning(false);
    }
  }

  async function sendReminder(assignment: Assignment) {
    if (!assignment.user || !assignment.training_id || !isActiveAssignment(assignment)) return;

    setRemindSent((previous) => new Set([...previous, assignment.id]));
    setErrorMessage(null);
    setSuccessMessage(null);

    const evidence = await notifyAssignmentsByEmail({
      assignmentsToNotify: [assignment],
      type: 'reminder',
    });

    await createAssignmentEvent({
      assignment,
      eventType: 'reminder_requested',
      eventDetail: evidence.sent
        ? 'Reminder solicitado desde la pantalla de asignaciones.'
        : `Reminder solicitado, pero no se pudo confirmar email: ${evidence.error || 'sin detalle'}`,
    });

    setLastEmailEvidence(evidence);

    if (evidence.sent) {
      setSuccessMessage('Reminder enviado por email.');
    } else {
      setErrorMessage(
        evidence.error ||
          'Reminder marcado, pero no se pudo confirmar el envío real del email.'
      );
    }

    setTimeout(() => {
      setRemindSent((previous) => {
        const next = new Set(previous);
        next.delete(assignment.id);
        return next;
      });
    }, 3000);
  }

  async function sendBulkReminder() {
    const eligible = filtered.filter(
      (assignment) => isActiveAssignment(assignment) && isReminderEligible(assignment.status)
    );

    if (eligible.length === 0) {
      setErrorMessage('No hay asignaciones pendientes en este filtro para enviar reminder.');
      setSuccessMessage(null);
      return;
    }

    const evidence = await notifyAssignmentsByEmail({
      assignmentsToNotify: eligible,
      type: 'reminder',
    });

    await Promise.all(
      eligible.map((assignment) =>
        createAssignmentEvent({
          assignment,
          eventType: 'bulk_reminder_requested',
          eventDetail: 'Reminder masivo solicitado desde la pantalla de asignaciones.',
        })
      )
    );

    setLastEmailEvidence(evidence);

    if (evidence.sent) {
      setErrorMessage(null);
      setSuccessMessage(
        `Reminder masivo enviado a ${evidence.recipient_count} persona(s).`
      );

      setRemindSent((previous) => {
        const next = new Set(previous);
        eligible.forEach((assignment) => next.add(assignment.id));
        return next;
      });

      setTimeout(() => {
        setRemindSent((previous) => {
          const next = new Set(previous);
          eligible.forEach((assignment) => next.delete(assignment.id));
          return next;
        });
      }, 3000);
    } else {
      setSuccessMessage(null);
      setErrorMessage(
        evidence.error ||
          'No se pudo confirmar el envío real del reminder masivo por email.'
      );
    }
  }

  async function confirmAssignmentAction() {
    if (!selectedAssignment || !tenantId || !assignmentAction) return;

    setIsUpdatingAction(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLastEmailEvidence(null);

    try {
      const now = new Date().toISOString();

      if (assignmentAction === 'deadline') {
        const { error } = await supabase
          .from('training_assignments')
          .update({ due_date: actionDueDate || null })
          .eq('id', selectedAssignment.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        await createAssignmentEvent({
          assignment: selectedAssignment,
          eventType: 'deadline_updated',
          eventDetail: `Deadline actualizado a ${formatDate(actionDueDate)}.`,
        });

        setSuccessMessage('Deadline actualizado correctamente.');
      }

      if (assignmentAction === 'unassign') {
        const { error } = await supabase
          .from('training_assignments')
          .update({
            is_active: false,
            status: 'unassigned',
            unassigned_at: now,
            unassigned_by: user?.id || null,
          })
          .eq('id', selectedAssignment.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        await createAssignmentEvent({
          assignment: selectedAssignment,
          eventType: 'unassigned',
          eventDetail: 'Training desasignado desde la pantalla de asignaciones.',
        });

        if (actionSendEmail) {
          const evidence = await notifyAssignmentsByEmail({
            assignmentsToNotify: [selectedAssignment],
            type: 'unassignment',
          });
          setLastEmailEvidence(evidence);
        }

        setSuccessMessage('Training desasignado correctamente.');
      }

      if (assignmentAction === 'reassign') {
        const { data, error } = await supabase
          .from('training_assignments')
          .update({
            is_active: true,
            status: 'not_started',
            progress_percentage: 0,
            assigned_at: now,
            due_date: actionDueDate || getDefaultDueDateISODate(),
            started_at: null,
            completed_at: null,
            expires_at: null,
            reassigned_at: now,
            reassigned_by: user?.id || null,
            reassignment_count: Number(selectedAssignment.reassignment_count ?? 0) + 1,
          })
          .eq('id', selectedAssignment.id)
          .eq('tenant_id', tenantId)
          .select('*')
          .maybeSingle();

        if (error) throw error;

        const updatedAssignment = {
          ...(data as Assignment),
          user: selectedAssignment.user,
          training: selectedAssignment.training,
        };

        await createAssignmentEvent({
          assignment: updatedAssignment,
          eventType: 'reassigned',
          eventDetail: `Training reasignado con deadline ${formatDate(actionDueDate)}.`,
        });

        if (actionSendEmail) {
          const evidence = await notifyAssignmentsByEmail({
            assignmentsToNotify: [updatedAssignment],
            type: 'reassignment',
          });
          setLastEmailEvidence(evidence);
        }

        setSuccessMessage('Training reasignado correctamente.');
      }

      closeAssignmentAction();
      await loadAssignments();
    } catch (error) {
      console.error('Error actualizando asignación:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la asignación.'
      );
    } finally {
      setIsUpdatingAction(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando asignaciones...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo asignaciones, usuarios, trainings y certificados desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && assignments.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />
          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar las asignaciones</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>
            <button onClick={loadAssignments} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignCanContinue =
    selectedTraining &&
    assignTargets.length > 0 &&
    (assignTargetMode !== 'role' || assignRole !== 'all');

  const actionTitle =
    assignmentAction === 'deadline'
      ? 'Editar deadline'
      : assignmentAction === 'unassign'
        ? 'Desasignar training'
        : assignmentAction === 'reassign'
          ? 'Reasignar training'
          : 'Acción';

  return (
    <div className="space-y-4">
      {(errorMessage || successMessage) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            errorMessage
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {lastEmailEvidence && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            lastEmailEvidence.sent
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="font-semibold">Evidencia de notificación</div>
          <div className="text-xs mt-1 opacity-90">
            Tipo: {lastEmailEvidence.type || 'asignación'} · Solicitado:{' '}
            {lastEmailEvidence.requested ? 'sí' : 'no'} · Enviado:{' '}
            {lastEmailEvidence.sent ? 'sí' : 'no'} · Destinatarios:{' '}
            {lastEmailEvidence.recipient_count} · Admin: {lastEmailEvidence.admin_email || 'sin email'}
          </div>
          {lastEmailEvidence.error && (
            <div className="text-xs mt-1 opacity-90">Error: {lastEmailEvidence.error}</div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
        <div className="text-sm font-semibold text-steel-100">Asignaciones</div>
        <div className="text-xs text-steel-500">
          Centro de gestión de asignaciones: deadlines, reminders, desasignaciones, reasignaciones y evidencias.
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="relative flex-1 sm:min-w-[260px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Buscar usuario, rol o training..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="select sm:min-w-[220px]"
          >
            <option value="all">Todos los roles ({assignments.length})</option>
            {roleOptions.map((roleOption) => (
              <option key={roleOption.role} value={roleOption.role}>
                {roleOption.role} ({getRoleCount(roleOption.role)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={loadAssignments} className="btn-secondary text-xs flex-shrink-0">
            <RefreshCw size={14} />
            Actualizar
          </button>

          <button onClick={openAssignModal} className="btn-primary text-xs flex-shrink-0">
            <Plus size={14} />
            Asignar curso masivo
          </button>

          <button onClick={sendBulkReminder} className="btn-secondary text-xs flex-shrink-0">
            <BellRing size={14} />
            Reminder masivo
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((statusFilterItem) => (
          <button
            key={statusFilterItem.value}
            onClick={() => setStatusFilter(statusFilterItem.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === statusFilterItem.value
                ? 'bg-amber-500 text-petroleum-950'
                : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
            }`}
          >
            {statusFilterItem.label}
            <span className="ml-1 opacity-70">({getStatusCount(statusFilterItem.value)})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="text-xs text-steel-500">Asignaciones visibles</div>
          <div className="text-xl font-bold text-steel-100 mt-1">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="text-xs text-steel-500">Usuarios en filtro</div>
          <div className="text-xl font-bold text-steel-100 mt-1">{filteredUsersFromCurrentView.length}</div>
        </div>
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="text-xs text-steel-500">Workers activos</div>
          <div className="text-xl font-bold text-steel-100 mt-1">{workerUsers.length}</div>
        </div>
        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
          <div className="text-xs text-steel-500">Trainings habilitados</div>
          <div className="text-xl font-bold text-steel-100 mt-1">{enabledTrainingOptions.length}</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-steel-900 border-b border-steel-700">
                <th className="table-header">Usuario</th>
                <th className="table-header hidden md:table-cell">Rol</th>
                <th className="table-header">Training</th>
                <th className="table-header hidden md:table-cell">Estado</th>
                <th className="table-header hidden lg:table-cell">Progreso</th>
                <th className="table-header hidden lg:table-cell">Asignado</th>
                <th className="table-header hidden xl:table-cell">Deadline</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((assignment) => {
                const userName = getFullName(assignment.user);
                const userRole = getWorkerRole(assignment.user);
                const trainingTitle = getTrainingTitle(assignment.training, assignment);
                const progress = getAssignmentProgress(assignment);
                const status = assignment.status || 'not_started';
                const assignedDate = getAssignedDate(assignment);
                const active = isActiveAssignment(assignment);

                return (
                  <tr key={assignment.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-petroleum-700 rounded-full flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                          {getInitial(assignment.user)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-steel-100 truncate max-w-[150px] block">
                            {userName}
                          </span>
                          {assignment.user?.email && (
                            <span className="text-xs text-steel-500 truncate max-w-[150px] block">
                              {assignment.user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="table-cell hidden md:table-cell">
                      <span className="text-xs text-steel-300 truncate max-w-[130px] block">
                        {userRole}
                      </span>
                    </td>

                    <td className="table-cell">
                      <span className="text-sm text-steel-200 truncate max-w-[190px] block">
                        {trainingTitle}
                      </span>
                    </td>

                    <td className="table-cell hidden md:table-cell">
                      <StatusBadge status={status} />
                    </td>

                    <td className="table-cell hidden lg:table-cell">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="progress-bar flex-1">
                          <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-steel-400 w-8 text-right">{progress}%</span>
                      </div>
                    </td>

                    <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                      {formatDate(assignedDate)}
                    </td>

                    <td className="table-cell hidden xl:table-cell text-xs">
                      <span className={`rounded-full border px-2 py-1 ${getDeadlineVisualClass(assignment)}`}>
                        {formatDate(assignment.due_date)}
                      </span>
                    </td>

                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1.5">
                        {active && isReminderEligible(status) && (
                          <button
                            onClick={() => sendReminder(assignment)}
                            className={`p-1.5 rounded transition-colors text-xs ${
                              remindSent.has(assignment.id)
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-steel-400 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title="Enviar reminder"
                          >
                            {remindSent.has(assignment.id) ? <BellRing size={14} /> : <Bell size={14} />}
                          </button>
                        )}

                        {active && (
                          <button
                            onClick={() => openAssignmentAction('deadline', assignment)}
                            className="p-1.5 rounded text-steel-400 hover:text-blue-400 hover:bg-blue-500/10"
                            title="Editar deadline"
                          >
                            <CalendarClock size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => openAssignmentAction('reassign', assignment)}
                          className="p-1.5 rounded text-steel-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                          title="Reasignar"
                        >
                          <RotateCcw size={14} />
                        </button>

                        {active && (
                          <button
                            onClick={() => openAssignmentAction('unassign', assignment)}
                            className="p-1.5 rounded text-steel-400 hover:text-red-400 hover:bg-red-500/10"
                            title="Desasignar"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="Sin asignaciones"
            description="No hay asignaciones con los filtros seleccionados."
          />
        )}
      </div>

      <Modal
        open={showAssignModal}
        onClose={closeAssignModal}
        title="Asignar curso masivo"
        size="lg"
        footer={
          <>
            <button onClick={closeAssignModal} disabled={isAssigning} className="btn-ghost">
              Cancelar
            </button>

            {assignStep !== 'select' && (
              <button
                onClick={() => setAssignStep(assignStep === 'confirm' ? 'due_date' : 'select')}
                disabled={isAssigning}
                className="btn-secondary"
              >
                Volver
              </button>
            )}

            {assignStep === 'select' && (
              <button
                onClick={() => setAssignStep('due_date')}
                disabled={!assignCanContinue}
                className="btn-primary disabled:opacity-50"
              >
                Continuar
              </button>
            )}

            {assignStep === 'due_date' && (
              <button
                onClick={() => setAssignStep('confirm')}
                disabled={!dueDate}
                className="btn-primary disabled:opacity-50"
              >
                Revisar asignación
              </button>
            )}

            {assignStep === 'confirm' && (
              <button
                onClick={confirmBulkAssignment}
                disabled={isAssigning || finalAssignmentTargets.length === 0 || !selectedTraining}
                className="btn-primary disabled:opacity-50"
              >
                <Send size={15} />
                {isAssigning ? 'Asignando...' : 'Confirmar y notificar'}
              </button>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {assignStep === 'select' && (
            <>
              <div>
                <label className="label">Training a asignar *</label>
                <select
                  value={selectedTrainingId}
                  onChange={(event) => setSelectedTrainingId(event.target.value)}
                  className="select"
                >
                  {enabledTrainingOptions.length === 0 && (
                    <option value="">No hay trainings habilitados</option>
                  )}

                  {enabledTrainingOptions.map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>

                {selectedTraining && (
                  <div className="mt-2 text-xs text-steel-500">
                    {selectedTraining.category || 'Sin categoría'} · {selectedTraining.duration_minutes ?? 0} min ·{' '}
                    {selectedTraining.certificate_enabled ? 'Certifica' : 'No certifica'}
                  </div>
                )}
              </div>

              <div>
                <label className="label">A quién asignar *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignTargetMode('filtered')}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      assignTargetMode === 'filtered'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-steel-700 bg-steel-900 hover:border-steel-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-steel-100">
                      <ClipboardList size={15} />
                      Filtro actual
                    </div>
                    <div className="text-xs text-steel-500 mt-1">
                      {filteredUsersFromCurrentView.length} usuario(s)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignTargetMode('role')}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      assignTargetMode === 'role'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-steel-700 bg-steel-900 hover:border-steel-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-steel-100">
                      <Users size={15} />
                      Por rol
                    </div>
                    <div className="text-xs text-steel-500 mt-1">Elegir puesto/rol</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignTargetMode('all_workers')}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      assignTargetMode === 'all_workers'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-steel-700 bg-steel-900 hover:border-steel-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-steel-100">
                      <BookOpen size={15} />
                      Todos workers
                    </div>
                    <div className="text-xs text-steel-500 mt-1">{workerUsers.length} usuario(s)</div>
                  </button>
                </div>
              </div>

              {assignTargetMode === 'role' && (
                <div>
                  <label className="label">Rol / puesto *</label>
                  <select
                    value={assignRole}
                    onChange={(event) => setAssignRole(event.target.value)}
                    className="select"
                  >
                    <option value="all">Seleccionar rol...</option>
                    {roleOptions.map((roleOption) => (
                      <option key={roleOption.role} value={roleOption.role}>
                        {roleOption.role} ({roleOption.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
                <div className="text-sm font-semibold text-steel-100">
                  Usuarios alcanzados: {assignTargets.length}
                </div>
                <div className="text-xs text-steel-500 mt-1">
                  En el paso final se mostrará cuántos son nuevos, activos, desasignados o ya certificados.
                </div>
              </div>
            </>
          )}

          {assignStep === 'due_date' && (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays size={18} className="text-amber-300 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-200">
                      Deadline sugerido: 1 mes
                    </div>
                    <div className="text-xs text-steel-400 mt-1">
                      El sistema propone un mes por defecto. El admin puede editarlo antes de enviar.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Fecha límite *</label>
                <input
                  type="date"
                  value={dueDate}
                  min={getTodayISODate()}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="input"
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(event) => setSendEmail(event.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-steel-100">Enviar email de notificación</div>
                  <div className="text-xs text-steel-500 mt-1">
                    Se enviará a usuarios con email y quedará registrado en email_notifications y training_assignment_events.
                  </div>
                </div>
              </label>
            </>
          )}

          {assignStep === 'confirm' && (
            <>
              <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-steel-400">Training</span>
                  <span className="text-steel-100 font-semibold text-right">{selectedTraining?.title || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-steel-400">Usuarios alcanzados</span>
                  <span className="text-steel-100 font-semibold">{reviewCounts.total}</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="text-xs text-emerald-300">Nuevos</div>
                    <div className="text-xl font-bold text-emerald-200">{reviewCounts.new}</div>
                  </div>
                  <div className="rounded-xl border border-steel-500/30 bg-steel-500/10 p-3">
                    <div className="text-xs text-steel-300">Desasignados</div>
                    <div className="text-xl font-bold text-steel-200">{reviewCounts.unassigned}</div>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                    <div className="text-xs text-blue-300">Ya activos</div>
                    <div className="text-xl font-bold text-blue-200">{reviewCounts.active}</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="text-xs text-amber-300">Completados</div>
                    <div className="text-xl font-bold text-amber-200">{reviewCounts.completed}</div>
                  </div>
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                    <div className="text-xs text-purple-300">Certificados</div>
                    <div className="text-xl font-bold text-purple-200">{reviewCounts.certified}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm pt-2">
                  <span className="text-steel-400">Fecha límite</span>
                  <span className="text-steel-100 font-semibold">{formatDate(dueDate)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-steel-400">Email</span>
                  <span className="text-steel-100 font-semibold">{sendEmail ? 'Sí' : 'No enviar'}</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-steel-400">Se asignará finalmente a</span>
                  <span className="text-steel-100 font-semibold">{finalAssignmentTargets.length} usuario(s)</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-steel-400">Con email</span>
                  <span className="text-steel-100 font-semibold">{finalRecipientsWithEmail.length}</span>
                </div>
              </div>

              {(reviewCounts.completed > 0 || reviewCounts.certified > 0) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-300 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-amber-200">
                        Hay usuarios que ya completaron este training
                      </div>
                      <div className="text-xs text-steel-400 mt-1">
                        Por defecto no se reasignan para no pisar evidencia ni trazabilidad.
                      </div>
                      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-steel-950/50 p-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeCertifiedUsers}
                          onChange={(event) => setIncludeCertifiedUsers(event.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-semibold text-steel-100">
                            Reasignar también a usuarios completados o certificados
                          </div>
                          <div className="text-xs text-steel-500 mt-1">
                            Usar solo si querés generar una nueva obligación de recertificación.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-xs text-steel-400">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={15} className="text-emerald-400 mt-0.5" />
                  <div>
                    Cada asignación/reasignación queda registrada en training_assignment_events y cada email en email_notifications.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(assignmentAction && selectedAssignment)}
        onClose={closeAssignmentAction}
        title={actionTitle}
        size="md"
        footer={
          <>
            <button onClick={closeAssignmentAction} disabled={isUpdatingAction} className="btn-ghost">
              Cancelar
            </button>
            <button
              onClick={confirmAssignmentAction}
              disabled={isUpdatingAction || ((assignmentAction === 'deadline' || assignmentAction === 'reassign') && !actionDueDate)}
              className={`btn-primary disabled:opacity-50 ${assignmentAction === 'unassign' ? 'bg-red-500 hover:bg-red-400' : ''}`}
            >
              {assignmentAction === 'deadline' && <CalendarClock size={15} />}
              {assignmentAction === 'unassign' && <XCircle size={15} />}
              {assignmentAction === 'reassign' && <RotateCcw size={15} />}
              {isUpdatingAction ? 'Procesando...' : 'Confirmar'}
            </button>
          </>
        }
      >
        {selectedAssignment && (
          <div className="space-y-4">
            <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4">
              <div className="text-xs text-steel-500">Usuario</div>
              <div className="text-sm font-semibold text-steel-100">{getFullName(selectedAssignment.user)}</div>
              <div className="text-xs text-steel-400 mt-1">{selectedAssignment.user?.email || 'sin email'}</div>
              <div className="text-xs text-steel-500 mt-3">Training</div>
              <div className="text-sm font-semibold text-steel-100">
                {getTrainingTitle(selectedAssignment.training, selectedAssignment)}
              </div>
            </div>

            {assignmentAction === 'deadline' && (
              <div>
                <label className="label">Nuevo deadline *</label>
                <input
                  type="date"
                  value={actionDueDate}
                  min={getTodayISODate()}
                  onChange={(event) => setActionDueDate(event.target.value)}
                  className="input"
                />
              </div>
            )}

            {assignmentAction === 'reassign' && (
              <>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  La reasignación reinicia estado, progreso e intento operativo para que el trabajador vuelva a realizar el training.
                </div>
                <div>
                  <label className="label">Deadline de la nueva asignación *</label>
                  <input
                    type="date"
                    value={actionDueDate}
                    min={getTodayISODate()}
                    onChange={(event) => setActionDueDate(event.target.value)}
                    className="input"
                  />
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actionSendEmail}
                    onChange={(event) => setActionSendEmail(event.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-steel-100">Enviar email de reasignación</div>
                    <div className="text-xs text-steel-500 mt-1">Quedará registrado como evidencia.</div>
                  </div>
                </label>
              </>
            )}

            {assignmentAction === 'unassign' && (
              <>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  Esta acción desasigna el training sin borrar el historial. La fila quedará marcada como inactiva/desasignada.
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actionSendEmail}
                    onChange={(event) => setActionSendEmail(event.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-steel-100">Enviar email de desasignación</div>
                    <div className="text-xs text-steel-500 mt-1">Quedará registrado como evidencia.</div>
                  </div>
                </label>
              </>
            )}

            <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3 text-xs text-steel-400">
              <div className="flex items-start gap-2">
                <Mail size={14} className="text-amber-400 mt-0.5" />
                <div>
                  Las acciones quedan registradas en training_assignment_events. Los emails quedan registrados en email_notifications.
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
