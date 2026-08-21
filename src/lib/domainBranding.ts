import { supabase } from './supabase';
import {
  DEFAULT_CIGUENA_BRANDING,
  resolveBranding,
  type BrandingConfig,
  type TenantBrandingRow,
} from './branding';

export interface DomainBrandingResolution {
  tenantId: string;
  tenantName: string;
  hostname: string;
  branding: BrandingConfig;
}

export function normalizeHostname(value?: string | null) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}

export function isDefaultPlatformHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  return (
    !normalized ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === 'ciguena.bondiapps.com' ||
    normalized === 'ciguena-dev.netlify.app' ||
    normalized === 'ciguena-product.netlify.app'
  );
}

function looksLikeDefaultBrand(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'ciguena';
}

export async function resolveBrandingFromHostname(
  hostname = window.location.hostname,
): Promise<DomainBrandingResolution | null> {
  const normalizedHostname = normalizeHostname(hostname);

  if (!normalizedHostname || isDefaultPlatformHostname(normalizedHostname)) {
    return null;
  }

  const { data, error } = await supabase
    .rpc('resolve_public_tenant_branding', {
      p_hostname: normalizedHostname,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.tenant_id) {
    return null;
  }

  const row: TenantBrandingRow = {
    tenant_id: data.tenant_id,
    brand_name: data.brand_name,
    logo_url: data.logo_url,
    logo_compact_url: data.logo_compact_url,
    logo_negative_url: data.logo_negative_url,
    favicon_url: data.favicon_url,
    primary_color: data.primary_color,
    accent_color: data.accent_color,
    custom_domain: data.custom_domain,
    is_custom_branding: data.is_custom_branding,
    show_powered_by_bondiapps: data.show_powered_by_bondiapps,
  };

  const branding = resolveBranding(row);
  const tenantName = data.tenant_name?.trim() || branding.brandName;

  if (
    branding.isCustomBranding &&
    (!branding.brandName.trim() || looksLikeDefaultBrand(branding.brandName))
  ) {
    branding.brandName = tenantName;
  }

  return {
    tenantId: data.tenant_id,
    tenantName,
    hostname: normalizedHostname,
    branding: {
      ...branding,
      tenantId: data.tenant_id,
      customDomain: data.custom_domain?.trim() || normalizedHostname,
    },
  };
}

export function getPublicBrandingFallback(): BrandingConfig {
  return { ...DEFAULT_CIGUENA_BRANDING };
}
