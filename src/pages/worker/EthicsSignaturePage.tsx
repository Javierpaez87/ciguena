import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  PenLine,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataUrlToBlob, sha256FromText } from '../../lib/ethics';
import type { AuthUser, EthicsCode } from '../../types';

interface EthicsSignaturePageProps {
  user: AuthUser;
  tenant: { id: string; name: string; logo_url: string | null };
  ethicsCode: EthicsCode;
  onSigned: () => void;
}

type Point = { x: number; y: number };

export default function EthicsSignaturePage({ user, tenant, ethicsCode, onSigned }: EthicsSignaturePageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acceptedName, setAcceptedName] = useState(user.full_name ?? '');
  const [documentNumber, setDocumentNumber] = useState(user.profile.employee_code ?? '');
  const [hasOpenedCode, setHasOpenedCode] = useState(false);
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

    if (!hasOpenedCode) {
      setError('Primero tenés que abrir y revisar el Código de Ética.');
      return;
    }

    if (!accepted) {
      setError('Marcá la declaración de aceptación para continuar.');
      return;
    }

    if (!acceptedName.trim()) {
      setError('Completá tu nombre y apellido.');
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
      const signatureHash = await sha256FromText(signatureDataUrl);
      const signatureBlob = dataUrlToBlob(signatureDataUrl);
      const signaturePath = `${tenant.id}/signatures/${user.id}/${ethicsCode.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('signature-images')
        .upload(signaturePath, signatureBlob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('signature-images')
        .getPublicUrl(signaturePath);

      const acceptanceText = `Declaro haber leído y aceptado el ${ethicsCode.title}, versión ${ethicsCode.version}, de ${tenant.name}. Autorizo el uso de mi firma electrónica registrada para constancias y certificados emitidos por Cigüeña vinculados a mis capacitaciones.`;

      const { data: acceptanceRecord, error: acceptanceError } = await supabase
        .from('ethics_acceptances')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          ethics_code_id: ethicsCode.id,
          accepted_name: acceptedName.trim(),
          accepted_document_number: documentNumber.trim(),
          signature_image_url: publicUrlData.publicUrl,
          signature_hash: signatureHash,
          acceptance_text: acceptanceText,
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single();

      if (acceptanceError) throw acceptanceError;

      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'ethics_code_accepted',
        entity_type: 'ethics_acceptance',
        entity_id: acceptanceRecord.id,
        metadata: {
          ethics_code_id: ethicsCode.id,
          ethics_code_title: ethicsCode.title,
          ethics_code_version: ethicsCode.version,
          ethics_code_hash: ethicsCode.content_hash,
          accepted_name: acceptedName.trim(),
          accepted_document_number: documentNumber.trim(),
          signature_hash: signatureHash,
        },
      });

      setSuccess('Código de Ética firmado correctamente.');
      onSigned();
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
            <div className="text-xs text-steel-400">Onboarding digital · {tenant.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          <section className="card">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300 flex-shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-steel-50 mb-1">Firma del Código de Ética</h1>
                <p className="text-sm text-steel-400 leading-relaxed">
                  Antes de acceder a tus capacitaciones, debés revisar y aceptar el código vigente de {tenant.name}.
                  Esta aceptación quedará registrada para trazabilidad y certificados.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-950/50 p-5 mb-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-steel-100 font-semibold">
                    <FileText size={18} className="text-amber-400" />
                    {ethicsCode.title}
                  </div>
                  <div className="text-xs text-steel-500 mt-1">Versión {ethicsCode.version}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasOpenedCode(true)}
                  className="btn-secondary text-xs"
                >
                  Marcar como revisado
                </button>
              </div>

              <div className="prose prose-invert max-w-none text-sm text-steel-300 whitespace-pre-line leading-relaxed max-h-[340px] overflow-y-auto pr-2">
                {ethicsCode.content}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-steel-700 bg-steel-900/60 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-amber-500"
              />
              <span className="text-sm text-steel-300 leading-relaxed">
                Declaro haber leído y aceptado el <strong className="text-steel-100">{ethicsCode.title}</strong>, versión {ethicsCode.version},
                y autorizo el uso de mi firma electrónica registrada para constancias y certificados emitidos por Cigüeña vinculados a mis capacitaciones.
              </span>
            </label>
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
                Se registrará fecha y hora, usuario, empresa, versión del documento, hash de la firma y evento de auditoría.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
