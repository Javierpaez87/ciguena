// src/services/liveTrainingService.ts

import { supabase } from '../lib/supabase';
import type {
  LiveTraining,
  LiveTrainingParticipant,
  LiveTrainingLog,
  LiveTrainingCertificate,
  LiveAttendanceStatus,
  AsyncRecoveryStatus,
  LiveTrainingExamStatus,
  LiveTrainingCertificationStatus,
  Profile,
} from '../types';

export interface CreateLiveTrainingInput {
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  timezone?: string;

  has_exam?: boolean;
  certificate_enabled?: boolean;
  async_recovery_enabled?: boolean;
  late_tolerance_minutes?: number;

  /**
   * En el MVP esto debería quedar en null hasta que la Netlify Function
   * cree el evento de Calendar + Google Meet.
   */
  meeting_url?: string | null;
}

export interface UpdateLiveTrainingInput {
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  timezone?: string;

  status?: LiveTraining['status'];

  has_exam?: boolean;
  certificate_enabled?: boolean;
  async_recovery_enabled?: boolean;
  late_tolerance_minutes?: number;

  meeting_url?: string | null;
  meeting_external_id?: string | null;

  calendar_event_id?: string | null;
  calendar_status?: LiveTraining['calendar_status'];
  calendar_error?: string | null;

  recording_url?: string | null;
  recording_available_at?: string | null;
  recording_due_at?: string | null;
}

export interface AddLiveTrainingParticipantsInput {
  tenant_id: string;
  live_training_id: string;
  user_ids: string[];
}

export interface LiveTrainingParticipantWithUser extends LiveTrainingParticipant {
  user?: Profile;
}

export interface LiveTrainingWithParticipants extends LiveTraining {
  participants?: LiveTrainingParticipantWithUser[];
}

export interface LiveTrainingStats {
  invited: number;
  on_time: number;
  late: number;
  absent: number;
  invalid_after_event: number;
  excused_manual: number;
  pending_exam: number;
  certificates_issued: number;
  async_completed: number;
}

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase no está configurado.');
  }

  return supabase;
}

function getNowIso(): string {
  return new Date().toISOString();
}

function buildEmptyStats(): LiveTrainingStats {
  return {
    invited: 0,
    on_time: 0,
    late: 0,
    absent: 0,
    invalid_after_event: 0,
    excused_manual: 0,
    pending_exam: 0,
    certificates_issued: 0,
    async_completed: 0,
  };
}

/**
 * Crea una capacitación en vivo.
 * Por ahora queda en status "draft".
 */
export async function createLiveTraining(input: CreateLiveTrainingInput): Promise<LiveTraining> {
  const client = assertSupabase();

  const payload = {
    tenant_id: input.tenant_id,
    created_by: input.created_by,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    timezone: input.timezone ?? 'America/Argentina/Buenos_Aires',

    meeting_provider: 'google_meet' as const,
    meeting_url: input.meeting_url ?? null,
    meeting_external_id: null,

    calendar_provider: 'google_calendar' as const,
    calendar_event_id: null,
    calendar_status: 'pending' as const,
    calendar_error: null,

    status: 'draft' as const,

    has_exam: input.has_exam ?? false,
    certificate_enabled: input.certificate_enabled ?? true,
    async_recovery_enabled: input.async_recovery_enabled ?? true,
    late_tolerance_minutes: input.late_tolerance_minutes ?? 15,

    recording_url: null,
    recording_available_at: null,
    recording_due_at: null,
  };

  const { data, error } = await client
    .from('live_trainings')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTraining;
}

/**
 * Actualiza una capacitación en vivo.
 */
