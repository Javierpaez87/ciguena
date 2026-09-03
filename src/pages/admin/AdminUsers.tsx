import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  Pencil,
  Mail,
  Users,
  RefreshCw,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle,
  Download,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { getBrandSlug } from '../../lib/brandIdentity';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import {
  WORKER_FILTER_DEFINITIONS,
  getWorkerFilterDefinition,
  getWorkerFilterOptions,
  matchesWorkerFilter,
  workerMatchesSearch,
  type WorkerFilterKey,
} from '../../lib/workerFilters';

interface Profile {
  id: string;
  tenant_id?: string | null;
  auth_user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  job_role?: string | null;
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
  raw_payload?: Record<string, unknown> | null;
  dni?: string | null;
  phone?: string | null;
  status?: string | null;
  preapproved?: boolean | null;
  source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}

interface EmployeeDirectory {
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
  created_at?: string | null;
  assigned_at?: string | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

interface TenantTraining {
  id?: string;
  tenant_id?: string | null;
  training_id?: string | null;
  title?: string | null;
  name?: string | null;
  training_title?: string | null;
  [key: string]: any;
}

type FormState = {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  dni: string;
  phone: string;
  work_role: string;
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
  status: string;
};

type EditFormState = {
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  work_role: string;
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
  supervisor: string;
  shift: string;
  hire_date: string;
  base: string;
  site: string;
  region: string;
  oilfield: string;
};

type CsvRowAction = 'new' | 'update' | 'unchanged' | 'conflict';

type CsvFieldChange = {
  field: string;
  label: string;
  from: string;
  to: string;
};

type CsvPreviewRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  dni: string;
  phone: string;
  work_role: string;
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
  supervisor: string;
  shift: string;
  hire_date: string;
  base: string;
  site: string;
  region: string;
  oilfield: string;
  custom_fields: Record<string, string>;
  status: string;
  status_provided: boolean;
  errors: string[];
  action: CsvRowAction;
  changes: CsvFieldChange[];
  matched_user_id?: string;
  matched_profile_id?: string;
  matched_directory_id?: string;
  match_reason?: string;
};

type InvitationResultStatus = 'accepted' | 'failed' | 'skipped' | 'not_processed';

type InvitationRecipientResult = {
  email: string;
  status: InvitationResultStatus;
  reason?: string;
  message?: string;
  providerId?: string;
};

type InvitationRunResult = {
  total: number;
  accepted: number;
  failed: number;
  skipped: number;
  notProcessed: number;
  results: InvitationRecipientResult[];
  fatalError?: string | null;
  trackingWarning?: string | null;
};

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  full_name: '',
  email: '',
  dni: '',
  phone: '',
  work_role: '',
  position: '',
  area: '',
  contractor_company: '',
  employee_code: '',
  status: 'active',
};

const emptyEditForm: EditFormState = {
  first_name: '',
  last_name: '',
  dni: '',
  phone: '',
  work_role: '',
  position: '',
  area: '',
  contractor_company: '',
  employee_code: '',
  supervisor: '',
  shift: '',
  hire_date: '',
  base: '',
  site: '',
  region: '',
  oilfield: '',
};

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function clean(value?: string | null) {
  const trimmed = (value || '').trim();
  return trimmed || null;
}

function isAdminUser(profile: Profile) {
  const role = normalize(profile.role);
  return role === 'admin' || role === 'superadmin' || role === 'super_admin';
}

function isActive(profile: Profile) {
  const status = normalize(profile.status);
  return !status || status === 'active' || status === 'activo';
}

function getDisplayStatus(profile: Profile) {
  return profile.status || 'active';
}

function getFullName(profile: Profile) {
  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Sin nombre'
  );
}

function getInitials(profile: Profile) {
  const source = getFullName(profile);
  return source.trim().charAt(0).toUpperCase();
}

function getWorkerRole(profile?: Profile | null) {
  return (
    profile?.work_role?.trim() ||
    profile?.job_role?.trim() ||
    profile?.position?.trim() ||
    'Sin rol definido'
  );
}

function isDirectoryOnly(profile: Profile) {
  return Boolean(profile.is_directory_only || String(profile.id || '').startsWith('directory:'));
}

function directoryRowToProfile(row: EmployeeDirectory): Profile {
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
    job_role: row.work_role || row.position,
    work_role: row.work_role,
    position: row.position || row.work_role,
    area: row.area || row.department,
    contractor_company: row.contractor_company,
    employee_code: row.employee_code || row.external_id,
    supervisor: row.supervisor || getRawPayloadString(row.raw_payload, 'supervisor'),
    shift: row.shift || getRawPayloadString(row.raw_payload, 'shift'),
    hire_date: row.hire_date || getRawPayloadString(row.raw_payload, 'hire_date'),
    base: row.base || getRawPayloadString(row.raw_payload, 'base'),
    site: row.site || getRawPayloadString(row.raw_payload, 'site'),
    region: row.region || getRawPayloadString(row.raw_payload, 'region'),
    oilfield: row.oilfield || getRawPayloadString(row.raw_payload, 'oilfield'),
    custom_fields:
      row.custom_fields ||
      ((row.raw_payload?.custom_fields as Record<string, string> | undefined) ?? null),
    raw_payload: row.raw_payload,
    dni: row.dni,
    phone: row.phone,
    status: row.status || 'preapproved',
    preapproved: true,
    source: row.source || 'csv',
    invited_at: row.invited_at,
    registered_at: row.registered_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_directory_only: true,
  };
}

function getTrainingTitle(training?: TenantTraining | null, assignment?: Assignment | null) {
  return (
    training?.title ||
    training?.training_title ||
    training?.name ||
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
  if (['in_progress', 'started'].includes(status)) return 50;

  return 0;
}

function detectCsvDelimiter(headerLine: string) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvLine(line: string, delimiter = ',') {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string) {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function getRawPayloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = payload?.[key];
  return typeof value === 'string' ? value : '';
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getColumnValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

function mapStatus(value: string) {
  const status = normalize(value);

  if (!status) return '';
  if (['activo', 'active', 'habilitado'].includes(status)) return 'active';
  if (['inactivo', 'inactive', 'deshabilitado'].includes(status)) return 'inactive';
  if (['pendiente', 'pending', 'preaprobado', 'preapproved'].includes(status)) return 'preapproved';

  return status;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCsv(text: string): CsvPreviewRow[] {
  const cleanedText = text.replace(/\r/g, '').trim();

  if (!cleanedText) return [];

  const lines = cleanedText.split('\n').filter((line) => line.trim());

  if (lines.length <= 1) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const emailsInCsv = new Set<string>();
  const employeeCodesInCsv = new Set<string>();
  const dnisInCsv = new Set<string>();

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || '';
    });

    const firstName = getColumnValue(row, ['nombre', 'first_name', 'firstname']);
    const lastName = getColumnValue(row, ['apellido', 'last_name', 'lastname']);
    const email = getColumnValue(row, [
      'email',
      'mail',
      'correo',
      'correo_electronico',
    ]).toLowerCase();
    const dni = getColumnValue(row, ['dni', 'documento', 'documento_nacional']);
    const phone = getColumnValue(row, ['telefono', 'phone', 'celular', 'mobile']);
    const workRole = getColumnValue(row, [
      'rol_operativo',
      'work_role',
      'job_role',
      'rol',
    ]);
    const position = getColumnValue(row, ['puesto', 'position', 'cargo']);
    const area = getColumnValue(row, ['area', 'sector', 'departamento', 'department']);
    const employeeCode = getColumnValue(row, ['legajo', 'employee_code', 'codigo_empleado']);
    const contractorCompany = getColumnValue(row, [
      'empresa_contratista',
      'contratista',
      'contractor_company',
      'empresa',
    ]);
    const rawStatus = getColumnValue(row, ['estado', 'status']);
    const status = rawStatus ? mapStatus(rawStatus) : '';
    const supervisor = getColumnValue(row, ['supervisor', 'responsable']);
    const shift = getColumnValue(row, ['turno', 'shift', 'diagrama']);
    const hireDate = getColumnValue(row, ['fecha_ingreso', 'hire_date', 'fecha_de_ingreso']);
    const base = getColumnValue(row, ['base', 'base_operativa']);
    const site = getColumnValue(row, ['sede', 'site']);
    const region = getColumnValue(row, ['region', 'región']);
    const oilfield = getColumnValue(row, ['yacimiento', 'locacion', 'locación', 'oilfield']);
    const customFields = Object.fromEntries(
      Array.from({ length: 5 }, (_, customIndex) => {
        const key = `campo_personalizado_${customIndex + 1}`;
        return [key, getColumnValue(row, [key])];
      }).filter(([, value]) => Boolean(value))
    );

    const fullNameFromCsv = getColumnValue(row, ['nombre_completo', 'full_name']);
    const fullName = fullNameFromCsv || [firstName, lastName].filter(Boolean).join(' ');

    const errors: string[] = [];
    const normalizedEmail = normalize(email);
    const normalizedEmployeeCode = normalize(employeeCode);
    const normalizedDni = normalize(dni);

    if (!email) errors.push('Falta email');
    if (email && !isValidEmail(email)) errors.push('Email inválido');
    if (normalizedEmail && emailsInCsv.has(normalizedEmail)) errors.push('Email duplicado en el CSV');
    if (normalizedEmployeeCode && employeeCodesInCsv.has(normalizedEmployeeCode)) {
      errors.push('Legajo duplicado en el CSV');
    }
    if (normalizedDni && dnisInCsv.has(normalizedDni)) errors.push('DNI duplicado en el CSV');
    if (!fullName) errors.push('Falta nombre');
    if (status && !['active', 'inactive', 'preapproved'].includes(status)) errors.push('Estado inválido');
    if (hireDate && !isValidIsoDate(hireDate)) errors.push('Fecha de ingreso inválida');

    if (normalizedEmail) emailsInCsv.add(normalizedEmail);
    if (normalizedEmployeeCode) employeeCodesInCsv.add(normalizedEmployeeCode);
    if (normalizedDni) dnisInCsv.add(normalizedDni);

    return {
      rowNumber: index + 2,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
      dni,
      phone,
      work_role: workRole,
      position,
      area,
      contractor_company: contractorCompany,
      employee_code: employeeCode,
      supervisor,
      shift,
      hire_date: hireDate,
      base,
      site,
      region,
      oilfield,
      custom_fields: customFields,
      status,
      status_provided: Boolean(rawStatus),
      errors,
      action: errors.length > 0 ? 'conflict' : 'new',
      changes: [],
    };
  });
}

