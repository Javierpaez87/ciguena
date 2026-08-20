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
import {
  DEFAULT_CIGUENA_BRANDING,
  hexToRgbChannels,
  resolveBranding,
  type BrandingConfig,
  type TenantBrandingRow,
} from '../lib/branding';

interface BrandingContextValue {
  branding: BrandingConfig;
  isLoading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
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

  return resolveBranding(data as TenantBrandingRow);
}

function applyBrandingVariables(branding: BrandingConfig) {
  const root = document.documentElement;

  root.style.setProperty('--brand-primary', branding.primaryColor);
  root.style.setProperty('--brand-accent', branding.accentColor);
  root.style.setProperty(
    '--brand-primary-rgb',
    hexToRgbChannels(branding.primaryColor),
  );
  root.style.setProperty(
    '--brand-accent-rgb',
    hexToRgbChannels(branding.accentColor),
  );
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? null;

  const [branding, setBranding] = useState<BrandingConfig>(() =>
    getDefaultBrandingForTenant(tenantId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBranding = useCallback(async () => {
    if (!tenantId) {
      setBranding(getDefaultBrandingForTenant(null));
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resolvedBranding = await fetchTenantBranding(tenantId);
      setBranding(resolvedBranding);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el branding del tenant.';

      setError(message);
      setBranding(getDefaultBrandingForTenant(tenantId));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    applyBrandingVariables(branding);
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading,
      error,
      refreshBranding,
    }),
    [branding, isLoading, error, refreshBranding],
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
