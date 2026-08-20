/**
 * White Label branding helpers.
 *
 * Este archivo no depende de React ni de Supabase.
 * Define la estructura de branding, el fallback de Cigüeña
 * y helpers que después usará BrandingContext.
 */

export interface TenantBrandingRow {
  id?: string;
  tenant_id: string;

  brand_name?: string | null;

  logo_url?: string | null;
  logo_compact_url?: string | null;
  logo_negative_url?: string | null;
  favicon_url?: string | null;

  primary_color?: string | null;
  accent_color?: string | null;

  custom_domain?: string | null;

  is_custom_branding?: boolean | null;
  show_powered_by_bondiapps?: boolean | null;

  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
}

export interface BrandingConfig {
  tenantId: string | null;

  brandName: string;

  logoUrl: string;
  logoCompactUrl: string;
  logoNegativeUrl: string;
  faviconUrl: string;

  primaryColor: string;
  accentColor: string;

  customDomain: string | null;

  isCustomBranding: boolean;
  showPoweredByBondiApps: boolean;
}

/**
 * Branding default de la plataforma.
 *
 * Todo tenant que no tenga White Label personalizado
 * utilizará esta identidad.
 */
export const DEFAULT_CIGUENA_BRANDING: BrandingConfig = {
  tenantId: null,

  brandName: 'Cigüeña',

  logoUrl: '/images/ciguena-pumpjack.png',
  logoCompactUrl: '/images/ciguena-pumpjack.png',
  logoNegativeUrl: '/images/ciguena-pumpjack.png',
  faviconUrl: '/favicon.png',

  primaryColor: '#F59E0B',
  accentColor: '#FBBF24',

  customDomain: null,

  isCustomBranding: false,
  showPoweredByBondiApps: true,
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

/**
 * Valida colores HEX.
 *
 * Si un cliente tiene un color inválido en Supabase,
 * usamos el color default en lugar de romper la UI.
 */
export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();

  if (!normalized || !HEX_COLOR_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized.toUpperCase();
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

/**
 * Convierte la fila de Supabase en una configuración
 * de branding completa y segura.
 *
 * Cualquier valor faltante utiliza Cigüeña como fallback.
 */
export function resolveBranding(
  row?: TenantBrandingRow | null,
): BrandingConfig {
  if (!row) {
    return { ...DEFAULT_CIGUENA_BRANDING };
  }

  const logoUrl =
    normalizeOptionalText(row.logo_url) ??
    DEFAULT_CIGUENA_BRANDING.logoUrl;

  return {
    tenantId: row.tenant_id,

    brandName:
      normalizeOptionalText(row.brand_name) ??
      DEFAULT_CIGUENA_BRANDING.brandName,

    logoUrl,

    logoCompactUrl:
      normalizeOptionalText(row.logo_compact_url) ??
      logoUrl,

    logoNegativeUrl:
      normalizeOptionalText(row.logo_negative_url) ??
      logoUrl,

    faviconUrl:
      normalizeOptionalText(row.favicon_url) ??
      DEFAULT_CIGUENA_BRANDING.faviconUrl,

    primaryColor: normalizeHexColor(
      row.primary_color,
      DEFAULT_CIGUENA_BRANDING.primaryColor,
    ),

    accentColor: normalizeHexColor(
      row.accent_color,
      DEFAULT_CIGUENA_BRANDING.accentColor,
    ),

    customDomain:
      normalizeOptionalText(row.custom_domain),

    isCustomBranding:
      row.is_custom_branding ?? false,

    showPoweredByBondiApps:
      row.show_powered_by_bondiapps ?? true,
  };
}

/**
 * Convierte HEX a canales RGB.
 *
 * Nos servirá después para generar variables CSS
 * que soporten transparencias.
 *
 * Ejemplo:
 * #F59E0B → "245 158 11"
 */
export function hexToRgbChannels(hex: string): string {
  const normalized = normalizeHexColor(
    hex,
    DEFAULT_CIGUENA_BRANDING.primaryColor,
  );

  const numericValue = Number.parseInt(
    normalized.slice(1),
    16,
  );

  const red = (numericValue >> 16) & 255;
  const green = (numericValue >> 8) & 255;
  const blue = numericValue & 255;

  return `${red} ${green} ${blue}`;
}
