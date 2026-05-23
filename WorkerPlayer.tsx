import React, { useState } from 'react';
import { BarChart2, Download, Users, BookOpen, Building, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsersByTenant, getAssignmentsByTenant, getCertificatesByTenant } from '../../lib/mockData';

export default function AdminReports() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';
  const users = getUsersByTenant(tenantId);
  const assignments = getAssignmentsByTenant(tenantId);
  const certificates = getCertificatesByTenant(tenantId);

  const [reportType, setReportType] = useState<'user' | 'training' | 'area' | 'contractor'>('user');

  const userReport = users.map(u => {
    const userAssignments = assignments.filter(a => a.user_id === u.id);
    const userCerts = certificates.filter(c => c.user_id === u.id);
    return {
      name: u.full_name,
      position: u.position,
      area: u.area,
      contractor: u.contractor_company,
      total: userAssignments.length,
      completed: userAssignments.filter(a => ['certificate_issued', 'completed', 'passed'].includes(a.status)).length,
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
      completed: ta.filter(a => ['certificate_issued', 'completed', 'passed'].includes(a.status)).length,
      inProgress: ta.filter(a => a.status === 'in_progress').length,
      pending: ta.filter(a => a.status === 'not_started').length,
      avgProgress: Math.round(ta.reduce((s, a) => s + a.progress_percentage, 0) / ta.length),
    };
  });

  const areaReport = [...new Set(users.map(u => u.area ?? 'Sin área'))].map(area => {
    const areaUsers = users.filter(u => (u.area ?? 'Sin área') === area);
    const areaAssignments = assignments.filter(a => areaUsers.some(u => u.id === a.user_id));
    return {
      name: area,
      users: areaUsers.length,
      assignments: areaAssignments.length,
      completed: areaAssignments.filter(a => ['certificate_issued', 'completed', 'passed'].includes(a.status)).length,
      completion: areaAssignments.length ? Math.round((areaAssignments.filter(a => ['certificate_issued', 'completed', 'passed'].includes(a.status)).length / areaAssignments.length) * 100) : 0,
    };
  });

  const downloadCSV = () => {
    let headers = '', rows = '';
    if (reportType === 'user') {
      headers = 'Nombre,Puesto,Área,Total,Completados,En curso,Pendientes,Progreso promedio,Certificados\n';
      rows = userReport.map(r => `${r.name},${r.position ?? ''},${r.area ?? ''},${r.total},${r.completed},${r.inProgress},${r.pending},${r.avgProgress}%,${r.certificates}`).join('\n');
    } else if (reportType === 'training') {
      headers = 'Training,Categoría,Asignados,Completados,En curso,Pendientes,Avance promedio\n';
      rows = trainingReport.map(r => `${r.name},${r.category},${r.assigned},${r.completed},${r.inProgress},${r.pending},${r.avgProgress}%`).join('\n');
    } else if (reportType === 'area') {
      headers = 'Área,Usuarios,Asignaciones,Completados,% Completitud\n';
      rows = areaReport.map(r => `${r.name},${r.users},${r.assignments},${r.completed},${r.completion}%`).join('\n');
    }
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reporte-${reportType}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'user', label: 'Por usuario', icon: <Users size={14} /> },
            { id: 'training', label: 'Por training', icon: <BookOpen size={14} /> },
            { id: 'area', label: 'Por área', icon: <Building size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${reportType === t.id ? 'bg-amber-500 text-petroleum-950' : 'bg-steel-800 text-steel-300 hover:bg-steel-700'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button onClick={downloadCSV} className="btn-secondary text-xs"><Download size={14} /> Exportar CSV</button>
      </div>

      {/* User Report */}
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

      {/* Training Report */}
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

      {/* Area Report */}
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
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-steel-400 mb-1">
                    <span>Completitud</span>
                    <span>{r.completion}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${r.completion}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
