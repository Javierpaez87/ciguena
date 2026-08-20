import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Globe2,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

import BrandingCard, {
  type BrandingTenantSummary,
} from '../../components/branding/BrandingCard';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_CIGUENA_BRANDING,
  resolveBranding,
  type TenantBrandingRow,
} from '../../lib/branding';

type TenantRow = {
  id: string;
  name: string;
  logo_url?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default function SaWhiteLabel() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [brandingRows, setBrandingRows] = useState<TenantBrandingRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] =
    useState<BrandingTenantSummary | null>(null);

  async function loadWhiteLabelData() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [tenantsResult, brandingResult] = await Promise.all([
        supabase
          .from('tenants')
          .select('id, name, logo_url, status, created_at')
          .order('name', { ascending: true }),
        supabase
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
          `),
      ]);

      if (tenantsResult.error) throw tenantsResult.error;
      if (brandingResult.error) throw brandingResult.error;

      setTenants((tenantsResult.data ?? []) as TenantRow[]);
      setBrandingRows(
        (brandingResult.data ?? []) as TenantBrandingRow[],
      );
    } catch (error) {
      console.error('Error loading White Label data:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la configuración de White Label.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWhiteLabelData();
  }, []);

  const brandingByTenant = useMemo(() => {
    const map = new Map<string, TenantBrandingRow>();

    brandingRows.forEach((row) => {
      map.set(row.tenant_id, row);
    });

    return map;
  }, [brandingRows]);

  const tenantCards = useMemo<BrandingTenantSummary[]>(() => {
    return tenants.map((tenant) => {
      const row = brandingByTenant.get(tenant.id);

      const branding = row
        ? resolveBranding(row)
        : {
            ...DEFAULT_CIGUENA_BRANDING,
            tenantId: tenant.id,
          };

      return {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        logoUrl: tenant.logo_url,
        branding,
      };
    });
  }, [tenants, brandingByTenant]);

  const filteredTenants = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tenantCards;

    return tenantCards.filter((tenant) => {
      return (
        tenant.name.toLowerCase().includes(term) ||
        tenant.branding.brandName.toLowerCase().includes(term) ||
        (tenant.branding.customDomain || '').toLowerCase().includes(term)
      );
    });
  }, [tenantCards, search]);

  const customCount = tenantCards.filter(
    (tenant) => tenant.branding.isCustomBranding,
  ).length;

  return (
    <div className="space-y-6">
      <section className="bg-steel-800 border border-steel-700 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-violet-300 text-sm font-medium mb-1">
              <Palette size={16} />
              White Label Engine
            </div>
            <p className="text-sm text-steel-400 max-w-2xl">
              Cada tenant tiene una identidad de marca. Los clientes sin White Label personalizado utilizan Cigüeña como configuración default.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-2 rounded-lg bg-steel-900 border border-steel-700 text-steel-300">
              <span className="text-steel-500">Tenants:</span>{' '}
              <strong className="text-steel-100">{tenantCards.length}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg bg-violet-400/10 border border-violet-400/20 text-violet-200">
              <span className="text-violet-300/70">Custom:</span>{' '}
              <strong>{customCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar empresa o marca..."
            className="input pl-9 w-full"
          />
        </div>

        <button
          type="button"
          onClick={loadWhiteLabelData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-steel-600 text-steel-300 hover:bg-steel-800 hover:text-steel-100 disabled:opacity-50 transition-colors text-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">No se pudo cargar White Label</div>
            <div className="text-red-200/80 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-[295px] bg-steel-800 border border-steel-700 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-steel-800 border border-steel-700 rounded-2xl">
          <EmptyState
            icon={<Building2 size={28} />}
            title={search ? 'No encontramos empresas' : 'No hay tenants'}
            description={
              search
                ? 'Probá con otro nombre de empresa o marca.'
                : 'Los tenants aparecerán acá cuando estén disponibles.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => (
            <BrandingCard
              key={tenant.id}
              tenant={tenant}
              onEdit={setSelectedTenant}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedTenant)}
        onClose={() => setSelectedTenant(null)}
        title={
          selectedTenant
            ? `Branding · ${selectedTenant.name}`
            : 'Branding'
        }
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedTenant(null)}
              className="px-4 py-2 rounded-lg bg-steel-700 text-steel-200 hover:bg-steel-600 transition-colors text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        }
      >
        {selectedTenant && (
          <div className="space-y-5">
            <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3">
              <div className="flex items-center gap-2 text-violet-200 font-medium text-sm">
                <ShieldCheck size={16} />
                Estructura lista para editar
              </div>
              <p className="text-xs text-violet-200/70 mt-1">
                En esta batería validamos la vista y la lectura del branding. La edición de logos, colores y dominio se habilita en la próxima batería.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-steel-900/70 border border-steel-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-steel-500 mb-2">
                  <Palette size={14} /> Marca
                </div>
                <div className="text-steel-100 font-medium">
                  {selectedTenant.branding.brandName}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-steel-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{
                        backgroundColor:
                          selectedTenant.branding.primaryColor,
                      }}
                    />
                    {selectedTenant.branding.primaryColor}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{
                        backgroundColor:
                          selectedTenant.branding.accentColor,
                      }}
                    />
                    {selectedTenant.branding.accentColor}
                  </span>
                </div>
              </div>

              <div className="bg-steel-900/70 border border-steel-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-steel-500 mb-2">
                  <Globe2 size={14} /> Dominio
                </div>
                <div className="text-sm text-steel-200 break-all">
                  {selectedTenant.branding.customDomain ||
                    'Sin dominio personalizado'}
                </div>
              </div>

              <div className="bg-steel-900/70 border border-steel-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-steel-500 mb-2">
                  <ImageIcon size={14} /> Assets
                </div>
                <div className="text-xs text-steel-400 space-y-1">
                  <div>Logo principal: disponible</div>
                  <div>Logo compacto: disponible</div>
                  <div>Favicon: disponible</div>
                </div>
              </div>

              <div className="bg-steel-900/70 border border-steel-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-steel-500 mb-2">
                  <ShieldCheck size={14} /> Modalidad
                </div>
                <div className="text-sm text-steel-200">
                  {selectedTenant.branding.isCustomBranding
                    ? 'White Label personalizado'
                    : 'Branding default Cigüeña'}
                </div>
                <div className="text-xs text-steel-500 mt-1">
                  Powered by BondiApps:{' '}
                  {selectedTenant.branding.showPoweredByBondiApps
                    ? 'Sí'
                    : 'No'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
