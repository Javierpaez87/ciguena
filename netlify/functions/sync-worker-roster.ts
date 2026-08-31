import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode: number, body: unknown) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullable(value: unknown) {
  const result = clean(value);
  return result || null;
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  return normalize(value);
}

function normalizeStatus(value: unknown) {
  const status = normalize(value);
  if (!status) return '';
  if (['inactive', 'inactivo', 'deshabilitado'].includes(status)) return 'inactive';
  if (['active', 'activo', 'habilitado', 'preapproved', 'preaprobado', 'pending', 'pendiente'].includes(status)) {
    return 'active';
  }
  return status;
}

function isAdminRole(value: unknown) {
  const role = normalize(value);
  return role === 'admin' || role === 'superadmin' || role === 'super_admin';
}

type ProfileRow = Record<string, any> & {
  id: string;
  tenant_id?: string | null;
  auth_user_id?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
};

type DirectoryRow = Record<string, any> & {
  id: string;
  tenant_id?: string | null;
  email?: string | null;
  profile_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
  status?: string | null;
};

type IncomingWorker = {
  rowNumber?: number;
  profileId?: string | null;
  directoryId?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  dni?: string | null;
  phone?: string | null;
  work_role?: string | null;
  position?: string | null;
  area?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  hire_date?: string | null;
  base?: string | null;
  site?: string | null;
  region?: string | null;
  oilfield?: string | null;
  custom_fields?: Record<string, string> | null;
  status?: string | null;
  status_provided?: boolean;
};

type ExistingWorker = {
  key: string;
  profile?: ProfileRow;
  directory?: DirectoryRow;
};

type SyncResult = {
  rowNumber?: number;
  email: string;
  status: 'created' | 'updated' | 'unchanged' | 'conflict';
  message?: string;
};

function getWorkerEmail(worker: ExistingWorker) {
  return normalizeEmail(worker.profile?.email || worker.directory?.email);
}

function getWorkerEmployeeCode(worker: ExistingWorker) {
  return normalize(
    worker.profile?.employee_code ||
      worker.directory?.employee_code ||
      worker.directory?.external_id
  );
}

function getWorkerDni(worker: ExistingWorker) {
  return normalize(worker.profile?.dni || worker.directory?.dni);
}

function addToIndex(index: Map<string, ExistingWorker[]>, value: string, worker: ExistingWorker) {
  if (!value) return;
  const current = index.get(value) || [];
  if (!current.some((item) => item.key === worker.key)) current.push(worker);
  index.set(value, current);
}

function buildExistingWorkers(profiles: ProfileRow[], directories: DirectoryRow[]) {
  const directoryByProfileId = new Map<string, DirectoryRow>();
  const directoryByEmail = new Map<string, DirectoryRow>();

  directories.forEach((row) => {
    if (row.profile_id) directoryByProfileId.set(row.profile_id, row);
    if (row.email) directoryByEmail.set(normalizeEmail(row.email), row);
  });

  const usedDirectoryIds = new Set<string>();
  const workers: ExistingWorker[] = [];

  profiles
    .filter((profile) => !isAdminRole(profile.role))
    .forEach((profile) => {
      const directory =
        directoryByProfileId.get(profile.id) ||
        (profile.email ? directoryByEmail.get(normalizeEmail(profile.email)) : undefined);

      if (directory) usedDirectoryIds.add(directory.id);
      workers.push({ key: `profile:${profile.id}`, profile, directory });
    });

  directories
    .filter((row) => !usedDirectoryIds.has(row.id))
    .forEach((directory) => {
      workers.push({ key: `directory:${directory.id}`, directory });
    });

  return workers;
}

function buildIndexes(workers: ExistingWorker[]) {
  const byEmail = new Map<string, ExistingWorker[]>();
  const byEmployeeCode = new Map<string, ExistingWorker[]>();
  const byDni = new Map<string, ExistingWorker[]>();
  const byProfileId = new Map<string, ExistingWorker>();
  const byDirectoryId = new Map<string, ExistingWorker>();

  workers.forEach((worker) => {
    addToIndex(byEmail, getWorkerEmail(worker), worker);
    addToIndex(byEmployeeCode, getWorkerEmployeeCode(worker), worker);
    addToIndex(byDni, getWorkerDni(worker), worker);
    if (worker.profile?.id) byProfileId.set(worker.profile.id, worker);
    if (worker.directory?.id) byDirectoryId.set(worker.directory.id, worker);
  });

  return { byEmail, byEmployeeCode, byDni, byProfileId, byDirectoryId };
}

