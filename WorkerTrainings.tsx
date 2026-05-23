import React, { useState } from 'react';
import { Search, Bell, BellRing, Filter, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignmentsByTenant } from '../../lib/mockData';
import type { AssignmentStatus } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'not_started', label: 'No iniciado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'pending_test', label: 'Pendiente test' },
  { value: 'passed', label: 'Aprobado' },
  { value: 'failed', label: 'Reprobado' },
  { value: 'certificate_issued', label: 'Certificado emitido' },
  { value: 'expired', label: 'Vencido' },
];

export default function AdminAssignments() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const [assignments] = useState(getAssignmentsByTenant(tenantId));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [remindSent, setRemindSent] = useState<Set<string>>(new Set());

  const filtered = assignments.filter(a =>
    (statusFilter === 'all' || a.status === statusFilter) &&
    (a.user?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.training?.title.toLowerCase().includes(search.toLowerCase()))
  );

  const sendReminder = (id: string) => {
    setRemindSent(prev => new Set([...prev, id]));
    setTimeout(() => setRemindSent(prev => { const s = new Set(prev); s.delete(id); return s; }), 3000);
  };

  const sendBulkReminder = () => {
    const eligible = filtered.filter(a => ['not_started', 'in_progress', 'pending_test'].includes(a.status));
    alert(`Reminders enviados a ${eligible.length} usuario(s). (Simulado)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar usuario o training..." />
        </div>
        <button onClick={sendBulkReminder} className="btn-secondary text-xs flex-shrink-0">
          <BellRing size={14} /> Reminder masivo
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(sf => (
          <button
            key={sf.value}
            onClick={() => setStatusFilter(sf.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === sf.value ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}
          >
            {sf.label}
            <span className="ml-1 opacity-70">
              ({sf.value === 'all' ? assignments.length : assignments.filter(a => a.status === sf.value).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-steel-900 border-b border-steel-700">
                <th className="table-header">Usuario</th>
                <th className="table-header">Training</th>
                <th className="table-header hidden md:table-cell">Estado</th>
                <th className="table-header hidden lg:table-cell">Progreso</th>
                <th className="table-header hidden lg:table-cell">Asignado</th>
                <th className="table-header hidden xl:table-cell">Vence</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-petroleum-700 rounded-full flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                        {a.user?.full_name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-steel-100 truncate max-w-[100px]">{a.user?.full_name}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-steel-200 truncate max-w-[140px] block">{a.training?.title}</span>
                  </td>
                  <td className="table-cell hidden md:table-cell"><StatusBadge status={a.status} /></td>
                  <td className="table-cell hidden lg:table-cell">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="progress-bar flex-1">
                        <div className="progress-fill" style={{ width: `${a.progress_percentage}%` }} />
                      </div>
                      <span className="text-xs text-steel-400 w-8 text-right">{a.progress_percentage}%</span>
                    </div>
                  </td>
                  <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                    {new Date(a.assigned_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="table-cell hidden xl:table-cell text-xs text-steel-400">
                    {a.due_date ? new Date(a.due_date).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="table-cell text-right">
                    {['not_started', 'in_progress', 'pending_test'].includes(a.status) && (
                      <button
                        onClick={() => sendReminder(a.id)}
                        className={`p-1.5 rounded transition-colors text-xs ${remindSent.has(a.id) ? 'text-emerald-400 bg-emerald-500/10' : 'text-steel-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                        title="Enviar reminder"
                      >
                        {remindSent.has(a.id) ? <BellRing size={14} /> : <Bell size={14} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={<ClipboardList size={28} />} title="Sin asignaciones" description="No hay asignaciones con los filtros seleccionados." />
        )}
      </div>
    </div>
  );
}
