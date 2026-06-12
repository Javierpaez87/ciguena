import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Users,
  BookOpen,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
  Award,
  FileText,
  Download,
  Eye,
  X,
  CalendarDays,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { Tenant } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';

type TenantTrainingRow = {
  id: string;
  tenant_id: string;
  training_id: string;
  enabled?: boolean | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  auth_user_id?: string | null;
  tenant_id?: string | null;
  role?: string | null;
  status?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type CertificateRow = {
  id: string;
  assignment_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_id?: string | null;
  certificate_code?: string | null;
  worker_signature_url?: string | null;
  company_signature_id?: string | null;
  company_signature_url?: string | null;
  company_signer_name?: string | null;
  company_signer_role?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
  test_score?: number | null;
  test_attempts_count?: number | null;
  created_at?: string | null;
};

type TenantWithStats = Tenant & {
  user_count: number;
  worker_count: number;
  training_count: number;
  certificate_count: number;
};

type HydratedCertificate = CertificateRow & {
  tenant_name?: string;
  worker_name?: string;
  worker_email?: string;
  training_title?: string;
  training_description?: string;
};

const CERTIFICATES_STEP = 10;

function formatDate(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('es-AR');
}

function formatDateTime(date?: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleString('es-AR');
}

function isTrainingEnabled(row?: TenantTrainingRow | null) {
  return row?.enabled !== false;
}

function getCertificateStatus(certificate: CertificateRow) {
  if (certificate.status === 'expired') return 'expired';

  if (!certificate.expires_at) return certificate.status || 'valid';

  const now = new Date();
  const expiresAt = new Date(certificate.expires_at);
  const inThirtyDays = new Date();
  inThirtyDays.setDate(now.getDate() + 30);

  if (expiresAt < now) return 'expired';
  if (expiresAt <= inThirtyDays) return 'expiring_soon';

  return certificate.status || 'valid';
}

function getCertificateStatusLabel(status: string) {
  if (status === 'valid') return 'Vigente';
  if (status === 'expired') return 'Vencido';
  if (status === 'expiring_soon') return 'Próx. a vencer';
  return status;
}

function getCertificateStatusClass(status: string) {
  if (status === 'valid') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'expiring_soon') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (status === 'expired') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-steel-700 bg-steel-800 text-steel-300';
}

function getCompanySignerLabel(certificate: HydratedCertificate) {
  const name = certificate.company_signer_name || 'Responsable de capacitaciones';
  const role = certificate.company_signer_role || certificate.tenant_name || 'Empresa / Tenant';

  return `${name} · ${role}`;
}

