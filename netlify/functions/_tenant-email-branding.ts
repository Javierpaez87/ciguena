export type TenantEmailBranding = {
  tenantId: string;
  tenantName: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  isCustomBranding: boolean;
  showPoweredByBondiApps: boolean;
  customDomain: string | null;
};

const DEFAULT_PRIMARY = '#F59E0B';
const DEFAULT_ACCENT = '#FBBF24';
const DEFAULT_BRAND = 'Cigüeña';
const DEFAULT_FROM_ADDRESS = 'ciguena-no-reply@bondiapps.com';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeHex(value: unknown, fallback: string) {
  const normalized = clean(value);
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
}

function looksLikeDefaultBrand(value: string) {
  const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized === 'ciguena';
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return clean(match?.[1] || value) || DEFAULT_FROM_ADDRESS;
}

export async function resolveTenantEmailBranding(
  client: any,
  tenantId: string,
  tenantName?: string | null
): Promise<TenantEmailBranding> {
  const safeTenantName = clean(tenantName) || 'Tu empresa';

  const { data, error } = await client
    .from('tenant_branding')
    .select(
      'tenant_id, brand_name, logo_url, logo_negative_url, primary_color, accent_color, custom_domain, is_custom_branding, show_powered_by_bondiapps'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo cargar tenant_branding para email. Se usa fallback:', error);
  }

  const isCustomBranding = data?.is_custom_branding === true;
  let brandName = clean(data?.brand_name);

  // Algunos tenants nacieron con brand_name=Cigüeña. Si luego se activa
  // White Label pero el nombre no se actualizó, usamos el nombre del tenant.
  if (isCustomBranding && (!brandName || looksLikeDefaultBrand(brandName))) {
    brandName = safeTenantName;
  }

  if (!brandName) brandName = DEFAULT_BRAND;

  return {
    tenantId,
    tenantName: safeTenantName,
    brandName,
    logoUrl: clean(data?.logo_negative_url) || clean(data?.logo_url) || null,
    primaryColor: normalizeHex(data?.primary_color, DEFAULT_PRIMARY),
    accentColor: normalizeHex(data?.accent_color, DEFAULT_ACCENT),
    isCustomBranding,
    showPoweredByBondiApps: data?.show_powered_by_bondiapps !== false,
    customDomain: clean(data?.custom_domain) || null,
  };
}


export function getTenantAppUrl(
  branding: TenantEmailBranding,
  fallbackUrl?: string | null
) {
  const configuredDomain = clean(branding.customDomain)
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .replace(/\/$/, '');

  if (configuredDomain) {
    return `https://${configuredDomain}`;
  }

  const fallback = clean(fallbackUrl) || 'https://ciguena.bondiapps.com';
  return fallback.replace(/\/$/, '');
}

export function getEmailSender(branding: TenantEmailBranding) {
  const configured =
    process.env.CIGUENA_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    DEFAULT_FROM_ADDRESS;
  const address = extractAddress(configured).replace(/[\r\n]/g, '');
  const isFullWhiteLabel =
    branding.isCustomBranding && !branding.showPoweredByBondiApps;
  const displayName = (isFullWhiteLabel
    ? `${branding.brandName} | CAPACITACIONES`
    : `${branding.brandName}${
        branding.showPoweredByBondiApps ? ' | Platform by BondiApps' : ''
      }`
  ).replace(/[\r\n]/g, '');

  return `${displayName} <${address}>`;
}

export function getCtaTextColor(backgroundHex: string) {
  const hex = normalizeHex(backgroundHex, DEFAULT_ACCENT).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111827' : '#FFFFFF';
}

export function renderEmailBrandHeader(branding: TenantEmailBranding) {
  const safeBrand = escapeHtml(branding.brandName);
  const safeLogo = branding.logoUrl ? escapeHtml(branding.logoUrl) : '';
  const powered = branding.showPoweredByBondiApps
    ? '<div style="font-size:11px;color:#64748b;margin-top:5px;">Powered by BondiApps</div>'
    : '';
  const descriptor = `
    <div style="font-size:13px;line-height:1.45;color:#94a3b8;margin-top:10px;">
      <strong style="font-weight:700;color:#94a3b8;">${safeBrand}</strong>
      Plataforma de capacitaciones y certificaciones
    </div>
  `;

  if (safeLogo) {
    return `
      <div style="margin-bottom:26px;">
        <img src="${safeLogo}" alt="${safeBrand}" style="display:block;max-height:58px;max-width:240px;width:auto;height:auto;object-fit:contain;" />
        ${descriptor}
        ${powered}
      </div>
    `;
  }

  return `
    <div style="margin-bottom:26px;">
      <div style="font-size:22px;font-weight:700;color:${branding.accentColor};letter-spacing:0.5px;">${safeBrand}</div>
      <div style="font-size:13px;line-height:1.45;color:#94a3b8;margin-top:6px;">Plataforma de capacitaciones y certificaciones</div>
      ${powered}
    </div>
  `;
}

export function renderEmailFooter(branding: TenantEmailBranding) {
  const safeBrand = escapeHtml(branding.brandName);
  const suffix = branding.showPoweredByBondiApps ? ' | Platform by BondiApps' : '';

  return `
    <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />
    <p style="font-size:12px;line-height:1.5;color:#64748b;margin:0;">
      Este es un mensaje automático de ${safeBrand}${suffix}.
    </p>
  `;
}
