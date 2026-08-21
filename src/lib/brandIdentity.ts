import {
  DEFAULT_CIGUENA_BRANDING,
  type BrandingConfig,
} from './branding';

export function getBrandSlug(brandingOrName: BrandingConfig | string): string {
  const value =
    typeof brandingOrName === 'string'
      ? brandingOrName
      : brandingOrName.brandName;

  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'ciguena';
}

export function getEffectiveFaviconUrl(branding: BrandingConfig): string {
  const configuredFavicon = branding.faviconUrl?.trim();

  if (
    branding.isCustomBranding &&
    (!configuredFavicon || configuredFavicon === DEFAULT_CIGUENA_BRANDING.faviconUrl)
  ) {
    return (
      branding.logoCompactUrl?.trim() ||
      branding.logoUrl?.trim() ||
      DEFAULT_CIGUENA_BRANDING.faviconUrl
    );
  }

  return configuredFavicon || DEFAULT_CIGUENA_BRANDING.faviconUrl;
}

export function getBrandDocumentSubtitle(
  branding: BrandingConfig,
  suffix: string,
): string {
  return branding.showPoweredByBondiApps
    ? `Powered by BondiApps · ${suffix}`
    : suffix;
}

export function getBrandDocumentLogoUrl(branding: BrandingConfig): string {
  if (!branding.isCustomBranding) {
    return DEFAULT_CIGUENA_BRANDING.logoUrl;
  }

  return (
    branding.logoUrl?.trim() ||
    branding.logoCompactUrl?.trim() ||
    DEFAULT_CIGUENA_BRANDING.logoUrl
  );
}

export function getBrandBrowserTitle(branding: BrandingConfig): string {
  if (!branding.isCustomBranding) {
    return 'Cigüeña | Oil & Gas Operational Compliance';
  }

  return `${branding.brandName} | Capacitaciones y certificaciones`;
}