function printCertificate(certificate: HydratedCertificate) {
  const status = getCertificateStatus(certificate);
  const workerName = certificate.worker_name || 'Trabajador';
  const issuerName = certificate.tenant_name || 'Empresa / Tenant';
  const trainingTitle = certificate.training_title || certificate.training_id || 'Training';

  const workerSignatureBlock = certificate.worker_signature_url
    ? `<img src="${certificate.worker_signature_url}" alt="Firma trabajador" style="height:70px;max-width:220px;object-fit:contain;filter:invert(1) contrast(1.4);" />`
    : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma trabajador no disponible</div>';

  const companySignatureBlock = certificate.company_signature_url
    ? `<img src="${certificate.company_signature_url}" alt="Firma responsable" style="height:70px;max-width:220px;object-fit:contain;filter:invert(1) contrast(1.4);" />`
    : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma responsable no disponible</div>';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${certificate.certificate_code || 'Certificado'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; }
          .certificate { border: 3px solid #f59e0b; padding: 42px; min-height: 700px; }
          .brand { color: #f59e0b; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
          .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
          h1 { margin: 48px 0 12px; font-size: 34px; text-align: center; }
          .lead { text-align: center; color: #475569; font-size: 16px; }
          .name { text-align: center; font-size: 30px; font-weight: 800; margin: 24px 0; }
          .training { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; }
          .issuer { text-align: center; color: #475569; font-size: 14px; margin-top: 12px; }
          .meta { margin-top: 42px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 14px; }
          .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
          .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px; }
          .signatures { margin-top: 54px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; }
          .signature-slot { height:70px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; border:1px dashed #cbd5e1; border-radius:10px; }
          .line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #334155; margin-top:8px; }
          .audit { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-family: monospace; color: #64748b; font-size: 11px; line-height: 1.6; }
          @media print { body { padding: 0; } .certificate { border-width: 2px; min-height: calc(100vh - 88px); } }
        </style>
      </head>
      <body>
        <main class="certificate">
          <div class="brand">CIGÜEÑA</div>
          <div class="subtitle">by BondiApps · Plataforma de capacitaciones y certificaciones</div>

          <h1>Certificado de capacitación</h1>

          <p class="lead">Se certifica que</p>
          <div class="name">${workerName}</div>

          <p class="lead">aprobó satisfactoriamente la capacitación</p>
          <div class="training">${trainingTitle}</div>

          <div class="issuer">Emitido por: <strong>${issuerName}</strong></div>

          <section class="meta">
            <div class="box"><div class="label">Código</div>${certificate.certificate_code || '—'}</div>
            <div class="box"><div class="label">Estado</div>${getCertificateStatusLabel(status)}</div>
            <div class="box"><div class="label">Emitido</div>${formatDate(certificate.issued_at)}</div>
            <div class="box"><div class="label">Vencimiento</div>${formatDate(certificate.expires_at)}</div>
            <div class="box"><div class="label">Puntaje</div>${certificate.test_score ?? '-'}%</div>
            <div class="box"><div class="label">Intentos utilizados</div>${certificate.test_attempts_count ?? '-'}</div>
          </section>

          <section class="signatures">
            <div>
              <div class="signature-slot">${workerSignatureBlock}</div>
              <div class="line">Firma electrónica del trabajador</div>
            </div>

            <div>
              <div class="signature-slot">${companySignatureBlock}</div>
              <div class="line">${getCompanySignerLabel(certificate)}</div>
            </div>
          </section>

          <div class="audit">
            Registro auditable · Certificate ID: ${certificate.id}<br/>
            Assignment ID: ${certificate.assignment_id || '—'}<br/>
            User ID: ${certificate.user_id || '—'}<br/>
            Tenant ID: ${certificate.tenant_id || '—'}<br/>
            Training ID: ${certificate.training_id || '—'}<br/>
            Created at: ${formatDateTime(certificate.created_at || certificate.issued_at)}
          </div>
        </main>

        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;

  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) return;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export default function SaTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [tenantTrainings, setTenantTrainings] = useState<TenantTrainingRow[]>([]);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [showTrainings, setShowTrainings] = useState<Tenant | null>(null);
  const [showCertificates, setShowCertificates] = useState<Tenant | null>(null);
  const [visibleCertificatesCount, setVisibleCertificatesCount] = useState(CERTIFICATES_STEP);
  const [selectedCertificate, setSelectedCertificate] = useState<HydratedCertificate | null>(null);

  const [form, setForm] = useState({
    name: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);
  const [updatingTrainingKey, setUpdatingTrainingKey] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [tenantsResult, profilesResult, tenantTrainingsResult, certificatesResult] =
        await Promise.all([
          supabase.from('tenants').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, auth_user_id, tenant_id, role, status, full_name, email'),
          supabase.from('tenant_trainings').select('*').order('created_at', { ascending: false }),
          supabase.from('certificates').select('*').order('issued_at', { ascending: false }),
        ]);

      if (tenantsResult.error) throw tenantsResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (tenantTrainingsResult.error) throw tenantTrainingsResult.error;
      if (certificatesResult.error) throw certificatesResult.error;

      setTenants((tenantsResult.data ?? []) as Tenant[]);
      setProfiles((profilesResult.data ?? []) as ProfileRow[]);
      setTenantTrainings((tenantTrainingsResult.data ?? []) as TenantTrainingRow[]);
      setCertificates((certificatesResult.data ?? []) as CertificateRow[]);
    } catch (error) {
      console.error('Error loading tenants:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las empresas desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const enabledTrainings = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    tenantTrainings.forEach((tenantTraining) => {
      if (!tenantTraining.tenant_id || !tenantTraining.training_id) return;
      if (!isTrainingEnabled(tenantTraining)) return;

      if (!map[tenantTraining.tenant_id]) {
        map[tenantTraining.tenant_id] = new Set<string>();
      }

      map[tenantTraining.tenant_id].add(tenantTraining.training_id);
    });

    return map;
  }, [tenantTrainings]);

  const certificateCountsByTenant = useMemo(() => {
    const map: Record<string, number> = {};

    certificates.forEach((certificate) => {
      if (!certificate.tenant_id) return;

      map[certificate.tenant_id] = (map[certificate.tenant_id] ?? 0) + 1;
    });

    return map;
  }, [certificates]);

  const profilesByAnyUserId = useMemo(() => {
    const map = new Map<string, ProfileRow>();

    profiles.forEach((profile) => {
      map.set(profile.id, profile);

      if (profile.auth_user_id) {
        map.set(profile.auth_user_id, profile);
      }
    });

    return map;
  }, [profiles]);

  const tenantsById = useMemo(() => {
    return new Map(tenants.map((tenant) => [tenant.id, tenant]));
  }, [tenants]);

  const trainingsById = useMemo(() => {
    return new Map(baseTrainings.map((training) => [training.id, training]));
  }, []);

  const tenantStats = useMemo<TenantWithStats[]>(() => {
    return tenants.map((tenant) => {
      const tenantProfiles = profiles.filter((profile) => profile.tenant_id === tenant.id);
      const tenantWorkers = tenantProfiles.filter((profile) => profile.role === 'worker');
      const tenantEnabledTrainings = enabledTrainings[tenant.id]?.size ?? 0;
      const tenantCertificateCount = certificateCountsByTenant[tenant.id] ?? 0;

      return {
        ...tenant,
        user_count: tenantProfiles.length,
        worker_count: tenantWorkers.length,
        training_count: tenantEnabledTrainings,
        certificate_count: tenantCertificateCount,
      };
    });
  }, [tenants, profiles, enabledTrainings, certificateCountsByTenant]);

  const filtered = tenantStats.filter((tenant) =>
    tenant.name.toLowerCase().includes(search.toLowerCase())
  );

  const detailTenant = showDetail
    ? tenantStats.find((tenant) => tenant.id === showDetail.id) ?? null
    : null;

  const trainingsTenant = showTrainings
    ? tenantStats.find((tenant) => tenant.id === showTrainings.id) ?? null
    : null;

  const certificatesTenant = showCertificates
    ? tenantStats.find((tenant) => tenant.id === showCertificates.id) ?? null
    : null;

  const tenantCertificates = useMemo<HydratedCertificate[]>(() => {
    if (!certificatesTenant) return [];

    return certificates
      .filter((certificate) => certificate.tenant_id === certificatesTenant.id)
      .map((certificate) => {
        const profile = certificate.user_id ? profilesByAnyUserId.get(certificate.user_id) : null;
        const tenant = certificate.tenant_id ? tenantsById.get(certificate.tenant_id) : null;
        const training = certificate.training_id ? trainingsById.get(certificate.training_id) : null;

        return {
          ...certificate,
          tenant_name: tenant?.name ?? certificatesTenant.name,
          worker_name: profile?.full_name || profile?.email || certificate.user_id || 'Trabajador',
          worker_email: profile?.email || undefined,
          training_title: training?.title || certificate.training_id || 'Training',
          training_description: training?.description,
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.issued_at || a.created_at || '').getTime();
        const dateB = new Date(b.issued_at || b.created_at || '').getTime();

        return dateB - dateA;
      });
  }, [certificates, certificatesTenant, profilesByAnyUserId, tenantsById, trainingsById]);

  const visibleTenantCertificates = tenantCertificates.slice(0, visibleCertificatesCount);
  const hasMoreCertificates = visibleCertificatesCount < tenantCertificates.length;

  function openCertificatesModal(tenant: Tenant) {
    setShowCertificates(tenant);
    setVisibleCertificatesCount(CERTIFICATES_STEP);
    setSelectedCertificate(null);
  }

  function closeCertificatesModal() {
    setShowCertificates(null);
    setVisibleCertificatesCount(CERTIFICATES_STEP);
    setSelectedCertificate(null);
  }

  async function toggleStatus(tenant: Tenant) {
    const nextStatus = tenant.status === 'active' ? 'inactive' : 'active';

    setUpdatingTenantId(tenant.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          status: nextStatus,
        })
        .eq('id', tenant.id)
        .select('*')
        .single();

      if (error) throw error;

      setTenants((currentTenants) =>
        currentTenants.map((currentTenant) =>
          currentTenant.id === tenant.id ? ((data as Tenant) ?? currentTenant) : currentTenant
        )
      );

      setSuccessMessage(
        `Empresa ${nextStatus === 'active' ? 'activada' : 'desactivada'} correctamente.`
      );
    } catch (error) {
      console.error('Error updating tenant status:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado de la empresa.'
      );
    } finally {
      setUpdatingTenantId(null);
    }
  }

  async function handleCreate() {
    const tenantName = form.name.trim();

    if (!tenantName) return;

    setSavingTenant(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          logo_url: null,
          status: form.status,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTenants((currentTenants) => [data as Tenant, ...currentTenants]);
      setForm({ name: '', status: 'active' });
      setShowCreate(false);
      setSuccessMessage('Empresa creada correctamente.');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo crear la empresa en Supabase.'
      );
    } finally {
      setSavingTenant(false);
    }
  }

  async function toggleTraining(tenantId: string, trainingId: string) {
    const key = `${tenantId}:${trainingId}`;
    const existing = tenantTrainings.find(
      (tenantTraining) =>
        tenantTraining.tenant_id === tenantId && tenantTraining.training_id === trainingId
    );

    const currentlyEnabled = isTrainingEnabled(existing);
    const nextEnabled = !currentlyEnabled;

    setUpdatingTrainingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (existing) {
        const { data, error } = await supabase
          .from('tenant_trainings')
          .update({
            enabled: nextEnabled,
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) throw error;

        setTenantTrainings((currentRows) =>
          currentRows.map((row) => (row.id === existing.id ? (data as TenantTrainingRow) : row))
        );
      } else {
        const { data, error } = await supabase
          .from('tenant_trainings')
          .insert({
            tenant_id: tenantId,
            training_id: trainingId,
            enabled: true,
          })
          .select('*')
          .single();

        if (error) throw error;

        setTenantTrainings((currentRows) => [data as TenantTrainingRow, ...currentRows]);
      }

      setSuccessMessage(
        nextEnabled
          ? 'Training habilitado correctamente.'
          : 'Training deshabilitado correctamente.'
      );
    } catch (error) {
      console.error('Error toggling tenant training:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el training para esta empresa.'
      );
    } finally {
      setUpdatingTrainingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando empresas...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo tenants, perfiles, trainings habilitados y certificados desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && tenants.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />

          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar las empresas</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>

            <button onClick={loadData} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(errorMessage || successMessage) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            errorMessage
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-9"
            placeholder="Buscar empresa..."
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={loadData} className="btn-secondary text-xs">
            <RefreshCw size={14} />
            Actualizar
          </button>

          <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0">
            <Plus size={16} />
            Nueva empresa
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="Sin empresas"
          description={
            search
              ? 'No hay empresas que coincidan con la búsqueda.'
              : 'Todavía no hay tenants creados en Supabase.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tenant) => (
            <div key={tenant.id} className="card hover:border-steel-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-petroleum-700 rounded-xl flex items-center justify-center text-base font-bold text-petroleum-200">
                    {tenant.name.charAt(0)}
                  </div>

                  <div>
                    <div className="text-base font-semibold text-steel-100">{tenant.name}</div>
                    <div className="text-xs text-steel-400">
                      Creado {formatDate(tenant.created_at)}
                    </div>
                  </div>
                </div>

                <StatusBadge status={tenant.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-steel-900 rounded-lg p-3 flex items-center gap-2">
                  <Users size={14} className="text-steel-400" />
                  <div>
                    <div className="text-lg font-bold text-steel-100">{tenant.user_count}</div>
                    <div className="text-xs text-steel-400">Usuarios</div>
                  </div>
                </div>

                <div className="bg-steel-900 rounded-lg p-3 flex items-center gap-2">
                  <BookOpen size={14} className="text-steel-400" />
                  <div>
                    <div className="text-lg font-bold text-steel-100">
                      {tenant.training_count}
                    </div>
                    <div className="text-xs text-steel-400">Trainings</div>
                  </div>
                </div>

                <div className="bg-steel-900 rounded-lg p-3 flex items-center gap-2">
                  <Award size={14} className="text-emerald-400" />
                  <div>
                    <div className="text-lg font-bold text-steel-100">
                      {tenant.certificate_count}
                    </div>
                    <div className="text-xs text-steel-400">Certificados</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDetail(tenant)}
                  className="btn-ghost text-xs justify-center"
                >
                  <ChevronRight size={14} />
                  Ver detalle
                </button>

                <button
                  onClick={() => setShowTrainings(tenant)}
                  className="btn-secondary text-xs justify-center"
                >
                  <BookOpen size={14} />
                  Trainings
                </button>

                <button
                  onClick={() => openCertificatesModal(tenant)}
                  className="btn-secondary text-xs justify-center"
                >
                  <Award size={14} />
                  Certificados
                </button>

                <button
                  onClick={() => toggleStatus(tenant)}
                  disabled={updatingTenantId === tenant.id}
                  className="btn-ghost text-xs justify-center disabled:opacity-50"
                  title={tenant.status === 'active' ? 'Desactivar empresa' : 'Activar empresa'}
                >
                  {tenant.status === 'active' ? (
                    <>
                      <ToggleRight size={15} className="text-emerald-400" />
                      Activa
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={15} className="text-steel-500" />
                      Inactiva
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva empresa / tenant"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">
              Cancelar
            </button>

            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || savingTenant}
              className="btn-primary"
            >
              <Plus size={15} />
              {savingTenant ? 'Creando...' : 'Crear empresa'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre de la empresa *</label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              className="input"
              placeholder="Ej: YPF S.A."
            />
          </div>

          <div>
            <label className="label">Estado inicial</label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  status: event.target.value as 'active' | 'inactive',
                }))
              }
              className="select"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailTenant && (
        <Modal
          open={!!detailTenant}
          onClose={() => setShowDetail(null)}
          title={detailTenant.name}
          size="lg"
          footer={
            <>
              <button onClick={() => setShowDetail(null)} className="btn-ghost">
                Cerrar
              </button>

              <button
                onClick={() => {
                  setShowDetail(null);
                  openCertificatesModal(detailTenant);
                }}
                className="btn-primary"
              >
                <Award size={15} />
                Ver certificados
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">
                  {detailTenant.user_count}
                </div>
                <div className="text-sm text-steel-400">Usuarios totales</div>
              </div>

              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-steel-50">
                  {detailTenant.training_count}
                </div>
                <div className="text-sm text-steel-400">Trainings habilitados</div>
              </div>

              <div className="bg-steel-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">
                  {detailTenant.certificate_count}
                </div>
                <div className="text-sm text-steel-400">Certificados emitidos</div>
              </div>
            </div>

            <div className="bg-steel-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm gap-4">
                <span className="text-steel-400">ID</span>
                <span className="text-steel-200 font-mono text-xs text-right">
                  {detailTenant.id}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Estado</span>
                <StatusBadge status={detailTenant.status} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Creado</span>
                <span className="text-steel-200">{formatDate(detailTenant.created_at)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Certificates Modal */}
      {certificatesTenant && (
        <Modal
          open={!!certificatesTenant}
          onClose={closeCertificatesModal}
          title={`Certificados — ${certificatesTenant.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-steel-100">
                    Certificados emitidos por la empresa
                  </div>
                  <div className="text-xs text-steel-500 mt-1">
                    Mostrando {Math.min(visibleCertificatesCount, tenantCertificates.length)} de{' '}
                    {tenantCertificates.length}.
                  </div>
                </div>

                <button onClick={loadData} className="btn-secondary text-xs">
                  <RefreshCw size={14} />
                  Actualizar
                </button>
              </div>
            </div>

            {tenantCertificates.length === 0 ? (
              <EmptyState
                icon={<Award size={28} />}
                title="Sin certificados emitidos"
                description="Esta empresa todavía no tiene certificados en Supabase."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {visibleTenantCertificates.map((certificate) => {
                    const status = getCertificateStatus(certificate);

                    return (
                      <div
                        key={certificate.id}
                        className="rounded-xl border border-steel-700 bg-steel-900/60 p-3 hover:border-steel-600 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Award size={18} className="text-emerald-300" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <div className="text-sm font-semibold text-steel-100">
                                {certificate.training_title}
                              </div>

                              <span
                                className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getCertificateStatusClass(status)}`}
                              >
                                {getCertificateStatusLabel(status)}
                              </span>
                            </div>

                            <div className="text-xs text-steel-500">
                              {certificate.worker_name}
                              {certificate.worker_email ? ` · ${certificate.worker_email}` : ''}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel-400">
                              <span>Código: {certificate.certificate_code || '—'}</span>
                              <span>Emitido: {formatDate(certificate.issued_at)}</span>
                              <span>Vence: {formatDate(certificate.expires_at)}</span>
                              <span>Puntaje: {certificate.test_score ?? '-'}%</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2">
                            <button
                              onClick={() => setSelectedCertificate(certificate)}
                              className="btn-secondary text-xs justify-center"
                            >
                              <Eye size={13} />
                              Preview
                            </button>

                            <button
                              onClick={() => printCertificate(certificate)}
                              className="btn-secondary text-xs justify-center"
                            >
                              <Download size={13} />
                              PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {tenantCertificates.length > CERTIFICATES_STEP && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    {hasMoreCertificates && (
                      <button
                        onClick={() =>
                          setVisibleCertificatesCount((current) =>
                            Math.min(current + CERTIFICATES_STEP, tenantCertificates.length)
                          )
                        }
                        className="btn-secondary text-xs justify-center"
                      >
                        Mostrar más
                      </button>
                    )}

                    {hasMoreCertificates && (
                      <button
                        onClick={() => setVisibleCertificatesCount(tenantCertificates.length)}
                        className="btn-ghost text-xs justify-center"
                      >
                        Mostrar todo
                      </button>
                    )}
                  </div>
                )}

                {selectedCertificate && (
                  <div className="rounded-2xl border border-steel-700 bg-steel-950 p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-sm font-semibold text-steel-100">
                          Preview del certificado
                        </div>
                        <div className="text-xs text-steel-500">
                          {selectedCertificate.certificate_code || 'Sin código'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCertificate(null)}
                        className="rounded-lg p-2 text-steel-400 hover:bg-steel-800 hover:text-steel-100"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="mx-auto max-w-[800px] rounded-xl bg-white p-8 text-slate-900 shadow-xl border-4 border-amber-500">
                      <div className="text-2xl font-extrabold tracking-wide text-amber-500">
                        CIGÜEÑA
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        by BondiApps · Plataforma de capacitaciones y certificaciones
                      </div>

                      <h1 className="mt-10 text-center text-3xl font-bold text-slate-900">
                        Certificado de capacitación
                      </h1>

                      <p className="mt-5 text-center text-base text-slate-600">
                        Se certifica que
                      </p>

                      <div className="mt-5 text-center text-3xl font-extrabold text-slate-900">
                        {selectedCertificate.worker_name || 'Trabajador'}
                      </div>

                      <p className="mt-5 text-center text-base text-slate-600">
                        aprobó satisfactoriamente la capacitación
                      </p>

                      <div className="mt-4 text-center text-2xl font-bold text-slate-900">
                        {selectedCertificate.training_title || selectedCertificate.training_id}
                      </div>

                      <div className="mt-3 text-center text-sm text-slate-600">
                        Emitido por:{' '}
                        <strong>{selectedCertificate.tenant_name || certificatesTenant.name}</strong>
                      </div>

                      <div className="mt-8 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Código
                          </div>
                          <div className="font-mono text-xs">
                            {selectedCertificate.certificate_code || '—'}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Estado
                          </div>
                          <div>
                            {getCertificateStatusLabel(getCertificateStatus(selectedCertificate))}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Emitido
                          </div>
                          <div>{formatDate(selectedCertificate.issued_at)}</div>
                        </div>

                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Vencimiento
                          </div>
                          <div>{formatDate(selectedCertificate.expires_at)}</div>
                        </div>

                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Puntaje
                          </div>
                          <div>{selectedCertificate.test_score ?? '-'}%</div>
                        </div>

                        <div className="rounded-xl border border-slate-300 p-4">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Intentos utilizados
                          </div>
                          <div>{selectedCertificate.test_attempts_count ?? '-'}</div>
                        </div>
                      </div>

                      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
                        <div>
                          <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-3">
                            {selectedCertificate.worker_signature_url ? (
                              <img
                                src={selectedCertificate.worker_signature_url}
                                alt="Firma trabajador"
                                className="max-h-24 max-w-full object-contain"
                                style={{ filter: 'invert(1) contrast(1.4)' }}
                              />
                            ) : (
                              <span className="text-xs text-slate-500">
                                Firma trabajador no disponible
                              </span>
                            )}
                          </div>

                          <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                            Firma electrónica del trabajador
                          </div>
                        </div>

                        <div>
                          <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-3">
                            {selectedCertificate.company_signature_url ? (
                              <img
                                src={selectedCertificate.company_signature_url}
                                alt="Firma responsable"
                                className="max-h-24 max-w-full object-contain"
                                style={{ filter: 'invert(1) contrast(1.4)' }}
                              />
                            ) : (
                              <span className="text-xs text-slate-500">
                                Firma responsable no disponible
                              </span>
                            )}
                          </div>

                          <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                            {getCompanySignerLabel(selectedCertificate)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 border-t border-slate-200 pt-4 font-mono text-xs leading-6 text-slate-500">
                        Registro auditable · Certificate ID: {selectedCertificate.id}<br />
                        Assignment ID: {selectedCertificate.assignment_id || '—'}<br />
                        User ID: {selectedCertificate.user_id || '—'}<br />
                        Tenant ID: {selectedCertificate.tenant_id || '—'}<br />
                        Training ID: {selectedCertificate.training_id || '—'}<br />
                        Created at: {formatDateTime(selectedCertificate.created_at || selectedCertificate.issued_at)}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => printCertificate(selectedCertificate)}
                        className="btn-primary text-xs py-2"
                      >
                        <Download size={13} />
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Trainings assignment Modal */}
      {trainingsTenant && (
        <Modal
          open={!!trainingsTenant}
          onClose={() => setShowTrainings(null)}
          title={`Trainings — ${trainingsTenant.name}`}
          size="lg"
        >
          <p className="text-sm text-steel-400 mb-4">
            Habilitá o deshabilitá trainings para esta empresa. El catálogo sale de
            baseTrainings.ts; la habilitación se guarda en Supabase.
          </p>

          <div className="space-y-2">
            {baseTrainings
              .filter((training) => training.status === 'active')
              .map((training) => {
                const isEnabled =
                  enabledTrainings[trainingsTenant.id]?.has(training.id) ?? false;

                const key = `${trainingsTenant.id}:${training.id}`;
                const isUpdating = updatingTrainingKey === key;

                return (
                  <div
                    key={training.id}
                    className="flex items-center gap-3 p-3 bg-steel-900 rounded-lg border border-steel-700 hover:border-steel-600 transition-colors"
                  >
                    <button
                      onClick={() => toggleTraining(trainingsTenant.id, training.id)}
                      disabled={isUpdating}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors disabled:opacity-50 ${
                        isEnabled
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-steel-600 hover:border-amber-500'
                      }`}
                      title={isEnabled ? 'Deshabilitar training' : 'Habilitar training'}
                    >
                      {isEnabled && <Check size={12} className="text-petroleum-950" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-steel-100">
                        {training.title}
                      </div>
                      <div className="text-xs text-steel-400">
                        {training.category} · {training.duration_minutes} min ·{' '}
                        {training.validity_months ?? 0}m vigencia
                      </div>
                    </div>

                    <span className="badge badge-info text-xs">{training.category}</span>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
  );
}
