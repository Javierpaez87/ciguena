import React from 'react';
import { Building2, Users, BookOpen, Award, TrendingUp, MessageSquare, Activity, CheckCircle } from 'lucide-react';
import MetricCard from '../../components/ui/MetricCard';
import { mockTenants, mockProfiles, mockTrainings, mockCertificates, mockFeedback, mockActivityLog, mockAssignments } from '../../lib/mockData';

export default function SaDashboard() {
  const totalUsers = mockProfiles.filter(p => p.role === 'worker').length;
  const activeTrainings = mockTrainings.filter(t => t.status === 'active').length;
  const totalCerts = mockCertificates.length;
  const completedAssignments = mockAssignments.filter(a => a.status === 'certificate_issued' || a.status === 'completed' || a.status === 'passed').length;
  const totalAssignments = mockAssignments.length;
  const completionRate = Math.round((completedAssignments / totalAssignments) * 100);
  const avgRating = (mockFeedback.reduce((s, f) => s + f.rating, 0) / mockFeedback.length).toFixed(1);

  const recentActivity = [...mockActivityLog].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const actionsLabel: Record<string, string> = {
    completed_training: 'completó el training',
    assigned_training: 'asignó el training',
    started_training: 'inició el training',
    certificate_issued: 'certificado emitido',
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Empresas activas" value={mockTenants.filter(t => t.status === 'active').length} icon={<Building2 size={20} />} accent="amber" subtitle={`${mockTenants.length} tenants total`} />
        <MetricCard title="Usuarios totales" value={totalUsers} icon={<Users size={20} />} accent="blue" />
        <MetricCard title="Trainings activos" value={activeTrainings} icon={<BookOpen size={20} />} accent="green" subtitle={`${mockTrainings.length} en catálogo`} />
        <MetricCard title="Certificados emitidos" value={totalCerts} icon={<Award size={20} />} accent="amber" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Completitud global" value={`${completionRate}%`} icon={<TrendingUp size={20} />} accent="green" subtitle={`${completedAssignments}/${totalAssignments} asignaciones`} />
        <MetricCard title="Feedback promedio" value={`${avgRating}/5`} icon={<MessageSquare size={20} />} accent="amber" subtitle={`${mockFeedback.length} reseñas`} />
        <MetricCard title="Asignaciones totales" value={totalAssignments} icon={<CheckCircle size={20} />} accent="blue" />
        <MetricCard title="Trainings en catálogo" value={mockTrainings.length} icon={<BookOpen size={20} />} accent="steel" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants overview */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-amber-400" />
            Empresas cliente
          </h3>
          <div className="space-y-3">
            {mockTenants.map(tenant => (
              <div key={tenant.id} className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700">
                <div className="w-8 h-8 bg-petroleum-700 rounded-lg flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                  {tenant.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-steel-100 truncate">{tenant.name}</div>
                  <div className="text-xs text-steel-400">{tenant.user_count} usuarios · {tenant.training_count} trainings</div>
                </div>
                <span className={`badge ${tenant.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                  {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            Actividad reciente
          </h3>
          <div className="space-y-3">
            {mockFeedback.slice(0, 4).map(fb => (
              <div key={fb.id} className="flex items-start gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700">
                <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={12} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-steel-200 line-clamp-2">{fb.comment}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xs ${s <= fb.rating ? 'text-amber-400' : 'text-steel-600'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-steel-500">{new Date(fb.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trainings table */}
      <div className="card">
        <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-amber-400" />
          Catálogo de trainings
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-steel-700">
                <th className="table-header">Training</th>
                <th className="table-header">Categoría</th>
                <th className="table-header">Duración</th>
                <th className="table-header">Módulos</th>
                <th className="table-header">Empresas</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {mockTrainings.map(tr => (
                <tr key={tr.id} className="table-row">
                  <td className="table-cell font-medium text-steel-100">{tr.title}</td>
                  <td className="table-cell">
                    <span className="badge badge-info">{tr.category}</span>
                  </td>
                  <td className="table-cell text-steel-400">{tr.duration_minutes} min</td>
                  <td className="table-cell text-steel-400">{tr.module_count}</td>
                  <td className="table-cell text-steel-400">{tr.tenant_count}</td>
                  <td className="table-cell">
                    <span className={`badge ${tr.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {tr.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