function addProfileToIndex(index: Map<string, Profile[]>, key: string, profile: Profile) {
  if (!key) return;
  const current = index.get(key) || [];
  if (!current.some((item) => item.id === profile.id)) current.push(profile);
  index.set(key, current);
}

function classifyCsvRows(rows: CsvPreviewRow[], users: Profile[]): CsvPreviewRow[] {
  const byEmail = new Map<string, Profile[]>();
  const byEmployeeCode = new Map<string, Profile[]>();
  const byDni = new Map<string, Profile[]>();

  users.forEach((profile) => {
    addProfileToIndex(byEmail, normalize(profile.email), profile);
    addProfileToIndex(byEmployeeCode, normalize(profile.employee_code), profile);
    addProfileToIndex(byDni, normalize(profile.dni), profile);
  });

  const labels: Record<string, string> = {
    first_name: 'Nombre',
    last_name: 'Apellido',
    full_name: 'Nombre completo',
    email: 'Email',
    dni: 'DNI',
    phone: 'Teléfono',
    work_role: 'Rol operativo',
    position: 'Puesto',
    area: 'Área',
    contractor_company: 'Contratista',
    employee_code: 'Legajo',
    supervisor: 'Supervisor',
    shift: 'Turno',
    hire_date: 'Fecha de ingreso',
    base: 'Base',
    site: 'Sede',
    region: 'Región',
    oilfield: 'Yacimiento',
  };

  return rows.map((row) => {
    if (row.errors.length > 0) return { ...row, action: 'conflict' };

    const candidateMap = new Map<string, Profile>();
    const reasons = new Set<string>();
    const employeeCode = normalize(row.employee_code);
    const dni = normalize(row.dni);
    const email = normalize(row.email);

    const addCandidates = (items: Profile[] | undefined, reason: string) => {
      (items || []).forEach((profile) => candidateMap.set(profile.id, profile));
      if (items && items.length > 0) reasons.add(reason);
    };

    if (employeeCode) addCandidates(byEmployeeCode.get(employeeCode), 'legajo');
    if (dni) addCandidates(byDni.get(dni), 'DNI');
    if (email) addCandidates(byEmail.get(email), 'email');

    const candidates = Array.from(candidateMap.values());

    if (candidates.length > 1) {
      return {
        ...row,
        action: 'conflict',
        errors: [...row.errors, 'Legajo, DNI o email corresponden a trabajadores distintos'],
      };
    }

    const existing = candidates[0];
    if (!existing) return { ...row, action: 'new' };

    const currentEmail = normalize(existing.email);
    if (existing.auth_user_id && currentEmail && email && currentEmail !== email) {
      return {
        ...row,
        action: 'conflict',
        matched_user_id: existing.id,
        matched_profile_id: isDirectoryOnly(existing) ? undefined : existing.id,
        matched_directory_id: existing.employee_directory_id,
        match_reason: Array.from(reasons).join(' + '),
        errors: [...row.errors, 'El usuario ya tiene cuenta: el email no se cambia por CSV'],
      };
    }

    const changes: CsvFieldChange[] = [];
    const values: Array<[keyof CsvPreviewRow, string]> = [
      ['first_name', existing.first_name || ''],
      ['last_name', existing.last_name || ''],
      ['full_name', existing.full_name || getFullName(existing)],
      ['dni', existing.dni || ''],
      ['phone', existing.phone || ''],
      ['work_role', existing.work_role || existing.job_role || ''],
      ['position', existing.position || ''],
      ['area', existing.area || ''],
      ['contractor_company', existing.contractor_company || ''],
      ['employee_code', existing.employee_code || ''],
      ['supervisor', existing.supervisor || ''],
      ['shift', existing.shift || ''],
      ['hire_date', existing.hire_date || ''],
      ['base', existing.base || ''],
      ['site', existing.site || ''],
      ['region', existing.region || ''],
      ['oilfield', existing.oilfield || ''],
    ];

    values.forEach(([field, currentValue]) => {
      const nextValue = String(row[field] || '').trim();
      if (nextValue && String(currentValue || '').trim() !== nextValue) {
        changes.push({
          field: String(field),
          label: labels[String(field)] || String(field),
          from: String(currentValue || '').trim(),
          to: nextValue,
        });
      }
    });

    if (currentEmail !== email) {
      changes.push({ field: 'email', label: 'Email', from: existing.email || '', to: row.email });
    }

    if (row.status_provided) {
      const currentStatus = isActive(existing) ? 'active' : normalize(existing.status);
      const nextStatus = row.status === 'inactive' ? 'inactive' : 'active';
      if (currentStatus !== nextStatus) {
        changes.push({ field: 'status', label: 'Estado', from: currentStatus, to: nextStatus });
      }
    }

    return {
      ...row,
      action: changes.length > 0 ? 'update' : 'unchanged',
      changes,
      matched_user_id: existing.id,
      matched_profile_id: isDirectoryOnly(existing) ? undefined : existing.id,
      matched_directory_id: existing.employee_directory_id,
      match_reason: Array.from(reasons).join(' + '),
    };
  });
}

function profileToEditForm(profile: Profile): EditFormState {
  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    dni: profile.dni || '',
    phone: profile.phone || '',
    work_role: profile.work_role || profile.job_role || '',
    position: profile.position || '',
    area: profile.area || '',
    contractor_company: profile.contractor_company || '',
    employee_code: profile.employee_code || '',
    supervisor: profile.supervisor || '',
    shift: profile.shift || '',
    hire_date: profile.hire_date || '',
    base: profile.base || '',
    site: profile.site || '',
    region: profile.region || '',
    oilfield: profile.oilfield || '',
  };
}

function sortByCreatedAtDesc<T extends { created_at?: string | null; assigned_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || a.assigned_at || '').getTime();
    const dateB = new Date(b.created_at || b.assigned_at || '').getTime();
    return dateB - dateA;
  });
}

