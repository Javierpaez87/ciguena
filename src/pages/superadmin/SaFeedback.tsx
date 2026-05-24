import React, { useState } from 'react';
import { MessageSquare, Star, Filter } from 'lucide-react';
import { mockFeedback, mockProfiles, mockTrainings, mockTenants } from '../../lib/mockData';

export default function SaFeedback() {
  const [tenantFilter, setTenantFilter] = useState('all');
  const [trainingFilter, setTrainingFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const enriched = mockFeedback.map(f => ({
    ...f,
    user: mockProfiles.find(p => p.id === f.user_id),
    training: f.training_id ? mockTrainings.find(t => t.id === f.training_id) : null,
    tenant: mockTenants.find(t => t.id === f.tenant_id),
  }));

  const filtered = enriched.filter(f =>
    (tenantFilter === 'all' || f.tenant_id === tenantFilter) &&
    (trainingFilter === 'all' || f.training_id === trainingFilter) &&
    (typeFilter === 'all' || f.feedback_type === typeFilter)
  );

  const avgRating = filtered.length ? (filtered.reduce((s, f) => s + f.rating, 0) / filtered.length).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-amber-400">{avgRating}</div>
          <div className="flex justify-center my-1">
            {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= Number(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-steel-600'} />)}
          </div>
          <div className="text-xs text-steel-400">Rating promedio</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-steel-50">{filtered.length}</div>
          <div className="text-xs text-steel-400 mt-1">Reseñas totales</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-steel-50">{filtered.filter(f => f.feedback_type === 'training').length}</div>
          <div className="text-xs text-steel-400 mt-1">Sobre trainings</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-2xl font-bold text-steel-50">{filtered.filter(f => f.feedback_type === 'platform').length}</div>
          <div className="text-xs text-steel-400 mt-1">Sobre plataforma</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className="select w-auto">
          <option value="all">Todas las empresas</option>
          {mockTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={trainingFilter} onChange={e => setTrainingFilter(e.target.value)} className="select w-auto">
          <option value="all">Todos los trainings</option>
          {mockTrainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select w-auto">
          <option value="all">Todos los tipos</option>
          <option value="training">Training</option>
          <option value="platform">Plataforma</option>
        </select>
      </div>

      {/* Feedback cards */}
      <div className="space-y-3">
        {filtered.map(fb => (
          <div key={fb.id} className="card hover:border-steel-600 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-petroleum-700 rounded-full flex items-center justify-center text-sm font-bold text-petroleum-200 flex-shrink-0">
                {fb.user?.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-steel-100">{fb.user?.full_name}</span>
                    <span className="text-xs text-steel-500 ml-2">· {fb.tenant?.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-steel-600'} />)}
                  </div>
                </div>
                {fb.training && (
                  <span className="badge badge-info text-xs mb-2">{fb.training.title}</span>
                )}
                {!fb.training && (
                  <span className="badge badge-neutral text-xs mb-2">Plataforma</span>
                )}
                {fb.comment && <p className="text-sm text-steel-300 mt-1">{fb.comment}</p>}
                <p className="text-xs text-steel-500 mt-2">{new Date(fb.created_at).toLocaleDateString('es-AR')}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-steel-500">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay feedback con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
