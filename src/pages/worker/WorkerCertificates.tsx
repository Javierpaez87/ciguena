import React from 'react';
import { Award, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCertificatesByUser } from '../../lib/mockData';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';

export default function WorkerCertificates() {
  const { user } = useAuth();
  const certificates = getCertificatesByUser(user?.id ?? 'u1');

  const valid = certificates.filter(c => c.status === 'valid').length;
  const expiringSoon = certificates.filter(c => c.status === 'expiring_soon').length;
  const expired = certificates.filter(c => c.status === 'expired').length;

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={<Award size={28} />}
        title="Sin certificados"
        description="Completá un training para obtener tu primer certificado."
      />
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certificates.map(cert => (
          <div key={cert.id} className={`card hover:border-steel-600 transition-all ${cert.status === 'expiring_soon' ? 'border-amber-500/30' : cert.status === 'expired' ? 'border-red-500/20' : ''}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cert.status === 'valid' ? 'bg-emerald-500/20' : cert.status === 'expiring_soon' ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                <Award size={22} className={cert.status === 'valid' ? 'text-emerald-400' : cert.status === 'expiring_soon' ? 'text-amber-400' : 'text-red-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-steel-100 mb-1">{cert.training?.title}</div>
                <StatusBadge status={cert.status} />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Código</span>
                <span className="font-mono text-xs text-steel-300">{cert.certificate_code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-steel-400">Emitido</span>
                <span className="text-steel-300">{new Date(cert.issued_at).toLocaleDateString('es-AR')}</span>
              </div>
              {cert.expires_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-steel-400">Vence</span>
                  <span className={cert.status === 'expired' ? 'text-red-400' : cert.status === 'expiring_soon' ? 'text-amber-400' : 'text-steel-300'}>
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

            <button className="btn-secondary w-full justify-center text-xs py-2">
              <Download size={13} /> Descargar certificado PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