function downloadCsvTemplate(brandSlug: string) {
  const headers = [
    'nombre',
    'apellido',
    'email',
    'dni',
    'telefono',
    'rol_operativo',
    'area',
    'legajo',
    'empresa_contratista',
    'estado',
    'puesto',
    'supervisor',
    'turno',
    'fecha_ingreso',
    'base',
    'sede',
    'region',
    'yacimiento',
    'campo_personalizado_1',
    'campo_personalizado_2',
    'campo_personalizado_3',
    'campo_personalizado_4',
    'campo_personalizado_5',
  ];

  const exampleRows = [
    [
      'Juan',
      'Perez',
      'juan.perez@empresa.com',
      '30111222',
      '+54 9 11 2233-4455',
      'operador',
      'Operaciones',
      'EMP001',
      'Contratista SA',
      'pending',
      'Operador de campo',
      'Ana López',
      '14x14',
      '2024-01-15',
      'Base Norte',
      'Sede Neuquén',
      'Patagonia Norte',
      'Loma Campana',
      'Diagrama 14x14',
      'CC-100',
      'Cuadrilla A',
      '',
      '',
    ],
  ];

  const csvContent = [headers, ...exampleRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `modelo_carga_trabajadores_${brandSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const brandSlug = getBrandSlug(branding);
  const tenantId = user?.tenant_id;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = useState<Profile[]>([]);
  const [employeeDirectory, setEmployeeDirectory] = useState<EmployeeDirectory[]>([]);
  const [tenantName, setTenantName] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterCriterion, setFilterCriterion] = useState<WorkerFilterKey>('work_role');
  const [filterValue, setFilterValue] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Profile | null>(null);
  const [showEdit, setShowEdit] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const [inviteEmails, setInviteEmails] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[]>([]);
  const [deactivateMissing, setDeactivateMissing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteProgress, setInviteProgress] = useState<{ processed: number; total: number } | null>(null);
  const [invitationResult, setInvitationResult] = useState<InvitationRunResult | null>(null);

  async function loadUsersData(options?: { silent?: boolean }) {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    if (!options?.silent) setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [usersResult, directoryResult, assignmentsResult, tenantTrainingsResult, tenantResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('employee_directory').select('*').eq('tenant_id', tenantId),
        supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
        supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
        supabase.from('tenants').select('id, name').eq('id', tenantId).maybeSingle(),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (directoryResult.error) throw directoryResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;

      const directoryRows = (directoryResult.data ?? []) as EmployeeDirectory[];

      const rawProfiles = ((usersResult.data ?? []) as Profile[]).filter((profile) => !isAdminUser(profile));
      const profileById = new Map(rawProfiles.map((profile) => [profile.id, profile]));
      const directoryByProfileId = new Map<string, EmployeeDirectory>();
      const directoryByEmail = new Map<string, EmployeeDirectory>();

      directoryRows.forEach((row) => {
        if (row.profile_id) directoryByProfileId.set(row.profile_id, row);
        if (row.email) directoryByEmail.set(normalize(row.email), row);
      });

      const enhancedProfiles = rawProfiles.map((profile) => {
        const directoryRow =
          directoryByProfileId.get(profile.id) ||
          (profile.email ? directoryByEmail.get(normalize(profile.email)) : undefined);

        if (!directoryRow) return profile;

        return {
          ...profile,
          employee_directory_id: directoryRow.id,
          first_name: profile.first_name || directoryRow.first_name,
          last_name: profile.last_name || directoryRow.last_name,
          full_name:
            profile.full_name ||
            directoryRow.full_name ||
            [directoryRow.first_name, directoryRow.last_name].filter(Boolean).join(' '),
          dni: profile.dni || directoryRow.dni,
          phone: profile.phone || directoryRow.phone,
          job_role: profile.job_role || profile.work_role || directoryRow.work_role || directoryRow.position,
          work_role: profile.work_role || directoryRow.work_role,
          position: profile.position || directoryRow.position || directoryRow.work_role,
          area: profile.area || directoryRow.area || directoryRow.department,
          contractor_company: profile.contractor_company || directoryRow.contractor_company,
          employee_code: profile.employee_code || directoryRow.employee_code || directoryRow.external_id,
          supervisor: profile.supervisor || directoryRow.supervisor || getRawPayloadString(directoryRow.raw_payload, 'supervisor'),
          shift: profile.shift || directoryRow.shift || getRawPayloadString(directoryRow.raw_payload, 'shift'),
          hire_date: profile.hire_date || directoryRow.hire_date || getRawPayloadString(directoryRow.raw_payload, 'hire_date'),
          base: profile.base || directoryRow.base || getRawPayloadString(directoryRow.raw_payload, 'base'),
          site: profile.site || directoryRow.site || getRawPayloadString(directoryRow.raw_payload, 'site'),
          region: profile.region || directoryRow.region || getRawPayloadString(directoryRow.raw_payload, 'region'),
          oilfield: profile.oilfield || directoryRow.oilfield || getRawPayloadString(directoryRow.raw_payload, 'oilfield'),
          custom_fields:
            profile.custom_fields ||
            directoryRow.custom_fields ||
            ((directoryRow.raw_payload?.custom_fields as Record<string, string> | undefined) ?? null),
          raw_payload: directoryRow.raw_payload,
          preapproved: profile.preapproved ?? true,
          source: profile.source || directoryRow.source,
          directory_status: directoryRow.status,
          invited_at: profile.invited_at || directoryRow.invited_at,
          registered_at: profile.registered_at || directoryRow.registered_at,
        };
      });

      const registeredDirectoryIds = new Set(
        enhancedProfiles
          .map((profile) => profile.employee_directory_id)
          .filter(Boolean)
      );

      const directoryOnlyProfiles = directoryRows
        .filter((row) => !row.profile_id || !profileById.has(row.profile_id))
        .filter((row) => !registeredDirectoryIds.has(row.id))
        .map(directoryRowToProfile);

      const loadedUsers = [...enhancedProfiles, ...directoryOnlyProfiles]
        .sort((a, b) => getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase()));

      const loadedTenantTrainings = (tenantTrainingsResult.data ?? []) as TenantTraining[];
      const loadedAssignmentsRaw = (assignmentsResult.data ?? []) as Assignment[];

      const trainingsByAnyId = new Map<string, TenantTraining>();

      loadedTenantTrainings.forEach((training) => {
        if (training.id) trainingsByAnyId.set(training.id, training);
        if (training.training_id) trainingsByAnyId.set(training.training_id, training);
      });

      const loadedAssignments = loadedAssignmentsRaw.map((assignment) => {
        const trainingKey =
          assignment.tenant_training_id ||
          assignment.training_id ||
          assignment.training_key ||
          assignment.training_slug;

        return {
          ...assignment,
          training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
        };
      });

      setEmployeeDirectory(directoryRows);
      setTenantName(tenantResult.data?.name || '');
      setUsers(loadedUsers);
      setAssignments(sortByCreatedAtDesc(loadedAssignments));
      setTenantTrainings(loadedTenantTrainings);
    } catch (error) {
      console.error('Error loading users:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los usuarios desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsersData();
  }, [tenantId]);

  const filterOptions = useMemo(
    () => getWorkerFilterOptions(users, filterCriterion),
    [users, filterCriterion]
  );

  const detectedRoleCount = useMemo(
    () => getWorkerFilterOptions(users, 'work_role').length,
    [users]
  );

  const activeFilterDefinition = getWorkerFilterDefinition(filterCriterion);

  const filtered = useMemo(() => {
    return users.filter((profile) => {
      const profileStatus = normalize(profile.status || 'active');
      const normalizedStatus = profileStatus === 'activo' ? 'active' : profileStatus;

      const matchesStatus =
        statusFilter === 'all' ||
        normalizedStatus === statusFilter ||
        (statusFilter === 'active' && isActive(profile));

      const matchesCriterion = matchesWorkerFilter(
        profile,
        filterCriterion,
        filterValue === 'all' ? [] : [filterValue]
      );

      return matchesStatus && matchesCriterion && workerMatchesSearch(profile, search);
    });
  }, [users, search, statusFilter, filterCriterion, filterValue]);

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'all' || filterValue !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setFilterValue('all');
  }

  const activeCount = users.filter(isActive).length;
  const inactiveCount = users.filter((profile) => normalize(profile.status) === 'inactive').length;
  const pendingCount = users.filter((profile) => normalize(profile.status) === 'pending').length;

  const bulkInvitationRows = useMemo(
    () =>
      employeeDirectory.filter((row) => {
        const status = normalize(row.status);

        return (
          Boolean(row.email) &&
          !row.profile_id &&
          ['preapproved', 'pending', 'active'].includes(status)
        );
      }),
    [employeeDirectory]
  );

  const alreadyInvitedCount = useMemo(
    () =>
      employeeDirectory.filter(
        (row) => !row.profile_id && normalize(row.status) === 'invited'
      ).length,
    [employeeDirectory]
  );

  const registeredDirectoryCount = useMemo(
    () => employeeDirectory.filter((row) => Boolean(row.profile_id)).length,
    [employeeDirectory]
  );

  const inactiveDirectoryCount = useMemo(
    () =>
      employeeDirectory.filter(
        (row) => !row.profile_id && normalize(row.status) === 'inactive'
      ).length,
    [employeeDirectory]
  );

  const assignmentsByUser = useMemo(() => {
    return assignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      if (!assignment.user_id) return acc;

      acc[assignment.user_id] = acc[assignment.user_id] ?? [];
      acc[assignment.user_id].push(assignment);

      return acc;
    }, {});
  }, [assignments]);

  function exportRosterCsv() {
    const headers = [
      'nombre',
      'apellido',
      'email',
      'dni',
      'telefono',
      'rol_operativo',
      'area',
      'legajo',
      'empresa_contratista',
      'estado',
      'puesto',
      'supervisor',
      'turno',
      'fecha_ingreso',
      'base',
      'sede',
      'region',
      'yacimiento',
      'campo_personalizado_1',
      'campo_personalizado_2',
      'campo_personalizado_3',
      'campo_personalizado_4',
      'campo_personalizado_5',
    ];

    const rows = users.map((profile) => {
      const customFields =
        profile.custom_fields ||
        ((profile.raw_payload?.custom_fields as Record<string, string> | undefined) ?? {});

      const rosterStatus =
        normalize(profile.status) === 'inactive' || normalize(profile.directory_status) === 'inactive'
          ? 'inactive'
          : 'active';

      return [
        profile.first_name || '',
        profile.last_name || '',
        profile.email || '',
        profile.dni || '',
        profile.phone || '',
        profile.work_role || profile.job_role || '',
        profile.area || '',
        profile.employee_code || '',
        profile.contractor_company || '',
        rosterStatus,
        profile.position || '',
        profile.supervisor || '',
        profile.shift || '',
        profile.hire_date || '',
        profile.base || '',
        profile.site || '',
        profile.region || '',
        profile.oilfield || '',
        customFields.campo_personalizado_1 || '',
        customFields.campo_personalizado_2 || '',
        customFields.campo_personalizado_3 || '',
        customFields.campo_personalizado_4 || '',
        customFields.campo_personalizado_5 || '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTenantName = (tenantName || 'empresa')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `nomina_${brandSlug}_${safeTenantName || 'empresa'}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function toggleStatus(profile: Profile) {
    if (!profile.id || !tenantId) return;

    const currentIsActive = isActive(profile);
    const nextStatus = currentIsActive ? 'inactive' : 'active';

    setErrorMessage(null);
    setSuccessMessage(null);

    const previousUsers = users;

    setUsers((currentUsers) =>
      currentUsers.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              status: nextStatus,
              preapproved: nextStatus === 'active' ? true : item.preapproved,
            }
          : item
      )
    );

    try {
      if (isDirectoryOnly(profile)) {
        const directoryId = profile.employee_directory_id || String(profile.id).replace('directory:', '');
        const { error } = await supabase
          .from('employee_directory')
          .update({ status: nextStatus })
          .eq('id', directoryId)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        setSuccessMessage(
          nextStatus === 'active'
            ? 'Trabajador activado en la nómina. Cuando se registre, quedará validado automáticamente.'
            : 'Trabajador desactivado en la nómina.'
        );
        return;
      }

      const response = await fetch('/.netlify/functions/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: profile.id,
          tenantId,
          status: nextStatus,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || 'No pudimos actualizar el usuario.');
      }

      if (result?.profile) {
        setUsers((currentUsers) =>
          currentUsers.map((item) =>
            item.id === profile.id
              ? {
                  ...item,
                  ...result.profile,
                }
              : item
          )
        );
      }

      setSuccessMessage(
        nextStatus === 'active'
          ? result?.email_sent
            ? 'Usuario activado correctamente. Se envió el mail de aprobación.'
            : 'Usuario activado correctamente, pero no se pudo confirmar el envío del mail.'
          : 'Usuario desactivado correctamente.'
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      setUsers(previousUsers);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar el usuario.'
      );
    }
  }

  async function callRosterSync(body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Tu sesión venció. Volvé a ingresar antes de modificar la nómina.');
    }

    const response = await fetch('/.netlify/functions/sync-worker-roster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || 'No pudimos actualizar la nómina.');
    }

    return result;
  }

  function openEditWorker(profile: Profile) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditForm(profileToEditForm(profile));
    setShowEdit(profile);
  }

  async function handleSaveEdit() {
    if (!tenantId || !showEdit) return;

    const fullName =
      [editForm.first_name.trim(), editForm.last_name.trim()].filter(Boolean).join(' ') ||
      getFullName(showEdit);

    if (!fullName) {
      setErrorMessage('El trabajador debe tener nombre.');
      return;
    }

    if (editForm.hire_date && !isValidIsoDate(editForm.hire_date)) {
      setErrorMessage('La fecha de ingreso debe tener formato AAAA-MM-DD.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await callRosterSync({
        mode: 'single',
        tenantId,
        worker: {
          profileId: isDirectoryOnly(showEdit) ? null : showEdit.id,
          directoryId:
            showEdit.employee_directory_id ||
            (isDirectoryOnly(showEdit) ? String(showEdit.id).replace('directory:', '') : null),
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          full_name: fullName,
          email: showEdit.email,
          dni: editForm.dni,
          phone: editForm.phone,
          work_role: editForm.work_role,
          position: editForm.position,
          area: editForm.area,
          contractor_company: editForm.contractor_company,
          employee_code: editForm.employee_code,
          supervisor: editForm.supervisor,
          shift: editForm.shift,
          hire_date: editForm.hire_date,
          base: editForm.base,
          site: editForm.site,
          region: editForm.region,
          oilfield: editForm.oilfield,
          status_provided: false,
        },
      });

      setShowEdit(null);
      setEditForm(emptyEditForm);
      await loadUsersData({ silent: true });
      setSuccessMessage('Datos del trabajador actualizados correctamente.');
    } catch (error) {
      console.error('Error editing worker:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el trabajador.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para crear el usuario.');
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage('El email es obligatorio.');
      return;
    }

    const fullName =
      form.full_name.trim() || [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ');

    if (!fullName) {
      setErrorMessage('El nombre es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = form.email.trim().toLowerCase();

      if (!isValidEmail(cleanEmail)) {
        throw new Error('El email no tiene un formato válido.');
      }

      const existing = users.find((profile) => normalize(profile.email) === cleanEmail);

      if (existing) {
        throw new Error('Ya existe un usuario con ese email en esta empresa.');
      }

      const cleanWorkRole = clean(form.work_role) || clean(form.position);
      const cleanPosition = clean(form.position) || cleanWorkRole;

      const newDirectoryEntry = {
        tenant_id: tenantId,
        source: 'manual',
        external_id: clean(form.employee_code),
        first_name: clean(form.first_name),
        last_name: clean(form.last_name),
        full_name: fullName,
        email: cleanEmail,
        dni: clean(form.dni),
        phone: clean(form.phone),
        work_role: cleanWorkRole,
        position: cleanPosition,
        area: clean(form.area),
        contractor_company: clean(form.contractor_company),
        employee_code: clean(form.employee_code),
        status: form.status === 'inactive' ? 'inactive' : 'preapproved',
        raw_payload: { source: 'admin_manual_create' },
      };

      const { data, error } = await supabase
        .from('employee_directory')
        .insert(newDirectoryEntry)
        .select('*')
        .single();

      if (error) throw error;

      // Un alta manual sólo incorpora a la persona a employee_directory.
      // El Profile real se crea/reutiliza recién cuando el trabajador completa el registro.
      const newProfile = directoryRowToProfile(data as EmployeeDirectory);

      setEmployeeDirectory((currentRows) => [...currentRows, data as EmployeeDirectory]);
      setUsers((currentUsers) =>
        [...currentUsers, newProfile].sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );

      setForm(emptyForm);
      setShowCreate(false);
      setSuccessMessage('Trabajador agregado a la nómina y preaprobado correctamente.');
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo crear el usuario en Supabase.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendInvitationBatches({
    emails,
    allowResend,
    onProgress,
  }: {
    emails: string[];
    allowResend: boolean;
    onProgress?: (processed: number, total: number) => void;
  }): Promise<InvitationRunResult> {
    if (!tenantId) {
      throw new Error('No se encontró tenant_id para enviar invitaciones.');
    }

    const uniqueEmails = Array.from(
      new Set(emails.map((email) => normalize(email)).filter(Boolean))
    );
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Tu sesión venció. Volvé a ingresar antes de enviar invitaciones.');
    }

    const requestId = crypto.randomUUID();
    const batches: string[][] = [];

    for (let index = 0; index < uniqueEmails.length; index += 100) {
      batches.push(uniqueEmails.slice(index, index + 100));
    }

    const results: InvitationRecipientResult[] = [];
    let processed = 0;
    let fatalError: string | null = null;
    let trackingWarning: string | null = null;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const response = await fetch('/.netlify/functions/send-employee-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId,
          emails: batch,
          allowResend,
          requestId,
          batchIndex,
        }),
      });

      const result = await response.json().catch(() => null);
      const returnedResults = Array.isArray(result?.results)
        ? (result.results as InvitationRecipientResult[])
        : [];

      if (returnedResults.length > 0) {
        results.push(...returnedResults);
      } else if (!response.ok) {
        const message = result?.error || 'No pudimos enviar este lote de invitaciones.';
        results.push(
          ...batch.map((email) => ({
            email,
            status: 'failed' as const,
            message,
          }))
        );
      }

      processed += batch.length;
      onProgress?.(processed, uniqueEmails.length);

      if (result?.trackingWarning && !trackingWarning) {
        trackingWarning = String(result.trackingWarning);
      }

      if (!response.ok) {
        fatalError = result?.error || 'El envío se interrumpió por un error del proveedor.';

        const remainingEmails = batches
          .slice(batchIndex + 1)
          .flat();

        results.push(
          ...remainingEmails.map((email) => ({
            email,
            status: 'not_processed' as const,
            message: 'No se intentó enviar porque un lote anterior terminó con error.',
          }))
        );
        break;
      }
    }

    const accepted = results.filter((item) => item.status === 'accepted').length;
    const failed = results.filter((item) => item.status === 'failed').length;
    const skipped = results.filter((item) => item.status === 'skipped').length;
    const notProcessed = results.filter((item) => item.status === 'not_processed').length;

    return {
      total: uniqueEmails.length,
      accepted,
      failed,
      skipped,
      notProcessed,
      results,
      fatalError,
      trackingWarning,
    };
  }

  function resetInvitationModal() {
    setInvitationResult(null);
    setInviteProgress(null);
    setErrorMessage(null);
  }

  function getInvitationStatusLabel(result: InvitationRecipientResult) {
    if (result.status === 'accepted') return 'Aceptado para envío';
    if (result.status === 'failed') return 'Error';
    if (result.status === 'not_processed') return 'No procesado';

    const labels: Record<string, string> = {
      registered: 'Omitido: ya registrado',
      inactive: 'Omitido: inactivo',
      already_invited: 'Omitido: ya invitado',
      not_found: 'Omitido: no encontrado',
      not_eligible: 'Omitido: no habilitado',
    };

    return labels[result.reason || ''] || 'Omitido';
  }

  function InvitationResultsPanel({ result }: { result: InvitationRunResult }) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <div className="text-xl font-bold text-emerald-300">{result.accepted}</div>
            <div className="text-xs text-emerald-100/70">aceptados</div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <div className="text-xl font-bold text-red-300">{result.failed}</div>
            <div className="text-xs text-red-100/70">con error</div>
          </div>
          <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
            <div className="text-xl font-bold text-steel-200">{result.skipped}</div>
            <div className="text-xs text-steel-500">omitidos</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="text-xl font-bold text-amber-300">{result.notProcessed}</div>
            <div className="text-xs text-amber-100/70">no procesados</div>
          </div>
        </div>

        <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3 text-xs text-steel-400">
          “Aceptado” significa que el proveedor creó el email para su envío. No confirma todavía que haya llegado a la bandeja del destinatario.
        </div>

        {result.fatalError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {result.fatalError}
          </div>
        )}

        {result.trackingWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {result.trackingWarning}
          </div>
        )}

        <div className="max-h-80 overflow-auto rounded-xl border border-steel-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-steel-900 text-steel-400">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-700/70">
              {result.results.map((item, index) => (
                <tr key={`${item.email}-${index}`} className="bg-steel-800/70">
                  <td className="px-3 py-2 align-top text-steel-200 break-all">{item.email}</td>
                  <td className="px-3 py-2 align-top">
                    <div
                      className={`font-medium ${
                        item.status === 'accepted'
                          ? 'text-emerald-300'
                          : item.status === 'failed'
                            ? 'text-red-300'
                            : item.status === 'not_processed'
                              ? 'text-amber-300'
                              : 'text-steel-300'
                      }`}
                    >
                      {getInvitationStatusLabel(item)}
                    </div>
                    {item.message && (
                      <div className="mt-1 text-steel-500 leading-4">{item.message}</div>
                    )}
                    {item.providerId && (
                      <div className="mt-1 font-mono text-[10px] text-steel-600">
                        ID: {item.providerId}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  async function handleInviteUsers() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para invitar usuarios.');
      return;
    }

    const emails: string[] = inviteEmails
      .split('\n')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const uniqueEmails: string[] = Array.from(new Set<string>(emails));

    if (uniqueEmails.length === 0) {
      setErrorMessage('Ingresá al menos un email.');
      return;
    }

    const invalidEmails = uniqueEmails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      setErrorMessage(`Hay ${invalidEmails.length} email(s) inválido(s). Revisalos antes de enviar.`);
      return;
    }

    setSaving(true);
    setInvitationResult(null);
    setInviteProgress({ processed: 0, total: uniqueEmails.length });
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const existingEmails = new Set<string>(users.map((profile) => normalize(profile.email)));
      const now = new Date().toISOString();

      const newDirectoryRows = uniqueEmails
        .filter((email) => !existingEmails.has(email))
        .map((email) => ({
          tenant_id: tenantId,
          source: 'manual',
          email,
          full_name: email.split('@')[0],
          status: 'preapproved',
          raw_payload: { source: 'admin_email_invite' },
          created_at: now,
          updated_at: now,
        }));

      if (newDirectoryRows.length > 0) {
        const { data, error } = await supabase
          .from('employee_directory')
          .insert(newDirectoryRows)
          .select('*');

        if (error) throw error;

        const createdRows = (data ?? []) as EmployeeDirectory[];
        setEmployeeDirectory((currentRows) => [...currentRows, ...createdRows]);
        setUsers((currentUsers) =>
          [...currentUsers, ...createdRows.map(directoryRowToProfile)].sort((a, b) =>
            getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
          )
        );
      }

      const result = await sendInvitationBatches({
        emails: uniqueEmails,
        allowResend: true,
        onProgress: (processed, total) => setInviteProgress({ processed, total }),
      });

      setInvitationResult(result);
      await loadUsersData({ silent: true });
    } catch (error) {
      console.error('Error inviting users:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar/enviar las invitaciones.'
      );
    } finally {
      setSaving(false);
      setInviteProgress(null);
    }
  }

  async function handleSendPendingInvitations() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para enviar invitaciones.');
      return;
    }

    const emails = bulkInvitationRows
      .map((row) => normalize(row.email))
      .filter(Boolean);

    if (emails.length === 0) {
      setInvitationResult({
        total: 0,
        accepted: 0,
        failed: 0,
        skipped: 0,
        notProcessed: 0,
        results: [],
        fatalError: null,
        trackingWarning: null,
      });
      return;
    }

    setSaving(true);
    setInvitationResult(null);
    setInviteProgress({ processed: 0, total: emails.length });
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await sendInvitationBatches({
        emails,
        allowResend: false,
        onProgress: (processed, total) => setInviteProgress({ processed, total }),
      });

      setInvitationResult(result);
      await loadUsersData({ silent: true });
    } catch (error) {
      console.error('Error sending pending invitations:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron enviar invitaciones.');
    } finally {
      setSaving(false);
      setInviteProgress(null);
    }
  }

  async function handleCsvFile(file: File) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const parsedRows = classifyCsvRows(parseCsv(text), users);

      if (parsedRows.length === 0) {
        throw new Error('El CSV no tiene filas válidas o está vacío.');
      }

      setDeactivateMissing(false);
      setCsvRows(parsedRows);
      setShowCsvModal(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo leer el archivo CSV.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function syncCsvRows() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para actualizar la nómina.');
      return;
    }

    const validRows = csvRows.filter((row) => row.errors.length === 0 && row.action !== 'conflict');
    const invalidRows = csvRows.filter((row) => row.errors.length > 0 || row.action === 'conflict');

    if (validRows.length === 0) {
      setErrorMessage('No hay filas válidas para procesar.');
      return;
    }

    if (deactivateMissing && invalidRows.length > 0) {
      setErrorMessage(
        'Para renovar la nómina completa primero resolvé todos los errores o conflictos del archivo. No se desactivará a nadie mientras existan filas dudosas.'
      );
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await callRosterSync({
        mode: 'roster',
        tenantId,
        deactivateMissing,
        rows: validRows.map((row) => ({
          rowNumber: row.rowNumber,
          first_name: row.first_name,
          last_name: row.last_name,
          full_name: row.full_name,
          email: row.email,
          dni: row.dni,
          phone: row.phone,
          work_role: row.work_role,
          position: row.position,
          area: row.area,
          contractor_company: row.contractor_company,
          employee_code: row.employee_code,
          supervisor: row.supervisor,
          shift: row.shift,
          hire_date: row.hire_date,
          base: row.base,
          site: row.site,
          region: row.region,
          oilfield: row.oilfield,
          custom_fields: row.custom_fields,
          status: row.status,
          status_provided: row.status_provided,
        })),
      });

      const summary = result?.summary || {};
      setCsvRows([]);
      setDeactivateMissing(false);
      setShowCsvModal(false);
      await loadUsersData({ silent: true });
      setSuccessMessage(
        `Nómina actualizada: ${summary.created || 0} nuevos, ${summary.updated || 0} modificados, ${summary.unchanged || 0} sin cambios${
          deactivateMissing ? `, ${summary.deactivated || 0} desactivados` : ''
        }.`
      );
    } catch (error) {
      console.error('Error syncing roster:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar la nómina.');
    } finally {
      setSaving(false);
    }
  }

  const detailAssignments = showDetail ? assignmentsByUser[showDetail.id] ?? [] : [];
  const newCsvRows = csvRows.filter((row) => row.action === 'new' && row.errors.length === 0);
  const updatedCsvRows = csvRows.filter((row) => row.action === 'update' && row.errors.length === 0);
  const unchangedCsvRows = csvRows.filter((row) => row.action === 'unchanged' && row.errors.length === 0);
  const invalidCsvRows = csvRows.filter((row) => row.action === 'conflict' || row.errors.length > 0);
  const validCsvRows = csvRows.filter((row) => row.action !== 'conflict' && row.errors.length === 0);
  const matchedCsvUserIds = new Set(
    csvRows.map((row) => row.matched_user_id).filter((value): value is string => Boolean(value))
  );
  const missingCsvUsers = csvRows.length > 0
    ? users.filter((profile) => normalize(profile.status) !== 'inactive' && !matchedCsvUserIds.has(profile.id))
    : [];
  const csvChangesToApply =
    newCsvRows.length + updatedCsvRows.length + (deactivateMissing ? missingCsvUsers.length : 0);


  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando usuarios...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo trabajadores reales desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && users.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />
          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar los usuarios</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>
            <button onClick={() => loadUsersData()} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleCsvFile(file);
        }}
      />

      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.5fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(150px,0.65fr)] gap-3 items-end">
          <label className="block">
            <span className="block text-xs font-semibold text-steel-300 mb-1.5">Buscar trabajadores</span>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-10 w-full"
                placeholder="Escribí nombre, apellido, DNI, email o legajo..."
              />
            </div>
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-steel-300 mb-1.5">
              <SlidersHorizontal size={13} />
              Filtrar por
            </span>
            <select
              value={filterCriterion}
              onChange={(event) => {
                setFilterCriterion(event.target.value as WorkerFilterKey);
                setFilterValue('all');
              }}
              className="select w-full"
            >
              {WORKER_FILTER_DEFINITIONS.map((definition) => (
                <option key={definition.key} value={definition.key}>
                  {definition.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-steel-300 mb-1.5">
              {activeFilterDefinition.label}
            </span>
            <select
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              className="select w-full"
            >
              <option value="all">Todos ({users.length})</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-steel-300 mb-1.5">Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="select w-full"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="pending">Pendientes</option>
              <option value="preapproved">Preaprobados</option>
              <option value="invited">Invitados</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between pt-3 border-t border-steel-700/70">
          <div className="flex items-center gap-2 min-h-9">
            <span className="text-xs text-steel-400">
              Mostrando <span className="font-semibold text-steel-200">{filtered.length}</span> de {users.length} trabajadores
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-steel-300 hover:text-white transition-colors"
              >
                <X size={13} />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button onClick={() => loadUsersData()} className="btn-secondary text-xs">
              <RefreshCw size={14} />
              Actualizar
            </button>

            <button
              onClick={() => {
                setCsvRows([]);
                setDeactivateMissing(false);
                setShowCsvModal(true);
              }}
              className="btn-secondary text-xs"
            >
              <Upload size={14} />
              Cargar / actualizar nómina
            </button>

            <button onClick={exportRosterCsv} className="btn-secondary text-xs">
              <Download size={14} />
              Exportar nómina
            </button>

            <button
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                resetInvitationModal();
                setShowBulkInvite(true);
              }}
              disabled={saving}
              className="btn-secondary text-xs"
            >
              <Mail size={14} />
              Enviar invitaciones{bulkInvitationRows.length > 0 ? ` (${bulkInvitationRows.length})` : ''}
            </button>

            <button
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                resetInvitationModal();
                setShowInvite(true);
              }}
              className="btn-secondary text-xs"
            >
              <Mail size={14} />
              Invitar emails puntuales
            </button>

            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              <Plus size={16} />
              Nuevo usuario
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <Users size={13} className="text-steel-400" />
          <span className="text-xs text-steel-300">{users.length} total</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <span className="text-xs text-emerald-400">{activeCount} activos</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <span className="text-xs text-amber-400">{pendingCount} pendientes</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <span className="text-xs text-steel-400">{inactiveCount} inactivos</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <span className="text-xs text-steel-400">
            {detectedRoleCount} roles detectados
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <span className="text-xs text-steel-400">
            {tenantTrainings.length} trainings habilitados
          </span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-steel-900 border-b border-steel-700">
                <th className="table-header">Nombre</th>
                <th className="table-header hidden md:table-cell">Rol operativo</th>
                <th className="table-header hidden xl:table-cell">Puesto</th>
                <th className="table-header hidden lg:table-cell">Área</th>
                <th className="table-header hidden lg:table-cell">Legajo</th>
                <th className="table-header hidden xl:table-cell">DNI</th>
                <th className="table-header hidden xl:table-cell">Asignaciones</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((profile) => {
                const userAssignments = assignmentsByUser[profile.id] ?? [];
                const completedAssignments = userAssignments.filter((assignment) =>
                  ['completed', 'passed', 'certificate_issued', 'approved'].includes(
                    normalize(assignment.status)
                  )
                ).length;

                return (
                  <tr key={profile.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-petroleum-700 rounded-full flex items-center justify-center text-sm font-bold text-petroleum-200 flex-shrink-0">
                          {getInitials(profile)}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-steel-100 truncate">
                            {getFullName(profile)}
                          </div>
                          <div className="text-xs text-steel-400 truncate">
                            {profile.email || 'Sin email'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="table-cell hidden md:table-cell text-steel-300">
                      {getWorkerRole(profile)}
                    </td>

                    <td className="table-cell hidden xl:table-cell text-steel-300">
                      {profile.position || '—'}
                    </td>

                    <td className="table-cell hidden lg:table-cell text-steel-300">
                      {profile.area || '—'}
                    </td>

                    <td className="table-cell hidden lg:table-cell font-mono text-xs text-steel-400">
                      {profile.employee_code || '—'}
                    </td>

                    <td className="table-cell hidden xl:table-cell font-mono text-xs text-steel-400">
                      {profile.dni || '—'}
                    </td>

                    <td className="table-cell hidden xl:table-cell text-steel-300">
                      <div className="text-sm">
                        {completedAssignments}/{userAssignments.length}
                      </div>
                      <div className="text-xs text-steel-500">completadas</div>
                    </td>

                    <td className="table-cell">
                      <div className="space-y-1">
                        <StatusBadge status={getDisplayStatus(profile)} />
                        {(profile.preapproved || isDirectoryOnly(profile)) && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={10} />
                            preaprobado
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="table-cell text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setShowDetail(profile)}
                          className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-steel-100 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => openEditWorker(profile)}
                          className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-amber-300 transition-colors"
                          title="Editar trabajador"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() => toggleStatus(profile)}
                          className="p-1.5 rounded hover:bg-steel-700 transition-colors"
                          title={isActive(profile) ? 'Desactivar' : 'Activar'}
                        >
                          {isActive(profile) ? (
                            <ToggleRight size={16} className="text-emerald-400" />
                          ) : (
                            <ToggleLeft size={16} className="text-steel-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-steel-500">
            <Users size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No se encontraron usuarios.</p>
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo usuario / trabajador"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.email.trim()}
              className="btn-primary"
            >
              <Plus size={15} />
              {saving ? 'Creando...' : 'Crear trabajador'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Esto agrega el trabajador a la nómina preaprobada. Cuando se registre con este email, {branding.brandName} lo validará automáticamente contra employee_directory.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <input
                value={form.first_name}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, first_name: event.target.value }))
                }
                className="input"
                placeholder="Juan"
              />
            </div>

            <div>
              <label className="label">Apellido</label>
              <input
                value={form.last_name}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, last_name: event.target.value }))
                }
                className="input"
                placeholder="Pérez"
              />
            </div>
          </div>

          <div>
            <label className="label">Nombre completo</label>
            <input
              value={form.full_name}
              onChange={(event) =>
                setForm((currentForm) => ({ ...currentForm, full_name: event.target.value }))
              }
              className="input"
              placeholder="Opcional si cargás nombre y apellido"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, email: event.target.value }))
                }
                className="input"
                placeholder="juan@empresa.com"
              />
            </div>

            <div>
              <label className="label">Estado</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, status: event.target.value }))
                }
                className="select"
              >
                <option value="pending">Pendiente</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">DNI</label>
              <input
                value={form.dni}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, dni: event.target.value }))
                }
                className="input"
                placeholder="30111222"
              />
            </div>

            <div>
              <label className="label">Teléfono</label>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, phone: event.target.value }))
                }
                className="input"
                placeholder="+54 9 11..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Rol operativo</label>
              <input
                value={form.work_role}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, work_role: event.target.value }))
                }
                className="input"
                placeholder="Ej: operador, supervisor, hse"
              />
            </div>

            <div>
              <label className="label">Puesto</label>
              <input
                value={form.position}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, position: event.target.value }))
                }
                className="input"
                placeholder="Ej: Operador de campo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Área</label>
              <input
                value={form.area}
                onChange={(event) =>
                  setForm((currentForm) => ({ ...currentForm, area: event.target.value }))
                }
                className="input"
                placeholder="Ej: Operaciones"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa contratista</label>
              <input
                value={form.contractor_company}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    contractor_company: event.target.value,
                  }))
                }
                className="input"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="label">Legajo</label>
              <input
                value={form.employee_code}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    employee_code: event.target.value,
                  }))
                }
                className="input"
                placeholder="EMP001"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!showEdit}
        onClose={() => {
          if (!saving) {
            setShowEdit(null);
            setEditForm(emptyEditForm);
          }
        }}
        title={showEdit ? `Editar trabajador · ${getFullName(showEdit)}` : 'Editar trabajador'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowEdit(null);
                setEditForm(emptyEditForm);
              }}
              disabled={saving}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button onClick={handleSaveEdit} disabled={saving || !showEdit} className="btn-primary">
              <Pencil size={15} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        {showEdit && (
          <div className="space-y-5">
            <div className="rounded-xl border border-steel-700 bg-steel-900 p-4">
              <div className="text-sm font-semibold text-steel-200">Email de acceso</div>
              <div className="mt-1 text-sm text-steel-400 break-all">{showEdit.email || 'Sin email'}</div>
              <p className="mt-2 text-xs text-steel-500">
                El email no se modifica desde este formulario porque puede estar vinculado a la cuenta de acceso.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  value={editForm.first_name}
                  onChange={(event) => setEditForm((current) => ({ ...current, first_name: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input
                  value={editForm.last_name}
                  onChange={(event) => setEditForm((current) => ({ ...current, last_name: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">DNI</label>
                <input
                  value={editForm.dni}
                  onChange={(event) => setEditForm((current) => ({ ...current, dni: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Rol operativo</label>
                <input
                  value={editForm.work_role}
                  onChange={(event) => setEditForm((current) => ({ ...current, work_role: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Puesto</label>
                <input
                  value={editForm.position}
                  onChange={(event) => setEditForm((current) => ({ ...current, position: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Área</label>
                <input
                  value={editForm.area}
                  onChange={(event) => setEditForm((current) => ({ ...current, area: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Legajo</label>
                <input
                  value={editForm.employee_code}
                  onChange={(event) => setEditForm((current) => ({ ...current, employee_code: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Empresa contratista</label>
                <input
                  value={editForm.contractor_company}
                  onChange={(event) => setEditForm((current) => ({ ...current, contractor_company: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Supervisor</label>
                <input
                  value={editForm.supervisor}
                  onChange={(event) => setEditForm((current) => ({ ...current, supervisor: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Turno</label>
                <input
                  value={editForm.shift}
                  onChange={(event) => setEditForm((current) => ({ ...current, shift: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Fecha de ingreso</label>
                <input
                  type="date"
                  value={editForm.hire_date}
                  onChange={(event) => setEditForm((current) => ({ ...current, hire_date: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Base</label>
                <input
                  value={editForm.base}
                  onChange={(event) => setEditForm((current) => ({ ...current, base: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Sede</label>
                <input
                  value={editForm.site}
                  onChange={(event) => setEditForm((current) => ({ ...current, site: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Región</label>
                <input
                  value={editForm.region}
                  onChange={(event) => setEditForm((current) => ({ ...current, region: event.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Yacimiento</label>
                <input
                  value={editForm.oilfield}
                  onChange={(event) => setEditForm((current) => ({ ...current, oilfield: event.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/80">
              Guardar sincroniza los datos de nómina y perfil sin tocar capacitaciones, progreso, certificados ni firma.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showCsvModal}
        onClose={() => {
          if (!saving) {
            setShowCsvModal(false);
            setCsvRows([]);
            setDeactivateMissing(false);
          }
        }}
        title={csvRows.length > 0 ? 'Previsualizar nómina' : 'Cargar / actualizar nómina'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowCsvModal(false);
                setCsvRows([]);
                setDeactivateMissing(false);
              }}
              disabled={saving}
              className="btn-ghost"
            >
              Cancelar
            </button>

            {csvRows.length > 0 ? (
              <button
                onClick={syncCsvRows}
                disabled={
                  saving ||
                  validCsvRows.length === 0 ||
                  csvChangesToApply === 0 ||
                  (deactivateMissing && invalidCsvRows.length > 0)
                }
                className="btn-primary"
              >
                <Upload size={15} />
                {saving ? 'Actualizando...' : `Aplicar ${csvChangesToApply} cambio(s)`}
              </button>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                <Upload size={15} />
                Seleccionar CSV
              </button>
            )}
          </>
        }
      >
        {csvRows.length === 0 ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-sm font-semibold text-amber-200 mb-1">
                Un mismo archivo para cargar o actualizar
              </div>
              <p className="text-sm text-amber-100/80">
                {branding.brandName} compara el CSV contra la nómina actual. Los nuevos se agregan, los existentes con datos distintos se actualizan y los que no cambiaron se dejan intactos. Nada se modifica hasta que confirmes el preview.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => downloadCsvTemplate(brandSlug)}
                className="rounded-xl border border-steel-700 bg-steel-900 hover:bg-steel-800 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Download size={20} className="text-amber-400" />
                  <div className="text-sm font-semibold text-steel-100">Descargar modelo CSV</div>
                </div>
                <p className="text-xs text-steel-400">
                  Usá la misma estructura para una carga inicial o para una actualización posterior.
                </p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-steel-700 bg-steel-900 hover:bg-steel-800 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Upload size={20} className="text-emerald-400" />
                  <div className="text-sm font-semibold text-steel-100">Seleccionar archivo CSV</div>
                </div>
                <p className="text-xs text-steel-400">
                  Primero se analiza el archivo; después elegís si querés aplicar los cambios.
                </p>
              </button>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-900 p-4">
              <div className="text-sm font-semibold text-steel-200 mb-3">Reglas de actualización</div>
              <div className="space-y-2 text-xs text-steel-400 leading-5">
                <p>• {branding.brandName} identifica trabajadores por legajo, DNI y email.</p>
                <p>• Las celdas vacías no borran datos existentes.</p>
                <p>• El email de una persona que ya tiene cuenta no se modifica por CSV: se marca como conflicto.</p>
                <p>• Si indicás que el archivo es la nómina completa, los trabajadores ausentes pueden marcarse inactivos; nunca se elimina su historial.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="text-xs text-emerald-400">Nuevos</div>
                <div className="text-xl font-bold text-emerald-300">{newCsvRows.length}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="text-xs text-amber-400">Modificados</div>
                <div className="text-xl font-bold text-amber-300">{updatedCsvRows.length}</div>
              </div>
              <div className="bg-steel-900 rounded-lg p-3">
                <div className="text-xs text-steel-500">Sin cambios</div>
                <div className="text-xl font-bold text-steel-100">{unchangedCsvRows.length}</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-xs text-red-400">Conflictos</div>
                <div className="text-xl font-bold text-red-300">{invalidCsvRows.length}</div>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                <div className="text-xs text-sky-300">Filas</div>
                <div className="text-xl font-bold text-sky-200">{csvRows.length}</div>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={deactivateMissing}
                onChange={(event) => setDeactivateMissing(event.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-semibold text-steel-200">
                  Este archivo representa la nómina completa vigente
                </div>
                <p className="mt-1 text-xs text-steel-500 leading-5">
                  Si lo activás, {missingCsvUsers.length} trabajador(es) activos que hoy existen en {branding.brandName} y no aparecen en este archivo serán marcados como inactivos. No se borran cuentas, asignaciones, progreso ni certificados.
                </p>
              </div>
            </label>

            {deactivateMissing && invalidCsvRows.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                No se puede renovar una nómina completa mientras haya conflictos. Corregí el CSV y volvé a cargarlo; así evitamos desactivar personas por error.
              </div>
            )}

            {deactivateMissing && invalidCsvRows.length === 0 && missingCsvUsers.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/80">
                Al confirmar también se desactivarán {missingCsvUsers.length} trabajador(es) ausentes del archivo.
              </div>
            )}

            <div className="rounded-xl border border-steel-700 overflow-hidden max-h-[440px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-steel-900 sticky top-0">
                  <tr>
                    <th className="table-header">Fila</th>
                    <th className="table-header">Resultado</th>
                    <th className="table-header">Trabajador</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Legajo</th>
                    <th className="table-header">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`border-b border-steel-800 ${row.action === 'conflict' ? 'bg-red-500/5' : ''}`}
                    >
                      <td className="table-cell text-steel-500">{row.rowNumber}</td>
                      <td className="table-cell">
                        {row.action === 'new' && (
                          <span className="text-xs font-semibold text-emerald-300">Nuevo</span>
                        )}
                        {row.action === 'update' && (
                          <span className="text-xs font-semibold text-amber-300">Actualizar</span>
                        )}
                        {row.action === 'unchanged' && (
                          <span className="text-xs font-semibold text-steel-400">Sin cambios</span>
                        )}
                        {row.action === 'conflict' && (
                          <span className="text-xs font-semibold text-red-300">Revisar</span>
                        )}
                      </td>
                      <td className="table-cell text-steel-200">{row.full_name || '—'}</td>
                      <td className="table-cell text-steel-300">{row.email || '—'}</td>
                      <td className="table-cell text-steel-300">{row.employee_code || '—'}</td>
                      <td className="table-cell min-w-[260px]">
                        {row.errors.length > 0 ? (
                          <div className="text-xs text-red-400">{row.errors.join(' · ')}</div>
                        ) : row.action === 'update' ? (
                          <div className="space-y-1 text-xs text-steel-400">
                            {row.changes.slice(0, 4).map((change) => (
                              <div key={`${row.rowNumber}-${change.field}`}>
                                <span className="text-steel-300">{change.label}:</span>{' '}
                                <span className="line-through text-steel-500">{change.from || '—'}</span>{' '}
                                → <span className="text-amber-300">{change.to || '—'}</span>
                              </div>
                            ))}
                            {row.changes.length > 4 && (
                              <div className="text-steel-500">+ {row.changes.length - 4} cambio(s) más</div>
                            )}
                          </div>
                        ) : row.action === 'new' ? (
                          <div className="text-xs text-emerald-400/80">Se agregará a la nómina preaprobada.</div>
                        ) : (
                          <div className="text-xs text-steel-500">No se modificará.</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-steel-500 flex items-start gap-2">
                <FileText size={14} className="mt-0.5" />
                <div>
                  Sólo se aplican altas y cambios confirmados. Las filas con conflicto se omiten; si elegís nómina completa, no se permite confirmar hasta resolver todos los conflictos.
                </div>
              </div>

              <button
                onClick={() => {
                  setCsvRows([]);
                  setDeactivateMissing(false);
                  fileInputRef.current?.click();
                }}
                disabled={saving}
                className="btn-secondary text-xs"
              >
                <Upload size={14} />
                Elegir otro archivo
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showBulkInvite}
        onClose={() => {
          if (!saving) {
            setShowBulkInvite(false);
            resetInvitationModal();
          }
        }}
        title={invitationResult ? 'Resultado del envío masivo' : 'Confirmar envío masivo'}
        size={invitationResult ? 'lg' : 'md'}
        footer={
          invitationResult ? (
            <button
              onClick={() => {
                setShowBulkInvite(false);
                resetInvitationModal();
              }}
              className="btn-primary"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowBulkInvite(false);
                  resetInvitationModal();
                }}
                disabled={saving}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendPendingInvitations}
                disabled={saving || bulkInvitationRows.length === 0}
                className="btn-primary"
              >
                <Mail size={15} />
                {saving
                  ? `Enviando ${inviteProgress?.processed ?? 0}/${inviteProgress?.total ?? bulkInvitationRows.length}`
                  : `Enviar a ${bulkInvitationRows.length}`}
              </button>
            </>
          )
        }
      >
        {invitationResult ? (
          <InvitationResultsPanel result={invitationResult} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-sm font-semibold text-amber-200">
                Se enviarán invitaciones a {bulkInvitationRows.length} trabajador(es) de {tenantName || 'esta empresa'}.
              </div>
              <p className="mt-2 text-xs leading-5 text-amber-100/70">
                Se incluyen trabajadores preaprobados o activos que todavía no tienen una cuenta registrada y nunca fueron invitados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="text-xl font-bold text-emerald-300">{bulkInvitationRows.length}</div>
                <div className="text-xs text-emerald-100/70">recibirán invitación</div>
              </div>
              <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
                <div className="text-xl font-bold text-steel-200">{alreadyInvitedCount}</div>
                <div className="text-xs text-steel-500">ya invitados, no se reenvían</div>
              </div>
              <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
                <div className="text-xl font-bold text-steel-200">{registeredDirectoryCount}</div>
                <div className="text-xs text-steel-500">ya registrados, no se incluyen</div>
              </div>
              <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
                <div className="text-xl font-bold text-steel-200">{inactiveDirectoryCount}</div>
                <div className="text-xs text-steel-500">inactivos, no se incluyen</div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {inviteProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-steel-400">
                  <span>Procesando invitaciones</span>
                  <span>{inviteProgress.processed} / {inviteProgress.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-steel-800">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${inviteProgress.total > 0
                        ? Math.round((inviteProgress.processed / inviteProgress.total) * 100)
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-steel-500">
              Para enviar o reenviar a destinatarios específicos, cancelá y elegí <strong className="text-steel-300">Invitar emails puntuales</strong>.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={showInvite}
        onClose={() => {
          if (!saving) {
            setShowInvite(false);
            setInviteEmails('');
            resetInvitationModal();
          }
        }}
        title={invitationResult ? 'Resultado de invitaciones puntuales' : 'Invitar usuarios por email'}
        size={invitationResult ? 'lg' : 'md'}
        footer={
          invitationResult ? (
            <>
              <button
                onClick={() => {
                  setInvitationResult(null);
                  setInviteEmails('');
                }}
                className="btn-secondary"
              >
                Enviar otra tanda
              </button>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteEmails('');
                  resetInvitationModal();
                }}
                className="btn-primary"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteEmails('');
                  resetInvitationModal();
                }}
                disabled={saving}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button onClick={handleInviteUsers} disabled={saving} className="btn-primary">
                <Mail size={15} />
                {saving
                  ? `Enviando ${inviteProgress?.processed ?? 0}/${inviteProgress?.total ?? 0}`
                  : 'Enviar invitaciones'}
              </button>
            </>
          )
        }
      >
        {invitationResult ? (
          <InvitationResultsPanel result={invitationResult} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-steel-400">
              Ingresá uno o más emails, uno por línea. Los emails nuevos se agregan a la nómina. Si una persona ya fue invitada pero todavía no se registró, la invitación se reenvía.
            </p>

            <p className="text-xs text-steel-500">
              Los usuarios ya registrados o inactivos se omiten. Al finalizar se mostrará el resultado individual de cada email.
            </p>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <textarea
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              className="input font-mono text-xs"
              rows={6}
              placeholder={'usuario1@empresa.com\nusuario2@empresa.com\nusuario3@empresa.com'}
            />

            <p className="text-xs text-steel-500">
              {
                inviteEmails
                  .split('\n')
                  .map((email) => email.trim())
                  .filter(Boolean).length
              }{' '}
              email(s) a cargar
            </p>
          </div>
        )}
      </Modal>

      {showDetail && (
        <Modal
          open={!!showDetail}
          onClose={() => setShowDetail(null)}
          title={getFullName(showDetail)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-steel-900 rounded-xl">
              <div className="w-14 h-14 bg-petroleum-600 rounded-xl flex items-center justify-center text-xl font-bold text-petroleum-100">
                {getInitials(showDetail)}
              </div>

              <div>
                <div className="text-lg font-semibold text-steel-100">
                  {getFullName(showDetail)}
                </div>
                <div className="text-sm text-steel-400">{showDetail.email || 'Sin email'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={getDisplayStatus(showDetail)} />
                  {showDetail.preapproved && (
                    <span className="text-xs text-emerald-400">Preaprobado</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Nombre', value: showDetail.first_name },
                { label: 'Apellido', value: showDetail.last_name },
                { label: 'DNI', value: showDetail.dni },
                { label: 'Teléfono', value: showDetail.phone },
                { label: 'Rol operativo', value: getWorkerRole(showDetail) },
                { label: 'Puesto', value: showDetail.position },
                { label: 'Área', value: showDetail.area },
                { label: 'Legajo', value: showDetail.employee_code },
                { label: 'Contratista', value: showDetail.contractor_company },
                { label: 'Supervisor', value: showDetail.supervisor },
                { label: 'Turno', value: showDetail.shift },
                { label: 'Fecha de ingreso', value: showDetail.hire_date },
                { label: 'Base', value: showDetail.base },
                { label: 'Sede', value: showDetail.site },
                { label: 'Región', value: showDetail.region },
                { label: 'Yacimiento', value: showDetail.oilfield },
                { label: 'Origen', value: showDetail.source },
              ].map((item) => (
                <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                  <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                  <div className="text-sm text-steel-200">{item.value || '—'}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-semibold text-steel-300 mb-2">
                Trainings asignados
              </div>

              {detailAssignments.length === 0 && (
                <div className="text-sm text-steel-500 bg-steel-900 rounded-lg p-3">
                  Este usuario todavía no tiene trainings asignados.
                </div>
              )}

              {detailAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-steel-900 rounded-lg border border-steel-700 mb-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-steel-200 truncate">
                      {getTrainingTitle(assignment.training, assignment)}
                    </div>
                    <div className="text-xs text-steel-500">
                      Avance: {getAssignmentProgress(assignment)}%
                    </div>
                  </div>

                  <StatusBadge status={assignment.status || 'assigned'} />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
