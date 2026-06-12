import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Download,
  Search,
  Bell,
  FileText,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'valid', label: 'Vigentes' },
  { value: 'expiring_soon', label: 'Próx. a vencer' },
  { value: 'expired', label: 'Vencidos' },
];

interface Profile {
  id: string;
  auth_user_id?: string | null;
  tenant_id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  position?: string | null;
  area?: string | null;
  employee_code?: string | null;
  dni?: string | null;
  [key: string]: any;
}

interface TenantTraining {
  id?: string;
  tenant_id?: string | null;
  training_id?: string | null;
  title?: string | null;
  name?: string | null;
  training_title?: string | null;
  description?: string | null;
  [key: string]: any;
}

interface EthicsAcceptance {
  id: string;
  user_id: string;
  signature_image_url?: string | null;
  accepted_at?: string | null;
  accepted_name?: string | null;
  [key: string]: any;
}

interface Certificate {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  training_id?: string | null;
  tenant_training_id?: string | null;
  assignment_id?: string | null;
  certificate_code?: string | null;
  code?: string | null;
  status?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // Fallback opcional si en algún momento guardamos firma dentro del certificado.
  worker_signature_url?: string | null;
  company_signature_id?: string | null;
  company_signature_url?: string | null;
  company_signer_name?: string | null;
  company_signer_role?: string | null;

  // Fuente principal actual: ethics_acceptances.signature_image_url.
  ethics_signature_url?: string | null;

  test_score?: number | null;
  test_attempts_count?: number | null;
  certificate_url?: string | null;
  pdf_url?: string | null;
  file_url?: string | null;
  download_url?: string | null;
  user?: Profile | null;
  training?: TenantTraining | null;
  [key: string]: any;
}

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function getFullName(profile?: Profile | null) {
  if (!profile) return 'Usuario sin nombre';

  return (
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Usuario sin nombre'
  );
}

function getInitial(profile?: Profile | null) {
  return getFullName(profile).trim().charAt(0).toUpperCase() || 'U';
}

function getTrainingTitle(training?: TenantTraining | null, certificate?: Certificate | null) {
  return (
    training?.title ||
    training?.training_title ||
    training?.name ||
    certificate?.training_title ||
    certificate?.training_name ||
    certificate?.training_id ||
    'Training sin título'
  );
}

function getCertificateCode(certificate: Certificate) {
  return (
    certificate.certificate_code ||
    certificate.code ||
    certificate.id?.slice(0, 8).toUpperCase() ||
    '—'
  );
}

function getSignatureUrl(certificate?: Certificate | null) {
  if (!certificate) return null;

  return (
    certificate.ethics_signature_url ||
    certificate.worker_signature_url ||
    null
  );
}

function getCompanySignerLabel(certificate?: Certificate | null, fallbackTenantName = 'Empresa / Tenant') {
  if (!certificate) return `Responsable de capacitaciones · ${fallbackTenantName}`;

  const name = certificate.company_signer_name || 'Responsable de capacitaciones';
  const role = certificate.company_signer_role || fallbackTenantName;
  return `${name} · ${role}`;
}

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

function getIssuedDate(certificate: Certificate) {
  return certificate.issued_at || certificate.created_at || certificate.updated_at || null;
}

function getComputedStatus(certificate: Certificate) {
  const explicitStatus = normalize(certificate.status);

  if (explicitStatus === 'valid' || explicitStatus === 'vigente') return 'valid';
  if (explicitStatus === 'expiring_soon' || explicitStatus === 'por_vencer') return 'expiring_soon';
  if (explicitStatus === 'expired' || explicitStatus === 'vencido') return 'expired';
  if (explicitStatus === 'issued' || explicitStatus === 'emitido') return 'valid';

  if (!certificate.expires_at) return explicitStatus || 'valid';

  const expiresAt = new Date(certificate.expires_at).getTime();

  if (Number.isNaN(expiresAt)) return explicitStatus || 'valid';

  const now = Date.now();
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;

  if (expiresAt < now) return 'expired';
  if (expiresAt <= now + thirtyDays) return 'expiring_soon';

  return 'valid';
}

function sortCertificates(certificates: Certificate[]) {
  return [...certificates].sort((a, b) => {
    const dateA = new Date(a.issued_at || a.created_at || a.updated_at || '').getTime();
    const dateB = new Date(b.issued_at || b.created_at || b.updated_at || '').getTime();

    return dateB - dateA;
  });
}

