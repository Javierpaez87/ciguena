import React from 'react';
import { BookOpen, Award, TrendingUp, Clock, AlertTriangle, CheckCircle, Play } from 'lucide-react';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignmentsByUser, getCertificatesByUser } from '../../lib/mockData';

interface WorkerDashboardProps {
  onNavigate: (view: string) => void;
}

export default function WorkerDashboard({ onNavigate }: WorkerDashboardProps) {
  const { user } = useAuth();
  const assignments = getAssignmentsByUser(user?.id ?? 'u1');
  const certificates = getCertificatesByUser(user?.id ?? 'u1');

  const pending = assignments.filter(a => a.status === 'not_started').length;
  const inProgress = assignments.filter(a => a.status === 'in_progress').length;
  const completed = assignments.filter(a => ['completed', 'passed', 'certificate_issued'].includes(a.status)).length;
  const expiringSoon = certificates.filter(c => c.status === 'expiring_soon').length;
  const avgProgress = assignments.length ? Math.round(assignments.reduce((s, a) => s + a.progress_percentage, 0) / assignments.length) : 0;

  const activeAssignments = assignments.filter(a => !['certificate_issued', 'completed'].includes(a.status)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Pendientes" value={pending} icon={<Clock size={20} />} accent="amber" />
        <MetricCard title="En curso" value={inProgress} icon={<Play size={20} />} accent="blue" />
        <MetricCard title="Completados" value={completed} icon={<CheckCircle size={20} />} accent="green" />
        <MetricCard title="Certificados" value={certificates.length} icon={<Award size={20} />} accent="amber" subtitle={expiringSoon > 0 ? `${expiringSoon} próximos a vencer` : undefined} />
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-steel-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" />
            Tu progreso general
          </h3>
          <span className="text-2xl font-bold text-amber-400">{avgProgress}%</span>
        </div>
        <div className="progress-bar h-2.5">
          <div className="progress-fill h-full" style={{ width: `${avgProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-steel-500 mt-2">
          <span>{completed} completados</span>
          <span>{assignments.length} total</span>
        </div>
      </div>

      {/* Active trainings */}
      {activeAssignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-steel-300">Continuar donde lo dejaste</h3>
          {activeAssignments.map(a => (
            <div key={a.id} className="card hover:border-amber-500/40 transition-all cursor-pointer" onClick={() => onNavigate('worker-trainings')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-petroleum-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-petroleum-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-steel-100 mb-1">{a.training?.title}</div>
                  <div className="flex items-center gap-3">
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width: `${a.progress_percentage}%` }} />
                    </div>
                    <span className="text-xs text-steel-400 flex-shrink-0">{a.progress_percentage}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={a.status} />
                  <button className="btn-primary text-xs py-1 px-3">
                    {a.status === 'not_started' ? 'Comenzar' : a.status === 'pending_test' ? 'Rendir test' : 'Continuar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expiring certs warning */}
      {expiringSoon > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-amber-300">Certificados próximos a vencer</div>
            <p className="text-xs text-steel-400 mt-1">Tenés {expiringSoon} certificado(s) que vencen pronto. Verificá tus certificados y renovalos a tiempo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
