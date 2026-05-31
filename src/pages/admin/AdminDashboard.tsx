import { Users, BookOpen, Award, TrendingUp, Clock, CheckCircle, Activity, XCircle } from 'lucide-react';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUsersByTenant, getAssignmentsByTenant, getCertificatesByTenant, mockFeedback, mockActivityLog
} from '../../lib/mockData';

interface ChartItem {
  label: string;
  value: number;
  className: string;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function DonutChart({ items, centerLabel, centerValue }: { items: ChartItem[]; centerLabel: string; centerValue: string | number }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative h-40 w-40 rounded-full bg-steel-800">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" strokeWidth="18" className="text-steel-800" />
          {items.map(item => {
            const dash = total ? (item.value / total) * 282.74 : 0;
            const offset = 282.74 - accumulated;
            accumulated += dash;
            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="18"
                strokeDasharray={`${dash} ${282.74 - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={item.className}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
          <div className="text-2xl font-bold text-steel-100">{centerValue}</div>
          <div className="text-xs text-steel-500">{centerLabel}</div>
        </div>
      </div>
      <div className="flex-1 w-full space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2.5 w-2.5 rounded-full ${item.className.replace('text-', 'bg-')}`} />
              <span className="text-sm text-steel-300 truncate">{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-steel-100">
              {item.value} <span className="text-xs font-normal text-steel-500">({percent(item.value, total)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ items, total }: { items: ChartItem[]; total: number }) {
  return (
    <div className="space-y-4">
      {items.map(item => {
        const width = percent(item.value, total);
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-steel-300">{item.label}</span>
              <span className="text-sm font-semibold text-steel-100">{item.value}</span>
            </div>
            <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
              <div className={`h-full rounded-full ${item.className.replace('text-', 'bg-')}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  const trainingStatusItems: ChartItem[] = [
    { label: 'Completados', value: completed, className: 'text-emerald-400' },
    { label: 'En curso', value: inProgress, className: 'text-sky-400' },
    { label: 'No iniciados', value: notStarted, className: 'text-slate-500' },
  ];

  const certificateItems: ChartItem[] = [
    { label: 'Vigentes', value: validCerts, className: 'text-emerald-400' },
    { label: 'Próx. a vencer', value: expiringSoon, className: 'text-amber-400' },
    { label: 'Vencidos', value: expiredCerts, className: 'text-red-400' },
  ];

  const areaProgress = users
    .filter(u => u.role === 'worker')
    .reduce<Record<string, { users: number; progress: number; assignments: number }>>((acc, profile) => {
      const area = profile.area ?? 'Sin área';
      const userAssignments = assignments.filter(a => a.user_id === profile.id);
      const userProgress = userAssignments.length
        ? Math.round(userAssignments.reduce((sum, assignment) => sum + assignment.progress_percentage, 0) / userAssignments.length)
        : 0;

      acc[area] = acc[area] ?? { users: 0, progress: 0, assignments: 0 };
      acc[area].users += 1;
      acc[area].progress += userProgress;
      acc[area].assignments += userAssignments.length;
      return acc;
    }, {});

  const areaItems = Object.entries(areaProgress).map(([area, data]) => ({
    label: area,
    value: data.users ? Math.round(data.progress / data.users) : 0,
    users: data.users,
    assignments: data.assignments,
  }));

  const actionLabel: Record<string, string> = {
    completed_training: 'completó un training',
    assigned_training: 'recibió una asignación',
    started_training: 'inició un training',
    certificate_issued: 'obtuvo un certificado',
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            Estado de trainings
          </h3>
          <p className="text-xs text-steel-500 mb-5">Distribución general de asignaciones activas.</p>
          <DonutChart items={trainingStatusItems} centerLabel="asignaciones" centerValue={assignments.length} />
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            Estado de certificados
          </h3>
          <p className="text-xs text-steel-500 mb-5">Vigencia, vencimientos próximos y certificados vencidos.</p>
          <HorizontalBars items={certificateItems} total={Math.max(certificates.length, 1)} />
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Users size={16} className="text-amber-400" />
            Avance por área
          </h3>
          <p className="text-xs text-steel-500 mb-5">Promedio de avance por sector de la empresa.</p>
          <div className="space-y-4">
            {areaItems.map(area => (
              <div key={area.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm text-steel-300">{area.label}</span>
                    <span className="text-xs text-steel-500 ml-2">{area.users} usuarios · {area.assignments} asignaciones</span>
                  </div>
                  <span className="text-sm font-semibold text-steel-100">{area.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${area.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            Actividad reciente
          </h3>
          <div className="space-y-2 mb-4">
            {activity.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-2.5 bg-steel-900 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Activity size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-steel-200">{actionLabel[item.action] ?? item.action}</div>
                  <div className="text-xs text-steel-500">{new Date(item.created_at).toLocaleDateString('es-AR')}</div>
                </div>
              </div>
            ))}
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