export async function updateLiveTraining(
  liveTrainingId: string,
  input: UpdateLiveTrainingInput
): Promise<LiveTraining> {
  const client = assertSupabase();

  const payload = {
    ...input,
    updated_at: getNowIso(),
  };

  const { data, error } = await client
    .from('live_trainings')
    .update(payload)
    .eq('id', liveTrainingId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTraining;
}

/**
 * Envía una capacitación a papelera.
 * No borra físicamente la capacitación ni sus participantes.
 */
export async function softDeleteLiveTraining(
  liveTrainingId: string,
  deletedBy: string
): Promise<LiveTraining> {
  const client = assertSupabase();
  const now = getNowIso();

  const { data, error } = await client
    .from('live_trainings')
    .update({
      deleted_at: now,
      deleted_by: deletedBy,
      updated_at: now,
    })
    .eq('id', liveTrainingId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTraining;
}

/**
 * Restaura una capacitación desde la papelera.
 */
export async function restoreLiveTraining(
  liveTrainingId: string,
  restoredBy: string
): Promise<LiveTraining> {
  const client = assertSupabase();
  const now = getNowIso();

  const { data, error } = await client
    .from('live_trainings')
    .update({
      deleted_at: null,
      deleted_by: null,
      restored_at: now,
      restored_by: restoredBy,
      updated_at: now,
    })
    .eq('id', liveTrainingId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTraining;
}

/**
 * Lista capacitaciones en vivo activas para un admin de tenant.
 * Excluye las enviadas a papelera.
 */
export async function getAdminLiveTrainings(tenantId: string): Promise<LiveTraining[]> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_trainings')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('starts_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LiveTraining[];
}

/**
 * Lista capacitaciones en vivo enviadas a papelera para un admin de tenant.
 */
export async function getAdminDeletedLiveTrainings(tenantId: string): Promise<LiveTraining[]> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_trainings')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LiveTraining[];
}

/**
 * Lista todas las capacitaciones en vivo para SuperAdmin.
 * Excluye papelera por default.
 */
export async function getSuperAdminLiveTrainings(): Promise<LiveTraining[]> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_trainings')
    .select(`
      *,
      tenant:tenants(*),
      creator:profiles(*)
    `)
    .is('deleted_at', null)
    .order('starts_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LiveTraining[];
}

/**
 * Obtiene una capacitación en vivo por ID.
 */
export async function getLiveTrainingById(liveTrainingId: string): Promise<LiveTraining | null> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_trainings')
    .select('*')
    .eq('id', liveTrainingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LiveTraining | null) ?? null;
}

/**
 * Obtiene una capacitación con participantes y datos básicos del usuario.
 */
export async function getLiveTrainingWithParticipants(
  liveTrainingId: string
): Promise<LiveTrainingWithParticipants | null> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_trainings')
    .select(`
      *,
      participants:live_training_participants(
        *,
        user:profiles(*)
      )
    `)
    .eq('id', liveTrainingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LiveTrainingWithParticipants | null) ?? null;
}

/**
 * Agrega participantes a una capacitación.
 * Si alguno ya estaba invitado, no duplica gracias al upsert.
 */
export async function addLiveTrainingParticipants(
  input: AddLiveTrainingParticipantsInput
): Promise<LiveTrainingParticipant[]> {
  const client = assertSupabase();

  const uniqueUserIds = Array.from(new Set(input.user_ids)).filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const rows = uniqueUserIds.map(userId => ({
    tenant_id: input.tenant_id,
    live_training_id: input.live_training_id,
    user_id: userId,
    live_attendance_status: 'invited' as LiveAttendanceStatus,
    async_recovery_status: 'not_required' as AsyncRecoveryStatus,
    exam_status: 'not_required' as LiveTrainingExamStatus,
    certification_status: 'not_eligible' as LiveTrainingCertificationStatus,
  }));

  const { data, error } = await client
    .from('live_training_participants')
    .upsert(rows, {
      onConflict: 'live_training_id,user_id',
      ignoreDuplicates: true,
    })
    .select('*');

  if (error) {
    throw error;
  }

  return (data ?? []) as LiveTrainingParticipant[];
}

/**
 * Reemplaza todos los participantes de una capacitación.
 * Útil para formulario de edición.
 */
export async function replaceLiveTrainingParticipants(
  input: AddLiveTrainingParticipantsInput
): Promise<LiveTrainingParticipant[]> {
  const client = assertSupabase();

  const { error: deleteError } = await client
    .from('live_training_participants')
    .delete()
    .eq('live_training_id', input.live_training_id);

  if (deleteError) {
    throw deleteError;
  }

  return addLiveTrainingParticipants(input);
}

/**
 * Lista participantes de una capacitación.
 */