function uniqueCandidates(groups: ExistingWorker[][]) {
  const map = new Map<string, ExistingWorker>();
  groups.flat().forEach((worker) => map.set(worker.key, worker));
  return Array.from(map.values());
}

function resolveWorker(
  incoming: IncomingWorker,
  indexes: ReturnType<typeof buildIndexes>,
  mode: string
): { worker?: ExistingWorker; conflict?: string } {
  if (mode === 'single') {
    const profileId = clean(incoming.profileId);
    const directoryId = clean(incoming.directoryId);
    const direct =
      (profileId ? indexes.byProfileId.get(profileId) : undefined) ||
      (directoryId ? indexes.byDirectoryId.get(directoryId) : undefined);

    if (!direct) return { conflict: 'No encontramos el trabajador a editar.' };
    return { worker: direct };
  }

  const groups: ExistingWorker[][] = [];
  const employeeCode = normalize(incoming.employee_code);
  const dni = normalize(incoming.dni);
  const email = normalizeEmail(incoming.email);

  if (employeeCode && indexes.byEmployeeCode.has(employeeCode)) {
    groups.push(indexes.byEmployeeCode.get(employeeCode)!);
  }
  if (dni && indexes.byDni.has(dni)) groups.push(indexes.byDni.get(dni)!);
  if (email && indexes.byEmail.has(email)) groups.push(indexes.byEmail.get(email)!);

  const candidates = uniqueCandidates(groups);
  if (candidates.length > 1) {
    return {
      conflict: 'Legajo, DNI o email corresponden a trabajadores distintos. Revisá esta fila.',
    };
  }

  return { worker: candidates[0] };
}

function mergeField(current: unknown, incoming: unknown, mode: string) {
  const next = clean(incoming);
  if (mode === 'single') return next || null;
  return next || nullable(current);
}

function buildFullName(incoming: IncomingWorker, existing?: ExistingWorker) {
  const explicit = clean(incoming.full_name);
  if (explicit) return explicit;

  const firstName = clean(incoming.first_name) || clean(existing?.profile?.first_name || existing?.directory?.first_name);
  const lastName = clean(incoming.last_name) || clean(existing?.profile?.last_name || existing?.directory?.last_name);
  return [firstName, lastName].filter(Boolean).join(' ') || null;
}

function getExtendedValue(existing: ExistingWorker | undefined, key: string) {
  return (
    existing?.profile?.[key] ||
    existing?.directory?.[key] ||
    existing?.directory?.raw_payload?.[key] ||
    null
  );
}

