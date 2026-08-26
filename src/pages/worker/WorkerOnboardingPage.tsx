import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { dataUrlToBlob, sha256FromText } from '../../lib/ethics';
import type { AuthUser } from '../../types';
import type { WorkerOnboardingRequirement } from '../../lib/workerOnboarding';
import { useBranding } from '../../contexts/BrandingContext';
import TenantBrandMark from '../../components/branding/TenantBrandMark';

interface WorkerOnboardingPageProps {
  user: AuthUser;
  requirement: WorkerOnboardingRequirement;
  onCompleted: () => void;
}

type Point = { x: number; y: number };

interface ConfirmationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  pendingTitle: string;
  confirmedTitle: string;
  pendingText: string;
  confirmedText: string;
}

function ConfirmationCheckbox({
  checked,
  onChange,
  disabled = false,
  pendingTitle,
  confirmedTitle,
  pendingText,
  confirmedText,
}: ConfirmationCheckboxProps) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? 'border-emerald-500/35 bg-emerald-500/10'
          : 'border-steel-700 bg-steel-950/50'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 flex-shrink-0 brand-checkbox"
        disabled={disabled}
      />
      <span className="flex min-w-0 flex-1 items-start gap-2.5">
        {checked && <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />}
        <span>
          <span className={`block text-sm font-semibold ${checked ? 'text-emerald-200' : 'text-steel-100'}`}>
            {checked ? confirmedTitle : pendingTitle}
          </span>
          <span className={`mt-1 block text-xs leading-relaxed ${checked ? 'text-emerald-100/75' : 'text-steel-300'}`}>
            {checked ? confirmedText : pendingText}
          </span>
        </span>
      </span>
    </label>
  );
}

