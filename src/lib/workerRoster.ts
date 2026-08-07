export type WorkerRecord = {
  id: string;
  tenant_id?: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  work_role?: string | null;
  job_role?: string | null;
  position?: string | null;
  area?: string | null;
  department?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  dni?: string | null;
  phone?: string | null;
  status?: string | null;
  source?: string | null;
  employee_directory_id?: string | null;
  directory_status?: string | null;
  profile_id?: string | null;
  is_directory_only?: boolean;
  [key: string]: any;
};

export type EmployeeDirectoryRecord = {
  id: string;
  tenant_id?: string | null;
  source?: string | null;
  external_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  dni?: string | null;
  phone?: string | null;
  employee_code?: string | null;
  work_role?: string | null;
  area?: string | null;
  position?: string | null;
  contractor_company?: string | null;
  department?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  hire_date?: string | null;
  base?: string | null;
  site?: string | null;
  region?: string | null;
  oilfield?: string | null;
  custom_fields?: Record<string, string> | null;
  raw_payload?: Record<string, unknown> | null;
  status?: string | null;
  invited_at?: string | null;
  registered_at?: string | null;
  profile_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
};

export function normalizeWorkerValue(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export function getOperationalRole(worker?: WorkerRecord | null) {
  return (
    worker?.work_role?.trim() ||
    worker?.job_role?.trim() ||
    worker?.position?.trim() ||
    'Sin rol definido'
  );
}

export function getWorkerDisplayName(worker?: WorkerRecord | null) {
  if (!worker) return 'Usuario sin nombre';

  return (
    worker.full_name ||
    [worker.first_name, worker.last_name].filter(Boolean).join(' ') ||
    worker.email ||
    'Usuario sin nombre'
  );
}

export function isAdminWorkerRecord(worker?: WorkerRecord | null) {
  const role = normalizeWorkerValue(worker?.role);
  return role === 'admin' || role === 'superadmin' || role === 'super_admin';
}

export function isWorkerRecord(worker?: WorkerRecord | null) {
  if (!worker || isAdminWorkerRecord(worker)) return false;
  const role = normalizeWorkerValue(worker.role);
  return !role || role === 'worker' || role === 'trabajador' || role === 'employee';
}

export function isWorkerActive(worker?: WorkerRecord | null) {
  const status = normalizeWorkerValue(worker?.status);
  return !status || ['active', 'activo', 'preapproved', 'pending', 'invited', 'registered'].includes(status);
}

export function isDirectoryOnlyWorker(worker?: WorkerRecord | null) {
  return Boolean(worker?.is_directory_only || String(worker?.id || '').startsWith('directory:'));
}

function rawString(row: EmployeeDirectoryRecord, key: string) {
  const value = row.raw_payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function directoryToWorker(row: EmployeeDirectoryRecord): WorkerRecord {
  return {
    id: `directory:${row.id}`,
    tenant_id: row.tenant_id,
    auth_user_id: null,
    employee_directory_id: row.id,
    profile_id: row.profile_id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' '),
    email: row.email,
    role: 'worker',
    work_role: row.work_role || row.position,
    job_role: row.work_role || row.position,
    position: row.position || row.work_role,
    area: row.area || row.department,
    contractor_company: row.contractor_company,
    employee_code: row.employee_code || row.external_id,
    supervisor: row.supervisor || rawString(row, 'supervisor'),
    shift: row.shift || rawString(row, 'shift'),
    hire_date: row.hire_date || rawString(row, 'hire_date'),
    base: row.base || rawString(row, 'base'),
    site: row.site || rawString(row, 'site'),
    region: row.region || rawString(row, 'region'),
    oilfield: row.oilfield || rawString(row, 'oilfield'),
    custom_fields:
      row.custom_fields ||
      ((row.raw_payload?.custom_fields as Record<string, string> | undefined) ?? null),
    raw_payload: row.raw_payload,
    dni: row.dni,
    phone: row.phone,
    status: row.status || 'preapproved',
    directory_status: row.status,
    source: row.source || 'csv',
    invited_at: row.invited_at,
    registered_at: row.registered_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_directory_only: true,
  };
}

export function mergeProfilesWithDirectory<T extends WorkerRecord>(
  profiles: T[],
  directoryRows: EmployeeDirectoryRecord[]
): WorkerRecord[] {
  const rawProfiles = profiles.filter((profile) => !isAdminWorkerRecord(profile));
  const profileById = new Map(rawProfiles.map((profile) => [profile.id, profile]));
  const directoryByProfileId = new Map<string, EmployeeDirectoryRecord>();
  const directoryByEmail = new Map<string, EmployeeDirectoryRecord>();

  directoryRows.forEach((row) => {
    if (row.profile_id) directoryByProfileId.set(row.profile_id, row);
    if (row.email) directoryByEmail.set(normalizeWorkerValue(row.email), row);
  });

  const enhancedProfiles: WorkerRecord[] = rawProfiles.map((profile) => {
    const directoryRow =
      directoryByProfileId.get(profile.id) ||
      (profile.email ? directoryByEmail.get(normalizeWorkerValue(profile.email)) : undefined);

    if (!directoryRow) return profile;

    return {
      ...profile,
      employee_directory_id: directoryRow.id,
      profile_id: profile.id,
      first_name: profile.first_name || directoryRow.first_name,
      last_name: profile.last_name || directoryRow.last_name,
      full_name:
        profile.full_name ||
        directoryRow.full_name ||
        [directoryRow.first_name, directoryRow.last_name].filter(Boolean).join(' '),
      email: profile.email || directoryRow.email,
      dni: profile.dni || directoryRow.dni,
      phone: profile.phone || directoryRow.phone,
      work_role: profile.work_role || profile.job_role || directoryRow.work_role || directoryRow.position,
      job_role: profile.job_role || profile.work_role || directoryRow.work_role || directoryRow.position,
      position: profile.position || directoryRow.position || directoryRow.work_role,
      area: profile.area || directoryRow.area || directoryRow.department,
      contractor_company: profile.contractor_company || directoryRow.contractor_company,
      employee_code: profile.employee_code || directoryRow.employee_code || directoryRow.external_id,
      supervisor: profile.supervisor || directoryRow.supervisor || rawString(directoryRow, 'supervisor'),
      shift: profile.shift || directoryRow.shift || rawString(directoryRow, 'shift'),
      hire_date: profile.hire_date || directoryRow.hire_date || rawString(directoryRow, 'hire_date'),
      base: profile.base || directoryRow.base || rawString(directoryRow, 'base'),
      site: profile.site || directoryRow.site || rawString(directoryRow, 'site'),
      region: profile.region || directoryRow.region || rawString(directoryRow, 'region'),
      oilfield: profile.oilfield || directoryRow.oilfield || rawString(directoryRow, 'oilfield'),
      custom_fields:
        profile.custom_fields ||
        directoryRow.custom_fields ||
        ((directoryRow.raw_payload?.custom_fields as Record<string, string> | undefined) ?? null),
      raw_payload: directoryRow.raw_payload,
      directory_status: directoryRow.status,
      invited_at: profile.invited_at || directoryRow.invited_at,
      registered_at: profile.registered_at || directoryRow.registered_at,
      is_directory_only: false,
    };
  });

  const matchedDirectoryIds = new Set(
    enhancedProfiles
      .map((profile) => profile.employee_directory_id)
      .filter((value): value is string => Boolean(value))
  );

  const directoryOnlyProfiles = directoryRows
    .filter((row) => !row.profile_id || !profileById.has(row.profile_id))
    .filter((row) => !matchedDirectoryIds.has(row.id))
    .map(directoryToWorker);

  return [...enhancedProfiles, ...directoryOnlyProfiles].sort((a, b) =>
    getWorkerDisplayName(a).toLowerCase().localeCompare(getWorkerDisplayName(b).toLowerCase())
  );
}