function buildDirectoryPayload({
  incoming,
  existing,
  tenantId,
  now,
  mode,
  id,
  nextEmail,
}: {
  incoming: IncomingWorker;
  existing?: ExistingWorker;
  tenantId: string;
  now: string;
  mode: string;
  id: string;
  nextEmail: string;
}) {
  const current = existing?.directory;
  const currentRaw = (current?.raw_payload || {}) as Record<string, unknown>;
  const nextRaw: Record<string, unknown> = {
    ...currentRaw,
    source: mode === 'single' ? 'admin_manual_edit' : 'csv_sync',
  };

  const extendedKeys = ['supervisor', 'shift', 'hire_date', 'base', 'site', 'region', 'oilfield'] as const;
  extendedKeys.forEach((key) => {
    const incomingValue = clean(incoming[key]);
    if (mode === 'single') {
      nextRaw[key] = incomingValue || null;
    } else if (incomingValue) {
      nextRaw[key] = incomingValue;
    }
  });
  if (incoming.custom_fields && Object.keys(incoming.custom_fields).length > 0) {
    nextRaw.custom_fields = incoming.custom_fields;
  }

  const incomingStatus = incoming.status_provided ? normalizeStatus(incoming.status) : '';
  const profileIsInactive = normalize(existing?.profile?.status) === 'inactive';
  const profileIsRegistered = Boolean(existing?.profile?.auth_user_id);
  let nextStatus = current?.status || (profileIsInactive ? 'inactive' : profileIsRegistered ? 'registered' : 'preapproved');
  if (incomingStatus === 'inactive') nextStatus = 'inactive';
  if (incomingStatus === 'active') {
    const currentStatus = normalize(current?.status);
    nextStatus = profileIsRegistered
      ? 'registered'
      : ['registered', 'invited'].includes(currentStatus)
        ? currentStatus
        : 'preapproved';
  }

  if (!existing) {
    nextStatus = incomingStatus === 'inactive' ? 'inactive' : 'preapproved';
  }

  return {
    id,
    tenant_id: tenantId,
    source: current?.source || (mode === 'single' ? 'manual' : 'csv'),
    external_id: mergeField(current?.external_id, incoming.employee_code, mode),
    first_name: mergeField(current?.first_name, incoming.first_name, mode),
    last_name: mergeField(current?.last_name, incoming.last_name, mode),
    full_name: buildFullName(incoming, existing),
    email: nextEmail,
    dni: mergeField(current?.dni, incoming.dni, mode),
    phone: mergeField(current?.phone, incoming.phone, mode),
    work_role: mergeField(current?.work_role, incoming.work_role || incoming.position, mode),
    position: mergeField(current?.position, incoming.position || incoming.work_role, mode),
    area: mergeField(current?.area, incoming.area, mode),
    contractor_company: mergeField(current?.contractor_company, incoming.contractor_company, mode),
    employee_code: mergeField(current?.employee_code || current?.external_id, incoming.employee_code, mode),
    status: nextStatus,
    profile_id: current?.profile_id || (profileIsRegistered ? existing?.profile?.id || null : null),
    registered_at: current?.registered_at || (profileIsRegistered ? now : null),
    invited_at: current?.invited_at || null,
    raw_payload: nextRaw,
    updated_at: now,
    created_at: current?.created_at || now,
  };
}

function buildProfilePayload({
  incoming,
  existing,
  tenantId,
  now,
  id,
  nextEmail,
  mode,
}: {
  incoming: IncomingWorker;
  existing?: ExistingWorker;
  tenantId: string;
  now: string;
  id: string;
  nextEmail: string;
  mode: string;
}) {
  const current = existing?.profile;
  const incomingStatus = incoming.status_provided ? normalizeStatus(incoming.status) : '';
  const directoryIsInactive = normalize(existing?.directory?.status) === 'inactive';
  let nextStatus = current?.status || (directoryIsInactive ? 'inactive' : 'active');
  if (incomingStatus === 'inactive') nextStatus = 'inactive';
  if (incomingStatus === 'active') nextStatus = 'active';
  if (!existing) nextStatus = incomingStatus === 'inactive' ? 'inactive' : 'active';

  const nextWorkRole = mergeField(current?.work_role || current?.job_role, incoming.work_role || incoming.position, mode);
  const nextPosition = mergeField(current?.position, incoming.position || incoming.work_role, mode);

  return {
    id,
    tenant_id: tenantId,
    first_name: mergeField(current?.first_name, incoming.first_name, mode),
    last_name: mergeField(current?.last_name, incoming.last_name, mode),
    full_name: buildFullName(incoming, existing),
    email: nextEmail,
    phone: mergeField(current?.phone, incoming.phone, mode),
    dni: mergeField(current?.dni, incoming.dni, mode),
    work_role: nextWorkRole,
    job_role: nextWorkRole,
    position: nextPosition,
    area: mergeField(current?.area, incoming.area, mode),
    contractor_company: mergeField(current?.contractor_company, incoming.contractor_company, mode),
    employee_code: mergeField(current?.employee_code, incoming.employee_code, mode),
    role: current?.role || 'worker',
    status: nextStatus,
    preapproved: current?.preapproved ?? true,
    updated_at: now,
    auth_user_id: current?.auth_user_id ?? null,
    created_at: current?.created_at || now,
  };
}

