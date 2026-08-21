import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  getComplianceModeLabel,
  getTenantComplianceState,
  publishTenantEthicsCode,
  resetTenantAdminOnboardingOverride,
  saveTenantOnboardingSetting,
  uploadEthicsDocument,
  type ComplianceMode,
  type ComplianceSource,
  type TenantComplianceState,
  type TenantEthicsCode,
} from '../../lib/onboardingCompliance';

interface Props {
  tenantId: string;
  source: ComplianceSource;
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-AR');
}

export default function OnboardingComplianceEditor({ tenantId, source }: Props) {
  const [state, setState] = useState<TenantComplianceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState<ComplianceMode>('signature_only');
  const [selectedCodeId, setSelectedCodeId] = useState('');
  const [title, setTitle] = useState('Código de Ética');
  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const next = await getTenantComplianceState(tenantId);
      setState(next);

      const ownSetting = source === 'admin' ? next.adminOverride : next.defaultSetting;
      const visibleSetting = ownSetting ?? next.effectiveSetting;
      setMode(visibleSetting?.onboarding_mode ?? 'signature_only');
      setSelectedCodeId(ownSetting?.ethics_code_id ?? '');
    } catch (err) {
      console.error('Error cargando compliance:', err);
      setError(err instanceof Error ? err.message : 'No pudimos cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tenantId, source]);

  const ownSetting = source === 'admin' ? state?.adminOverride : state?.defaultSetting;
  const ownCodes = useMemo(
    () => (state?.codes ?? []).filter((code) => (code.source ?? 'superadmin') === source),
    [state?.codes, source],
  );

  const codeById = (id?: string | null) =>
    (state?.codes ?? []).find((code) => code.id === id) ?? null;

  const effectiveCode = codeById(state?.effectiveSetting?.ethics_code_id);
  const ownCurrentCode = codeById(ownSetting?.ethics_code_id);
  const hasAdminOverride = Boolean(state?.adminOverride);
  const inheritedAdminConfig = source === 'admin' && !hasAdminOverride;

  async function handleSaveMode() {
    if (!state) return;

    setError(null);
    setSuccess(null);

    if (mode === 'ethics_and_signature' && !selectedCodeId) {
      setError('Para usar Código de Ética, publicá una versión propia o seleccioná una versión ya publicada por este mismo nivel.');
      return;
    }

    setSaving(true);
    try {
      await saveTenantOnboardingSetting({
        tenantId,
        source,
        mode,
        ethicsCodeId: mode === 'ethics_and_signature' ? selectedCodeId : null,
      });
      setSuccess('Configuración de onboarding guardada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!state) return;
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Ingresá un título.');
      return;
    }
    if (!version.trim()) {
      setError('Ingresá una versión, por ejemplo 1.0 o 2026.1.');
      return;
    }
    if (!content.trim() && !pdfFile) {
      setError('Pegá el contenido del Código de Ética o adjuntá un PDF.');
      return;
    }

    setSaving(true);
    try {
      let documentUrl: string | null = null;
      if (pdfFile) {
        documentUrl = await uploadEthicsDocument({ tenantId, source, file: pdfFile });
      }

      const code = await publishTenantEthicsCode({
        tenantId,
        source,
        title: title.trim(),
        version: version.trim(),
        content: content.trim(),
        documentUrl,
      });

      setMode('ethics_and_signature');
      setSelectedCodeId(code.id);
      setVersion('');
      setContent('');
      setPdfFile(null);
      setSuccess('Nueva versión publicada y configurada como vigente.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos publicar el Código de Ética.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetOverride() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await resetTenantAdminOnboardingOverride();
      setSuccess('Se eliminó el override. La cuenta vuelve a usar la configuración definida por BondiApps.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos eliminar el override.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-3 text-steel-300">
        <Loader2 size={18} className="animate-spin" /> Cargando configuración de onboarding...
      </div>
    );
  }

  if (!state) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 text-red-200">
        No pudimos cargar la configuración del tenant.
      </div>
    );
  }

  const sourceLabel = source === 'admin' ? 'Admin del cliente' : 'Superadmin BondiApps';
  const effectiveSourceLabel = state.adminOverride ? 'Admin del cliente' : 'Superadmin BondiApps';

  return (
    <div className="space-y-5">
      {(error || success) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
            error
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error ? <AlertCircle size={18} className="mt-0.5" /> : <CheckCircle2 size={18} className="mt-0.5" />}
          <span>{error ?? success}</span>
        </div>
      )}

      <div className="card border-blue-500/20 bg-blue-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-steel-500">Configuración efectiva · {state.tenant.name}</div>
            <div className="text-lg font-bold text-steel-100 mt-1">
              {getComplianceModeLabel(state.effectiveSetting?.onboarding_mode)}
            </div>
            <div className="text-xs text-steel-400 mt-1">
              Fuente efectiva: <strong className="text-steel-200">{effectiveSourceLabel}</strong>
              {effectiveCode ? ` · ${effectiveCode.title} v${effectiveCode.version}` : ''}
            </div>
          </div>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={load} disabled={saving}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </div>

      {source === 'superadmin' && hasAdminOverride && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <strong>Este tenant tiene un override del Admin.</strong> Podés modificar el default de BondiApps, pero los trabajadores seguirán usando la configuración del Admin hasta que ese override sea eliminado.
        </div>
      )}

      {source === 'admin' && inheritedAdminConfig && (
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm text-blue-100">
          Actualmente la cuenta <strong>hereda la configuración de BondiApps</strong>. Solo se crea un override si guardás una modalidad propia o publicás un Código de Ética propio.
        </div>
      )}

      <div className="card">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl brand-bg-soft brand-text border brand-border-soft flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-steel-100">Modalidad de onboarding</h2>
            <p className="text-sm text-steel-400 mt-1">Editando como: {sourceLabel}. La firma y el consentimiento siempre son obligatorios.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode('signature_only')}
            className={`text-left rounded-xl border p-4 transition-colors ${mode === 'signature_only' ? 'brand-border brand-bg-soft' : 'border-steel-700 bg-steel-950/40 hover:border-steel-600'}`}
          >
            <div className="font-semibold text-steel-100">Firma + consentimiento</div>
            <div className="text-xs text-steel-400 mt-2 leading-relaxed">El trabajador valida sus datos, registra su firma y acepta el uso de esa firma. No se exige Código de Ética.</div>
          </button>

          <button
            type="button"
            onClick={() => setMode('ethics_and_signature')}
            className={`text-left rounded-xl border p-4 transition-colors ${mode === 'ethics_and_signature' ? 'brand-border brand-bg-soft' : 'border-steel-700 bg-steel-950/40 hover:border-steel-600'}`}
          >
            <div className="font-semibold text-steel-100">Código de Ética + firma</div>
            <div className="text-xs text-steel-400 mt-2 leading-relaxed">Además de validar datos y firma, el trabajador debe aceptar la versión vigente del Código de Ética.</div>
          </button>
        </div>

        {mode === 'ethics_and_signature' && (
          <div className="mt-5">
            <label className="label">Versión vigente de este nivel</label>
            <select className="input" value={selectedCodeId} onChange={(e) => setSelectedCodeId(e.target.value)}>
              <option value="">Seleccionar una versión publicada...</option>
              {ownCodes.map((code) => (
                <option key={code.id} value={code.id}>{code.title} · v{code.version}</option>
              ))}
            </select>
            {ownCodes.length === 0 && (
              <p className="text-xs text-steel-500 mt-2">Todavía no hay versiones publicadas por {sourceLabel}. Publicá una abajo.</p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleSaveMode} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Guardar modalidad
          </button>
          {source === 'admin' && hasAdminOverride && (
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={handleResetOverride} disabled={saving}>
              <RotateCcw size={16} /> Volver al default BondiApps
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-steel-800 border border-steel-700 text-steel-300 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-steel-100">Publicar nueva versión del Código de Ética</h2>
            <p className="text-sm text-steel-400 mt-1">Las versiones publicadas no se editan ni se borran. Una corrección se publica como una nueva versión.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Título *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Código de Ética ${state.tenant.name}`} />
          </div>
          <div>
            <label className="label">Versión *</label>
            <input className="input" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Ej. 1.0 o 2026.1" />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Contenido</label>
          <textarea
            className="input min-h-[220px] resize-y"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pegá aquí el texto del Código de Ética. También podés adjuntar un PDF."
          />
        </div>

        <div className="mt-4 rounded-xl border border-steel-700 bg-steel-950/40 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <div className="text-sm font-medium text-steel-200">PDF opcional</div>
              <div className="text-xs text-steel-500 mt-1">Máximo 15 MB. El trabajador podrá abrirlo antes de aceptar.</div>
            </div>
            <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
              <Upload size={15} /> {pdfFile ? 'Cambiar PDF' : 'Adjuntar PDF'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                disabled={saving}
              />
            </label>
          </div>
          {pdfFile && <div className="text-xs text-steel-300 mt-3">Archivo: {pdfFile.name}</div>}
        </div>

        <button type="button" className="btn-primary mt-5 inline-flex items-center gap-2" onClick={handlePublish} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Publicar y usar esta versión
        </button>
      </div>

      <div className="card">
        <h3 className="font-semibold text-steel-100 mb-4">Historial de versiones</h3>
        {state.codes.length === 0 ? (
          <div className="text-sm text-steel-500">No hay versiones publicadas.</div>
        ) : (
          <div className="space-y-2">
            {state.codes.map((code: TenantEthicsCode) => {
              const isEffective = code.id === state.effectiveSetting?.ethics_code_id;
              const isOwn = (code.source ?? 'superadmin') === source;
              return (
                <div key={code.id} className="rounded-xl border border-steel-700 bg-steel-950/35 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div>
                    <div className="text-sm font-medium text-steel-100">{code.title} · v{code.version}</div>
                    <div className="text-xs text-steel-500 mt-1">
                      {code.source === 'admin' ? 'Admin cliente' : 'Superadmin BondiApps'} · {formatDate(code.published_at ?? code.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEffective && <span className="badge badge-success">Vigente</span>}
                    {isOwn && <span className="badge badge-neutral">Tu nivel</span>}
                    {code.document_url && (
                      <a className="text-xs brand-text hover:underline" href={code.document_url} target="_blank" rel="noreferrer">Ver PDF</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ownCurrentCode && (
        <div className="text-xs text-steel-500">
          Configuración propia actual: {ownCurrentCode.title} v{ownCurrentCode.version}.
        </div>
      )}
    </div>
  );
}
