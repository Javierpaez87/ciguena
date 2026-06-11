import React, { useEffect, useState } from 'react';
import { Award, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCertificatesByUser } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import type { Certificate, EthicsAcceptance } from '../../types';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

export default function WorkerCertificates() {
  const { user } = useAuth();
  const certificates = getCertificatesByUser(user?.id ?? 'u1');
  const [ethicsAcceptance, setEthicsAcceptance] = useState<EthicsAcceptance | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadLatestSignature() {
      if (!user?.id) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error cargando perfil para firma:', profileError);
        if (!ignore) setEthicsAcceptance(null);
        return;
      }

      const { data, error } = await supabase
        .from('ethics_acceptances')
        .select('*')
        .eq('user_id', profile.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error cargando Código de Ética firmado:', error);
        if (!ignore) setEthicsAcceptance(null);
        return;
      }

      if (!ignore) setEthicsAcceptance((data as EthicsAcceptance | null) ?? null);
    }

    loadLatestSignature();

    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const valid = certificates.filter(c => c.status === 'valid').length;
  const expiringSoon = certificates.filter(c => c.status === 'expiring_soon').length;
  const expired = certificates.filter(c => c.status === 'expired').length;

  const printCertificate = (cert: Certificate) => {
    const signatureBlock = ethicsAcceptance?.signature_image_url
      ? `<img src="${ethicsAcceptance.signature_image_url}" alt="Firma trabajador" style="height:70px;max-width:220px;object-fit:contain;" />`
      : '<div style="height:70px;color:#64748b;font-size:12px;display:flex;align-items:center;">Firma no disponible</div>';

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${cert.certificate_code}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; }
            .certificate { border: 3px solid #f59e0b; padding: 42px; min-height: 620px; }
            .brand { color: #f59e0b; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
            .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
            h1 { margin: 52px 0 12px; font-size: 36px; text-align: center; }
            .lead { text-align: center; color: #475569; font-size: 16px; }
            .name { text-align: center; font-size: 30px; font-weight: 800; margin: 26px 0; }
            .training { text-align: center; font-size: 22px; font-weight: 700; color: #0f172a; }
            .meta { margin-top: 46px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 14px; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 5px; }
            .signatures { margin-top: 54px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; }
            .line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #334155; }
            .code { margin-top: 34px; font-family: monospace; color: #475569; font-size: 12px; }
            @media print { body { padding: 0; } .certificate { border-width: 2px; min-height: calc(100vh - 88px); } }
          </style>
        </head>
        <body>
          <main class="certificate">
            <div class="brand">CIGÜEÑA</div>
            <div class="subtitle">by BondiApps · Plataforma de capacitaciones y certificaciones</div>

            <h1>Certificado de capacitación</h1>
            <p class="lead">Se certifica que</p>
            <div class="name">${user?.full_name ?? cert.user?.full_name ?? 'Trabajador'}</div>
            <p class="lead">aprobó satisfactoriamente la capacitación</p>
            <div class="training">${cert.training?.title ?? 'Training'}</div>

            <section class="meta">
              <div class="box"><div class="label">Código</div>${cert.certificate_code}</div>
              <div class="box"><div class="label">Emitido</div>${new Date(cert.issued_at).toLocaleDateString('es-AR')}</div>
              <div class="box"><div class="label">Vencimiento</div>${cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('es-AR') : 'Sin vencimiento'}</div>
              <div class="box"><div class="label">Estado</div>${cert.status}</div>
            </section>

            <section class="signatures">
              <div>
                ${signatureBlock}
                <div class="line">Firma electrónica del trabajador</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;">${ethicsAcceptance ? `Aceptación registrada: ${new Date(ethicsAcceptance.accepted_at).toLocaleString('es-AR')}` : ''}</div>
              </div>
              <div>
                <div style="height:70px;display:flex;align-items:center;font-weight:800;color:#f59e0b;">BondiApps</div>
                <div class="line">Emitido por Cigüeña</div>
              </div>
            </section>

            <div class="code">Registro auditable · ${cert.certificate_code}</div>
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
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-base font-semibold text-steel-100">
                Código de Ética firmado
              </div>

              <div className="text-xs text-steel-400 mt-1">
                Registro de aceptación y firma electrónica asociada al trabajador.
              </div>
            </div>

            <span className="badge badge-success">
              Firmado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-steel-500">Nombre:</span>{' '}
                <span className="text-steel-200">
                  {ethicsAcceptance.accepted_name || user?.full_name || 'Sin nombre'}
                </span>
              </div>

              <div>
                <span className="text-steel-500">Documento:</span>{' '}
                <span className="text-steel-200">
                  {ethicsAcceptance.accepted_document_number || 'Sin documento'}
                </span>
              </div>

              <div>
                <span className="text-steel-500">Fecha de aceptación:</span>{' '}
                <span className="text-steel-200">
                  {ethicsAcceptance.accepted_at
                    ? new Date(ethicsAcceptance.accepted_at).toLocaleString('es-AR')
                    : 'Sin fecha'}
                </span>
              </div>

              {ethicsAcceptance.acceptance_text && (
                <div className="pt-2 text-steel-400 leading-relaxed">
                  {ethicsAcceptance.acceptance_text}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-steel-700 bg-white p-4 flex items-center justify-center min-h-[120px]">
              {ethicsAcceptance.signature_image_url ? (
                <img
                  src={ethicsAcceptance.signature_image_url}
                  alt="Firma registrada"
                  className="max-h-24 max-w-full object-contain"
                />
              ) : (
                <div className="text-xs text-steel-500">
                  Firma no disponible
                </div>
              )}
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
          {certificates.map(cert => (
            <div
              key={cert.id}
              className={`card hover:border-steel-600 transition-all ${
                cert.status === 'expiring_soon'
                  ? 'border-amber-500/30'
                  : cert.status === 'expired'
                    ? 'border-red-500/20'
                    : ''
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    cert.status === 'valid'
                      ? 'bg-emerald-500/20'
                      : cert.status === 'expiring_soon'
                        ? 'bg-amber-500/20'
                        : 'bg-red-500/20'
                  }`}
                >
                  <Award
                    size={22}
                    className={
                      cert.status === 'valid'
                        ? 'text-emerald-400'
                        : cert.status === 'expiring_soon'
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-steel-100 mb-1">
                    {cert.training?.title}
                  </div>
                  <StatusBadge status={cert.status} />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-steel-400">Código</span>
                  <span className="font-mono text-xs text-steel-300">
                    {cert.certificate_code}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-steel-400">Emitido</span>
                  <span className="text-steel-300">
                    {new Date(cert.issued_at).toLocaleDateString('es-AR')}
                  </span>
                </div>

                {cert.expires_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-steel-400">Vence</span>
                    <span
                      className={
                        cert.status === 'expired'
                          ? 'text-red-400'
                          : cert.status === 'expiring_soon'
                            ? 'text-amber-400'
                            : 'text-steel-300'
                      }
                    >
                      {new Date(cert.expires_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                )}
              </div>

              {cert.status === 'expiring_soon' && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3 text-xs text-amber-300">
                  <AlertTriangle size={13} /> Este certificado vence pronto. Renovalo a tiempo.
                </div>
              )}

              {cert.status === 'expired' && (
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
          ))}
        </div>
      )}
    </div>
  );
}