export async function getLiveTrainingParticipants(
  liveTrainingId: string
): Promise<LiveTrainingParticipantWithUser[]> {
  const client = assertSupabase();

  const { data: participantsData, error: participantsError } = await client
    .from('live_training_participants')
    .select('*')
    .eq('live_training_id', liveTrainingId)
    .order('created_at', { ascending: true });

  if (participantsError) {
    throw participantsError;
  }

  const participants = (participantsData ?? []) as LiveTrainingParticipant[];

  if (participants.length === 0) {
    return [];
  }

  const participantUserIds = Array.from(
    new Set(
      participants
        .map(participant => participant.user_id)
        .filter(Boolean)
    )
  );

  if (participantUserIds.length === 0) {
    return participants as LiveTrainingParticipantWithUser[];
  }

  const { data: profilesData, error: profilesError } = await client
    .from('profiles')
    .select('*')
    .or(
      `id.in.(${participantUserIds.join(',')}),auth_user_id.in.(${participantUserIds.join(',')})`
    );

  if (profilesError) {
    throw profilesError;
  }

  const profiles = (profilesData ?? []) as Profile[];

  const profilesById = new Map<string, Profile>();

  profiles.forEach(profile => {
    if (profile.id) {
      profilesById.set(profile.id, profile);
    }

    const authUserId = (profile as Profile & { auth_user_id?: string | null }).auth_user_id;

    if (authUserId) {
      profilesById.set(authUserId, profile);
    }
  });

  return participants.map(participant => ({
    ...participant,
    user: profilesById.get(participant.user_id) ?? undefined,
  })) as LiveTrainingParticipantWithUser[];
}
/**
 * Obtiene capacitaciones en vivo asignadas a un worker.
 */
export async function getWorkerLiveTrainings(
  userIdOrIds: string | string[]
): Promise<LiveTrainingParticipantWithUser[]> {
  const client = assertSupabase();
  const userIds = Array.from(
    new Set((Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds]).filter(Boolean))
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from('live_training_participants')
    .select(`
      *,
      live_training:live_trainings(*)
    `)
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as LiveTrainingParticipantWithUser[]).filter(item => {
    const training = item.live_training as LiveTrainingParticipantWithUser['live_training'] & { deleted_at?: string | null };
    return !training?.deleted_at;
  });
}

/**
 * Obtiene una invitación puntual de worker a una capacitación.
 * Sirve para validar que el worker pueda entrar a la sala.
 */
export async function getWorkerLiveTrainingParticipant(
  liveTrainingId: string,
  userIdOrIds: string | string[]
): Promise<LiveTrainingParticipant | null> {
  const client = assertSupabase();
  const userIds = Array.from(
    new Set((Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds]).filter(Boolean))
  );

  if (userIds.length === 0) {
    return null;
  }

  const { data, error } = await client
    .from('live_training_participants')
    .select(`
      *,
      live_training:live_trainings(*)
    `)
    .eq('live_training_id', liveTrainingId)
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LiveTrainingParticipant | null) ?? null;
}

/**
 * Registra que el worker abrió la pantalla interna de Cigüeña.
 */
