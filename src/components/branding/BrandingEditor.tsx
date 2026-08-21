import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_CIGUENA_BRANDING,
  type BrandingConfig,
} from '../../lib/branding';
import type { BrandingTenantSummary } from './BrandingCard';
import BrandingPreview from './BrandingPreview';
import LogoUploader from './LogoUploader';

interface BrandingEditorProps {
  tenant: BrandingTenantSummary;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}

type AssetKey = 'logo' | 'compact' | 'negative' | 'favicon';

type AssetFiles = Record<AssetKey, File | null>;

const HEX_PATTERN = /^#[0-9A-F]{6}$/i;
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

function normalizeColor(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('#')
    ? trimmed.toUpperCase()
    : `#${trimmed}`.toUpperCase();
}

function isDefaultAsset(url: string | null, defaultUrl: string) {
  return !url || url === defaultUrl;
}

function dbAssetValue(url: string | null, defaultUrl: string) {
  return isDefaultAsset(url, defaultUrl) ? null : url;
}

async function uploadAsset(
  tenantId: string,
  slot: AssetKey,
  file: File,
): Promise<string> {
  const objectName: Record<AssetKey, string> = {
    logo: 'logo-main',
    compact: 'logo-compact',
    negative: 'logo-negative',
    favicon: 'favicon',
  };

  const extension =
    file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'img';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${tenantId}/${objectName[slot]}-${uniqueSuffix}.${extension}`;

  const { error } = await supabase.storage
    .from('tenant-branding')
    .upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: '3600',
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('tenant-branding')
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error('No se pudo obtener la URL pública del asset.');
  }

  return data.publicUrl;
}

function hasCustomConfiguration(config: BrandingConfig) {
  return (
    config.brandName.trim() !== DEFAULT_CIGUENA_BRANDING.brandName ||
    config.primaryColor.toUpperCase() !==
      DEFAULT_CIGUENA_BRANDING.primaryColor.toUpperCase() ||
    config.accentColor.toUpperCase() !==
      DEFAULT_CIGUENA_BRANDING.accentColor.toUpperCase() ||
    Boolean(config.customDomain) ||
    !config.showPoweredByBondiApps ||
    !isDefaultAsset(config.logoUrl, DEFAULT_CIGUENA_BRANDING.logoUrl) ||
    !isDefaultAsset(
      config.logoCompactUrl,
      DEFAULT_CIGUENA_BRANDING.logoCompactUrl,
    ) ||
    !isDefaultAsset(
      config.logoNegativeUrl,
      DEFAULT_CIGUENA_BRANDING.logoNegativeUrl,
    ) ||
    !isDefaultAsset(config.faviconUrl, DEFAULT_CIGUENA_BRANDING.faviconUrl)
  );
}

export default function BrandingEditor({
  tenant,
  onSaved,
  onCancel,
}: BrandingEditorProps) {
  const { sessionUser } = useAuth();

  const [brandName, setBrandName] = useState(tenant.branding.brandName);
  const [primaryColor, setPrimaryColor] = useState(
    tenant.branding.primaryColor,
  );
  const [accentColor, setAccentColor] = useState(
    tenant.branding.accentColor,
  );
  const [customDomain, setCustomDomain] = useState(
    tenant.branding.customDomain || '',
  );
  const [showPowered, setShowPowered] = useState(
    tenant.branding.showPoweredByBondiApps,
  );

  const [assetUrls, setAssetUrls] = useState<Record<AssetKey, string | null>>({
    logo: tenant.brandingRow?.logo_url ?? null,
    compact: tenant.brandingRow?.logo_compact_url ?? null,
    negative: tenant.brandingRow?.logo_negative_url ?? null,
    favicon: tenant.brandingRow?.favicon_url ?? null,
  });

  const [files, setFiles] = useState<AssetFiles>({
    logo: null,
    compact: null,
    negative: null,
    favicon: null,
  });

  const [previewUrls, setPreviewUrls] = useState<Record<AssetKey, string | null>>({
    logo: null,
    compact: null,
    negative: null,
    favicon: null,
  });

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextUrls: Record<AssetKey, string | null> = {
      logo: null,
      compact: null,
      negative: null,
      favicon: null,
    };

    (Object.keys(files) as AssetKey[]).forEach((key) => {
      if (files[key]) {
        nextUrls[key] = URL.createObjectURL(files[key] as File);
      }
    });

    setPreviewUrls(nextUrls);

    return () => {
      (Object.values(nextUrls) as Array<string | null>).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  const effectiveLogo =
    assetUrls.logo || DEFAULT_CIGUENA_BRANDING.logoUrl;
  const effectiveCompact =
    assetUrls.compact || assetUrls.logo || DEFAULT_CIGUENA_BRANDING.logoCompactUrl;
  const effectiveNegative =
    assetUrls.negative || assetUrls.logo || DEFAULT_CIGUENA_BRANDING.logoNegativeUrl;
  const effectiveFavicon =
    assetUrls.favicon ||
    assetUrls.compact ||
    assetUrls.logo ||
    DEFAULT_CIGUENA_BRANDING.faviconUrl;

  const previewLogo = previewUrls.logo || effectiveLogo;
  const previewCompact =
    previewUrls.compact ||
    assetUrls.compact ||
    previewUrls.logo ||
    assetUrls.logo ||
    DEFAULT_CIGUENA_BRANDING.logoCompactUrl;

  const validationError = useMemo(() => {
    if (!brandName.trim()) return 'El nombre visible de la marca es obligatorio.';

    const normalizedPrimary = normalizeColor(primaryColor);
    const normalizedAccent = normalizeColor(accentColor);

    if (!HEX_PATTERN.test(normalizedPrimary)) {
      return 'Primary debe ser un color HEX válido, por ejemplo #003F5F.';
    }

    if (!HEX_PATTERN.test(normalizedAccent)) {
      return 'Accent debe ser un color HEX válido, por ejemplo #00799F.';
    }

    const domain = normalizeDomain(customDomain);
    if (domain && !DOMAIN_PATTERN.test(domain)) {
      return 'El dominio debe tener formato de hostname, por ejemplo training.spi.com.ar.';
    }

    return null;
  }, [brandName, primaryColor, accentColor, customDomain]);

  function setAssetFile(key: AssetKey, file: File | null) {
    setFiles((current) => ({ ...current, [key]: file }));
    setSuccessMessage(null);
  }

  async function handleSave() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls = { ...assetUrls };

      for (const key of Object.keys(files) as AssetKey[]) {
        const file = files[key];
        if (!file) continue;
        uploadedUrls[key] = await uploadAsset(tenant.id, key, file);
      }

      const resolvedConfig: BrandingConfig = {
        tenantId: tenant.id,
        brandName: brandName.trim(),
        logoUrl: uploadedUrls.logo || DEFAULT_CIGUENA_BRANDING.logoUrl,
        logoCompactUrl:
          uploadedUrls.compact ||
          uploadedUrls.logo ||
          DEFAULT_CIGUENA_BRANDING.logoCompactUrl,
        logoNegativeUrl:
          uploadedUrls.negative ||
          uploadedUrls.logo ||
          DEFAULT_CIGUENA_BRANDING.logoNegativeUrl,
        faviconUrl:
          uploadedUrls.favicon ||
          uploadedUrls.compact ||
          uploadedUrls.logo ||
          DEFAULT_CIGUENA_BRANDING.faviconUrl,
        primaryColor: normalizeColor(primaryColor),
        accentColor: normalizeColor(accentColor),
        customDomain: normalizeDomain(customDomain) || null,
        isCustomBranding: false,
        showPoweredByBondiApps: showPowered,
      };

      resolvedConfig.isCustomBranding = hasCustomConfiguration(resolvedConfig);

      const payload = {
        tenant_id: tenant.id,
        brand_name: resolvedConfig.brandName,
        logo_url: dbAssetValue(
          uploadedUrls.logo,
          DEFAULT_CIGUENA_BRANDING.logoUrl,
        ),
        logo_compact_url: dbAssetValue(
          uploadedUrls.compact,
          DEFAULT_CIGUENA_BRANDING.logoCompactUrl,
        ),
        logo_negative_url: dbAssetValue(
          uploadedUrls.negative,
          DEFAULT_CIGUENA_BRANDING.logoNegativeUrl,
        ),
        favicon_url: dbAssetValue(
          uploadedUrls.favicon,
          DEFAULT_CIGUENA_BRANDING.faviconUrl,
        ),
        primary_color: resolvedConfig.primaryColor,
        accent_color: resolvedConfig.accentColor,
        custom_domain: resolvedConfig.customDomain,
        is_custom_branding: resolvedConfig.isCustomBranding,
        show_powered_by_bondiapps: resolvedConfig.showPoweredByBondiApps,
        updated_at: new Date().toISOString(),
        updated_by: sessionUser?.id ?? null,
      };

      const { error } = await supabase
        .from('tenant_branding')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ese dominio ya está asignado a otro tenant.');
        }
        throw error;
      }

      setAssetUrls(uploadedUrls);
      setFiles({ logo: null, compact: null, negative: null, favicon: null });
      setSuccessMessage('Branding guardado correctamente.');

      await onSaved();
    } catch (error) {
      console.error('Error saving tenant branding:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el branding.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      `¿Restablecer ${tenant.name} al branding default de Cigüeña?`,
    );

    if (!confirmed) return;

    setResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase
        .from('tenant_branding')
        .upsert(
          {
            tenant_id: tenant.id,
            brand_name: DEFAULT_CIGUENA_BRANDING.brandName,
            logo_url: null,
            logo_compact_url: null,
            logo_negative_url: null,
            favicon_url: null,
            primary_color: DEFAULT_CIGUENA_BRANDING.primaryColor,
            accent_color: DEFAULT_CIGUENA_BRANDING.accentColor,
            custom_domain: null,
            is_custom_branding: false,
            show_powered_by_bondiapps: true,
            updated_at: new Date().toISOString(),
            updated_by: sessionUser?.id ?? null,
          },
          { onConflict: 'tenant_id' },
        );

      if (error) throw error;

      setBrandName(DEFAULT_CIGUENA_BRANDING.brandName);
      setPrimaryColor(DEFAULT_CIGUENA_BRANDING.primaryColor);
      setAccentColor(DEFAULT_CIGUENA_BRANDING.accentColor);
      setCustomDomain('');
      setShowPowered(true);
      setAssetUrls({ logo: null, compact: null, negative: null, favicon: null });
      setFiles({ logo: null, compact: null, negative: null, favicon: null });
      setSuccessMessage('Se restableció el branding default de Cigüeña.');

      await onSaved();
    } catch (error) {
      console.error('Error resetting tenant branding:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo restablecer el branding.',
      );
    } finally {
      setResetting(false);
    }
  }

  const normalizedPreviewPrimary = HEX_PATTERN.test(normalizeColor(primaryColor))
    ? normalizeColor(primaryColor)
    : DEFAULT_CIGUENA_BRANDING.primaryColor;
  const normalizedPreviewAccent = HEX_PATTERN.test(normalizeColor(accentColor))
    ? normalizeColor(accentColor)
    : DEFAULT_CIGUENA_BRANDING.accentColor;

  const busy = saving || resetting;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-violet-300" />
          <div>
            <h3 className="text-sm font-semibold text-steel-100">Identidad</h3>
            <p className="text-xs text-steel-500 mt-0.5">
              Nombre que verán los usuarios de este tenant.
            </p>
          </div>
        </div>

        <label className="label">Nombre visible de la marca</label>
        <input
          value={brandName}
          onChange={(event) => {
            setBrandName(event.target.value);
            setSuccessMessage(null);
          }}
          maxLength={80}
          className="input"
          placeholder="Ej. SPI"
        />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-violet-300" />
          <div>
            <h3 className="text-sm font-semibold text-steel-100">Paleta</h3>
            <p className="text-xs text-steel-500 mt-0.5">
              Configuramos solo Primary y Accent. El resto de los estados visuales se derivará automáticamente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorControl
            label="Primary"
            value={primaryColor}
            onChange={(value) => {
              setPrimaryColor(value);
              setSuccessMessage(null);
            }}
          />
          <ColorControl
            label="Accent"
            value={accentColor}
            onChange={(value) => {
              setAccentColor(value);
              setSuccessMessage(null);
            }}
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-steel-100">Logos y assets</h3>
          <p className="text-xs text-steel-500 mt-0.5">
            Los archivos se guardan en Supabase Storage dentro de una carpeta exclusiva del tenant.
          </p>
        </div>

        <div className="space-y-3">
          <LogoUploader
            label="Logo principal"
            description="Versión completa para sidebar, login y documentos."
            recommended="Recomendado: PNG/SVG transparente, hasta 2 MB."
            currentUrl={effectiveLogo}
            file={files.logo}
            onFileChange={(file) => setAssetFile('logo', file)}
          />

          <LogoUploader
            label="Logo compacto / isotipo"
            description="Para sidebar colapsado, mobile y espacios reducidos."
            recommended="Si no se carga favicon, este asset podrá usarse como fallback."
            compact
            currentUrl={effectiveCompact}
            file={files.compact}
            onFileChange={(file) => setAssetFile('compact', file)}
          />

          <LogoUploader
            label="Logo negativo"
            description="Versión clara/blanca para fondos oscuros."
            compact
            currentUrl={effectiveNegative}
            file={files.negative}
            onFileChange={(file) => setAssetFile('negative', file)}
          />

          <LogoUploader
            label="Favicon"
            description="Ícono de la pestaña del navegador. Opcional."
            recommended="PNG, ICO o SVG cuadrado."
            compact
            currentUrl={effectiveFavicon}
            file={files.favicon}
            onFileChange={(file) => setAssetFile('favicon', file)}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Globe2 size={16} className="text-violet-300" />
          <div>
            <h3 className="text-sm font-semibold text-steel-100">Experiencia</h3>
            <p className="text-xs text-steel-500 mt-0.5">
              Parámetros comerciales y de acceso asociados a la marca.
            </p>
          </div>
        </div>

        <label className="label">Dominio personalizado</label>
        <input
          value={customDomain}
          onChange={(event) => {
            setCustomDomain(event.target.value);
            setSuccessMessage(null);
          }}
          className="input"
          placeholder="training.spi.com.ar"
        />
        <p className="text-[11px] text-steel-600 mt-1.5">
          Este hostname se usa para resolver la marca antes del login. También debe estar agregado como dominio/alias en Netlify.
        </p>

        <label className="flex items-start gap-3 mt-4 rounded-xl border border-steel-700 bg-steel-900/55 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={showPowered}
            onChange={(event) => {
              setShowPowered(event.target.checked);
              setSuccessMessage(null);
            }}
            className="mt-1 h-4 w-4 rounded border-steel-600 bg-steel-900 text-violet-500 focus:ring-violet-500"
          />
          <div>
            <div className="text-sm font-medium text-steel-100">
              Mostrar “Powered by BondiApps”
            </div>
            <div className="text-xs text-steel-500 mt-1">
              Puede ocultarse para clientes con modalidad White Label completa.
            </div>
          </div>
        </label>
      </section>

      <BrandingPreview
        brandName={brandName.trim() || tenant.name}
        logoUrl={previewLogo}
        compactLogoUrl={previewCompact}
        primaryColor={normalizedPreviewPrimary}
        accentColor={normalizedPreviewAccent}
        showPoweredByBondiApps={showPowered}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={handleReset}
          className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-steel-600 text-steel-300 hover:bg-steel-800 hover:text-steel-100 disabled:opacity-50 transition-colors text-sm"
        >
          {resetting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RotateCcw size={15} />
          )}
          Restablecer Cigüeña
        </button>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg bg-steel-700 text-steel-200 hover:bg-steel-600 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || Boolean(validationError)}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Guardar branding
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = normalizeColor(value);
  const valid = HEX_PATTERN.test(normalized);

  return (
    <div className="rounded-xl border border-steel-700 bg-steel-900/55 p-4">
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? normalized : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="w-11 h-10 rounded-lg bg-steel-800 border border-steel-600 p-1 cursor-pointer"
          aria-label={`Selector ${label}`}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (valid) onChange(normalized);
          }}
          className="input font-mono uppercase"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
      {!valid && (
        <p className="text-[11px] text-red-300 mt-2">HEX inválido.</p>
      )}
    </div>
  );
}
