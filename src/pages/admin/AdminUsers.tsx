import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

interface Profile {
  id: string;
  tenant_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  position?: string | null;
  area?: string | null;
  contractor_company?: string | null;
  employee_code?: string | null;
  status?: string | null;
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
  completed_at?: string | null;
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
  full_name: string;
  email: string;
  position: string;
  area: string;
  contractor_company: string;
  employee_code: string;
};

const emptyForm: FormState = {
  full_name: '',
  email: '',
  position: '',
  area: '',
  contractor_company: '',
  employee_code: '',
};

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
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

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || 'U';
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

function sortByCreatedAtDesc<T extends { created_at?: string | null; assigned_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || a.assigned_at || '').getTime();
    const dateB = new Date(b.created_at || b.assigned_at || '').getTime();
    return dateB - dateA;
  });
}

export default function AdminUsers() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const [inviteEmails, setInviteEmails] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);

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
        .sort((a, b) => {
          const nameA = (a.full_name || a.email || '').toLowerCase();
          const nameB = (b.full_name || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

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
      const profileStatus = isActive(profile) ? 'active' : 'inactive';

      const matchesStatus = statusFilter === 'all' || profileStatus === statusFilter;

      const matchesSearch =
        !searchValue ||
        normalize(profile.full_name).includes(searchValue) ||
        normalize(profile.email).includes(searchValue) ||
        normalize(profile.position).includes(searchValue) ||
        normalize(profile.area).includes(searchValue) ||
        normalize(profile.employee_code).includes(searchValue) ||
        normalize(profile.contractor_company).includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [users, search, statusFilter]);

  const activeCount = users.filter(isActive).length;
  const inactiveCount = users.length - activeCount;

  const assignmentsByUser = useMemo(() => {
    return assignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      if (!assignment.user_id) return acc;

      acc[assignment.user_id] = acc[assignment.user_id] ?? [];
      acc[assignment.user_id].push(assignment);

      return acc;
    }, {});
  }, [assignments]);

  async function toggleStatus(profile: Profile) {
    if (!profile.id) return;

    const currentIsActive = isActive(profile);
    const nextStatus = currentIsActive ? 'inactive' : 'active';

    setErrorMessage(null);
    setSuccessMessage(null);

    const previousUsers = users;

    setUsers((currentUsers) =>
      currentUsers.map((item) => (item.id === profile.id ? { ...item, status: nextStatus } : item))
    );

    const { error } = await supabase
      .from('profiles')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error updating user status:', error);
      setUsers(previousUsers);
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      nextStatus === 'active'
        ? 'Usuario activado correctamente.'
        : 'Usuario desactivado correctamente.'
    );
  }

  async function handleCreate() {
    if (!tenantId) {
      setErrorMessage('No se encontró tenant_id para crear el usuario.');
      return;
    }

    if (!form.full_name.trim() || !form.email.trim()) {
      setErrorMessage('Nombre completo y email son obligatorios.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const cleanEmail = form.email.trim().toLowerCase();

      const existing = users.find((profile) => normalize(profile.email) === cleanEmail);

      if (existing) {
        throw new Error('Ya existe un usuario con ese email en esta empresa.');
      }

      const newUser = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        full_name: form.full_name.trim(),
        email: cleanEmail,
        role: 'worker',
        position: form.position.trim() || null,
        area: form.area.trim() || null,
        contractor_company: form.contractor_company.trim() || null,
        employee_code: form.employee_code.trim() || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('profiles').insert(newUser).select('*').single();

      if (error) throw error;

      setUsers((currentUsers) =>
        [...currentUsers, data as Profile].sort((a, b) => {
          const nameA = (a.full_name || a.email || '').toLowerCase();
          const nameB = (b.full_name || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        })
      );

      setForm(emptyForm);
      setShowCreate(false);
      setSuccessMessage('Usuario creado correctamente.');
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
          full_name: email.split('@')[0],
          email,
          role: 'worker',
          position: null,
          area: null,
          contractor_company: null,
          employee_code: null,
          status: 'pending',
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
        [...currentUsers, ...((data ?? []) as Profile[])].sort((a, b) => {
          const nameA = (a.full_name || a.email || '').toLowerCase();
          const nameB = (b.full_name || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        })
      );

      setShowInvite(false);
      setInviteEmails('');
      setSuccessMessage(
        `${newProfiles.length} usuario(s) cargado(s) como pendiente(s). El envío real de email queda para una función backend.`
      );
    } catch (error) {
      console.error('Error inviting users:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar las invitaciones.'
      );
    } finally {
      setSaving(false);
    }
  }

  const detailAssignments = showDetail ? assignmentsByUser[showDetail.id] ?? [] : [];

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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
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
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={loadUsersData} className="btn-secondary text-xs">
            <RefreshCw size={14} />
            Actualizar
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
                          {getInitials(profile.full_name, profile.email)}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-steel-100 truncate">
                            {profile.full_name || 'Sin nombre'}
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

                    <td className="table-cell hidden xl:table-cell text-steel-300">
                      <div className="text-sm">
                        {completedAssignments}/{userAssignments.length}
                      </div>
                      <div className="text-xs text-steel-500">completadas</div>
                    </td>

                    <td className="table-cell">
                      <StatusBadge status={getDisplayStatus(profile)} />
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
              disabled={saving || !form.full_name.trim() || !form.email.trim()}
              className="btn-primary"
            >
              <Plus size={15} />
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Esto crea el perfil del trabajador en Supabase dentro de la empresa actual. El login real
            por email se puede conectar después con invitaciones de Supabase Auth.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input
                value={form.full_name}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    full_name: event.target.value,
                  }))
                }
                className="input"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    email: event.target.value,
                  }))
                }
                className="input"
                placeholder="juan@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Puesto</label>
              <input
                value={form.position}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    position: event.target.value,
                  }))
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
                  setForm((currentForm) => ({
                    ...currentForm,
                    area: event.target.value,
                  }))
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
              <label className="label">Legajo / DNI</label>
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
            Ingresá uno o más emails, uno por línea. Por ahora se cargan como usuarios pendientes
            en Supabase. El envío real del email lo conectamos después con backend.
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
          title={showDetail.full_name || showDetail.email || 'Usuario'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-steel-900 rounded-xl">
              <div className="w-14 h-14 bg-petroleum-600 rounded-xl flex items-center justify-center text-xl font-bold text-petroleum-100">
                {getInitials(showDetail.full_name, showDetail.email)}
              </div>

              <div>
                <div className="text-lg font-semibold text-steel-100">
                  {showDetail.full_name || 'Sin nombre'}
                </div>
                <div className="text-sm text-steel-400">{showDetail.email || 'Sin email'}</div>
                <div className="mt-2">
                  <StatusBadge status={getDisplayStatus(showDetail)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Puesto', value: showDetail.position },
                { label: 'Área', value: showDetail.area },
                { label: 'Legajo', value: showDetail.employee_code },
                { label: 'Contratista', value: showDetail.contractor_company },
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