export async function markLiveTrainingRoomOpened(
  participantId: string,
  metadata?: Record<string, unknown>
): Promise<LiveTrainingParticipant> {
  const client = assertSupabase();
  const openedAt = getNowIso();

  const { data, error } = await client
    .from('live_training_participants')
    .update({
      room_opened_at: openedAt,
      updated_at: openedAt,
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const participant = data as LiveTrainingParticipant;

  await logLiveTrainingEvent({
    tenant_id: participant.tenant_id,
    live_training_id: participant.live_training_id,
    user_id: participant.user_id,
    event_type: 'room_opened',
    metadata: {
      room_opened_at: openedAt,
      ...(metadata ?? {}),
    },
    created_by: participant.user_id,
  });

  return participant;
}

/**
 * Registra que el worker hizo click en "Ingresar a Google Meet".
 * Este timestamp después se usa para clasificar on_time / late / absent.
 */
export async function markLiveTrainingJoinClicked(
  participantId: string,
  metadata?: Record<string, unknown>
): Promise<LiveTrainingParticipant> {
  const client = assertSupabase();
  const clickedAt = getNowIso();

  const { data, error } = await client
    .from('live_training_participants')
    .update({
      join_clicked_at: clickedAt,
      updated_at: clickedAt,
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const participant = data as LiveTrainingParticipant;

  await logLiveTrainingEvent({
    tenant_id: participant.tenant_id,
    live_training_id: participant.live_training_id,
    user_id: participant.user_id,
    event_type: 'join_clicked',
    metadata: {
      join_clicked_at: clickedAt,
      ...(metadata ?? {}),
    },
    created_by: participant.user_id,
  });

  return participant;
}

/**
 * Marca manualmente o corrige asistencia desde Admin.
 * Esto lo dejamos preparado aunque la lógica automática venga después.
 */
export async function updateLiveTrainingParticipantStatus(
  participantId: string,
  input: {
    live_attendance_status?: LiveAttendanceStatus;
    async_recovery_status?: AsyncRecoveryStatus;
    exam_status?: LiveTrainingExamStatus;
    certification_status?: LiveTrainingCertificationStatus;
    live_attendance_overridden_by?: string | null;
    live_attendance_override_reason?: string | null;
  }
): Promise<LiveTrainingParticipant> {
  const client = assertSupabase();
  const now = getNowIso();

  const { data, error } = await client
    .from('live_training_participants')
    .update({
      ...input,
      live_attendance_evaluated_at: input.live_attendance_status ? now : undefined,
      updated_at: now,
    })
    .eq('id', participantId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTrainingParticipant;
}

/**
 * Clasifica asistencia según el horario de la capacitación.
 * Esta función se puede usar desde UI o luego mover a Netlify Function.
 */
export function calculateLiveAttendanceStatus(params: {
  starts_at: string;
  ends_at: string;
  late_tolerance_minutes: number;
  join_clicked_at: string | null;
}): LiveAttendanceStatus {
  const { starts_at, ends_at, late_tolerance_minutes, join_clicked_at } = params;

  if (!join_clicked_at) {
    return 'absent';
  }

  const startsAt = new Date(starts_at).getTime();
  const endsAt = new Date(ends_at).getTime();
  const joinedAt = new Date(join_clicked_at).getTime();
  const onTimeLimit = startsAt + late_tolerance_minutes * 60 * 1000;

  if (joinedAt <= onTimeLimit) {
    return 'on_time';
  }

  if (joinedAt > onTimeLimit && joinedAt <= endsAt) {
    return 'late';
  }

  return 'invalid_after_event';
}

/**
 * Evalúa todos los participantes de una capacitación.
 * MVP: se puede disparar desde un botón Admin "Evaluar asistencia".
 * Luego lo ideal es moverlo a función scheduled.
 */
export async function evaluateLiveTrainingAttendance(
  liveTrainingId: string
): Promise<LiveTrainingParticipant[]> {
  const client = assertSupabase();

  const training = await getLiveTrainingById(liveTrainingId);

  if (!training) {
    throw new Error('Capacitación en vivo no encontrada.');
  }

  const participants = await getLiveTrainingParticipants(liveTrainingId);
  const now = getNowIso();

  const updates = await Promise.all(
    participants.map(async participant => {
      const liveAttendanceStatus = calculateLiveAttendanceStatus({
        starts_at: training.starts_at,
        ends_at: training.ends_at,
        late_tolerance_minutes: training.late_tolerance_minutes,
        join_clicked_at: participant.join_clicked_at,
      });

      const isOnTime = liveAttendanceStatus === 'on_time';
      const isLate = liveAttendanceStatus === 'late';
      const attendedLive = isOnTime || isLate;

      let asyncRecoveryStatus: AsyncRecoveryStatus = participant.async_recovery_status;
      let examStatus: LiveTrainingExamStatus = participant.exam_status;
      let certificationStatus: LiveTrainingCertificationStatus = participant.certification_status;

      if (attendedLive) {
        asyncRecoveryStatus = 'not_required';

        if (training.has_exam) {
          examStatus = participant.exam_status === 'not_required' ? 'pending' : participant.exam_status;
          certificationStatus = 'pending_exam';
        } else if (training.certificate_enabled && isOnTime) {
          examStatus = 'not_required';
          certificationStatus = 'eligible';
        } else {
          certificationStatus = 'not_eligible';
        }
      } else {
        if (training.async_recovery_enabled) {
          asyncRecoveryStatus = training.recording_url ? 'available' : 'pending_recording';
        } else {
          asyncRecoveryStatus = 'not_required';
        }

        examStatus = training.has_exam ? 'pending' : 'not_required';
        certificationStatus = 'not_eligible';
      }

      const { data, error } = await client
        .from('live_training_participants')
        .update({
          live_attendance_status: liveAttendanceStatus,
          live_attendance_evaluated_at: now,
          async_recovery_status: asyncRecoveryStatus,
          exam_status: examStatus,
          certification_status: certificationStatus,
          updated_at: now,
        })
        .eq('id', participant.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data as LiveTrainingParticipant;
    })
  );

  await updateLiveTraining(liveTrainingId, {
    status: 'completed',
  });

  await logLiveTrainingEvent({
    tenant_id: training.tenant_id,
    live_training_id: training.id,
    user_id: null,
    event_type: 'attendance_evaluated',
    metadata: {
      evaluated_at: now,
      participant_count: updates.length,
    },
    created_by: training.created_by,
  });

  return updates;
}

/**
 * Guarda un log de auditoría.
 */
export async function logLiveTrainingEvent(input: {
  tenant_id: string | null;
  live_training_id: string;
  user_id?: string | null;
  event_type: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
}): Promise<LiveTrainingLog> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_training_logs')
    .insert({
      tenant_id: input.tenant_id,
      live_training_id: input.live_training_id,
      user_id: input.user_id ?? null,
      event_type: input.event_type,
      metadata: input.metadata ?? null,
      created_by: input.created_by ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as LiveTrainingLog;
}

/**
 * Genera estadísticas simples para la UI.
 */
export function getLiveTrainingStats(
  participants: LiveTrainingParticipant[]
): LiveTrainingStats {
  const stats = buildEmptyStats();

  participants.forEach(participant => {
    if (participant.live_attendance_status === 'invited') stats.invited += 1;
    if (participant.live_attendance_status === 'on_time') stats.on_time += 1;
    if (participant.live_attendance_status === 'late') stats.late += 1;
    if (participant.live_attendance_status === 'absent') stats.absent += 1;
    if (participant.live_attendance_status === 'invalid_after_event') stats.invalid_after_event += 1;
    if (participant.live_attendance_status === 'excused_manual') stats.excused_manual += 1;

    if (participant.exam_status === 'pending') stats.pending_exam += 1;
    if (participant.certification_status === 'issued') stats.certificates_issued += 1;
    if (participant.async_recovery_status === 'completed') stats.async_completed += 1;
  });

  return stats;
}

/**
 * Crea un certificado de capacitación en vivo.
 * MVP: guarda el registro. La generación real del PDF/URL puede venir después.
 */
export async function createLiveTrainingCertificate(input: {
  tenant_id: string;
  user_id: string;
  live_training_id: string;
  participant_id: string;
  certificate_code: string;
  certificate_url?: string | null;
  completion_mode: 'live_attendance' | 'async_recovery';
}): Promise<LiveTrainingCertificate> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('live_training_certificates')
    .insert({
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      live_training_id: input.live_training_id,
      participant_id: input.participant_id,
      certificate_code: input.certificate_code,
      certificate_url: input.certificate_url ?? null,
      completion_mode: input.completion_mode,
      status: 'valid',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const certificate = data as LiveTrainingCertificate;

  await client
    .from('live_training_participants')
    .update({
      certificate_id: certificate.id,
      certification_status: 'issued',
      updated_at: getNowIso(),
    })
    .eq('id', input.participant_id);

  await logLiveTrainingEvent({
    tenant_id: input.tenant_id,
    live_training_id: input.live_training_id,
    user_id: input.user_id,
    event_type: 'certificate_issued',
    metadata: {
      certificate_id: certificate.id,
      certificate_code: certificate.certificate_code,
      completion_mode: certificate.completion_mode,
    },
    created_by: input.user_id,
  });

  return certificate;
}

/**
 * Lista trabajadores activos de un tenant.
 * Lo usamos para seleccionar invitados desde el formulario Admin.
 */
export async function getTenantWorkersForLiveTraining(tenantId: string): Promise<Profile[]> {
  const client = assertSupabase();

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('role', 'worker')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
}