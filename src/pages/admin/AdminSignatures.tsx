import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileSignature,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import EmptyState from '../../components/ui/EmptyState';

type TenantSignature = {
  id: string;
  tenant_id: string;
  admin_user_id?: string | null;
  signer_name: string;
  signer_role?: string | null;
  signature_image_url: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(date?: string | null) {
  if (!date) return 'Sin fecha';
  return new Date(date).toLocaleString('es-AR');
}

export default function AdminSignatures() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [signatures, setSignatures] = useState<TenantSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadSignatures() {
    if (!tenantId) {
      setLoading(false);
      setErrorMessage('No se encontró tenant_id para el usuario actual.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('tenant_signatures')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando firmas:', error);
      setErrorMessage('No pudimos cargar las firmas autorizadas.');
      setSignatures([]);
    } else {
      setSignatures((data ?? []) as TenantSignature[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSignatures();
  }, [tenantId]);

  async function setAsDefault(signature: TenantSignature) {
    if (!tenantId || !signature.is_active) return;

    setSavingId(signature.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const previousDefaultIds = signatures
      .filter((item) => item.is_default && item.id !== signature.id)
      .map((item) => item.id);
    const now = new Date().toISOString();

    const { error: resetError } = await supabase
      .from('tenant_signatures')
      .update({ is_default: false, updated_at: now })
      .eq('tenant_id', tenantId)
      .eq('is_default', true);

    if (resetError) {
      setSavingId(null);
      setErrorMessage(resetError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('tenant_signatures')
      .update({ is_default: true, updated_at: now })
      .eq('id', signature.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      if (previousDefaultIds.length > 0) {
        await supabase
          .from('tenant_signatures')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .in('id', previousDefaultIds);
      }
      setSavingId(null);
      setErrorMessage(`No pudimos cambiar la firma predeterminada: ${updateError.message}`);
      return;
    }

    setSavingId(null);
    await loadSignatures();
    setSuccessMessage(`La firma de ${signature.signer_name} quedó como predeterminada para nuevos certificados.`);
  }

  async function deactivateSignature(signature: TenantSignature) {
    if (signature.is_default) {
      setErrorMessage('No podés desactivar la firma predeterminada. Primero seleccioná otra firma como predeterminada.');
      setSuccessMessage(null);
      return;
    }

    setSavingId(signature.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from('tenant_signatures')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', signature.id);

    setSavingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(`La firma de ${signature.signer_name} fue desactivada.`);
    await loadSignatures();
  }

  async function reactivateSignature(signature: TenantSignature) {
    setSavingId(signature.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const anotherActiveDefaultExists = signatures.some(
      (item) => item.id !== signature.id && item.is_active && item.is_default
    );

    const { error } = await supabase
      .from('tenant_signatures')
      .update({
        is_active: true,
        // Compatibilidad con datos legacy: si esta firma quedó default estando inactiva
        // y ya existe otra default activa, se reactiva sin disputar la predeterminada.
        is_default: signature.is_default && anotherActiveDefaultExists ? false : signature.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signature.id);

    setSavingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(`La firma de ${signature.signer_name} fue reactivada.`);
    await loadSignatures();
  }

  const activeSignatures = signatures.filter(signature => signature.is_active);
  const activeDefaultSignatures = signatures.filter(signature => signature.is_default && signature.is_active);
  const defaultSignature = activeDefaultSignatures[0];

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-steel-100 font-semibold">Cargando firmas...</div>
        <div className="text-sm text-steel-500 mt-1">Estamos trayendo las firmas autorizadas de tu empresa.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      <div className="card border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-300 flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-base font-semibold text-steel-100">Firmas autorizadas para certificados</div>
            <div className="text-sm text-steel-400 mt-1 leading-relaxed">
              La firma marcada como predeterminada se copiará en los nuevos certificados emitidos. Los certificados ya emitidos conservarán la firma que tenían al momento de su emisión, aunque después cambie la firma predeterminada.
            </div>
          </div>
        </div>
      </div>

      {activeDefaultSignatures.length > 1 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="font-semibold">Atención: hay {activeDefaultSignatures.length} firmas marcadas como predeterminadas.</div>
          <div className="text-xs text-red-200/80 mt-1">
            Seleccioná nuevamente la firma correcta. También recomendamos ejecutar la query de integridad incluida con este cambio.
          </div>
        </div>
      )}

      {defaultSignature ? (
        <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-5 shadow-lg shadow-amber-500/5">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-full md:w-56 min-h-[110px] rounded-xl border border-amber-500/30 bg-steel-950/70 p-4 flex items-center justify-center">
              <img
                src={defaultSignature.signature_image_url}
                alt={`Firma predeterminada de ${defaultSignature.signer_name}`}
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-200">
                <Star size={14} className="fill-current" />
                Firma que saldrá en los nuevos certificados
              </div>
              <div className="text-xl font-bold text-steel-100 mt-3">{defaultSignature.signer_name}</div>
              <div className="text-sm text-steel-300 mt-1">{defaultSignature.signer_role || 'Sin cargo informado'}</div>
              <div className="text-xs text-steel-500 mt-3">
                Si cambiás la predeterminada, solo afecta certificados emitidos a partir de ese momento.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="font-semibold">No hay una firma predeterminada activa.</div>
          <div className="text-xs text-steel-400 mt-1">
            Elegí una firma activa antes de emitir nuevos certificados para evitar que salgan sin firma responsable.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card text-center">
          <UserCheck size={20} className="text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-emerald-400">{activeSignatures.length}</div>
          <div className="text-xs text-steel-400 mt-1">Firmas activas</div>
        </div>

        <div className="metric-card text-center">
          <Star size={20} className="text-amber-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-amber-400">{defaultSignature ? '1' : '0'}</div>
          <div className="text-xs text-steel-400 mt-1">Predeterminada</div>
        </div>

        <button onClick={loadSignatures} className="metric-card text-center hover:border-amber-500/50 transition-colors">
          <RefreshCw size={20} className="text-steel-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-steel-100">Actualizar</div>
          <div className="text-xs text-steel-400 mt-1">Recargar firmas</div>
        </button>
      </div>

      {signatures.length === 0 ? (
        <EmptyState
          icon={<FileSignature size={28} />}
          title="Sin firmas autorizadas"
          description="Cuando un admin registre su conformidad inicial, su firma aparecerá acá para poder usarla en certificados."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signatures.map(signature => (
            <div
              key={signature.id}
              className={`card ${signature.is_default && signature.is_active ? 'border-2 border-amber-500/70 ring-1 ring-amber-500/20' : ''} ${!signature.is_active ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-base font-semibold text-steel-100">{signature.signer_name}</div>
                  <div className="text-sm text-steel-400 mt-0.5">{signature.signer_role || 'Sin cargo informado'}</div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {signature.is_default && signature.is_active && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-200"><Star size={12} className="fill-current" /> Firma de certificados</span>
                  )}
                  <span className={`badge ${signature.is_active ? 'badge-success' : 'badge-error'}`}>
                    {signature.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-steel-700 bg-steel-950/70 p-4 min-h-[120px] flex items-center justify-center mb-4">
                <img
                  src={signature.signature_image_url}
                  alt={`Firma de ${signature.signer_name}`}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>

              <div className="text-xs text-steel-500 mb-4">
                Registrada: {formatDate(signature.created_at)}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setAsDefault(signature)}
                  disabled={!signature.is_active || signature.is_default || savingId === signature.id}
                  className="btn-secondary justify-center text-xs py-2 disabled:opacity-40"
                >
                  <Star size={13} />
                  {signature.is_default ? 'Seleccionada para certificados' : 'Usar en certificados'}
                </button>

                {signature.is_active ? (
                  <button
                    type="button"
                    onClick={() => deactivateSignature(signature)}
                    disabled={signature.is_default || savingId === signature.id}
                    className="btn-secondary justify-center text-xs py-2 disabled:opacity-40"
                  >
                    <XCircle size={13} /> Desactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reactivateSignature(signature)}
                    disabled={savingId === signature.id}
                    className="btn-secondary justify-center text-xs py-2 disabled:opacity-40"
                  >
                    <CheckCircle size={13} /> Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-steel-600 flex items-start gap-2">
        <AlertCircle size={14} className="mt-0.5" />
        <div>
          Para agregar una nueva firma, el admin correspondiente debe iniciar sesión y registrar su conformidad. La firma quedará disponible en esta pantalla.
        </div>
      </div>
    </div>
  );
}
