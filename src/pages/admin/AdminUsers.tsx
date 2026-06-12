import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  Mail,
  Users,
  RefreshCw,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle,
  Download,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

interface Profile {
  id: string;
  tenant_id?: string | null;
  auth_user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  position?: string | null;
  area?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  dni?: string | null;
  phone?: string | null;
  status?: string | null;
  preapproved?: boolean | null;
  source?: string | null;
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
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
  status: string;
};

type CsvPreviewRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  dni: string;
  phone: string;
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
  status: string;
  errors: string[];
};

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  full_name: '',
  email: '',
  dni: '',
  phone: '',
  position: '',
  area: '',
  contractor_company: '',
  employee_code: '',
  status: 'active',
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
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
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

  if (!status) return 'pending';
  if (['activo', 'active', 'habilitado'].includes(status)) return 'active';
  if (['inactivo', 'inactive', 'deshabilitado'].includes(status)) return 'inactive';
  if (['pendiente', 'pending'].includes(status)) return 'pending';

  return status;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCsv(text: string, existingEmails: Set<string>): CsvPreviewRow[] {
  const cleanedText = text.replace(/\r/g, '').trim();

  if (!cleanedText) return [];

  const lines = cleanedText.split('\n').filter((line) => line.trim());

  if (lines.length <= 1) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const emailsInCsv = new Set<string>();

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
    const position = getColumnValue(row, ['puesto', 'position', 'cargo', 'rol_operativo']);
    const area = getColumnValue(row, ['area', 'sector', 'departamento', 'department']);
    const employeeCode = getColumnValue(row, ['legajo', 'employee_code', 'codigo_empleado']);
    const contractorCompany = getColumnValue(row, [
      'empresa_contratista',
      'contratista',
      'contractor_company',
      'empresa',
    ]);
    const status = mapStatus(getColumnValue(row, ['estado', 'status']));

    const fullNameFromCsv = getColumnValue(row, ['nombre_completo', 'full_name']);
    const fullName = fullNameFromCsv || [firstName, lastName].filter(Boolean).join(' ');

    const errors: string[] = [];

    if (!email) errors.push('Falta email');
    if (email && !isValidEmail(email)) errors.push('Email inválido');
    if (email && existingEmails.has(email)) errors.push('Email ya existe');
    if (email && emailsInCsv.has(email)) errors.push('Email duplicado en el CSV');
    if (!fullName) errors.push('Falta nombre');

    if (email) {
      emailsInCsv.add(email);
    }

    return {
      rowNumber: index + 2,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
      dni,
      phone,
      position,
      area,
      contractor_company: contractorCompany,
      employee_code: employeeCode,
      status,
      errors,
    };
  });
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

