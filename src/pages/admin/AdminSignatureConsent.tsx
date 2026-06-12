import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileSignature,
  Loader2,
  PenLine,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataUrlToBlob } from '../../lib/ethics';
import type { AuthUser } from '../../types';

interface AdminSignatureConsentProps {
  user: AuthUser;
  tenant: { id: string; name: string; logo_url: string | null };
  onSigned: () => void;
}

type Point = { x: number; y: number };

const ACCEPTANCE_TEXT =
  'Declaro que la firma registrada en la plataforma Cigüeña corresponde a mi firma electrónica y autorizo su almacenamiento y utilización por parte de mi organización para la emisión de certificados de capacitación, constancias y documentos asociados al uso de la plataforma, cuando corresponda. Entiendo que la firma podrá ser utilizada únicamente en el marco de los procesos de capacitación, certificación y trazabilidad gestionados por mi organización dentro de la plataforma.';

export default function AdminSignatureConsent({ user, tenant, onSigned }: AdminSignatureConsentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acceptedName, setAcceptedName] = useState(user.full_name ?? '');
  const [signerRole, setSignerRole] = useState(user.profile.position ?? 'Responsable de capacitaciones');
  const [documentNumber, setDocumentNumber] = useState(user.profile.employee_code ?? '');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f8fafc';
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const point = getPoint(event);
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!accepted) {
      setError('Marcá la declaración de conformidad para continuar.');
      return;
    }

    if (!acceptedName.trim()) {
      setError('Completá tu nombre y apellido.');
      return;
    }

    if (!signerRole.trim()) {
      setError('Completá el cargo o rol del firmante.');
      return;
    }

    if (!documentNumber.trim()) {
      setError('Completá tu DNI, legajo o identificador interno.');
      return;
    }

    if (!hasSignature || !canvasRef.current) {
      setError('Firmá dentro del recuadro para continuar.');
      return;
    }

    setIsSaving(true);

    try {
      const signatureDataUrl = canvasRef.current.toDataURL('image/png');
      const signatureBlob = dataUrlToBlob(signatureDataUrl);
      const signaturePath = `${tenant.id}/signatures/${user.id}/admin-signature-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('company-signatures')
        .upload(signaturePath, signatureBlob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('company-signatures')
        .getPublicUrl(signaturePath);

      const { count: activeSignaturesCount, error: countError } = await supabase
        .from('tenant_signatures')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('is_active', true);

      if (countError) throw countError;

      const shouldBeDefault = (activeSignaturesCount ?? 0) === 0;

      const { data: tenantSignature, error: tenantSignatureError } = await supabase
        .from('tenant_signatures')
        .insert({
          tenant_id: tenant.id,
          admin_user_id: user.id,
          signer_name: acceptedName.trim(),
          signer_role: signerRole.trim(),
          signature_image_url: publicUrlData.publicUrl,
          is_default: shouldBeDefault,
          is_active: true,
        })
        .select('id')
        .single();

      if (tenantSignatureError) throw tenantSignatureError;

      const { error: acceptanceError } = await supabase
        .from('admin_signature_acceptances')
        .insert({
          tenant_id: tenant.id,
          admin_user_id: user.id,
          accepted_name: acceptedName.trim(),
          accepted_document_number: documentNumber.trim(),
          acceptance_text: ACCEPTANCE_TEXT,
          signature_image_url: publicUrlData.publicUrl,
          tenant_signature_id: tenantSignature.id,
        });

      if (acceptanceError) throw acceptanceError;

      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'admin_signature_consent_accepted',
        entity_type: 'tenant_signature',
        entity_id: tenantSignature.id,
        metadata: {
          signer_name: acceptedName.trim(),
          signer_role: signerRole.trim(),
          is_default: shouldBeDefault,
        },
      });

      setSuccess(
        shouldBeDefault
          ? 'Firma registrada correctamente. Al ser la primera firma activa de la empresa, quedó configurada como predeterminada para nuevos certificados. Podés administrarla desde Signatures.'
          : 'Firma registrada correctamente. Podés administrar las firmas autorizadas y seleccionar la predeterminada desde Signatures.'
      );

      setTimeout(() => onSigned(), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos guardar la firma.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-steel-950 p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-steel-900 border border-amber-500/30 flex items-center justify-center p-1.5 shadow-lg shadow-amber-500/10">
            <img src="/images/ciguena-pumpjack.png" alt="Cigüeña" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400 tracking-wide">CIGÜEÑA</div>
            <div className="text-xs text-steel-400">Firma autorizada · {tenant.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          <section className="card">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300 flex-shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-steel-50 mb-1">Conformidad de firma para certificados</h1>
                <p className="text-sm text-steel-400 leading-relaxed">
                  Para operar como admin de {tenant.name}, registrá tu firma y aceptá su uso en certificados de capacitación cuando la empresa la seleccione como firma autorizada.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-950/50 p-5 mb-5">
              <div className="flex items-center gap-2 text-steel-100 font-semibold mb-3">
                <FileSignature size={18} className="text-amber-400" />
                Declaración de conformidad
              </div>

              <p className="text-sm leading-7 text-steel-300 whitespace-pre-line">
                {ACCEPTANCE_TEXT}
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-amber-500"
              />
              <span className="text-sm text-steel-300 leading-relaxed">
                Declaro mi conformidad y autorizo el almacenamiento de mi firma para los usos descriptos. Entiendo que las firmas autorizadas se administran desde el menú lateral <strong className="text-steel-100">Signatures</strong>.
              </span>
            </label>

            <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200 leading-relaxed">
              Una vez registrada, esta firma quedará disponible en <strong>Signatures</strong>. Si es la primera firma activa de la empresa, se marcará como predeterminada para nuevos certificados. Los certificados ya emitidos conservarán la firma usada al momento de su emisión.
            </div>
          </section>

          <aside className="card sticky top-6">
            <div className="flex items-center gap-2 mb-5">
              <PenLine size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-steel-50">Datos y firma</h2>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="accepted-name">Nombre y apellido</label>
                <input
                  id="accepted-name"
                  className="input"
                  value={acceptedName}
                  onChange={e => setAcceptedName(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="label" htmlFor="signer-role">Cargo / rol para certificados</label>
                <input
                  id="signer-role"
                  className="input"
                  value={signerRole}
                  onChange={e => setSignerRole(e.target.value)}
                  disabled={isSaving}
                  placeholder="Ej. Responsable HSE"
                />
              </div>

              <div>
                <label className="label" htmlFor="document-number">DNI / Legajo / Identificador</label>
                <input
                  id="document-number"
                  className="input"
                  value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)}
                  disabled={isSaving}
                  placeholder="Ej. DNI o legajo interno"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Firma</label>
                  <button type="button" onClick={clearSignature} className="text-xs text-steel-400 hover:text-steel-200 inline-flex items-center gap-1">
                    <RotateCcw size={13} /> Limpiar
                  </button>
                </div>
                <div className="rounded-xl border border-steel-700 bg-steel-950 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-44 touch-none cursor-crosshair"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    onPointerLeave={stopDrawing}
                  />
                  <div className="border-t border-steel-800 px-3 py-2 text-[11px] text-steel-500">
                    Firmá dentro del recuadro con mouse, dedo o pantalla táctil.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary w-full justify-center py-3"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Guardando firma...</span>
                ) : 'Confirmar firma y continuar'}
              </button>

              <div className="text-[11px] text-steel-500 leading-relaxed">
                Se registrará fecha y hora, usuario, empresa, firma y evento de auditoría.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
