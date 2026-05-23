import React from 'react';
import { Users, BookOpen, Award, TrendingUp, Clock, AlertTriangle, CheckCircle, Activity, XCircle } from 'lucide-react';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUsersByTenant, getAssignmentsByTenant, getCertificatesByTenant, mockFeedback, mockActivityLog
} from '../../lib/mockData';

export default function AdminDashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';

  const users = getUsersByTenant(tenantId);
  const assignments = getAssignmentsByTenant(tenantId);
  const certificates = getCertificatesByTenant(tenantId);
  const feedback = mockFeedback.filter(f => f.tenant_id === tenantId);
  const activity = mockActivityLog.filter(a => a.tenant_id === tenantId).slice(0, 5);

  const activeUsers = users.filter(u => u.status === 'active').length;
  const notStarted = assignments.filter(a => a.status === 'not_started').length;
  const inProgress = assignments.filter(a => a.status === 'in_progress').length;
  const completed = assignments.filter(a => ['completed', 'passed', 'certificate_issued'].includes(a.status)).length;
  const validCerts = certificates.filter(c => c.status === 'valid').length;
  const expiredCerts = certificates.filter(c => c.status === 'expired').length;
  const expiringSoon = certificates.filter(c => c.status === 'expiring_soon').length;
  const avgProgress = assignments.length ? Math.round(assignments.reduce((s, a) => s + a.progress_percentage, 0) / assignments.length) : 0;

  const actionLabel: Record<string, string> = {
    completed_training: 'completó',
    assigned_training: 'fue asignado a',
    started_training: 'inició',
    certificate_issued: 'certificado emitido para',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Usuarios totales" value={users.length} icon={<Users size={20} />} accent="amber" subtitle={`${activeUsers} activos`} />
        <MetricCard title="Trainings asignados" value={assignments.length} icon={<BookOpen size={20} />} accent="blue" />
        <MetricCard title="Certificados vigentes" value={validCerts} icon={<Award size={20} />} accent="green" />
        <MetricCard title="Avance promedio" value={`${avgProgress}%`} icon={<TrendingUp size={20} />} accent="amber" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="No iniciados" value={notStarted} icon={<Clock size={20} />} accent="steel" />
        <MetricCard title="En curso" value={inProgress} icon={<Activity size={20} />} accent="blue" />
        <MetricCard title="Completados" value={completed} icon={<CheckCircle size={20} />} accent="green" />
        <MetricCard title="Certs. vencidos" value={expiredCerts} icon={<XCircle size={20} />} accent="red" subtitle={`${expiringSoon} próximos a vencer`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent assignments */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            Asignaciones recientes
          </h3>
          <div className="space-y-2">
            {assignments.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 bg-steel-900 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-steel-100 truncate">{a.user?.full_name}</div>
                  <div className="text-xs text-steel-400 truncate">{a.training?.title}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <StatusBadge status={a.status} />
                  <div className="text-xs text-steel-500 mt-1">{a.progress_percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificates */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            Certificados
          </h3>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="text-sm text-emerald-300 flex items-center gap-2"><CheckCircle size={14} /> Vigentes</span>
              <span className="text-lg font-bold text-emerald-400">{validCerts}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-sm text-amber-300 flex items-center gap-2"><AlertTriangle size={14} /> Próx. a vencer</span>
              <span className="text-lg font-bold text-amber-400">{expiringSoon}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-sm text-red-300 flex items-center gap-2"><XCircle size={14} /> Vencidos</span>
              <span className="text-lg font-bold text-red-400">{expiredCerts}</span>
            </div>
          </div>
          {feedback.length > 0 && (
            <div className="border-t border-steel-700 pt-3">
              <div className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2">Último feedback</div>
              <p className="text-sm text-steel-300 line-clamp-2">{feedback[0].comment}</p>
              <div className="flex mt-1">
                {[1,2,3,4,5].map(s => <span key={s} className={`text-xs ${s <= feedback[0].rating ? 'text-amber-400' : 'text-steel-600'}`}>★</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
