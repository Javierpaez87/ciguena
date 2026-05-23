import React, { useState } from 'react';
import { Plus, Search, Edit, ToggleLeft, ToggleRight, Eye, Mail, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsersByTenant, getAssignmentsByUser } from '../../lib/mockData';
import type { Profile } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

export default function AdminUsers() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const [users, setUsers] = useState(getUsersByTenant(tenantId));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', position: '', area: '', contractor_company: '', employee_code: '',
  });

  const filtered = users.filter(u =>
    (statusFilter === 'all' || u.status === statusFilter) &&
    (u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.position ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const toggleStatus = (id: string) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  const handleCreate = () => {
    const newUser: Profile = {
      id: `u${Date.now()}`,
      tenant_id: tenantId,
      full_name: form.full_name,
      email: form.email,
      role: 'worker',
      position: form.position || null,
      area: form.area || null,
      contractor_company: form.contractor_company || null,
      employee_code: form.employee_code || null,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setUsers(us => [...us, newUser]);
    setForm({ full_name: '', email: '', position: '', area: '', contractor_company: '', employee_code: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar usuario..." />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-auto">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInvite(true)} className="btn-secondary text-xs"><Mail size={14} /> Invitar por email</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus size={16} /> Nuevo usuario</button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <Users size={13} className="text-steel-400" />
          <span className="text-xs text-steel-300">{users.length} total</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <span className="text-xs text-emerald-400">{users.filter(u => u.status === 'active').length} activos</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-steel-800 rounded-lg border border-steel-700">
          <span className="text-xs text-steel-400">{users.filter(u => u.status === 'inactive').length} inactivos</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-steel-900 border-b border-steel-700">
                <th className="table-header">Nombre</th>
                <th className="table-header hidden md:table-cell">Puesto</th>
                <th className="table-header hidden lg:table-cell">Área</th>
                <th className="table-header hidden lg:table-cell">Legajo</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-petroleum-700 rounded-full flex items-center justify-center text-sm font-bold text-petroleum-200 flex-shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-steel-100 truncate">{u.full_name}</div>
                        <div className="text-xs text-steel-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell text-steel-300">{u.position ?? '—'}</td>
                  <td className="table-cell hidden lg:table-cell text-steel-300">{u.area ?? '—'}</td>
                  <td className="table-cell hidden lg:table-cell font-mono text-xs text-steel-400">{u.employee_code ?? '—'}</td>
                  <td className="table-cell"><StatusBadge status={u.status} /></td>
                  <td className="table-cell text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setShowDetail(u)} className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-steel-100 transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => toggleStatus(u.id)} className="p-1.5 rounded hover:bg-steel-700 transition-colors">
                        {u.status === 'active'
                          ? <ToggleRight size={16} className="text-emerald-400" />
                          : <ToggleLeft size={16} className="text-steel-500" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo usuario / trabajador"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.full_name || !form.email} className="btn-primary"><Plus size={15} /> Crear usuario</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="juan@empresa.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Puesto</label>
              <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="input" placeholder="Ej: Operador de campo" />
            </div>
            <div>
              <label className="label">Área</label>
              <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="input" placeholder="Ej: Operaciones" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa contratista</label>
              <input value={form.contractor_company} onChange={e => setForm(f => ({ ...f, contractor_company: e.target.value }))} className="input" placeholder="Opcional" />
            </div>
            <div>
              <label className="label">Legajo / DNI</label>
              <input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))} className="input" placeholder="EMP001" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invitar usuarios por email"
        footer={
          <>
            <button onClick={() => setShowInvite(false)} className="btn-ghost">Cancelar</button>
            <button onClick={() => { alert('Emails de invitación simulados: ' + inviteEmails.split('\n').filter(Boolean).length + ' enviados.'); setShowInvite(false); setInviteEmails(''); }} className="btn-primary"><Mail size={15} /> Enviar invitaciones</button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-steel-400">Ingresá uno o más emails (uno por línea) para enviar invitaciones a la plataforma.</p>
          <textarea
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
            className="input font-mono text-xs"
            rows={6}
            placeholder={"usuario1@empresa.com\nusuario2@empresa.com\nusuario3@empresa.com"}
          />
          <p className="text-xs text-steel-500">
            {inviteEmails.split('\n').filter(Boolean).length} email(s) a enviar
          </p>
        </div>
      </Modal>

      {/* Detail Modal */}
      {showDetail && (
        <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail.full_name} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-steel-900 rounded-xl">
              <div className="w-14 h-14 bg-petroleum-600 rounded-xl flex items-center justify-center text-xl font-bold text-petroleum-100">
                {showDetail.full_name.charAt(0)}
              </div>
              <div>
                <div className="text-lg font-semibold text-steel-100">{showDetail.full_name}</div>
                <div className="text-sm text-steel-400">{showDetail.email}</div>
                <StatusBadge status={showDetail.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Puesto', value: showDetail.position },
                { label: 'Área', value: showDetail.area },
                { label: 'Legajo', value: showDetail.employee_code },
                { label: 'Contratista', value: showDetail.contractor_company },
              ].map(item => (
                <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                  <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                  <div className="text-sm text-steel-200">{item.value ?? '—'}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm font-semibold text-steel-300 mb-2">Trainings asignados</div>
              {getAssignmentsByUser(showDetail.id).map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-steel-900 rounded-lg border border-steel-700 mb-2">
                  <div className="text-sm text-steel-200 truncate">{a.training?.title}</div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
