import React, { useState } from 'react';
import { Search, BookOpen, Clock, Award, Users, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getTrainingsByTenant, getUsersByTenant } from '../../lib/mockData';
import type { Training } from '../../types';
import Modal from '../../components/ui/Modal';

export default function AdminTrainings() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const trainings = getTrainingsByTenant(tenantId);
  const users = getUsersByTenant(tenantId).filter(u => u.status === 'active');

  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState<Training | null>(null);
  const [showAssign, setShowAssign] = useState<Training | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [assignAll, setAssignAll] = useState(false);

  const filtered = trainings.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  const handleAssign = () => {
    const targets = assignAll ? users.map(u => u.id) : Array.from(selectedUsers);
    alert(`Training "${showAssign?.title}" asignado a ${targets.length} usuario(s). (Simulado)`);
    setShowAssign(null);
    setSelectedUsers(new Set());
    setAssignAll(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar training..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(tr => (
          <div key={tr.id} className="card hover:border-steel-600 transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-petroleum-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-steel-100 mb-1">{tr.title}</div>
                <p className="text-xs text-steel-400 line-clamp-2">{tr.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-info">{tr.category}</span>
              <span className="badge badge-neutral flex items-center gap-1"><Clock size={10} /> {tr.duration_minutes} min</span>
              {tr.certificate_enabled && <span className="badge badge-warning flex items-center gap-1"><Award size={10} /> Certifica</span>}
              {tr.validity_months && <span className="badge badge-neutral">{tr.validity_months}m vigencia</span>}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-steel-100">{tr.passing_score}%</div>
                <div className="text-xs text-steel-500">Min. aprobación</div>
              </div>
              <div className="bg-steel-900 rounded-lg p-2.5 text-center">
                <div className="text-sm font-bold text-steel-100">{tr.max_attempts ?? '∞'}</div>
                <div className="text-xs text-steel-500">Intentos</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowDetail(tr)} className="btn-ghost text-xs flex-1 justify-center">
                <ChevronRight size={13} /> Detalle
              </button>
              <button onClick={() => { setShowAssign(tr); setSelectedUsers(new Set()); setAssignAll(false); }} className="btn-primary text-xs flex-1 justify-center">
                <Plus size={13} /> Asignar
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-steel-500">
          <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay trainings habilitados para tu empresa.</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail.title} size="lg">
          <div className="space-y-4">
            <p className="text-sm text-steel-300">{showDetail.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Categoría', value: showDetail.category },
                { label: 'Duración', value: `${showDetail.duration_minutes} minutos` },
                { label: 'Puntaje mínimo', value: `${showDetail.passing_score}%` },
                { label: 'Intentos máx.', value: showDetail.max_attempts?.toString() ?? 'Ilimitado' },
                { label: 'Vigencia', value: showDetail.validity_months ? `${showDetail.validity_months} meses` : 'Sin vigencia' },
                { label: 'Emite certificado', value: showDetail.certificate_enabled ? 'Sí' : 'No' },
              ].map(item => (
                <div key={item.label} className="bg-steel-900 rounded-lg p-3">
                  <div className="text-xs text-steel-500 mb-1">{item.label}</div>
                  <div className="text-sm font-medium text-steel-200">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <Modal
          open={!!showAssign}
          onClose={() => setShowAssign(null)}
          title={`Asignar: ${showAssign.title}`}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowAssign(null)} className="btn-ghost">Cancelar</button>
              <button onClick={handleAssign} disabled={!assignAll && selectedUsers.size === 0} className="btn-primary">
                <Plus size={15} /> Asignar {assignAll ? 'a todos' : `(${selectedUsers.size})`}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer hover:bg-amber-500/15 transition-colors">
              <input type="checkbox" checked={assignAll} onChange={e => setAssignAll(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <div>
                <div className="text-sm font-semibold text-amber-300">Asignar a todos los usuarios activos</div>
                <div className="text-xs text-steel-400">{users.length} usuarios activos</div>
              </div>
            </label>
            {!assignAll && (
              <div className="space-y-1.5">
                <p className="text-xs text-steel-400 font-medium">O seleccioná usuarios individuales:</p>
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2.5 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(u.id)}
                      onChange={e => {
                        setSelectedUsers(prev => {
                          const s = new Set(prev);
                          if (e.target.checked) s.add(u.id);
                          else s.delete(u.id);
                          return s;
                        });
                      }}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-steel-100">{u.full_name}</div>
                      <div className="text-xs text-steel-400">{u.position ?? u.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
