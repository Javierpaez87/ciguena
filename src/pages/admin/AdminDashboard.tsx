// AdminDashboard.tsx · v3 · 8 KPI cards superiores con gráficos integrados
import { Users, BookOpen, Award, TrendingUp, Clock, CheckCircle, Activity, XCircle } from 'lucide-react';
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

interface MiniMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: 'amber' | 'blue' | 'green' | 'red' | 'steel';
  chartType: 'donut' | 'bar' | 'spark';
  chartValue: number;
  chartLabel?: string;
}

const accentStyles = {
  amber: {
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    bar: 'bg-amber-400',
    ring: 'text-amber-400',
  },
  blue: {
    icon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    bar: 'bg-blue-400',
    ring: 'text-blue-400',
  },
  green: {
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    bar: 'bg-emerald-400',
    ring: 'text-emerald-400',
  },
  red: {
    icon: 'bg-red-500/10 text-red-400 border-red-500/20',
    bar: 'bg-red-400',
    ring: 'text-red-400',
  },
  steel: {
    icon: 'bg-steel-700 text-steel-300 border-steel-600',
    bar: 'bg-steel-400',
    ring: 'text-steel-400',
  },
};

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function DonutChart({ items, centerLabel, centerValue }: { items: ChartItem[]; centerLabel: string; centerValue: string | number }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative h-36 w-36 flex-shrink-0 rounded-full bg-steel-800">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full px-3 text-center">
          <div className="text-2xl font-bold leading-none text-steel-100">{centerValue}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-steel-500">{centerLabel}</div>
        </div>
      </div>
      <div className="flex-1 w-full space-y-3 min-w-0">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${item.className.replace('text-', 'bg-')}`} />
              <span className="text-sm text-steel-300 truncate">{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-steel-100 whitespace-nowrap">
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

function MiniChart({ type, value, accent }: { type: MiniMetricCardProps['chartType']; value: number; accent: MiniMetricCardProps['accent'] }) {
  const safeValue = clampPercent(value);
  const styles = accentStyles[accent];
  const circumference = 100.53;
  const dash = (safeValue / 100) * circumference;
  const sparkBars = [38, 55, 44, 72, 58, safeValue || 8];

  if (type === 'donut') {
    return (
      <div className="relative h-16 w-16 flex-shrink-0">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="5" className="text-steel-800" />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            className={styles.ring}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-steel-200">
          {safeValue}%
        </div>
      </div>
    );
  }

  if (type === 'spark') {
    return (
      <div className="flex h-14 w-20 items-end gap-1.5 rounded-xl bg-steel-950/40 px-2 py-2">
        {sparkBars.map((bar, index) => (
          <div key={index} className="flex-1 rounded-full bg-steel-700 overflow-hidden">
            <div className={`w-full rounded-full ${styles.bar}`} style={{ height: `${clampPercent(bar)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-20">
      <div className="mb-1 flex items-center justify-between text-[10px] text-steel-500">
        <span>avance</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function MiniMetricCard({ title, value, subtitle, icon, accent, chartType, chartValue, chartLabel }: MiniMetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="card p-4 min-h-[170px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>
        <MiniChart type={chartType} value={chartValue} accent={accent} />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold leading-tight text-steel-100">{value}</div>
        <div className="mt-1 text-sm font-medium text-steel-300 leading-snug">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-steel-500 leading-snug">{subtitle}</div>}
        {chartLabel && <div className="mt-2 text-[10px] uppercase tracking-wide text-steel-600">{chartLabel}</div>}
      </div>
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
  const completionRate = percent(completed, assignments.length);
  const activeUserRate = percent(activeUsers, users.length);
  const inProgressRate = percent(inProgress, assignments.length);
  const notStartedRate = percent(notStarted, assignments.length);
  const validCertRate = percent(validCerts, certificates.length);
  const expiredCertRate = percent(expiredCerts, Math.max(certificates.length, 1));
  const expiringSoonRate = percent(expiringSoon, Math.max(certificates.length, 1));

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
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">Indicadores principales</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MiniMetricCard
            title="Usuarios totales"
            value={users.length}
            icon={<Users size={20} />}
            accent="amber"
            subtitle={`${activeUsers} activos`}
            chartType="donut"
            chartValue={activeUserRate}
            chartLabel="usuarios activos"
          />
          <MiniMetricCard
            title="Trainings asignados"
            value={assignments.length}
            icon={<BookOpen size={20} />}
            accent="blue"
            subtitle={`${completed} completados`}
            chartType="bar"
            chartValue={completionRate}
            chartLabel="cumplimiento"
          />
          <MiniMetricCard
            title="Certificados vigentes"
            value={validCerts}
            icon={<Award size={20} />}
            accent="green"
            subtitle={`${certificates.length} certificados totales`}
            chartType="donut"
            chartValue={validCertRate}
            chartLabel="vigencia"
          />
          <MiniMetricCard
            title="Avance promedio"
            value={`${avgProgress}%`}
            icon={<TrendingUp size={20} />}
            accent="amber"
            subtitle="promedio de la empresa"
            chartType="spark"
            chartValue={avgProgress}
            chartLabel="avance general"
          />
          <MiniMetricCard
            title="No iniciados"
            value={notStarted}
            icon={<Clock size={20} />}
            accent="steel"
            subtitle={`${notStartedRate}% de asignaciones`}
            chartType="bar"
            chartValue={notStartedRate}
            chartLabel="pendientes"
          />
          <MiniMetricCard
            title="En curso"
            value={inProgress}
            icon={<Activity size={20} />}
            accent="blue"
            subtitle={`${inProgressRate}% de asignaciones`}
            chartType="spark"
            chartValue={inProgressRate}
            chartLabel="actividad"
          />
          <MiniMetricCard
            title="Completados"
            value={completed}
            icon={<CheckCircle size={20} />}
            accent="green"
            subtitle={`${completionRate}% de cumplimiento`}
            chartType="donut"
            chartValue={completionRate}
            chartLabel="finalizados"
          />
          <MiniMetricCard
            title="Certs. vencidos"
            value={expiredCerts}
            icon={<XCircle size={20} />}
            accent="red"
            subtitle={`${expiringSoon} próximos a vencer`}
            chartType="bar"
            chartValue={expiredCerts > 0 ? expiredCertRate : expiringSoonRate}
            chartLabel={expiredCerts > 0 ? 'riesgo vencido' : 'riesgo próximo'}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-1">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            Estado de trainings
          </h3>
          <p className="text-xs text-steel-500 mb-5">Distribución general de asignaciones activas.</p>
          <DonutChart items={trainingStatusItems} centerLabel="total" centerValue={assignments.length} />
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
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <span className="text-sm text-steel-300">{area.label}</span>
                    <span className="text-xs text-steel-500 ml-2">{area.users} usuarios · {area.assignments} asignaciones</span>
                  </div>
                  <span className="text-sm font-semibold text-steel-100 whitespace-nowrap">{area.value}%</span>
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
