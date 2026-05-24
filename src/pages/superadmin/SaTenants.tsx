import React, { useState } from 'react';
import { Plus, Search, Edit, ToggleLeft, ToggleRight, Building2, ChevronRight, Users, BookOpen, X, Check } from 'lucide-react';
import { mockTenants, mockTrainings, mockTenantTrainings } from '../../lib/mockData';
import type { Tenant } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

export default function SaTenants() {
  const [tenants, setTenants] = useState(mockTenants);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showTrainings, setShowTrainings] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', status: 'active' as 'active' | 'inactive' });
  const [enabledTrainings, setEnabledTrainings] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    mockTenantTrainings.forEach(tt => {
      if (!map[tt.tenant_id]) map[tt.tenant_id] = new Set();
      if (tt.enabled) map[tt.tenant_id].add(tt.training_id);
    });
    return map;
  });

  const filtered = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const toggleStatus = (id: string) => {
    setTenants(ts => ts.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t));
  };

  const handleCreate = () => {
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: form.name,
      logo_url: null,
      status: form.status,
      created_at: new Date().toISOString(),
      user_count: 0,
      training_count: 0,
    };
    setTenants(ts => [...ts, newTenant]);
    setForm({ name: '', status: 'active' });
    setShowCreate(false);
  };

  const toggleTraining = (tenantId: string, trainingId: string) => {
    setEnabledTrainings(prev => {
      const set = new Set(prev[tenantId] ?? []);
      if (set.has(trainingId)) set.delete(trainingId);
      else set.add(trainingId);
      return { ...prev, [tenantId]: set };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar empresa..." />
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Nueva empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(tenant => (
          <div key={tenant.id} className="card hover:border-steel-600 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center text-base font-bold text-petroleum-200">
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <div className="text-base font-semibold text-steel-100">{tenant.name}</div>
                  <div className="text-xs text-steel-400">Creado {new Date(tenant.created_at).toLocaleDateString('es-AR')}</div>
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
                  <div className="text-lg font-bold text-steel-100">{enabledTrainings[tenant.id]?.size ?? 0}</div>
                  <div className="text-xs text-steel-400">Trainings</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowDetail(tenant)} className="btn-ghost text-xs flex-1 justify-center">
                <ChevronRight size={14} /> Ver detalle
              </button>
              <button onClick={() => setShowTrainings(tenant)} className="btn-secondary text-xs flex-1 justify-center">
                <BookOpen size={14} /> Trainings
              </button>
              <button onClick={() => toggleStatus(tenant.id)} className="p-2 rounded-lg hover:bg-steel-700 transition-colors">
                {tenant.status === 'active'
                  ? <ToggleRight size={18} className="text-emerald-400" />
                  : <ToggleLeft size={18} className="text-steel-500" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva empresa / tenant"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.name} className="btn-primary">
              <Plus size={15} /> Crear empresa
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la empresa *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ej: YPF S.A." />
          </div>
          <div>
            <label className="label">Estado inicial</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))} className="select">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {showDetail && (
        <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail.name} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">{showDetail.user_count}</div>
                <div className="text-sm text-steel-400">Usuarios totales</div>
              </div>
              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">{enabledTrainings[showDetail.id]?.size ?? 0}</div>
                <div className="text-sm text-steel-400">Trainings habilitados</div>
              </div>
            </div>
            <div className="bg-steel-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">ID</span>
                <span className="text-steel-200 font-mono text-xs">{showDetail.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Estado</span>
                <StatusBadge status={showDetail.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Creado</span>
                <span className="text-steel-200">{new Date(showDetail.created_at).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Trainings assignment Modal */}
      {showTrainings && (
        <Modal open={!!showTrainings} onClose={() => setShowTrainings(null)} title={`Trainings — ${showTrainings.name}`} size="lg">
          <p className="text-sm text-steel-400 mb-4">Habilitá o deshabilitá trainings para esta empresa.</p>
          <div className="space-y-2">
            {mockTrainings.map(tr => {
              const isEnabled = enabledTrainings[showTrainings.id]?.has(tr.id) ?? false;
              return (
                <div key={tr.id} className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors">
                  <button
                    onClick={() => toggleTraining(showTrainings.id, tr.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${isEnabled ? 'bg-amber-500 border-amber-500' : 'border-steel-600 hover:border-amber-500'}`}
                  >
                    {isEnabled && <Check size={12} className="text-petroleum-950" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-steel-100">{tr.title}</div>
                    <div className="text-xs text-steel-400">{tr.category} · {tr.duration_minutes} min</div>
                  </div>
                  <span className="badge badge-info text-xs">{tr.category}</span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