function csvEscape(value: string | number | null | undefined) {
  const safeValue = value === null || value === undefined ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export default function AdminCertificates() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [tenantName, setTenantName] = useState<string>('Empresa / Tenant');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remindSent, setRemindSent] = useState(false);

  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  async function loadCertificates() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const [usersResult, trainingsResult, tenantResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('tenant_trainings').select('*').eq('tenant_id', tenantId),
        supabase.from('tenants').select('id, name').eq('id', tenantId).maybeSingle(),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (trainingsResult.error) throw trainingsResult.error;

      if (!tenantResult.error && tenantResult.data?.name) {
        setTenantName(tenantResult.data.name);
      }

      const loadedUsers = (usersResult.data ?? []) as Profile[];
      const loadedTrainings = (trainingsResult.data ?? []) as TenantTraining[];

      const profileIds = loadedUsers.map((profile) => profile.id).filter(Boolean);
      const authUserIds = loadedUsers
        .map((profile) => profile.auth_user_id)
        .filter(Boolean) as string[];

      const userIdsToMatch = Array.from(new Set([...profileIds, ...authUserIds]));

      const certificatesByTenantResult = await supabase
        .from('certificates')
        .select('*')
        .eq('tenant_id', tenantId);

      if (certificatesByTenantResult.error) throw certificatesByTenantResult.error;

      let certificatesByUserResultData: Certificate[] = [];

      if (userIdsToMatch.length > 0) {
        const certificatesByUserResult = await supabase
          .from('certificates')
          .select('*')
          .in('user_id', userIdsToMatch);

        if (certificatesByUserResult.error) throw certificatesByUserResult.error;

        certificatesByUserResultData = (certificatesByUserResult.data ?? []) as Certificate[];
      }

      const loadedCertificatesRaw = uniqueById([
        ...((certificatesByTenantResult.data ?? []) as Certificate[]),
        ...certificatesByUserResultData,
      ]);

      const usersById = new Map<string, Profile>();

      loadedUsers.forEach((profile) => {
        if (profile.id) usersById.set(profile.id, profile);
        if (profile.auth_user_id) usersById.set(profile.auth_user_id, profile);
      });

      const trainingsByAnyId = new Map<string, TenantTraining>();

      loadedTrainings.forEach((training) => {
        if (training.id) trainingsByAnyId.set(training.id, training);
        if (training.training_id) trainingsByAnyId.set(training.training_id, training);
      });

      let ethicsAcceptancesData: EthicsAcceptance[] = [];

      if (userIdsToMatch.length > 0) {
        const ethicsAcceptancesResult = await supabase
          .from('ethics_acceptances')
          .select('*')
          .in('user_id', userIdsToMatch)
          .order('accepted_at', { ascending: false });

        if (ethicsAcceptancesResult.error) {
          console.error('Error cargando firmas de ética:', ethicsAcceptancesResult.error);
        } else {
          ethicsAcceptancesData = (ethicsAcceptancesResult.data ?? []) as EthicsAcceptance[];
        }
      }

      const ethicsSignatureByUserId = new Map<string, string>();

      ethicsAcceptancesData.forEach((acceptance) => {
        if (!acceptance.user_id || !acceptance.signature_image_url) return;

        // Como viene ordenado desc por accepted_at, guardamos la firma más reciente.
        if (!ethicsSignatureByUserId.has(acceptance.user_id)) {
          ethicsSignatureByUserId.set(acceptance.user_id, acceptance.signature_image_url);
        }
      });

      const hydratedCertificates = loadedCertificatesRaw.map((certificate) => {
        const trainingKey =
          certificate.tenant_training_id ||
          certificate.training_id ||
          certificate.training_key ||
          certificate.training_slug;

        const certificateUser = certificate.user_id
          ? usersById.get(certificate.user_id) ?? null
          : null;

        const possibleSignatureUserIds = [
          certificate.user_id,
          certificateUser?.id,
          certificateUser?.auth_user_id,
        ].filter(Boolean) as string[];

        const ethicsSignatureUrl =
          possibleSignatureUserIds
            .map((id) => ethicsSignatureByUserId.get(id))
            .find(Boolean) ?? null;

        return {
          ...certificate,
          user: certificateUser,
          training: trainingKey ? trainingsByAnyId.get(trainingKey) ?? null : null,
          status: getComputedStatus(certificate),
          ethics_signature_url: ethicsSignatureUrl,
        };
      });

      setCertificates(sortCertificates(hydratedCertificates));
    } catch (error) {
      console.error('Error loading certificates:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los certificados desde Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCertificates();
  }, [tenantId]);

  const filtered = useMemo(() => {
    const searchValue = normalize(search);

    return certificates.filter((certificate) => {
      const status = getComputedStatus(certificate);
      const userName = getFullName(certificate.user);
      const userEmail = certificate.user?.email || '';
      const userDni = certificate.user?.dni || '';
      const userArea = certificate.user?.area || '';
      const trainingTitle = getTrainingTitle(certificate.training, certificate);
      const code = getCertificateCode(certificate);

      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const matchesSearch =
        !searchValue ||
        normalize(userName).includes(searchValue) ||
        normalize(userEmail).includes(searchValue) ||
        normalize(userDni).includes(searchValue) ||
        normalize(userArea).includes(searchValue) ||
        normalize(trainingTitle).includes(searchValue) ||
        normalize(code).includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [certificates, search, statusFilter]);

  function getStatusCount(statusValue: string) {
    if (statusValue === 'all') return certificates.length;

    return certificates.filter((certificate) => getComputedStatus(certificate) === statusValue)
      .length;
  }

  function exportCSV() {
    const headers = [
      'Usuario',
      'Email',
      'DNI',
      'Area',
      'Training',
      'Codigo',
      'Emitido',
      'Vence',
      'Estado',
      'Tiene firma',
    ];

    const rows = filtered.map((certificate) => [
      getFullName(certificate.user),
      certificate.user?.email || '',
      certificate.user?.dni || '',
      certificate.user?.area || '',
      getTrainingTitle(certificate.training, certificate),
      getCertificateCode(certificate),
      formatDate(getIssuedDate(certificate)),
      formatDate(certificate.expires_at),
      getComputedStatus(certificate),
      getSignatureUrl(certificate) ? 'Sí' : 'No',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'certificados_ciguena.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function sendReminderExpiring() {
    const expiring = filtered.filter((certificate) =>
      ['expiring_soon', 'expired'].includes(getComputedStatus(certificate))
    );

    if (expiring.length === 0) {
      setErrorMessage('No hay certificados vencidos o próximos a vencer en este filtro.');
      setSuccessMessage(null);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(
      `Reminder preparado para ${expiring.length} usuario(s) con certificados vencidos o próximos a vencer. El envío real se conecta después.`
    );

    setRemindSent(true);

    setTimeout(() => {
      setRemindSent(false);
    }, 3000);
  }

  function printCertificate(certificate: Certificate) {
    const workerName = getFullName(certificate.user);
    const workerSignatureUrl = getSignatureUrl(certificate);
    const trainingTitle = getTrainingTitle(certificate.training, certificate);
    const certificateCode = getCertificateCode(certificate);
    const status = getComputedStatus(certificate);
    const issuerName = tenantName || 'Empresa / Tenant';

    const workerSignatureBlock = workerSignatureUrl
      ? `<img src="${workerSignatureUrl}" alt="Firma trabajador" style="height:70px;max-width:220px;object-fit:contain;filter:invert(1) contrast(1.4);" />`
      : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma no disponible</div>';

    const companySignatureBlock = certificate.company_signature_url
      ? `<img src="${certificate.company_signature_url}" alt="Firma responsable" style="height:70px;max-width:220px;object-fit:contain;filter:invert(1) contrast(1.4);" />`
      : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma responsable no disponible</div>';

    const companySignerLabel = getCompanySignerLabel(certificate, issuerName);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${certificateCode}</title>
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
              <div class="box"><div class="label">Código</div>${certificateCode}</div>
              <div class="box"><div class="label">Estado</div>${status}</div>
              <div class="box"><div class="label">Emitido</div>${formatDate(getIssuedDate(certificate))}</div>
              <div class="box"><div class="label">Vencimiento</div>${formatDate(certificate.expires_at)}</div>
              <div class="box"><div class="label">Puntaje</div>${certificate.test_score ?? '-'}%</div>
              <div class="box"><div class="label">Intentos utilizados</div>${certificate.test_attempts_count ?? '-'}</div>
            </section>

            <section class="signatures">
              <div>
                ${workerSignatureBlock}
                <div class="line">Firma electrónica del trabajador</div>
              </div>

              <div>
                <div class="signature-slot">${companySignatureBlock}</div>
                <div class="line">${companySignerLabel}</div>
              </div>
            </section>

            <div class="audit">
              Registro auditable · Certificate ID: ${certificate.id}<br/>
              Assignment ID: ${certificate.assignment_id || 'sin assignment'}<br/>
              User ID: ${certificate.user_id || 'sin user'}<br/>
              Tenant ID: ${certificate.tenant_id || 'sin tenant'}<br/>
              Training ID: ${certificate.training_id || 'sin training'}<br/>
              Created at: ${formatDateTime(certificate.created_at || getIssuedDate(certificate))}
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

  const validCount = getStatusCount('valid');
  const expiringCount = getStatusCount('expiring_soon');
  const expiredCount = getStatusCount('expired');

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando certificados...</div>
        <div className="text-sm text-steel-500 mt-1">
          Estamos trayendo los certificados reales desde Supabase.
        </div>
      </div>
    );
  }

  if (errorMessage && certificates.length === 0) {
    return (
      <div className="card p-6 border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5" />

          <div>
            <div className="text-red-400 font-semibold">No se pudieron cargar los certificados</div>
            <div className="text-sm text-steel-400 mt-2">{errorMessage}</div>

            <button onClick={loadCertificates} className="btn-secondary mt-4 text-xs">
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
              placeholder="Buscar usuario, training o código..."
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={loadCertificates} className="btn-secondary text-xs">
              <RefreshCw size={14} />
              Actualizar
            </button>

            <button onClick={sendReminderExpiring} className="btn-secondary text-xs">
              {remindSent ? <Bell size={14} className="text-emerald-400" /> : <Bell size={14} />}
              Reminder vencidos
            </button>

            <button onClick={exportCSV} className="btn-secondary text-xs">
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            className={`metric-card text-center cursor-pointer transition-all ${
              statusFilter === 'valid' ? 'border-amber-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'valid' ? 'all' : 'valid')}
          >
            <div className="text-2xl font-bold text-emerald-400">{validCount}</div>
            <div className="text-xs text-steel-400 mt-1">Vigentes</div>
          </button>

          <button
            type="button"
            className={`metric-card text-center cursor-pointer transition-all ${
              statusFilter === 'expiring_soon' ? 'border-amber-500' : ''
            }`}
            onClick={() =>
              setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon')
            }
          >
            <div className="text-2xl font-bold text-amber-400">{expiringCount}</div>
            <div className="text-xs text-steel-400 mt-1">Próx. a vencer</div>
          </button>

          <button
            type="button"
            className={`metric-card text-center cursor-pointer transition-all ${
              statusFilter === 'expired' ? 'border-amber-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
          >
            <div className="text-2xl font-bold text-red-400">{expiredCount}</div>
            <div className="text-xs text-steel-400 mt-1">Vencidos</div>
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((statusFilterItem) => (
            <button
              key={statusFilterItem.value}
              onClick={() => setStatusFilter(statusFilterItem.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === statusFilterItem.value
                  ? 'bg-amber-500 text-petroleum-950'
                  : 'bg-steel-800 text-steel-300 hover:bg-steel-700'
              }`}
            >
              {statusFilterItem.label} ({getStatusCount(statusFilterItem.value)})
            </button>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-steel-900 border-b border-steel-700">
                  <th className="table-header">Usuario</th>
                  <th className="table-header">Training</th>
                  <th className="table-header hidden md:table-cell">Código</th>
                  <th className="table-header hidden lg:table-cell">Emitido</th>
                  <th className="table-header hidden lg:table-cell">Vence</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((certificate) => {
                  const userName = getFullName(certificate.user);
                  const trainingTitle = getTrainingTitle(certificate.training, certificate);
                  const status = getComputedStatus(certificate);

                  return (
                    <tr key={certificate.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-petroleum-700 rounded-full flex items-center justify-center text-xs font-bold text-petroleum-200 flex-shrink-0">
                            {getInitial(certificate.user)}
                          </div>

                          <div className="min-w-0">
                            <span className="text-sm font-medium text-steel-100 truncate max-w-[130px] block">
                              {userName}
                            </span>
                            {certificate.user?.email && (
                              <span className="text-xs text-steel-500 truncate max-w-[130px] block">
                                {certificate.user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="table-cell">
                        <span className="text-sm text-steel-200 truncate max-w-[180px] block">
                          {trainingTitle}
                        </span>
                      </td>

                      <td className="table-cell hidden md:table-cell font-mono text-xs text-steel-400">
                        {getCertificateCode(certificate)}
                      </td>

                      <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                        {formatDate(getIssuedDate(certificate))}
                      </td>

                      <td className="table-cell hidden lg:table-cell text-xs text-steel-400">
                        {formatDate(certificate.expires_at)}
                      </td>

                      <td className="table-cell">
                        <StatusBadge status={status} />
                      </td>

                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedCertificate(certificate)}
                            className="p-1.5 rounded transition-colors text-steel-400 hover:text-amber-400 hover:bg-steel-700"
                            title="Ver certificado"
                          >
                            <FileText size={14} />
                          </button>

                          <button
                            onClick={() => printCertificate(certificate)}
                            className="p-1.5 rounded transition-colors text-steel-400 hover:text-amber-400 hover:bg-steel-700"
                            title="Descargar PDF"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={<Award size={28} />}
              title="Sin certificados"
              description="No hay certificados con los filtros seleccionados."
            />
          )}
        </div>

        <div className="text-xs text-steel-600 flex items-start gap-2">
          <FileText size={14} className="mt-0.5" />
          <div>
            Vista conectada a Supabase. Si no aparecen certificados, revisá que la tabla certificates
            tenga tenant_id o que user_id coincida con profiles.id/auth_user_id.
          </div>
        </div>
      </div>

      {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-steel-950 border border-steel-700 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-steel-800 bg-steel-950 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-steel-100">
                  Certificado firmado
                </div>
                <div className="text-xs text-steel-500">
                  {getTrainingTitle(selectedCertificate.training, selectedCertificate)} ·{' '}
                  {getCertificateCode(selectedCertificate)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="rounded-lg p-2 text-steel-400 hover:bg-steel-800 hover:text-steel-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="mx-auto min-h-[900px] max-w-[800px] rounded-xl bg-white p-10 text-slate-900 shadow-xl border-4 border-amber-500">
                <div className="text-2xl font-extrabold tracking-wide text-amber-500">
                  CIGÜEÑA
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  by BondiApps · Plataforma de capacitaciones y certificaciones
                </div>

                <h1 className="mt-12 text-center text-4xl font-bold text-slate-900">
                  Certificado de capacitación
                </h1>

                <p className="mt-5 text-center text-base text-slate-600">
                  Se certifica que
                </p>

                <div className="mt-5 text-center text-3xl font-extrabold text-slate-900">
                  {getFullName(selectedCertificate.user)}
                </div>

                <p className="mt-5 text-center text-base text-slate-600">
                  aprobó satisfactoriamente la capacitación
                </p>

                <div className="mt-4 text-center text-2xl font-bold text-slate-900">
                  {getTrainingTitle(selectedCertificate.training, selectedCertificate)}
                </div>

                <div className="mt-3 text-center text-sm text-slate-600">
                  Emitido por: <strong>{tenantName || 'Empresa / Tenant'}</strong>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-xl border border-slate-300 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Código
                    </div>
                    <div className="font-mono text-xs">{getCertificateCode(selectedCertificate)}</div>
                  </div>

                  <div className="rounded-xl border border-slate-300 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </div>
                    <div>{getComputedStatus(selectedCertificate)}</div>
                  </div>

                  <div className="rounded-xl border border-slate-300 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Emitido
                    </div>
                    <div>{formatDate(getIssuedDate(selectedCertificate))}</div>
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

                <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
                  <div>
                    <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-3">
                      {getSignatureUrl(selectedCertificate) ? (
                        <img
                          src={getSignatureUrl(selectedCertificate) || ''}
                          alt="Firma trabajador"
                          className="max-h-24 max-w-full object-contain"
                          style={{ filter: 'invert(1) contrast(1.4)' }}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Firma no disponible</span>
                      )}
                    </div>
                    <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                      Firma electrónica del trabajador
                    </div>
                  </div>

                  <div>
                    <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-3">
                      {selectedCertificate.company_signature_url ? (
                        <img
                          src={selectedCertificate.company_signature_url}
                          alt="Firma responsable"
                          className="max-h-24 max-w-full object-contain"
                          style={{ filter: 'invert(1) contrast(1.4)' }}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Firma responsable no disponible</span>
                      )}
                    </div>
                    <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                      {getCompanySignerLabel(selectedCertificate, tenantName || 'Empresa / Tenant')}
                    </div>
                  </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-4 font-mono text-xs leading-6 text-slate-500">
                  Registro auditable · Certificate ID: {selectedCertificate.id}
                  <br />
                  Assignment ID: {selectedCertificate.assignment_id || 'sin assignment'}
                  <br />
                  User ID: {selectedCertificate.user_id || 'sin user'}
                  <br />
                  Tenant ID: {selectedCertificate.tenant_id || 'sin tenant'}
                  <br />
                  Training ID: {selectedCertificate.training_id || 'sin training'}
                  <br />
                  Created at:{' '}
                  {formatDateTime(selectedCertificate.created_at || getIssuedDate(selectedCertificate))}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => printCertificate(selectedCertificate)}
                  className="btn-secondary text-xs py-2"
                >
                  <Download size={13} /> Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
