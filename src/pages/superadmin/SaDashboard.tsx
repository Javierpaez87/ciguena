import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Activity,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import MetricCard from '../../components/ui/MetricCard';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';

type Tenant = {
  id: string;
  name: string;
  status?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type Profile = {
  id: string;
  tenant_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type TenantTraining = {
  id: string;
  tenant_id?: string | null;
  training_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type Certificate = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  certificate_code?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type TrainingAssignment = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  status?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  [key: string]: any;
};

type RecentActivityItem = {
  id: string;
  type: 'certificate' | 'assignment';
  title: string;
  subtitle: string;
  date: string | null;
};

function getFullName(profile?: Profile | null) {
  if (!profile) return 'Usuario sin nombre';

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Usuario sin nombre'
  );
}

function formatDate(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('es-AR');
}

function getTrainingTitle(trainingId?: string | null) {
  if (!trainingId) return 'Training sin identificar';

  return baseTrainings.find((training) => training.id === trainingId)?.title || trainingId;
}

function isCompletedAssignment(status?: string | null) {
  return ['certificate_issued', 'completed', 'passed'].includes(status || '');
}

export default function SaDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTraining[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDashboardData() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [
        tenantsResult,
        profilesResult,
        tenantTrainingsResult,
        certificatesResult,
        assignmentsResult,
      ] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tenant_trainings').select('*').order('created_at', { ascending: false }),
        supabase.from('certificates').select('*').order('issued_at', { ascending: false }),
        supabase.from('training_assignments').select('*').order('created_at', { ascending: false }),
      ]);

      if (tenantsResult.error) throw tenantsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setTenants((tenantsResult.data ?? []) as Tenant[]);
      setProfiles((profilesResult.data ?? []) as Profile[]);
      setTenantTrainings((tenantTrainingsResult.data ?? []) as TenantTraining[]);
      setCertificates((certificatesResult.data ?? []) as Certificate[]);
      setAssignments((assignmentsResult.data ?? []) as TrainingAssignment[]);
    } catch (error) {
      console.error('Error loading superadmin dashboard:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información real desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const profilesById = useMemo(() => {
    const map = new Map<string, Profile>();

    profiles.forEach((profile) => {
      map.set(profile.id, profile);
    });

    return map;
  }, [profiles]);

  const tenantsById = useMemo(() => {
    const map = new Map<string, Tenant>();

    tenants.forEach((tenant) => {
      map.set(tenant.id, tenant);
    });

    return map;
  }, [tenants]);

  const tenantStats = useMemo(() => {
    return tenants.map((tenant) => {
      const tenantUsers = profiles.filter((profile) => profile.tenant_id === tenant.id);
      const tenantWorkers = tenantUsers.filter((profile) => profile.role === 'worker');
      const tenantEnabledTrainings = tenantTrainings.filter(
        (training) => training.tenant_id === tenant.id
      );
      const tenantCertificates = certificates.filter((certificate) => certificate.tenant_id === tenant.id);

      return {
        ...tenant,
        user_count: tenantWorkers.length,
        total_profiles_count: tenantUsers.length,
        training_count: tenantEnabledTrainings.length,
        certificate_count: tenantCertificates.length,
      };
    });
  }, [tenants, profiles, tenantTrainings, certificates]);

  const trainingTenantCountById = useMemo(() => {
    const map = new Map<string, Set<string>>();

    tenantTrainings.forEach((tenantTraining) => {
      if (!tenantTraining.training_id || !tenantTraining.tenant_id) return;

      if (!map.has(tenantTraining.training_id)) {
        map.set(tenantTraining.training_id, new Set<string>());
      }

      map.get(tenantTraining.training_id)?.add(tenantTraining.tenant_id);
    });

    return map;
  }, [tenantTrainings]);

  const recentActivity = useMemo<RecentActivityItem[]>(() => {
    const certificateItems: RecentActivityItem[] = certificates.slice(0, 10).map((certificate) => {
      const profile = certificate.user_id ? profilesById.get(certificate.user_id) : null;
      const tenant = certificate.tenant_id ? tenantsById.get(certificate.tenant_id) : null;

      return {
        id: `certificate-${certificate.id}`,
        type: 'certificate',
        title: 'Certificado emitido',
        subtitle: `${getFullName(profile)} · ${getTrainingTitle(certificate.training_id)} · ${
          tenant?.name || 'Sin empresa'
        }`,
        date: certificate.issued_at || certificate.created_at || null,
      };
    });

    const assignmentItems: RecentActivityItem[] = assignments.slice(0, 10).map((assignment) => {
      const profile = assignment.user_id ? profilesById.get(assignment.user_id) : null;
      const tenant = assignment.tenant_id ? tenantsById.get(assignment.tenant_id) : null;

      return {
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: isCompletedAssignment(assignment.status)
          ? 'Asignación completada'
          : 'Asignación registrada',
        subtitle: `${getFullName(profile)} · ${getTrainingTitle(assignment.training_id)} · ${
          tenant?.name || 'Sin empresa'
        }`,
        date:
          assignment.completed_at ||
          assignment.updated_at ||
          assignment.assigned_at ||
          assignment.created_at ||
          null,
      };
    });

    return [...certificateItems, ...assignmentItems]
      .sort((a, b) => {
        const dateA = new Date(a.date || '').getTime();
        const dateB = new Date(b.date || '').getTime();

        return dateB - dateA;
      })
      .slice(0, 6);
  }, [certificates, assignments, profilesById, tenantsById]);

  const totalWorkers = profiles.filter((profile) => profile.role === 'worker').length;
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
  const activeTrainings = baseTrainings.filter((training) => training.status === 'active').length;
  const totalCerts = certificates.length;

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((assignment) =>
    isCompletedAssignment(assignment.status)
  ).length;

  const completionRate =
    totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando dashboard...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo datos reales desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />

          <div>
            <div className="text-red-400 font-semibold">
              No se pudo cargar el dashboard de SuperAdmin
            </div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>

            <button onClick={loadDashboardData} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Empresas activas"
          value={activeTenants}
          icon={<Building2 size={20} />}
          accent="amber"
          subtitle={`${tenants.length} tenants total`}
        />

        <MetricCard
          title="Usuarios workers"
          value={totalWorkers}
          icon={<Users size={20} />}
          accent="blue"
          subtitle={`${profiles.length} perfiles total`}
        />

        <MetricCard
          title="Trainings activos"
          value={activeTrainings}
          icon={<BookOpen size={20} />}
          accent="green"
          subtitle={`${baseTrainings.length} en catálogo`}
        />

        <MetricCard
          title="Certificados emitidos"
          value={totalCerts}
          icon={<Award size={20} />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Completitud global"
          value={`${completionRate}%`}
          icon={<TrendingUp size={20} />}
          accent="green"
          subtitle={`${completedAssignments}/${totalAssignments} asignaciones`}
        />

        <MetricCard
          title="Asignaciones totales"
          value={totalAssignments}
          icon={<CheckCircle size={20} />}
          accent="blue"
        />

        <MetricCard
          title="Trainings habilitados"
          value={tenantTrainings.length}
          icon={<BookOpen size={20} />}
          accent="steel"
          subtitle="Total tenant_trainings"
        />

        <MetricCard
          title="Empresas con trainings"
          value={new Set(tenantTrainings.map((training) => training.tenant_id).filter(Boolean)).size}
          icon={<Building2 size={20} />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants overview */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-amber-400" />
            Empresas cliente
          </h3>

          {tenantStats.length === 0 ? (
            <EmptyState
              icon={<Building2 size={28} />}
              title="Sin empresas"
              description="Todavía no hay tenants cargados en Supabase."
            />
          ) : (
            <div className="space-y-3">
              {tenantStats.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700"
                >
                  <div className="w-8 h-8 bg-petroleum-700 rounded-lg flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                    {tenant.name?.charAt(0) || 'E'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-steel-100 truncate">
                      {tenant.name}
                    </div>
                    <div className="text-xs text-steel-400">
                      {tenant.user_count} workers · {tenant.training_count} trainings ·{' '}
                      {tenant.certificate_count} certificados
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      tenant.status === 'active' ? 'badge-success' : 'badge-neutral'
                    }`}
                  >
                    {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="text-base font-semibold text-steel-100 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            Actividad reciente
          </h3>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<Activity size={28} />}
              title="Sin actividad"
              description="Todavía no hay certificados o asignaciones recientes."
            />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700"
                >
                  <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    {item.type === 'certificate' ? (
                      <Award size={12} className="text-amber-400" />
                    ) : (
                      <CheckCircle size={12} className="text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-steel-200">{item.title}</div>
                    <div className="text-xs text-steel-400 line-clamp-2 mt-0.5">
                      {item.subtitle}
                    </div>
                    <div className="text-xs text-steel-500 mt-1">{formatDate(item.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {baseTrainings.map((training) => {
                const tenantCount = trainingTenantCountById.get(training.id)?.size || 0;

                return (
                  <tr key={training.id} className="table-row">
                    <td className="table-cell font-medium text-steel-100">
                      {training.title}
                    </td>

                    <td className="table-cell">
                      <span className="badge badge-info">{training.category}</span>
                    </td>

                    <td className="table-cell text-steel-400">
                      {training.duration_minutes} min
                    </td>

                    <td className="table-cell text-steel-400">
                      {training.module_count}
                    </td>

                    <td className="table-cell text-steel-400">
                      {tenantCount}
                    </td>

                    <td className="table-cell">
                      <span
                        className={`badge ${
                          training.status === 'active' ? 'badge-success' : 'badge-neutral'
                        }`}
                      >
                        {training.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-steel-600 flex items-start gap-2">
        <Activity size={14} className="mt-0.5" />
        <div>
          Dashboard conectado a Supabase. El catálogo de trainings sigue viviendo en el repo desde
          baseTrainings.ts; los conteos de empresas, usuarios, asignaciones y certificados salen de
          la base real.
        </div>
      </div>
    </div>
  );
}
