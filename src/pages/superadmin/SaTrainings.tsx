import React, { useState } from 'react';
import { Plus, Search, BookOpen, Clock, Award, Edit, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import { mockTrainings } from '../../lib/mockData';
import type { Training } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

const CATEGORIES = ['Todos', 'HSE', 'Seguridad', 'Transporte', 'Eléctrico', 'Emergencias', 'Ambiental'];

export default function SaTrainings() {
  const [trainings, setTrainings] = useState(mockTrainings);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Training | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'HSE', duration_minutes: 60,
    validity_months: 12 as number | '', certificate_enabled: true,
    passing_score: 70, max_attempts: 3 as number | '',
  });

  const filtered = trainings.filter(t =>
    (category === 'Todos' || t.category === category) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setTrainings(ts => ts.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t));
  };

  const openEdit = (tr: Training) => {
    setEditTarget(tr);
    setForm({
      title: tr.title, description: tr.description, category: tr.category,
      duration_minutes: tr.duration_minutes, validity_months: tr.validity_months ?? '',
      certificate_enabled: tr.certificate_enabled, passing_score: tr.passing_score,
      max_attempts: tr.max_attempts ?? '',
    });
  };

  const handleSave = () => {
    if (editTarget) {
      setTrainings(ts => ts.map(t => t.id === editTarget.id ? {
        ...t, ...form,
        validity_months: form.validity_months === '' ? null : Number(form.validity_months),
        max_attempts: form.max_attempts === '' ? null : Number(form.max_attempts),
      } : t));
      setEditTarget(null);
    } else {
      const newTr: Training = {
        id: `tr${Date.now()}`, ...form,
        validity_months: form.validity_months === '' ? null : Number(form.validity_months),
        max_attempts: form.max_attempts === '' ? null : Number(form.max_attempts),
        status: 'active', created_at: new Date().toISOString(), module_count: 0, tenant_count: 0,
      };
      setTrainings(ts => [...ts, newTr]);
      setShowCreate(false);
    }
    setForm({ title: '', description: '', category: 'HSE', duration_minutes: 60, validity_months: 12, certificate_enabled: true, passing_score: 70, max_attempts: 3 });
  };

  const TrainingForm = () => (
    <div className="space-y-4">
      <div>
        <label className="label">Título *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Ej: Inducción HSE" />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" rows={3} placeholder="Descripción del training..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Categoría</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="select">
            {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Duración (min)</label>
          <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} className="input" min={1} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Vigencia (meses)</label>
          <input type="number" value={form.validity_months} onChange={e => setForm(f => ({ ...f, validity_months: e.target.value === '' ? '' : Number(e.target.value) }))} className="input" min={1} placeholder="Sin vigencia" />
        </div>
        <div>
          <label className="label">Puntaje mínimo (%)</label>
          <input type="number" value={form.passing_score} onChange={e => setForm(f => ({ ...f, passing_score: Number(e.target.value) }))} className="input" min={0} max={100} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Intentos máx.</label>
          <input type="number" value={form.max_attempts} onChange={e => setForm(f => ({ ...f, max_attempts: e.target.value === '' ? '' : Number(e.target.value) }))} className="input" min={1} placeholder="Ilimitado" />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, certificate_enabled: !f.certificate_enabled }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.certificate_enabled ? 'bg-amber-500' : 'bg-steel-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.certificate_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-steel-300">Emite certificado</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar training..." />
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Nuevo training
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(tr => (
          <div key={tr.id} className="card hover:border-steel-600 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="text-base font-semibold text-steel-100 mb-1">{tr.title}</div>
                <p className="text-xs text-steel-400 line-clamp-2">{tr.description}</p>
              </div>
              <StatusBadge status={tr.status} />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-info">{tr.category}</span>
              <span className="badge badge-neutral flex items-center gap-1"><Clock size={10} /> {tr.duration_minutes} min</span>
              {tr.certificate_enabled && <span className="badge badge-warning flex items-center gap-1"><Award size={10} /> Certifica</span>}
              {tr.validity_months && <span className="badge badge-neutral">{tr.validity_months} meses</span>}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-steel-900 rounded-lg p-2">
                <div className="text-sm font-bold text-steel-100">{tr.module_count}</div>
                <div className="text-xs text-steel-500">Módulos</div>
              </div>
              <div className="bg-steel-900 rounded-lg p-2">
                <div className="text-sm font-bold text-steel-100">{tr.passing_score}%</div>
                <div className="text-xs text-steel-500">Min. aprobación</div>
              </div>
              <div className="bg-steel-900 rounded-lg p-2">
                <div className="text-sm font-bold text-steel-100">{tr.tenant_count}</div>
                <div className="text-xs text-steel-500">Empresas</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(tr)} className="btn-ghost text-xs flex-1 justify-center">
                <Edit size={13} /> Editar
              </button>
              <button onClick={() => toggleStatus(tr.id)} className={`btn-ghost text-xs flex-1 justify-center ${tr.status === 'active' ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                {tr.status === 'active' ? <><ToggleRight size={13} /> Desactivar</> : <><ToggleLeft size={13} /> Activar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showCreate || !!editTarget}
        onClose={() => { setShowCreate(false); setEditTarget(null); }}
        title={editTarget ? `Editar: ${editTarget.title}` : 'Nuevo training'}
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowCreate(false); setEditTarget(null); }} className="btn-ghost">Cancelar</button>
            <button onClick={handleSave} disabled={!form.title} className="btn-primary">
              {editTarget ? 'Guardar cambios' : <><Plus size={15} /> Crear training</>}
            </button>
          </>
        }
      >
        <TrainingForm />
      </Modal>
    </div>
  );
}
