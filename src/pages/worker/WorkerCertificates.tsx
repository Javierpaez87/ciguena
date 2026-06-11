import React, { useEffect, useState } from 'react';
import {
  Award,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { baseTrainings } from '../../data/baseTrainings';
import type { EthicsAcceptance } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

type SupabaseCertificate = {
  id: string;
  assignment_id: string;
  user_id: string;
  training_id: string;
  tenant_id?: string | null;
  certificate_code: string;
  worker_signature_url?: string | null;
  issued_at: string;
  expires_at?: string | null;
  status: string;
  test_score?: number | null;
  test_attempts_count?: number | null;
  created_at?: string | null;
  training?: {
    title: string;
    description?: string;
  };
  tenant?: {
    name?: string;
  } | null;
};

const getCertificateStatus = (cert: SupabaseCertificate) => {
  if (cert.status === 'expired') return 'expired';

  if (!cert.expires_at) return cert.status || 'valid';

  const now = new Date();
  const expiresAt = new Date(cert.expires_at);
  const inThirtyDays = new Date();
  inThirtyDays.setDate(now.getDate() + 30);

  if (expiresAt < now) return 'expired';
  if (expiresAt <= inThirtyDays) return 'expiring_soon';

  return cert.status || 'valid';
};

export default function WorkerCertificates() {
  const { user } = useAuth();

  const [certificates, setCertificates] = useState<SupabaseCertificate[]>([]);
  const [ethicsAcceptance, setEthicsAcceptance] = useState<EthicsAcceptance | null>(null);
  const [isEthicsModalOpen, setIsEthicsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const formatDate = (date?: string | null) => {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleDateString('es-AR');
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleString('es-AR');
  };

  const loadCertificatesData = async () => {
    if (!user?.id) {
      setCertificates([]);
      setEthicsAcceptance(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const { data: ethicsData, error: ethicsError } = await supabase
      .from('ethics_acceptances')
      .select('*')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ethicsError) {
      console.error('Error cargando Código de Ética firmado:', ethicsError);
    }

    setEthicsAcceptance((ethicsData as EthicsAcceptance | null) ?? null);

    const { data: certificatesData, error: certificatesError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (certificatesError) {
      console.error('Error cargando certificados:', certificatesError);
      setLoadError('No pudimos cargar tus certificados.');
      setCertificates([]);
      setIsLoading(false);
      return;
    }

    const tenantIds = Array.from(
      new Set(
        (certificatesData ?? [])
          .map(cert => cert.tenant_id)
          .filter(Boolean)
      )
    );

    let tenantsById = new Map<string, { name?: string }>();

    if (tenantIds.length > 0) {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);

      if (tenantsError) {
        console.error('Error cargando tenants para certificados:', tenantsError);
      }

      tenantsById = new Map(
        (tenantsData ?? []).map(tenant => [
          tenant.id as string,
          { name: tenant.name as string },
        ])
      );
    }

    const trainingById = new Map(baseTrainings.map(training => [training.id, training]));

    const hydratedCertificates = (certificatesData ?? []).map(cert => {
      const training = trainingById.get(cert.training_id as string);
      const tenant = cert.tenant_id ? tenantsById.get(cert.tenant_id as string) ?? null : null;

      return {
        ...(cert as SupabaseCertificate),
        training: training
          ? {
              title: training.title,
              description: training.description,
            }
          : {
              title: cert.training_id as string,
            },
        tenant,
      };
    });

    setCertificates(hydratedCertificates);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCertificatesData();
  }, [user?.id]);

  const valid = certificates.filter(c => getCertificateStatus(c) === 'valid').length;
  const expiringSoon = certificates.filter(c => getCertificateStatus(c) === 'expiring_soon').length;
  const expired = certificates.filter(c => getCertificateStatus(c) === 'expired').length;

  const printEthicsDocument = () => {
    if (!ethicsAcceptance) return;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Codigo de Etica firmado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #f8fafc; }
            .document { background: white; max-width: 820px; margin: 0 auto; padding: 54px; border: 1px solid #cbd5e1; min-height: 900px; }
            .brand { color: #f59e0b; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
            .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
            h1 { margin: 42px 0 18px; font-size: 30px; color: #0f172a; }
            h2 { margin-top: 28px; font-size: 16px; color: #0f172a; }
            p { font-size: 14px; line-height: 1.7; color: #334155; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-top: 22px; font-size: 14px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px; }
            .signature { margin-top: 52px; display: grid; grid-template-columns: 1fr 1fr; gap: 46px; align-items: end; }
            .signature-box { min-height: 90px; display: flex; align-items: center; justify-content: center; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: #f1f5f9; }
            .signature-box img { max-height: 80px; max-width: 260px; object-fit: contain; filter: invert(1) contrast(1.4); }
            .line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #334155; margin-top: 10px; }
            .code { margin-top: 34px; font-family: monospace; color: #64748b; font-size: 12px; }
            @media print { body { background: white; padding: 0; } .document { border: none; max-width: none; min-height: calc(100vh - 108px); } }
          </style>
        </head>
        <body>
          <main class="document">
            <div class="brand">CIGÜEÑA</div>
            <div class="subtitle">by BondiApps · Registro de aceptación electrónica</div>

            <h1>Código de Ética BondiApps</h1>

            <p>
              Este documento deja constancia de la lectura y aceptación del Código de Ética aplicable
              al uso de la plataforma Cigüeña y a las capacitaciones asignadas por la organización.
            </p>

            <h2>Declaración de aceptación</h2>
            <p>
              ${ethicsAcceptance.acceptance_text || 'Declaro haber leído y aceptado el Código de Ética BondiApps.'}
            </p>

            <section class="box">
              <div class="label">Firmante</div>
              <div><strong>Nombre:</strong> ${ethicsAcceptance.accepted_name || user?.full_name || 'Sin nombre'}</div>
              <div><strong>Documento:</strong> ${ethicsAcceptance.accepted_document_number || 'Sin documento'}</div>
              <div><strong>Fecha de aceptación:</strong> ${formatDateTime(ethicsAcceptance.accepted_at)}</div>
            </section>

            <section class="signature">
              <div>
                <div class="signature-box">
                  ${
                    ethicsAcceptance.signature_image_url
                      ? `<img src="${ethicsAcceptance.signature_image_url}" alt="Firma registrada" />`
                      : '<span style="color:#64748b;font-size:12px;">Firma no disponible</span>'
                  }
                </div>
                <div class="line">Firma electrónica del trabajador</div>
              </div>

              <div>
                <div style="height:90px;display:flex;align-items:center;font-weight:800;color:#f59e0b;">BondiApps</div>
                <div class="line">Registro emitido por Cigüeña</div>
              </div>
            </section>

            <div class="code">Registro auditable · ${ethicsAcceptance.id || 'sin-id'}</div>
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
  };

  const printCertificate = (cert: SupabaseCertificate) => {
    const workerSignatureUrl = cert.worker_signature_url || ethicsAcceptance?.signature_image_url;

    const workerSignatureBlock = workerSignatureUrl
      ? `<img src="${workerSignatureUrl}" alt="Firma trabajador" style="height:70px;max-width:220px;object-fit:contain;filter:invert(1) contrast(1.4);" />`
      : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma no disponible</div>';

    const issuerName = cert.tenant?.name || 'Empresa / Tenant';
    const status = getCertificateStatus(cert);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${cert.certificate_code}</title>
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
            <div class="name">${user?.full_name ?? 'Trabajador'}</div>
            <p class="lead">aprobó satisfactoriamente la capacitación</p>
            <div class="training">${cert.training?.title ?? cert.training_id}</div>
            <div class="issuer">Emitido por: <strong>${issuerName}</strong></div>

            <section class="meta">
              <div class="box"><div class="label">Código</div>${cert.certificate_code}</div>
              <div class="box"><div class="label">Estado</div>${status}</div>
              <div class="box"><div class="label">Emitido</div>${formatDate(cert.issued_at)}</div>
              <div class="box"><div class="label">Vencimiento</div>${formatDate(cert.expires_at)}</div>
              <div class="box"><div class="label">Puntaje</div>${cert.test_score ?? '-'}%</div>
              <div class="box"><div class="label">Intentos utilizados</div>${cert.test_attempts_count ?? '-'}</div>
            </section>

            <section class="signatures">
              <div>
                ${workerSignatureBlock}
                <div class="line">Firma electrónica del trabajador</div>
              </div>

              <div>
                <div class="signature-slot">Firma responsable de capacitaciones</div>
                <div class="line">Responsable de capacitaciones · ${issuerName}</div>
              </div>
            </section>

            <div class="audit">
              Registro auditable · Certificate ID: ${cert.id}<br/>
              Assignment ID: ${cert.assignment_id}<br/>
              User ID: ${cert.user_id}<br/>
              Tenant ID: ${cert.tenant_id || 'sin tenant'}<br/>
              Training ID: ${cert.training_id}<br/>
              Created at: ${formatDateTime(cert.created_at || cert.issued_at)}
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
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-steel-700 bg-steel-900/60 p-4 text-sm text-steel-300">
        Cargando certificados...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold">No pudimos cargar tus certificados</div>
          <div className="text-red-200/90">{loadError}</div>
          <button
            onClick={loadCertificatesData}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
          >
            <RefreshCw size={13} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {certificates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="metric-card text-center">
            <CheckCircle size={20} className="text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-emerald-400">{valid}</div>
            <div className="text-xs text-steel-400 mt-1">Vigentes</div>
          </div>

          <div className="metric-card text-center">
            <AlertTriangle size={20} className="text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-amber-400">{expiringSoon}</div>
            <div className="text-xs text-steel-400 mt-1">Próx. a vencer</div>
          </div>

          <div className="metric-card text-center">
            <XCircle size={20} className="text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-400">{expired}</div>
            <div className="text-xs text-steel-400 mt-1">Vencidos</div>
          </div>
        </div>
      )}

      {ethicsAcceptance && (
        <div className="card border-emerald-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-emerald-400" />
              </div>

              <div>
                <div className="text-base font-semibold text-steel-100">
                  Código de Ética
                </div>

                <div className="text-xs text-steel-400 mt-1">
                  Firmado el {formatDateTime(ethicsAcceptance.accepted_at)}
                </div>

                <div className="mt-2">
                  <span className="badge badge-success">
                    Firmado
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setIsEthicsModalOpen(true)}
                className="btn-secondary justify-center text-xs py-2"
              >
                <FileText size={13} /> Ver documento firmado
              </button>

              <button
                type="button"
                onClick={printEthicsDocument}
                className="btn-secondary justify-center text-xs py-2"
              >
                <Download size={13} /> Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {certificates.length === 0 ? (
        <EmptyState
          icon={<Award size={28} />}
          title="Sin certificados"
          description="Completá un training para obtener tu primer certificado."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map(cert => {
            const status = getCertificateStatus(cert);

            return (
              <div
                key={cert.id}
                className={`card hover:border-steel-600 transition-all ${
                  status === 'expiring_soon'
                    ? 'border-amber-500/30'
                    : status === 'expired'
                      ? 'border-red-500/20'
                      : ''
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      status === 'valid'
                        ? 'bg-emerald-500/20'
                        : status === 'expiring_soon'
                          ? 'bg-amber-500/20'
                          : 'bg-red-500/20'
                    }`}
                  >
                    <Award
                      size={22}
                      className={
                        status === 'valid'
                          ? 'text-emerald-400'
                          : status === 'expiring_soon'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-steel-100 mb-1">
                      {cert.training?.title}
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Empresa</span>
                    <span className="text-steel-300">
                      {cert.tenant?.name || 'Sin empresa'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Código</span>
                    <span className="font-mono text-xs text-steel-300">
                      {cert.certificate_code}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Emitido</span>
                    <span className="text-steel-300">
                      {formatDate(cert.issued_at)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Vence</span>
                    <span
                      className={
                        status === 'expired'
                          ? 'text-red-400'
                          : status === 'expiring_soon'
                            ? 'text-amber-400'
                            : 'text-steel-300'
                      }
                    >
                      {formatDate(cert.expires_at)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Puntaje</span>
                    <span className="text-steel-300">
                      {cert.test_score ?? '-'}%
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Intentos</span>
                    <span className="text-steel-300">
                      {cert.test_attempts_count ?? '-'}
                    </span>
                  </div>
                </div>

                {status === 'expiring_soon' && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3 text-xs text-amber-300">
                    <AlertTriangle size={13} /> Este certificado vence pronto. Renovalo a tiempo.
                  </div>
                )}

                {status === 'expired' && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-300">
                    <XCircle size={13} /> Certificado vencido. Debés renovarlo.
                  </div>
                )}

                <button
                  onClick={() => printCertificate(cert)}
                  className="btn-secondary w-full justify-center text-xs py-2"
                >
                  <Download size={13} /> Descargar certificado PDF
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isEthicsModalOpen && ethicsAcceptance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-steel-950 border border-steel-700 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-steel-800 bg-steel-950 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-steel-100">
                  Documento firmado
                </div>
                <div className="text-xs text-steel-500">
                  Código de Ética · Registro electrónico
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEthicsModalOpen(false)}
                className="rounded-lg p-2 text-steel-400 hover:bg-steel-800 hover:text-steel-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="mx-auto min-h-[900px] max-w-[760px] rounded-xl bg-white p-10 text-slate-900 shadow-xl">
                <div className="text-2xl font-extrabold tracking-wide text-amber-500">
                  CIGÜEÑA
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  by BondiApps · Registro de aceptación electrónica
                </div>

                <h1 className="mt-10 text-3xl font-bold text-slate-900">
                  Código de Ética BondiApps
                </h1>

                <p className="mt-5 text-sm leading-7 text-slate-700">
                  Este documento deja constancia de la lectura y aceptación del Código de Ética aplicable
                  al uso de la plataforma Cigüeña y a las capacitaciones asignadas por la organización.
                </p>

                <h2 className="mt-8 text-base font-bold text-slate-900">
                  Declaración de aceptación
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {ethicsAcceptance.acceptance_text ||
                    'Declaro haber leído y aceptado el Código de Ética BondiApps.'}
                </p>

                <div className="mt-8 rounded-xl border border-slate-300 p-4 text-sm text-slate-700">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Firmante
                  </div>

                  <div>
                    <strong>Nombre:</strong>{' '}
                    {ethicsAcceptance.accepted_name || user?.full_name || 'Sin nombre'}
                  </div>

                  <div>
                    <strong>Documento:</strong>{' '}
                    {ethicsAcceptance.accepted_document_number || 'Sin documento'}
                  </div>

                  <div>
                    <strong>Fecha de aceptación:</strong>{' '}
                    {formatDateTime(ethicsAcceptance.accepted_at)}
                  </div>
                </div>

                <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
                  <div>
                    <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 p-3">
                      {ethicsAcceptance.signature_image_url ? (
                        <img
                          src={ethicsAcceptance.signature_image_url}
                          alt="Firma registrada"
                          className="max-h-24 max-w-full object-contain"
                          style={{ filter: 'invert(1) contrast(1.4)' }}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">
                          Firma no disponible
                        </span>
                      )}
                    </div>
                    <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                      Firma electrónica del trabajador
                    </div>
                  </div>

                  <div>
                    <div className="flex min-h-[110px] items-center font-extrabold text-amber-500">
                      BondiApps
                    </div>
                    <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-700">
                      Registro emitido por Cigüeña
                    </div>
                  </div>
                </div>

                <div className="mt-10 font-mono text-xs text-slate-500">
                  Registro auditable · {ethicsAcceptance.id || 'sin-id'}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={printEthicsDocument}
                  className="btn-secondary text-xs py-2"
                >
                  <Download size={13} /> Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
