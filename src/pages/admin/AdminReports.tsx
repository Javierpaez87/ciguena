// AdminReports.tsx · v2 · reportes ejecutivos con gráficos y tablas exportables
import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  Building,
  CalendarClock,
  CheckCircle,
  Download,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsersByTenant, getAssignmentsByTenant, getCertificatesByTenant } from '../../lib/mockData';

type ReportType = 'user' | 'training' | 'area';
type Accent = 'amber' | 'blue' | 'green' | 'red' | 'steel';

interface ChartItem {
  label: string;
  value: number;
  className: string;
}

interface ReportMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent: Accent;
  chartType: 'donut' | 'bar' | 'spark';
  chartValue: number;
}

const accentStyles: Record<Accent, { icon: string; bar: string; ring: string }> = {
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

function MiniChart({ type, value, accent }: { type: ReportMetricCardProps['chartType']; value: number; accent: Accent }) {
  const safeValue = clampPercent(value);
  const styles = accentStyles[accent];
  const circumference = 100.53;
  const dash = (safeValue / 100) * circumference;
  const sparkBars = [28, 42, 58, 51, 74, safeValue || 8];

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

function ReportMetricCard({ title, value, subtitle, icon, accent, chartType, chartValue }: ReportMetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="card p-4 min-h-[160px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>
        <MiniChart type={chartType} value={chartValue} accent={accent} />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold leading-tight text-steel-100">{value}</div>
        <div className="mt-1 text-sm font-medium text-steel-300 leading-snug">{title}</div>
        <div className="mt-1 text-xs text-steel-500 leading-snug">{subtitle}</div>
      </div>
    </div>
  );
}

function DonutChart({ items, centerLabel, centerValue }: { items: ChartItem[]; centerLabel: string; centerValue: string | number }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative h-32 w-32 flex-shrink-0 rounded-full bg-steel-800">
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

function HorizontalReportBars({ items }: { items: Array<{ label: string; value: number; meta?: string; accent?: Accent }> }) {
  const maxValue = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map(item => {
        const styles = accentStyles[item.accent ?? 'amber'];
        const width = Math.max(5, percent(item.value, maxValue));
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <span className="text-sm text-steel-300 truncate block">{item.label}</span>
                {item.meta && <span className="text-xs text-steel-500">{item.meta}</span>}
              </div>
              <span className="text-sm font-semibold text-steel-100 whitespace-nowrap">{item.value}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-steel-800 overflow-hidden">
              <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReports() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const users = getUsersByTenant(tenantId);
  const assignments = getAssignmentsByTenant(tenantId);
  const certificates = getCertificatesByTenant(tenantId);

  const [reportType, setReportType] = useState<ReportType>('user');

  const completedStatuses = ['certificate_issued', 'completed', 'passed'];
  const completedAssignments = assignments.filter(a => completedStatuses.includes(a.status)).length;
  const inProgressAssignments = assignments.filter(a => a.status === 'in_progress').length;
  const pendingAssignments = assignments.filter(a => a.status === 'not_started').length;
  const pendingTestAssignments = assignments.filter(a => a.status === 'pending_test').length;
  const failedAssignments = assignments.filter(a => a.status === 'failed').length;
  const avgProgress = assignments.length ? Math.round(assignments.reduce((s, a) => s + a.progress_percentage, 0) / assignments.length) : 0;
  const completionRate = percent(completedAssignments, assignments.length);

  const validCerts = certificates.filter(c => c.status === 'valid').length;
  const expiringSoonCerts = certificates.filter(c => c.status === 'expiring_soon').length;
  const expiredCerts = certificates.filter(c => c.status === 'expired').length;
  const certificateRiskRate = percent(expiringSoonCerts + expiredCerts, Math.max(certificates.length, 1));

  const userReport = users.map(u => {
    const userAssignments = assignments.filter(a => a.user_id === u.id);
    const userCerts = certificates.filter(c => c.user_id === u.id);
    return {
      name: u.full_name,
      position: u.position,
      area: u.area,
      contractor: u.contractor_company,
      total: userAssignments.length,
      completed: userAssignments.filter(a => completedStatuses.includes(a.status)).length,
      inProgress: userAssignments.filter(a => a.status === 'in_progress').length,
      pending: userAssignments.filter(a => a.status === 'not_started').length,
      certificates: userCerts.length,
      avgProgress: userAssignments.length ? Math.round(userAssignments.reduce((s, a) => s + a.progress_percentage, 0) / userAssignments.length) : 0,
    };
  });

  const trainingReport = [...new Set(assignments.map(a => a.training_id))].map(tid => {
    const tr = assignments.find(a => a.training_id === tid)?.training;
    const ta = assignments.filter(a => a.training_id === tid);
    return {
      name: tr?.title ?? tid,
      category: tr?.category ?? '—',
      assigned: ta.length,
      completed: ta.filter(a => completedStatuses.includes(a.status)).length,
      inProgress: ta.filter(a => a.status === 'in_progress').length,
      pending: ta.filter(a => a.status === 'not_started').length,
      failed: ta.filter(a => a.status === 'failed').length,
      avgProgress: ta.length ? Math.round(ta.reduce((s, a) => s + a.progress_percentage, 0) / ta.length) : 0,
    };
  });

  const areaReport = [...new Set(users.map(u => u.area ?? 'Sin área'))].map(area => {
    const areaUsers = users.filter(u => (u.area ?? 'Sin área') === area);
    const areaAssignments = assignments.filter(a => areaUsers.some(u => u.id === a.user_id));
    const completed = areaAssignments.filter(a => completedStatuses.includes(a.status)).length;
    const progress = areaAssignments.length ? Math.round(areaAssignments.reduce((s, a) => s + a.progress_percentage, 0) / areaAssignments.length) : 0;
    return {
      name: area,
      users: areaUsers.length,
      assignments: areaAssignments.length,
      completed,
      pending: areaAssignments.filter(a => a.status === 'not_started').length,
      completion: percent(completed, areaAssignments.length),
      progress,
    };
  });

  const criticalUsers = [...userReport]
    .filter(r => r.total > 0)
    .sort((a, b) => a.avgProgress - b.avgProgress)
    .slice(0, 5);

  const criticalTrainings = [...trainingReport]
    .filter(r => r.assigned > 0)
    .sort((a, b) => a.avgProgress - b.avgProgress)
    .slice(0, 5);

  const expiringCertificates = certificates
    .filter(c => c.status !== 'valid')
    .slice()
    .sort((a, b) => new Date(a.expires_at ?? a.created_at).getTime() - new Date(b.expires_at ?? b.created_at).getTime())
    .slice(0, 5);

  const statusItems: ChartItem[] = [
    { label: 'Completados', value: completedAssignments, className: 'text-emerald-400' },
    { label: 'En curso', value: inProgressAssignments, className: 'text-blue-400' },
    { label: 'Pendientes', value: pendingAssignments, className: 'text-slate-500' },
    { label: 'Pend. examen', value: pendingTestAssignments, className: 'text-amber-400' },
    { label: 'Fallidos', value: failedAssignments, className: 'text-red-400' },
  ];

  const certItems: ChartItem[] = [
    { label: 'Vigentes', value: validCerts, className: 'text-emerald-400' },
    { label: 'Próx. a vencer', value: expiringSoonCerts, className: 'text-amber-400' },
    { label: 'Vencidos', value: expiredCerts, className: 'text-red-400' },
  ];

  const downloadCSV = () => {
    let headers = '', rows = '';
    if (reportType === 'user') {
      headers = 'Nombre,Puesto,Área,Total,Completados,En curso,Pendientes,Progreso promedio,Certificados\n';
      rows = userReport.map(r => `${r.name},${r.position ?? ''},${r.area ?? ''},${r.total},${r.completed},${r.inProgress},${r.pending},${r.avgProgress}%,${r.certificates}`).join('\n');
    } else if (reportType === 'training') {
      headers = 'Training,Categoría,Asignados,Completados,En curso,Pendientes,Fallidos,Avance promedio\n';
      rows = trainingReport.map(r => `${r.name},${r.category},${r.assigned},${r.completed},${r.inProgress},${r.pending},${r.failed},${r.avgProgress}%`).join('\n');
    } else if (reportType === 'area') {
      headers = 'Área,Usuarios,Asignaciones,Completados,Pendientes,% Completitud,Avance promedio\n';
      rows = areaReport.map(r => `${r.name},${r.users},${r.assignments},${r.completed},${r.pending},${r.completion}%,${r.progress}%`).join('\n');
    }
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-${reportType}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">Reportes ejecutivos</h2>
            <p className="text-sm text-steel-400 mt-1">Vista comercial del cumplimiento, riesgos y avance operativo de la empresa.</p>
          </div>
          <button onClick={downloadCSV} className="btn-secondary text-xs w-fit"><Download size={14} /> Exportar CSV</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportMetricCard
            title="Cumplimiento general"
            value={`${completionRate}%`}
            subtitle={`${completedAssignments} de ${assignments.length} asignaciones completadas`}
            icon={<CheckCircle size={20} />}
            accent="green"
            chartType="donut"
            chartValue={completionRate}
          />
          <ReportMetricCard
            title="Avance promedio"
            value={`${avgProgress}%`}
            subtitle="Promedio de progreso de trainings activos"
            icon={<TrendingUp size={20} />}
            accent="amber"
            chartType="spark"
            chartValue={avgProgress}
          />
          <ReportMetricCard
            title="Certificados en riesgo"
            value={expiringSoonCerts + expiredCerts}
            subtitle={`${expiringSoonCerts} próximos · ${expiredCerts} vencidos`}
            icon={<AlertTriangle size={20} />}
            accent={(expiringSoonCerts + expiredCerts) > 0 ? 'red' : 'green'}
            chartType="bar"
            chartValue={certificateRiskRate}
          />
          <ReportMetricCard
            title="Usuarios alcanzados"
            value={users.length}
            subtitle={`${userReport.filter(r => r.total > 0).length} con trainings asignados`}
            icon={<Users size={20} />}
            accent="blue"
            chartType="donut"
            chartValue={percent(userReport.filter(r => r.total > 0).length, users.length)}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BarChart2 size={16} className="text-amber-400" />
            Estado de asignaciones
          </h3>
          <p className="text-xs text-steel-500 mb-5">Distribución general por estado operativo.</p>
          <DonutChart items={statusItems} centerLabel="total" centerValue={assignments.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Award size={16} className="text-amber-400" />
            Estado de certificados
          </h3>
          <p className="text-xs text-steel-500 mb-5">Vigencia y riesgos próximos para seguimiento HSE.</p>
          <DonutChart items={certItems} centerLabel="certs" centerValue={certificates.length} />
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Building size={16} className="text-amber-400" />
            Cumplimiento por área
          </h3>
          <p className="text-xs text-steel-500 mb-5">Comparativo de avance por sector.</p>
          <HorizontalReportBars
            items={areaReport.map(area => ({
              label: area.name,
              value: area.progress,
              meta: `${area.users} usuarios · ${area.assignments} asignaciones`,
              accent: area.progress >= 70 ? 'green' : area.progress >= 40 ? 'amber' : 'red',
            }))}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <Users size={16} className="text-amber-400" />
            Usuarios críticos
          </h3>
          <p className="text-xs text-steel-500 mb-4">Menor avance promedio para accionar reminders.</p>
          <div className="space-y-3">
            {criticalUsers.map(userItem => (
              <div key={userItem.name} className="p-3 rounded-xl bg-steel-900">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-steel-100 truncate">{userItem.name}</div>
                    <div className="text-xs text-steel-500 truncate">{userItem.area ?? 'Sin área'} · {userItem.pending} pendientes</div>
                  </div>
                  <span className="text-sm font-semibold text-steel-100">{userItem.avgProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${userItem.avgProgress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            Trainings críticos
          </h3>
          <p className="text-xs text-steel-500 mb-4">Cursos con menor avance promedio.</p>
          <div className="space-y-3">
            {criticalTrainings.map(training => (
              <div key={training.name} className="p-3 rounded-xl bg-steel-900">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-steel-100 truncate">{training.name}</div>
                    <div className="text-xs text-steel-500 truncate">{training.category} · {training.assigned} asignados</div>
                  </div>
                  <span className="text-sm font-semibold text-steel-100">{training.avgProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-400" style={{ width: `${training.avgProgress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-1 flex items-center gap-2">
            <CalendarClock size={16} className="text-amber-400" />
            Vencimientos próximos
          </h3>
          <p className="text-xs text-steel-500 mb-4">Certificados a revisar o renovar.</p>
          <div className="space-y-3">
            {expiringCertificates.length > 0 ? expiringCertificates.map(cert => (
              <div key={cert.id} className="p-3 rounded-xl bg-steel-900 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-steel-100 truncate">{cert.user?.full_name ?? 'Usuario'}</div>
                  <div className="text-xs text-steel-500 truncate">{cert.training?.title ?? 'Training'} · {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('es-AR') : 'Sin fecha'}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cert.status === 'expired' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {cert.status === 'expired' ? 'Vencido' : 'Próximo'}
                </span>
              </div>
            )) : (
              <div className="p-4 rounded-xl bg-steel-900 text-sm text-steel-400">No hay vencimientos críticos en este demo.</div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-steel-500">Detalle exportable</h2>
            <p className="text-sm text-steel-400 mt-1">Tablas operativas para revisar por usuario, training o área.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'user', label: 'Por usuario', icon: <Users size={14} /> },
              { id: 'training', label: 'Por training', icon: <BookOpen size={14} /> },
              { id: 'area', label: 'Por área', icon: <Building size={14} /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id as ReportType)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${reportType === t.id ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {reportType === 'user' && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-steel-900 border-b border-steel-700">
                    <th className="table-header">Usuario</th>
                    <th className="table-header hidden md:table-cell">Área</th>
                    <th className="table-header text-center">Total</th>
                    <th className="table-header text-center">Complet.</th>
                    <th className="table-header text-center">En curso</th>
                    <th className="table-header text-center">Pendiente</th>
                    <th className="table-header hidden lg:table-cell">Avance</th>
                    <th className="table-header text-center hidden xl:table-cell">Certs.</th>
                  </tr>
                </thead>
                <tbody>
                  {userReport.map((r, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell font-medium text-steel-100">{r.name}</td>
                      <td className="table-cell hidden md:table-cell text-steel-300 text-xs">{r.area ?? '—'}</td>
                      <td className="table-cell text-center text-steel-300">{r.total}</td>
                      <td className="table-cell text-center"><span className="text-emerald-400 font-medium">{r.completed}</span></td>
                      <td className="table-cell text-center"><span className="text-blue-400">{r.inProgress}</span></td>
                      <td className="table-cell text-center"><span className="text-steel-400">{r.pending}</span></td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 min-w-[60px]">
                            <div className="progress-fill" style={{ width: `${r.avgProgress}%` }} />
                          </div>
                          <span className="text-xs text-steel-400">{r.avgProgress}%</span>
                        </div>
                      </td>
                      <td className="table-cell text-center hidden xl:table-cell text-amber-400">{r.certificates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'training' && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-steel-900 border-b border-steel-700">
                    <th className="table-header">Training</th>
                    <th className="table-header hidden md:table-cell">Categoría</th>
                    <th className="table-header text-center">Asignados</th>
                    <th className="table-header text-center">Completados</th>
                    <th className="table-header text-center">En curso</th>
                    <th className="table-header text-center hidden md:table-cell">Fallidos</th>
                    <th className="table-header hidden lg:table-cell">Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingReport.map((r, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell font-medium text-steel-100">{r.name}</td>
                      <td className="table-cell hidden md:table-cell"><span className="badge badge-info">{r.category}</span></td>
                      <td className="table-cell text-center text-steel-300">{r.assigned}</td>
                      <td className="table-cell text-center"><span className="text-emerald-400 font-medium">{r.completed}</span></td>
                      <td className="table-cell text-center"><span className="text-blue-400">{r.inProgress}</span></td>
                      <td className="table-cell text-center hidden md:table-cell"><span className="text-red-400">{r.failed}</span></td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 min-w-[60px]">
                            <div className="progress-fill" style={{ width: `${r.avgProgress}%` }} />
                          </div>
                          <span className="text-xs text-steel-400">{r.avgProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'area' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areaReport.map((r, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-semibold text-steel-100">{r.name}</div>
                  <span className="badge badge-neutral">{r.users} usuarios</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Asignaciones</span>
                    <span className="text-steel-200">{r.assignments}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Completados</span>
                    <span className="text-emerald-400">{r.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Pendientes</span>
                    <span className="text-steel-400">{r.pending}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-steel-400 mb-1">
                      <span>Completitud</span>
                      <span>{r.completion}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${r.completion}%` }} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-steel-400 mb-1">
                      <span>Avance promedio</span>
                      <span>{r.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-steel-800 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${r.progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