function valueFromProfile(profile: Record<string, unknown> | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = profile?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export default function WorkerOnboardingPage({
  user,
  requirement,
  onCompleted,
}: WorkerOnboardingPageProps) {
  const { branding } = useBranding();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const profile = requirement.profile ?? user.profile;
  const tenant = requirement.tenant;
  const existingSignature = requirement.signatureConsent;
  const needsNewSignature = requirement.needsSignatureConsent;
  const needsEthicsAcceptance = requirement.needsEthicsAcceptance;
  const ethicsCode = requirement.ethicsCode;

  const [acceptedName, setAcceptedName] = useState(
    user.full_name || valueFromProfile(profile as unknown as Record<string, unknown>, ['full_name']),
  );
  const [dni, setDni] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, ['dni']),
  );
  const [employeeCode, setEmployeeCode] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, ['employee_code']),
  );
  const [workRole, setWorkRole] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, [
      'work_role',
      'job_role',
      'position',
    ]),
  );
  const [phone, setPhone] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, ['phone']),
  );
  const [area, setArea] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, ['area']),
  );
  const [position, setPosition] = useState(
    valueFromProfile(profile as unknown as Record<string, unknown>, [
      'position',
      'job_role',
      'work_role',
    ]),
  );

  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [signatureConsentAccepted, setSignatureConsentAccepted] = useState(false);
  const [hasOpenedCode, setHasOpenedCode] = useState(false);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!needsNewSignature) return;

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
  }, [needsNewSignature]);

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

  const stopDrawing = () => setIsDrawing(false);

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

    if (!tenant) {
      setError('No pudimos identificar tu empresa. Reintentá la sesión.');
      return;
    }

    const cleanAcceptedName = acceptedName.trim();
    const cleanDni = dni.trim();
    const cleanEmployeeCode = employeeCode.trim();
    const cleanWorkRole = workRole.trim();
    const cleanPhone = phone.trim();
    const cleanArea = area.trim() || null;
    const cleanPosition = position.trim() || cleanWorkRole;

    if (!cleanAcceptedName) {
      setError('Completá tu nombre y apellido.');
      return;
    }
    if (!cleanDni) {
      setError('Completá tu DNI.');
      return;
    }
    if (!cleanEmployeeCode) {
      setError('Completá tu legajo o identificador interno.');
      return;
    }
    if (!cleanWorkRole) {
      setError('Completá tu rol operativo.');
      return;
    }
    if (!cleanPhone) {
      setError('Completá tu teléfono.');
      return;
    }
    if (!profileConfirmed) {
      setError('Confirmá que revisaste y validaste tus datos de nómina.');
      return;
    }

    if (needsNewSignature) {
      if (!hasSignature || !canvasRef.current) {
        setError('Firmá dentro del recuadro para continuar.');
        return;
      }
      if (!signatureConsentAccepted) {
        setError('Aceptá el consentimiento de uso de firma para continuar.');
        return;
      }
    }

    if (needsEthicsAcceptance) {
      if (!ethicsCode) {
        setError('No hay un Código de Ética vigente disponible. Contactá al administrador.');
        return;
      }
      if (!hasOpenedCode) {
        setError('Primero revisá el Código de Ética vigente.');
        return;
      }
      if (!ethicsAccepted) {
        setError('Aceptá el Código de Ética para continuar.');
        return;
      }
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      const profileSnapshot = {
        full_name: cleanAcceptedName,
        dni: cleanDni,
        employee_code: cleanEmployeeCode,
        work_role: cleanWorkRole,
        phone: cleanPhone,
        area: cleanArea,
        position: cleanPosition,
      };

      const { data: updatedProfile, error: profileUpdateError } = await supabase.rpc(
        'complete_worker_profile_onboarding',
        {
          p_full_name: cleanAcceptedName,
          p_dni: cleanDni,
          p_employee_code: cleanEmployeeCode,
          p_work_role: cleanWorkRole,
          p_phone: cleanPhone,
          p_area: cleanArea,
          p_position: cleanPosition,
        },
      );

      if (profileUpdateError) throw profileUpdateError;

      if (!updatedProfile || updatedProfile.id !== user.id) {
        throw new Error('No pudimos confirmar que los datos de nómina se hayan guardado.');
      }

      let signatureImageUrl = existingSignature?.signature_image_url ?? null;
      let signatureHash = existingSignature?.signature_hash ?? null;

      if (needsNewSignature) {
        const signatureDataUrl = canvasRef.current!.toDataURL('image/png');
        signatureHash = await sha256FromText(signatureDataUrl);
        const signatureBlob = dataUrlToBlob(signatureDataUrl);
        const signaturePath = `${tenant.id}/signatures/${user.id}/worker-consent-${Date.now()}.png`;

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

        signatureImageUrl = publicUrlData.publicUrl;

        const consentText = `Autorizo el almacenamiento y uso de mi firma electrónica registrada dentro de ${branding.brandName} para certificados, constancias y documentos asociados a mis capacitaciones de ${tenant.name}.`;

        const { data: signatureConsentRecord, error: signatureConsentError } = await supabase
          .from('worker_signature_consents')
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            signature_image_url: signatureImageUrl,
            signature_hash: signatureHash,
            accepted_name: cleanAcceptedName,
            accepted_document_number: cleanDni,
            consent_text: consentText,
            consent_version: '1.0',
            profile_snapshot: profileSnapshot,
            accepted_at: now,
            user_agent: navigator.userAgent,
          })
          .select('id')
          .single();

        if (signatureConsentError) throw signatureConsentError;

        await supabase.from('activity_log').insert({
          tenant_id: tenant.id,
          user_id: user.id,
          action: 'worker_signature_consent_accepted',
          entity_type: 'worker_signature_consent',
          entity_id: signatureConsentRecord.id,
          metadata: {
            consent_version: '1.0',
            signature_hash: signatureHash,
            profile_snapshot: profileSnapshot,
          },
        });
      }

      if (!signatureImageUrl || !signatureHash) {
        throw new Error('No pudimos resolver una firma válida para completar el onboarding.');
      }

      if (needsEthicsAcceptance && ethicsCode) {
        const acceptanceText = `Declaro haber leído y aceptado el ${ethicsCode.title}, versión ${ethicsCode.version}, de ${tenant.name}. La aceptación queda asociada a mi firma electrónica registrada.`;

        const { data: acceptanceRecord, error: acceptanceError } = await supabase
          .from('ethics_acceptances')
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            ethics_code_id: ethicsCode.id,
            accepted_name: cleanAcceptedName,
            accepted_document_number: cleanDni,
            signature_image_url: signatureImageUrl,
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
            signature_hash: signatureHash,
          },
        });
      }

      await supabase.from('activity_log').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'worker_profile_validated',
        entity_type: 'profile',
        entity_id: user.id,
        metadata: profileSnapshot,
      });

      setSuccess('Onboarding completado correctamente. Verificando acceso...');
      onCompleted();
    } catch (err) {
      console.error('Error guardando onboarding:', err);
      const message = err instanceof Error ? err.message : 'No pudimos completar el onboarding.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-steel-950 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <TenantBrandMark subtitle={`Onboarding obligatorio · ${tenant?.name ?? branding.brandName}`} />
        </div>

        <div className="mb-6 rounded-xl border border-steel-700 bg-steel-900/70 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="brand-text mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-steel-100">Antes de continuar</div>
              <p className="text-sm text-steel-400 mt-1 leading-relaxed">
                Revisá tus datos de nómina y completá los requisitos pendientes. Este paso es obligatorio antes de acceder a las capacitaciones y certificados.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-6 items-start">
          <section className="space-y-6">
            <div className="card">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl brand-bg-soft border brand-border-soft flex items-center justify-center brand-text flex-shrink-0">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-steel-50">Validación de datos</h1>
                  <p className="text-sm text-steel-400 mt-1">
                    Si tu empresa precargó la nómina, los campos aparecerán completos. Revisalos y corregí lo que corresponda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label" htmlFor="worker-full-name">Nombre y apellido *</label>
                  <input id="worker-full-name" className="input" value={acceptedName} onChange={(e) => setAcceptedName(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-dni">DNI *</label>
                  <input id="worker-dni" className="input" value={dni} onChange={(e) => setDni(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-employee-code">Legajo *</label>
                  <input id="worker-employee-code" className="input" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-role">Rol operativo *</label>
                  <input id="worker-role" className="input" value={workRole} onChange={(e) => setWorkRole(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-phone">Teléfono *</label>
                  <input id="worker-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-area">Área</label>
                  <input id="worker-area" className="input" value={area} onChange={(e) => setArea(e.target.value)} disabled={isSaving} />
                </div>
                <div>
                  <label className="label" htmlFor="worker-position">Puesto</label>
                  <input id="worker-position" className="input" value={position} onChange={(e) => setPosition(e.target.value)} disabled={isSaving} />
                </div>
              </div>

              <div className="mt-5">
                <ConfirmationCheckbox
                  checked={profileConfirmed}
                  onChange={(checked) => {
                    setProfileConfirmed(checked);
                    setError('');
                  }}
                  disabled={isSaving}
                  pendingTitle="Confirmar revisión de datos"
                  confirmedTitle="Datos revisados y confirmados"
                  pendingText="Marcá este checkbox cuando hayas revisado los datos anteriores y sean correctos, o después de actualizarlos."
                  confirmedText="Confirmaste que tus datos fueron revisados y están listos para continuar."
                />
              </div>
            </div>

            {needsEthicsAcceptance && ethicsCode && (
              <div className="card">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-11 h-11 rounded-xl brand-bg-soft border brand-border-soft flex items-center justify-center brand-text flex-shrink-0">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-steel-50">Código de Ética</h2>
                    <p className="text-sm text-steel-400 mt-1">
                      Tu empresa exige la aceptación de la versión vigente antes de ingresar.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-steel-700 bg-steel-950/50 p-5 mb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="font-semibold text-steel-100">{ethicsCode.title}</div>
                      <div className="text-xs text-steel-500 mt-1">Versión {ethicsCode.version}</div>
                    </div>
                    {ethicsCode.document_url && (
                      <a
                        href={ethicsCode.document_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setHasOpenedCode(true)}
                        className="btn-secondary text-xs inline-flex items-center gap-2"
                      >
                        <FileText size={14} /> Abrir documento
                      </a>
                    )}
                  </div>

                  {ethicsCode.content?.trim() ? (
                    <div className="prose prose-invert max-w-none text-sm text-steel-300 whitespace-pre-line leading-relaxed max-h-[340px] overflow-y-auto pr-2">
                      {ethicsCode.content}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-steel-800 bg-steel-900/60 p-4 text-sm text-steel-400">
                      El Código de Ética fue publicado como documento PDF. Abrilo y revisalo antes de confirmar su lectura y aceptación.
                    </div>
                  )}

                  <div className="mt-5">
                    <ConfirmationCheckbox
                      checked={ethicsAccepted}
                      onChange={(checked) => {
                        if (checked) setHasOpenedCode(true);
                        setEthicsAccepted(checked);
                        setError('');
                      }}
                      disabled={isSaving || (!!ethicsCode.document_url && !hasOpenedCode)}
                      pendingTitle="Confirmar lectura y aceptación"
                      confirmedTitle="Lectura y aceptación confirmadas"
                      pendingText="Marcá este checkbox después de revisar el Código de Ética. La aceptación quedará asociada a tu firma electrónica."
                      confirmedText="Confirmaste la lectura y aceptación del Código de Ética vigente."
                    />

                    {ethicsCode.document_url && !hasOpenedCode && !ethicsAccepted && (
                      <div className="mt-2 text-[11px] text-steel-500 text-center">
                        Primero abrí el documento para habilitar este checkbox.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </section>

          <aside className="card lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-5">
              <PenLine size={18} className="brand-text" />
              <h2 className="text-lg font-semibold text-steel-50">Firma electrónica</h2>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {needsNewSignature ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-steel-200">Ingresá tu firma *</div>
                  <button type="button" onClick={clearSignature} className="text-xs text-steel-400 hover:text-steel-200 inline-flex items-center gap-1" disabled={isSaving}>
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
                    Firmá con mouse, dedo o pantalla táctil.
                  </div>
                </div>

                <div className="mt-4">
                  <ConfirmationCheckbox
                    checked={signatureConsentAccepted}
                    onChange={(checked) => {
                      setSignatureConsentAccepted(checked);
                      setError('');
                    }}
                    disabled={isSaving}
                    pendingTitle="Confirmar autorización de firma"
                    confirmedTitle="Consentimiento de firma confirmado"
                    pendingText={`Marcá este checkbox para autorizar el almacenamiento y uso de tu firma electrónica dentro de ${branding.brandName} para certificados, constancias y documentos asociados a tus capacitaciones.`}
                    confirmedText="Confirmaste la autorización de almacenamiento y uso de tu firma electrónica."
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  <CheckCircle2 size={17} /> Firma y consentimiento registrados
                </div>
                <div className="text-xs text-emerald-100/70 mt-2">
                  No necesitás volver a dibujar tu firma para completar este onboarding.
                </div>
                {existingSignature?.signature_image_url && (
                  <div className="mt-4 rounded-lg bg-white p-3 flex justify-center">
                    <img src={existingSignature.signature_image_url} alt="Firma registrada" className="max-h-20 max-w-full object-contain" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-steel-700 bg-steel-950/50 p-3 text-xs text-steel-400 leading-relaxed">
              La firma se almacena como registro auditable y puede utilizarse en certificados y constancias emitidos dentro de la plataforma.
            </div>

            <button type="button" onClick={handleSave} disabled={isSaving} className="btn-primary w-full mt-5 inline-flex items-center justify-center gap-2">
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              {isSaving ? 'Guardando...' : 'Validar y continuar'}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
