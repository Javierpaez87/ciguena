import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Users,
  BookOpen,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Tenant } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

type TenantTrainingRow = {
  id: string;
  tenant_id: string;
  training_id: string;
  enabled?: boolean | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  tenant_id?: string | null;
  role?: string | null;
  status?: string | null;
};

type TenantWithStats = Tenant & {
  user_count: number;
  worker_count: number;
  training_count: number;
};

function formatDate(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('es-AR');
}

function isTrainingEnabled(row?: TenantTrainingRow | null) {
  return row?.enabled !== false;
}

export default function SaTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTrainingRow[]>([]);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showTrainings, setShowTrainings] = useState<Tenant | null>(null);

  const [form, setForm] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);
  const [updatingTrainingKey, setUpdatingTrainingKey] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [tenantsResult, profilesResult, tenantTrainingsResult] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, tenant_id, role, status'),
        supabase.from('tenant_trainings').select('*').order('created_at', { ascending: false }),
      ]);

      if (tenantsResult.error) throw tenantsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;

      setTenants((tenantsResult.data ?? []) as Tenant[]);
      setProfiles((profilesResult.data ?? []) as ProfileRow[]);
      setTenantTrainings((tenantTrainingsResult.data ?? []) as TenantTrainingRow[]);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las empresas desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const enabledTrainings = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    tenantTrainings.forEach((tenantTraining) => {
      if (!tenantTraining.tenant_id || !tenantTraining.training_id) return;
      if (!isTrainingEnabled(tenantTraining)) return;

      if (!map[tenantTraining.tenant_id]) {
        map[tenantTraining.tenant_id] = new Set<string>();
      }

      map[tenantTraining.tenant_id].add(tenantTraining.training_id);
    });

    return map;
  }, [tenantTrainings]);

  const tenantStats = useMemo<TenantWithStats[]>(() => {
    return tenants.map((tenant) => {
      const tenantProfiles = profiles.filter((profile) => profile.tenant_id === tenant.id);
      const tenantWorkers = tenantProfiles.filter((profile) => profile.role === 'worker');
      const tenantEnabledTrainings = enabledTrainings[tenant.id]?.size ?? 0;

      return {
        ...tenant,
        user_count: tenantProfiles.length,
        worker_count: tenantWorkers.length,
        training_count: tenantEnabledTrainings,
      };
    });
  }, [tenants, profiles, enabledTrainings]);

  const filtered = tenantStats.filter((tenant) =>
    tenant.name.toLowerCase().includes(search.toLowerCase())
  );

  const detailTenant = showDetail
    ? tenantStats.find((tenant) => tenant.id === showDetail.id) ?? null
    : null;

  const trainingsTenant = showTrainings
    ? tenantStats.find((tenant) => tenant.id === showTrainings.id) ?? null
    : null;

  async function toggleStatus(tenant: Tenant) {
    const nextStatus = tenant.status === 'active' ? 'inactive' : 'active';

    setUpdatingTenantId(tenant.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          status: nextStatus,
        })
        .eq('id', tenant.id)
        .select('*')
        .single();

      if (error) throw error;

      setTenants((currentTenants) =>
        currentTenants.map((currentTenant) =>
          currentTenant.id === tenant.id ? ((data as Tenant) ?? currentTenant) : currentTenant
        )
      );

      setSuccessMessage(
        `Empresa ${nextStatus === 'active' ? 'activada' : 'desactivada'} correctamente.`
      );
    } catch (error) {
      console.error('Error updating tenant status:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado de la empresa.'
      );
    } finally {
      setUpdatingTenantId(null);
    }
  }

  async function handleCreate() {
    const tenantName = form.name.trim();

    if (!tenantName) return;

    setSavingTenant(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          logo_url: null,
          status: form.status,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTenants((currentTenants) => [data as Tenant, ...currentTenants]);
      setForm({ name: '', status: 'active' });
      setShowCreate(false);
      setSuccessMessage('Empresa creada correctamente.');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo crear la empresa en Supabase.'
      );
    } finally {
      setSavingTenant(false);
    }
  }

  async function toggleTraining(tenantId: string, trainingId: string) {
    const key = `${tenantId}:${trainingId}`;
    const existing = tenantTrainings.find(
      (tenantTraining) =>
        tenantTraining.tenant_id === tenantId && tenantTraining.training_id === trainingId
    );

    const currentlyEnabled = isTrainingEnabled(existing);
    const nextEnabled = !currentlyEnabled;

    setUpdatingTrainingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (existing) {
        const { data, error } = await supabase
          .from('tenant_trainings')
          .update({
            enabled: nextEnabled,
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;

        setTenantTrainings((currentRows) =>
          currentRows.map((row) => (row.id === existing.id ? (data as TenantTrainingRow) : row))
        );
      } else {
        const { data, error } = await supabase
          .from('tenant_trainings')
          .insert({
            tenant_id: tenantId,
            training_id: trainingId,
            enabled: true,
          })
          .select('*')
          .single();

        if (error) throw error;

        setTenantTrainings((currentRows) => [data as TenantTrainingRow, ...currentRows]);
      }

      setSuccessMessage(
        nextEnabled
          ? 'Training habilitado correctamente.'
          : 'Training deshabilitado correctamente.'
      );
    } catch (error) {
      console.error('Error toggling tenant training:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el training para esta empresa.'
      );
    } finally {
      setUpdatingTrainingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando empresas...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo tenants, perfiles y trainings habilitados desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && tenants.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />

          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar las empresas</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>

            <button onClick={loadData} className="btn-secondary mt-4 text-xs">
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
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9"
            placeholder="Buscar empresa..."
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={loadData} className="btn-secondary text-xs">
            <RefreshCw size={14} />
            Actualizar
          </button>

          <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            Nueva empresa
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="Sin empresas"
          description={
            search
              ? 'No hay empresas que coincidan con la búsqueda.'
              : 'Todavía no hay tenants creados en Supabase.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tenant) => (
            <div key={tenant.id} className="card hover:border-steel-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center text-base font-bold text-petroleum-200">
                    {tenant.name.charAt(0)}
                  </div>

                  <div>
                    <div className="text-base font-semibold text-steel-100">{tenant.name}</div>
                    <div className="text-xs text-steel-400">
                      Creado {formatDate(tenant.created_at)}
                    </div>
                  </div>
                </div>

                <StatusBadge status={tenant.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-steel-900 rounded-lg p-3 flex items-center gap-2">
                  <Users size={14} className="text-steel-400" />
                  <div>
                    <div className="text-lg font-bold text-steel-100">{tenant.user_count}</div>
                    <div className="text-xs text-steel-400">Usuarios</div>
                  </div>
                </div>

                <div className="bg-steel-900 rounded-lg p-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-steel-400" />
                  <div>
                    <div className="text-lg font-bold text-steel-100">
                      {tenant.training_count}
                    </div>
                    <div className="text-xs text-steel-400">Trainings</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetail(tenant)}
                  className="btn-ghost text-xs flex-1 justify-center"
                >
                  <ChevronRight size={14} />
                  Ver detalle
                </button>

                <button
                  onClick={() => setShowTrainings(tenant)}
                  className="btn-secondary text-xs flex-1 justify-center"
                >
                  <BookOpen size={14} />
                  Trainings
                </button>

                <button
                  onClick={() => toggleStatus(tenant)}
                  disabled={updatingTenantId === tenant.id}
                  className="p-2 rounded-lg hover:bg-steel-700 transition-colors disabled:opacity-50"
                  title={tenant.status === 'active' ? 'Desactivar empresa' : 'Activar empresa'}
                >
                  {tenant.status === 'active' ? (
                    <ToggleRight size={18} className="text-emerald-400" />
                  ) : (
                    <ToggleLeft size={18} className="text-steel-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva empresa / tenant"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">
              Cancelar
            </button>

            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || savingTenant}
              className="btn-primary"
            >
              <Plus size={15} />
              {savingTenant ? 'Creando...' : 'Crear empresa'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la empresa *</label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              className="input"
              placeholder="Ej: YPF S.A."
            />
          </div>

          <div>
            <label className="label">Estado inicial</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  status: event.target.value as 'active' | 'inactive',
                }))
              }
              className="select"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailTenant && (
        <Modal
          open={!!detailTenant}
          onClose={() => setShowDetail(null)}
          title={detailTenant.name}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">
                  {detailTenant.user_count}
                </div>
                <div className="text-sm text-steel-400">Usuarios totales</div>
              </div>

              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">
                  {detailTenant.training_count}
                </div>
                <div className="text-sm text-steel-400">Trainings habilitados</div>
              </div>
            </div>

            <div className="bg-steel-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm gap-4">
                <span className="text-steel-400">ID</span>
                <span className="text-steel-200 font-mono text-xs text-right">
                  {detailTenant.id}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Estado</span>
                <StatusBadge status={detailTenant.status} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Creado</span>
                <span className="text-steel-200">{formatDate(detailTenant.created_at)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Trainings assignment Modal */}
      {trainingsTenant && (
        <Modal
          open={!!trainingsTenant}
          onClose={() => setShowTrainings(null)}
          title={`Trainings — ${trainingsTenant.name}`}
          size="lg"
        >
          <p className="text-sm text-steel-400 mb-4">
            Habilitá o deshabilitá trainings para esta empresa. El catálogo sale de
            baseTrainings.ts; la habilitación se guarda en Supabase.
          </p>

          <div className="space-y-2">
            {baseTrainings
              .filter((training) => training.status === 'active')
              .map((training) => {
                const isEnabled =
                  enabledTrainings[trainingsTenant.id]?.has(training.id) ?? false;

                const key = `${trainingsTenant.id}:${training.id}`;
                const isUpdating = updatingTrainingKey === key;

                return (
                  <div
                    key={training.id}
                    className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors"
                  >
                    <button
                      onClick={() => toggleTraining(trainingsTenant.id, training.id)}
                      disabled={isUpdating}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors disabled:opacity-50 ${
                        isEnabled
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-steel-600 hover:border-amber-500'
                      }`}
                      title={isEnabled ? 'Deshabilitar training' : 'Habilitar training'}
                    >
                      {isEnabled && <Check size={12} className="text-petroleum-950" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-steel-100">
                        {training.title}
                      </div>
                      <div className="text-xs text-steel-400">
                        {training.category} · {training.duration_minutes} min ·{' '}
                        {training.validity_months ?? 0}m vigencia
                      </div>
                    </div>

                    <span className="badge badge-info text-xs">{training.category}</span>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
  );
}
