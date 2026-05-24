import React, { useState } from 'react';
import { Award, Download, Search, Bell, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCertificatesByTenant } from '../../lib/mockData';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'valid', label: 'Vigentes' },
  { value: 'expiring_soon', label: 'Próx. a vencer' },
  { value: 'expired', label: 'Vencidos' },
];

export default function AdminCertificates() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const certificates = getCertificatesByTenant(tenantId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = certificates.filter(c =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    (c.user?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.training?.title.toLowerCase().includes(search.toLowerCase()))
  );

  const exportCSV = () => {
    const headers = 'Usuario,Training,Código,Emitido,Vence,Estado\n';
    const rows = filtered.map(c =>
      `${c.user?.full_name},${c.training?.title},${c.certificate_code},${new Date(c.issued_at).toLocaleDateString('es-AR')},${c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-AR') : '-'},${c.status}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'certificados.csv'; a.click();
  };

  const sendReminderExpiring = () => {
    const expiring = filtered.filter(c => c.status === 'expiring_soon' || c.status === 'expired');
    alert(`Reminders enviados a ${expiring.length} usuario(s) con certificados por vencer o vencidos. (Simulado)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar usuario o training..." />
        </div>
        <div className="flex gap-2">
          <button onClick={sendReminderExpiring} className="btn-secondary text-xs"><Bell size={14} /> Reminder vencidos</button>
          <button onClick={exportCSV} className="btn-secondary text-xs"><Download size={14} /> Exportar CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {STATUS_FILTERS.filter(sf => sf.value !== 'all').map(sf => (
          <div key={sf.value} className={`metric-card text-center cursor-pointer transition-all ${statusFilter === sf.value ? 'border-amber-500' : ''}`} onClick={() => setStatusFilter(sf.value === statusFilter ? 'all' : sf.value)}>
            <div className={`text-2xl font-bold ${sf.value === 'valid' ? 'text-emerald-400' : sf.value === 'expiring_soon' ? 'text-amber-400' : 'text-red-400'}`}>
              {certificates.filter(c => c.status === sf.value).length}
            </div>
            <div className="text-xs text-steel-400 mt-1">{sf.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(sf => (
          <button key={sf.value} onClick={() => setStatusFilter(sf.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === sf.value ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}>
            {sf.label} ({sf.value === 'all' ? certificates.length : certificates.filter(c => c.status === sf.value).length})
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
                <th className="table-header hidden md:table-cell">Código</th>
                <th className="table-header hidden lg:table-cell">Emitido</th>
                <th className="table-header hidden lg:table-cell">Vence</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-petroleum-700 rounded-full flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                        {c.user?.full_name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-steel-100 truncate max-w-[100px]">{c.user?.full_name}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-steel-200 truncate max-w-[140px] block">{c.training?.title}</span>
                  </td>
                  <td className="table-cell hidden md:table-cell font-mono text-xs text-steel-400">{c.certificate_code}</td>
                  <td className="table-cell hidden lg:table-cell text-xs text-steel-400">{new Date(c.issued_at).toLocaleDateString('es-AR')}</td>
                  <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell text-right">
                    <button className="p-1.5 rounded hover:bg-steel-700 text-steel-400 hover:text-amber-400 transition-colors" title="Descargar certificado">
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={<Award size={28} />} title="Sin certificados" description="No hay certificados con los filtros seleccionados." />
        )}
      </div>
    </div>
  );
}