function comparableWorker(existing: ExistingWorker | undefined) {
  if (!existing) return null;
  return {
    first_name: clean(existing.profile?.first_name || existing.directory?.first_name),
    last_name: clean(existing.profile?.last_name || existing.directory?.last_name),
    full_name: clean(existing.profile?.full_name || existing.directory?.full_name),
    email: getWorkerEmail(existing),
    dni: clean(existing.profile?.dni || existing.directory?.dni),
    phone: clean(existing.profile?.phone || existing.directory?.phone),
    work_role: clean(existing.profile?.work_role || existing.profile?.job_role || existing.directory?.work_role),
    position: clean(existing.profile?.position || existing.directory?.position),
    area: clean(existing.profile?.area || existing.directory?.area || existing.directory?.department),
    contractor_company: clean(existing.profile?.contractor_company || existing.directory?.contractor_company),
    employee_code: clean(existing.profile?.employee_code || existing.directory?.employee_code || existing.directory?.external_id),
    supervisor: clean(getExtendedValue(existing, 'supervisor')),
    shift: clean(getExtendedValue(existing, 'shift')),
    hire_date: clean(getExtendedValue(existing, 'hire_date')),
    base: clean(getExtendedValue(existing, 'base')),
    site: clean(getExtendedValue(existing, 'site')),
    region: clean(getExtendedValue(existing, 'region')),
    oilfield: clean(getExtendedValue(existing, 'oilfield')),
    status: normalizeStatus(existing.profile?.status || existing.directory?.status),
  };
}

function hasMeaningfulChanges(
  incoming: IncomingWorker,
  existing: ExistingWorker | undefined,
  nextEmail: string,
  mode: string
) {
  if (!existing) return true;
  const current = comparableWorker(existing)!;
  const keys = [
    'first_name',
    'last_name',
    'full_name',
    'dni',
    'phone',
    'work_role',
    'position',
    'area',
    'contractor_company',
    'employee_code',
    'supervisor',
    'shift',
    'hire_date',
    'base',
    'site',
    'region',
    'oilfield',
  ] as const;

  if (nextEmail && normalizeEmail(current.email) !== normalizeEmail(nextEmail)) return true;

  for (const key of keys) {
    const incomingValue = clean(incoming[key]);
    if (mode === 'single') {
      if (clean(current[key]) !== incomingValue) return true;
    } else if (incomingValue && clean(current[key]) !== incomingValue) {
      return true;
    }
  }

  if (incoming.status_provided) {
    const nextStatus = normalizeStatus(incoming.status);
    if (nextStatus && current.status !== nextStatus) return true;
  }

  return false;
}