function downloadCsvTemplate() {
  const headers = [
    'nombre',
    'apellido',
    'email',
    'dni',
    'telefono',
    'puesto',
    'area',
    'legajo',
    'empresa_contratista',
    'estado',
  ];

  const exampleRows = [
    [
      'Juan',
      'Perez',
      'juan.perez@empresa.com',
      '30111222',
      '+54 9 11 2233-4455',
      'Operador de campo',
      'Operaciones',
      'EMP001',
      'Contratista SA',
      'pending',
    ],
    [
      'Maria',
      'Gomez',
      'maria.gomez@empresa.com',
      '30999888',
      '+54 9 11 6677-8899',
      'Supervisora HSE',
      'Seguridad e Higiene',
      'EMP002',
      '',
      'pending',
    ],
  ];

  const csvContent = [headers, ...exampleRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_carga_trabajadores_ciguena.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function AdminUsers() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const [inviteEmails, setInviteEmails] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadUsersData() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [usersResult, assignmentsResult, tenantTrainingsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('training_assignments').select('*').eq('tenant_id', tenantId),
        supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;

      const loadedUsers = ((usersResult.data ?? []) as Profile[])
        .filter((profile) => !isAdminUser(profile))
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

  const filtered = useMemo(() => {
    const searchValue = normalize(search);

    return users.filter((profile) => {
      const profileStatus = normalize(profile.status || 'active');
      const normalizedStatus = profileStatus === 'activo' ? 'active' : profileStatus;

      const matchesStatus =
        statusFilter === 'all' ||
        normalizedStatus === statusFilter ||
        (statusFilter === 'active' && isActive(profile));

      const matchesSearch =
        !searchValue ||
        normalize(getFullName(profile)).includes(searchValue) ||
        normalize(profile.email).includes(searchValue) ||
        normalize(profile.position).includes(searchValue) ||
        normalize(profile.area).includes(searchValue) ||
        normalize(profile.employee_code).includes(searchValue) ||
        normalize(profile.dni).includes(searchValue) ||
        normalize(profile.phone).includes(searchValue) ||
        normalize(profile.contractor_company).includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [users, search, statusFilter]);

  const activeCount = users.filter(isActive).length;
  const inactiveCount = users.filter((profile) => normalize(profile.status) === 'inactive').length;
  const pendingCount = users.filter((profile) => normalize(profile.status) === 'pending').length;

  const assignmentsByUser = useMemo(() => {
    return assignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      if (!assignment.user_id) return acc;

      acc[assignment.user_id] = acc[assignment.user_id] ?? [];
      acc[assignment.user_id].push(assignment);

      return acc;
    }, {});
  }, [assignments]);

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

      const newUser = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        auth_user_id: null,
        first_name: clean(form.first_name),
        last_name: clean(form.last_name),
        full_name: fullName,
        email: cleanEmail,
        dni: clean(form.dni),
        phone: clean(form.phone),
        role: 'worker',
        position: clean(form.position),
        area: clean(form.area),
        contractor_company: clean(form.contractor_company),
        employee_code: clean(form.employee_code),
        status: form.status || 'pending',
        preapproved: true,
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('profiles').insert(newUser).select('*').single();

      if (error) throw error;

      setUsers((currentUsers) =>
        [...currentUsers, data as Profile].sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );

      setForm(emptyForm);
      setShowCreate(false);
      setSuccessMessage('Trabajador creado y preaprobado correctamente.');
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo crear el usuario en Supabase.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleInviteUsers() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para invitar usuarios.');
      return;
    }

    const emails = inviteEmails
      .split('\n')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length === 0) {
      setErrorMessage('Ingresá al menos un email.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const existingEmails = new Set(users.map((profile) => normalize(profile.email)));

      const newProfiles = uniqueEmails
        .filter((email) => !existingEmails.has(email))
        .map((email) => ({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          auth_user_id: null,
          first_name: null,
          last_name: null,
          full_name: email.split('@')[0],
          email,
          role: 'worker',
          position: null,
          area: null,
          contractor_company: null,
          employee_code: null,
          dni: null,
          phone: null,
          status: 'pending',
          preapproved: true,
          source: 'email_invite',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      if (newProfiles.length === 0) {
        setSuccessMessage('Todos los emails ya estaban cargados en la empresa.');
        setShowInvite(false);
        setInviteEmails('');
        return;
      }

      const { data, error } = await supabase.from('profiles').insert(newProfiles).select('*');

      if (error) throw error;

      setUsers((currentUsers) =>
        [...currentUsers, ...((data ?? []) as Profile[])].sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );

      setShowInvite(false);
      setInviteEmails('');
      setSuccessMessage(`${newProfiles.length} trabajador(es) cargado(s) como preaprobado(s).`);
    } catch (error) {
      console.error('Error inviting users:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar las invitaciones.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCsvFile(file: File) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const existingEmails = new Set(users.map((profile) => normalize(profile.email)));
      const parsedRows = parseCsv(text, existingEmails);

      if (parsedRows.length === 0) {
        throw new Error('El CSV no tiene filas válidas o está vacío.');
      }

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

  async function importCsvRows() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para importar usuarios.');
      return;
    }

    const validRows = csvRows.filter((row) => row.errors.length === 0);

    if (validRows.length === 0) {
      setErrorMessage('No hay filas válidas para importar.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const now = new Date().toISOString();

      const profilesToInsert = validRows.map((row) => ({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        auth_user_id: null,
        first_name: clean(row.first_name),
        last_name: clean(row.last_name),
        full_name: row.full_name,
        email: row.email,
        dni: clean(row.dni),
        phone: clean(row.phone),
        role: 'worker',
        position: clean(row.position),
        area: clean(row.area),
        contractor_company: clean(row.contractor_company),
        employee_code: clean(row.employee_code),
        status: row.status || 'pending',
        preapproved: true,
        source: 'csv',
        created_at: now,
        updated_at: now,
      }));

      const { data, error } = await supabase.from('profiles').insert(profilesToInsert).select('*');

      if (error) throw error;

      setUsers((currentUsers) =>
        [...currentUsers, ...((data ?? []) as Profile[])].sort((a, b) =>
          getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
        )
      );

      setCsvRows([]);
      setShowCsvModal(false);
      setSuccessMessage(`${profilesToInsert.length} trabajador(es) importado(s) desde CSV.`);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo importar el CSV.');
    } finally {
      setSaving(false);
    }
  }

  const detailAssignments = showDetail ? assignmentsByUser[showDetail.id] ?? [] : [];
  const validCsvRows = csvRows.filter((row) => row.errors.length === 0);
  const invalidCsvRows = csvRows.filter((row) => row.errors.length > 0);

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
            <button onClick={loadUsersData} className="btn-secondary mt-4 text-xs">
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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Buscar usuario..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="select w-auto"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={loadUsersData} className="btn-secondary text-xs">
            <RefreshCw size={14} />
            Actualizar
          </button>

          <button
            onClick={() => {
              setCsvRows([]);
              setShowCsvModal(true);
            }}
            className="btn-secondary text-xs"
          >
            <Upload size={14} />
            Cargar CSV
          </button>

          <button onClick={() => setShowInvite(true)} className="btn-secondary text-xs">
            <Mail size={14} />
            Invitar por email
          </button>

          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={16} />
            Nuevo usuario
          </button>
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
                <th className="table-header hidden md:table-cell">Puesto</th>
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
                        {profile.preapproved && (
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
            Esto crea el trabajador como preaprobado. Cuando se registre con este email, podremos
            validarlo automáticamente contra esta base.
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
        open={showCsvModal}
        onClose={() => {
          setShowCsvModal(false);
          setCsvRows([]);
        }}
        title={csvRows.length > 0 ? 'Previsualizar importación CSV' : 'Cargar trabajadores por CSV'}
        size="xl"
        footer={
          <>
            <button
              onClick={() => {
                setShowCsvModal(false);
                setCsvRows([]);
              }}
              className="btn-ghost"
            >
              Cancelar
            </button>

            {csvRows.length > 0 ? (
              <button
                onClick={importCsvRows}
                disabled={saving || validCsvRows.length === 0}
                className="btn-primary"
              >
                <Upload size={15} />
                {saving ? 'Importando...' : `Importar ${validCsvRows.length}`}
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
                Carga masiva de trabajadores
              </div>
              <p className="text-sm text-amber-100/80">
                Subí un archivo CSV con la nómina de trabajadores de la empresa. Los usuarios
                cargados quedarán preaprobados para que, cuando se registren con su email, puedan
                validarse automáticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={downloadCsvTemplate}
                className="rounded-xl border border-steel-700 bg-steel-900 hover:bg-steel-800 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Download size={20} className="text-amber-400" />
                  <div className="text-sm font-semibold text-steel-100">
                    Descargar modelo CSV
                  </div>
                </div>
                <p className="text-xs text-steel-400">
                  Bajá una plantilla con las columnas correctas y dos filas de ejemplo.
                </p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-steel-700 bg-steel-900 hover:bg-steel-800 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Upload size={20} className="text-emerald-400" />
                  <div className="text-sm font-semibold text-steel-100">
                    Seleccionar archivo CSV
                  </div>
                </div>
                <p className="text-xs text-steel-400">
                  Elegí el archivo completo para validar e importar trabajadores.
                </p>
              </button>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-900 p-4">
              <div className="text-sm font-semibold text-steel-200 mb-3">
                Columnas aceptadas
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-steel-400">
                <div>
                  <div className="text-steel-300 font-medium mb-1">Obligatorias</div>
                  <ul className="space-y-1">
                    <li>email</li>
                    <li>nombre y apellido, o nombre_completo</li>
                  </ul>
                </div>

                <div>
                  <div className="text-steel-300 font-medium mb-1">Opcionales</div>
                  <ul className="space-y-1">
                    <li>dni</li>
                    <li>telefono</li>
                    <li>puesto</li>
                    <li>area</li>
                    <li>legajo</li>
                    <li>empresa_contratista</li>
                    <li>estado: pending, active o inactive</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-steel-900 rounded-lg p-3">
                <div className="text-xs text-steel-500">Filas detectadas</div>
                <div className="text-xl font-bold text-steel-100">{csvRows.length}</div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="text-xs text-emerald-500">Válidas</div>
                <div className="text-xl font-bold text-emerald-300">{validCsvRows.length}</div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-xs text-red-400">Con errores</div>
                <div className="text-xl font-bold text-red-300">{invalidCsvRows.length}</div>
              </div>
            </div>

            <div className="rounded-xl border border-steel-700 overflow-hidden max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-steel-900 sticky top-0">
                  <tr>
                    <th className="table-header">Fila</th>
                    <th className="table-header">Nombre</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">DNI</th>
                    <th className="table-header">Puesto</th>
                    <th className="table-header">Área</th>
                    <th className="table-header">Legajo</th>
                    <th className="table-header">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {csvRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={`border-b border-steel-800 ${
                        row.errors.length > 0 ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="table-cell text-steel-500">{row.rowNumber}</td>
                      <td className="table-cell text-steel-200">
                        <div>{row.full_name || '—'}</div>
                        {row.errors.length > 0 && (
                          <div className="text-xs text-red-400 mt-1">
                            {row.errors.join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="table-cell text-steel-300">{row.email || '—'}</td>
                      <td className="table-cell text-steel-300">{row.dni || '—'}</td>
                      <td className="table-cell text-steel-300">{row.position || '—'}</td>
                      <td className="table-cell text-steel-300">{row.area || '—'}</td>
                      <td className="table-cell text-steel-300">{row.employee_code || '—'}</td>
                      <td className="table-cell">
                        <StatusBadge status={row.status || 'pending'} />
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
                  Las filas válidas se importarán como trabajadores preaprobados. Las filas con
                  errores no se importan.
                </div>
              </div>

              <button
                onClick={() => {
                  setCsvRows([]);
                  fileInputRef.current?.click();
                }}
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
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invitar usuarios por email"
        footer={
          <>
            <button onClick={() => setShowInvite(false)} className="btn-ghost">
              Cancelar
            </button>
            <button onClick={handleInviteUsers} disabled={saving} className="btn-primary">
              <Mail size={15} />
              {saving ? 'Cargando...' : 'Cargar invitaciones'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-steel-400">
            Ingresá uno o más emails, uno por línea. Se cargan como trabajadores pendientes y
            preaprobados.
          </p>

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
                { label: 'Puesto', value: showDetail.position },
                { label: 'Área', value: showDetail.area },
                { label: 'Legajo', value: showDetail.employee_code },
                { label: 'Contratista', value: showDetail.contractor_company },
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
