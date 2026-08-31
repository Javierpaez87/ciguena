import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { getReadableTextColor, getTenantBrandTheme } from '../lib/brandTheme';
import {
  getBrandBrowserTitle,
  getEffectiveFaviconUrl,
} from '../lib/brandIdentity';
import {
  DEFAULT_CIGUENA_BRANDING,
  hexToRgbChannels,
  resolveBranding,
  type BrandingConfig,
  type TenantBrandingRow,
} from '../lib/branding';
import {
  isDefaultPlatformHostname,
  normalizeHostname,
  resolveBrandingFromHostname,
  type DomainBrandingResolution,
} from '../lib/domainBranding';

interface BrandingContextValue {
  branding: BrandingConfig;
  isLoading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
  domainTenantId: string | null;
  domainTenantName: string | null;
  domainHostname: string | null;
  isDomainBound: boolean;
  isDefaultPlatformDomain: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

function getDefaultBrandingForTenant(
  tenantId: string | null,
): BrandingConfig {
  return {
    ...DEFAULT_CIGUENA_BRANDING,
    tenantId,
  };
}

function looksLikeDefaultBrand(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'ciguena';
}

async function fetchTenantBranding(
  tenantId: string,
): Promise<BrandingConfig> {
  const { data, error } = await supabase
    .from('tenant_branding')
    .select(`
      id,
      tenant_id,
      brand_name,
      logo_url,
      logo_compact_url,
      logo_negative_url,
      favicon_url,
      primary_color,
      accent_color,
      custom_domain,
      is_custom_branding,
      show_powered_by_bondiapps,
      created_at,
      updated_at,
      updated_by
    `)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return getDefaultBrandingForTenant(tenantId);
  }

  const resolvedBranding = resolveBranding(data as TenantBrandingRow);

  if (
    resolvedBranding.isCustomBranding &&
    looksLikeDefaultBrand(resolvedBranding.brandName)
  ) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle();

    const tenantName = tenant?.name?.trim();

    if (tenantName) {
      resolvedBranding.brandName = tenantName;
    }
  }

  return resolvedBranding;
}

function applyBrandingVariables(branding: BrandingConfig) {
  const root = document.documentElement;
  const tenantTheme = getTenantBrandTheme(branding);

  root.style.setProperty('--brand-primary', branding.primaryColor);
  root.style.setProperty('--brand-accent', branding.accentColor);
  root.style.setProperty(
    '--brand-accent-readable',
    branding.isCustomBranding ? tenantTheme.accentText : branding.accentColor,
  );
  root.style.setProperty(
    '--brand-primary-contrast',
    getReadableTextColor(branding.primaryColor),
  );
  root.style.setProperty(
    '--brand-accent-contrast',
    getReadableTextColor(branding.accentColor),
  );
  root.style.setProperty(
    '--brand-primary-rgb',
    hexToRgbChannels(branding.primaryColor),
  );
  root.style.setProperty(
    '--brand-accent-rgb',
    hexToRgbChannels(branding.accentColor),
  );
  root.dataset.branding = branding.isCustomBranding ? 'custom' : 'default';
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? null;
  const currentHostname = normalizeHostname(window.location.hostname);

  const [branding, setBranding] = useState<BrandingConfig>(() =>
    getDefaultBrandingForTenant(tenantId),
  );
  const [domainResolution, setDomainResolution] = useState<DomainBrandingResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let resolvedDomain: DomainBrandingResolution | null = null;

    try {
      resolvedDomain = await resolveBrandingFromHostname(currentHostname);
      setDomainResolution(resolvedDomain);
    } catch (domainError) {
      const message =
        domainError instanceof Error
          ? domainError.message
          : 'No se pudo resolver el dominio de la organización.';

      // Default platform domains never require a public resolver.
      if (!isDefaultPlatformHostname(currentHostname)) {
        setError(message);
      }
      setDomainResolution(null);
    }

    try {
      // A custom hostname owns the public identity. We keep that identity even
      // while Auth is loading so there is no Cigüeña flash before login.
      if (resolvedDomain) {
        setBranding(resolvedDomain.branding);
        return;
      }

      if (tenantId) {
        const resolvedBranding = await fetchTenantBranding(tenantId);
        setBranding(resolvedBranding);
        return;
      }

      setBranding(getDefaultBrandingForTenant(null));
    } catch (tenantError) {
      const message =
        tenantError instanceof Error
          ? tenantError.message
          : 'No se pudo cargar el branding del tenant.';

      setError((current) => current || message);
      setBranding(getDefaultBrandingForTenant(tenantId));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, currentHostname]);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    applyBrandingVariables(branding);

    document.title = getBrandBrowserTitle(branding);

    const faviconUrl = getEffectiveFaviconUrl(branding);
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    favicon.href = faviconUrl;

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = document.title;

    const twitterTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.content = document.title;
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading,
      error,
      refreshBranding,
      domainTenantId: domainResolution?.tenantId ?? null,
      domainTenantName: domainResolution?.tenantName ?? null,
      domainHostname: domainResolution?.hostname ?? null,
      isDomainBound: Boolean(domainResolution?.tenantId),
      isDefaultPlatformDomain: isDefaultPlatformHostname(currentHostname),
    }),
    [branding, isLoading, error, refreshBranding, domainResolution, currentHostname],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding must be used inside BrandingProvider');
  }

  return context;
}