async function upsertAll(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  payload: Record<string, unknown>[]
) {
  if (payload.length === 0) return null;
  const { error } = await supabaseAdmin.from(table).upsert(payload, { onConflict: 'id' });
  return error;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido.' });
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Faltan variables de entorno de Supabase.' });
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Solicitud inválida.' });
  }

  const tenantId = clean(payload.tenantId);
  const mode = clean(payload.mode) || 'roster';
  const deactivateMissing = mode === 'roster' && payload.deactivateMissing === true;
  const incomingRows: IncomingWorker[] = Array.isArray(payload.rows)
    ? payload.rows
    : payload.worker
      ? [payload.worker]
      : [];

  if (!tenantId || incomingRows.length === 0) {
    return json(400, { error: 'Faltan tenantId o trabajadores para procesar.' });
  }

  if (!['single', 'roster'].includes(mode)) {
    return json(400, { error: 'Modo de actualización inválido.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authorizationHeader = clean(event.headers?.authorization || event.headers?.Authorization);
  const accessToken = authorizationHeader.toLowerCase().startsWith('bearer ')
    ? authorizationHeader.slice(7).trim()
    : '';

  if (!accessToken) return json(401, { error: 'Sesión no autorizada.' });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  const authUser = authData?.user;
  if (authError || !authUser) return json(401, { error: 'La sesión no es válida o venció.' });

  const { data: requesterProfile, error: requesterError } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id, role, status')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  const requesterRole = normalize(requesterProfile?.role);
  const isSuperAdmin = requesterRole === 'super_admin' || requesterRole === 'superadmin';
  const isTenantAdmin = requesterRole === 'admin' && requesterProfile?.tenant_id === tenantId;

  if (
    requesterError ||
    !requesterProfile ||
    normalize(requesterProfile.status) !== 'active' ||
    (!isSuperAdmin && !isTenantAdmin)
  ) {
    return json(403, { error: 'No tenés permisos para modificar la nómina de esta empresa.' });
  }

  const [{ data: profileData, error: profilesError }, { data: directoryData, error: directoryError }] =
    await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('tenant_id', tenantId),
      supabaseAdmin.from('employee_directory').select('*').eq('tenant_id', tenantId),
    ]);

  if (profilesError || directoryError) {
    console.error('Error loading roster:', profilesError || directoryError);
    return json(500, { error: 'No pudimos leer la nómina actual.' });
  }

  const profiles = (profileData || []) as ProfileRow[];
  const directories = (directoryData || []) as DirectoryRow[];
  const existingWorkers = buildExistingWorkers(profiles, directories);
  const indexes = buildIndexes(existingWorkers);
  const now = new Date().toISOString();

  const directoryPayloads = new Map<string, Record<string, unknown>>();
  const profilePayloads = new Map<string, Record<string, unknown>>();
  const directoryRollbackPayloads = new Map<string, Record<string, unknown>>();
  const newDirectoryIds = new Set<string>();
  const matchedExistingKeys = new Set<string>();
  const directoryIdsToDeactivate = new Set<string>();
  const profileIdsToDeactivate = new Set<string>();
  const results: SyncResult[] = [];

  const seenEmails = new Set<string>();
  const seenCodes = new Set<string>();
  const seenDnis = new Set<string>();

  for (const incoming of incomingRows) {
    const email = normalizeEmail(incoming.email);
    const employeeCode = normalize(incoming.employee_code);
    const dni = normalize(incoming.dni);

    if (!email) {
      results.push({
        rowNumber: incoming.rowNumber,
        email: '',
        status: 'conflict',
        message: 'Falta email.',
      });
      continue;
    }

    if (mode === 'roster') {
      if (seenEmails.has(email)) {
        results.push({ rowNumber: incoming.rowNumber, email, status: 'conflict', message: 'Email duplicado en el CSV.' });
        continue;
      }
      if (employeeCode && seenCodes.has(employeeCode)) {
        results.push({ rowNumber: incoming.rowNumber, email, status: 'conflict', message: 'Legajo duplicado en el CSV.' });
        continue;
      }
      if (dni && seenDnis.has(dni)) {
        results.push({ rowNumber: incoming.rowNumber, email, status: 'conflict', message: 'DNI duplicado en el CSV.' });
        continue;
      }
      seenEmails.add(email);
      if (employeeCode) seenCodes.add(employeeCode);
      if (dni) seenDnis.add(dni);
    }

    const resolved = resolveWorker(incoming, indexes, mode);
    if (resolved.conflict) {
      results.push({ rowNumber: incoming.rowNumber, email, status: 'conflict', message: resolved.conflict });
      continue;
    }

    const existing = resolved.worker;
    if (existing) matchedExistingKeys.add(existing.key);

    const currentEmail = existing ? getWorkerEmail(existing) : '';
    const requestedEmail = email;

    if (
      existing?.profile?.auth_user_id &&
      currentEmail &&
      requestedEmail &&
      currentEmail !== requestedEmail
    ) {
      results.push({
        rowNumber: incoming.rowNumber,
        email: requestedEmail,
        status: 'conflict',
        message: 'El usuario ya tiene cuenta. El cambio de email debe hacerse de forma individual sobre Auth.',
      });
      continue;
    }

    const nextEmail = requestedEmail || currentEmail;
    const directoryId = existing?.directory?.id || randomUUID();
    const profileId = existing?.profile?.id || randomUUID();

    const changed = hasMeaningfulChanges(incoming, existing, nextEmail, mode);
    if (!changed) {
      results.push({ rowNumber: incoming.rowNumber, email: nextEmail, status: 'unchanged' });
      continue;
    }

    const directoryPayload = buildDirectoryPayload({
      incoming,
      existing,
      tenantId,
      now,
      mode,
      id: directoryId,
      nextEmail,
    });
    const profilePayload = buildProfilePayload({
      incoming,
      existing,
      tenantId,
      now,
      id: profileId,
      nextEmail,
      mode,
    });

    directoryPayloads.set(directoryId, directoryPayload);
    profilePayloads.set(profileId, profilePayload);

    if (existing?.directory) {
      directoryRollbackPayloads.set(existing.directory.id, { ...existing.directory });
    } else {
      newDirectoryIds.add(directoryId);
    }

    results.push({
      rowNumber: incoming.rowNumber,
      email: nextEmail,
      status: existing ? 'updated' : 'created',
    });
  }

  if (deactivateMissing) {
    existingWorkers.forEach((worker) => {
      if (matchedExistingKeys.has(worker.key)) return;

      if (worker.directory && normalize(worker.directory.status) !== 'inactive') {
        directoryIdsToDeactivate.add(worker.directory.id);
      }

      if (worker.profile && normalize(worker.profile.status) !== 'inactive') {
        profileIdsToDeactivate.add(worker.profile.id);
      }
    });
  }

  const missingWorkersToDeactivate = deactivateMissing
    ? existingWorkers.filter((worker) => {
        if (matchedExistingKeys.has(worker.key)) return false;
        const directoryActive = worker.directory && normalize(worker.directory.status) !== 'inactive';
        const profileActive = worker.profile && normalize(worker.profile.status) !== 'inactive';
        return Boolean(directoryActive || profileActive);
      }).length
    : 0;

  const conflicts = results.filter((item) => item.status === 'conflict');
  if (deactivateMissing && conflicts.length > 0) {
    return json(409, {
      ok: false,
      error: 'La nómina completa tiene conflictos. No se aplicó ningún cambio ni se desactivó a nadie.',
      results,
    });
  }

  const directoryPayloadArray = Array.from(directoryPayloads.values());
  const profilePayloadArray = Array.from(profilePayloads.values());

  const directoryUpsertError = await upsertAll(supabaseAdmin, 'employee_directory', directoryPayloadArray);
  if (directoryUpsertError) {
    console.error('Error updating employee_directory:', directoryUpsertError);
    return json(500, { error: 'No pudimos actualizar employee_directory. No se modificaron perfiles.' });
  }

  const profileUpsertError = await upsertAll(supabaseAdmin, 'profiles', profilePayloadArray);
  if (profileUpsertError) {
    console.error('Error updating profiles:', profileUpsertError);

    try {
      const rollbackRows = Array.from(directoryRollbackPayloads.values());
      if (rollbackRows.length > 0) {
        await supabaseAdmin.from('employee_directory').upsert(rollbackRows, { onConflict: 'id' });
      }
      if (newDirectoryIds.size > 0) {
        await supabaseAdmin.from('employee_directory').delete().in('id', Array.from(newDirectoryIds));
      }
    } catch (rollbackError) {
      console.error('Roster rollback failed:', rollbackError);
    }

    return json(500, {
      error: 'No pudimos actualizar profiles. Se intentó revertir employee_directory para mantener consistencia.',
    });
  }


  if (deactivateMissing && directoryIdsToDeactivate.size > 0) {
    const { error } = await supabaseAdmin
      .from('employee_directory')
      .update({ status: 'inactive', updated_at: now })
      .in('id', Array.from(directoryIdsToDeactivate));

    if (error) {
      console.error('Error deactivating missing directory workers:', error);
      return json(500, {
        error: 'La nómina se actualizó, pero no pudimos desactivar todos los trabajadores ausentes. Reintentá la renovación.',
      });
    }
  }

  if (deactivateMissing && profileIdsToDeactivate.size > 0) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'inactive', updated_at: now })
      .in('id', Array.from(profileIdsToDeactivate));

    if (error) {
      console.error('Error deactivating missing profiles:', error);
      return json(500, {
        error: 'La nómina se actualizó, pero no pudimos desactivar todos los perfiles ausentes. Reintentá la renovación.',
      });
    }
  }

  const summary = {
    created: results.filter((item) => item.status === 'created').length,
    updated: results.filter((item) => item.status === 'updated').length,
    unchanged: results.filter((item) => item.status === 'unchanged').length,
    conflicts: conflicts.length,
    deactivated: missingWorkersToDeactivate,
  };

  return json(200, { ok: true, summary, results });
};
