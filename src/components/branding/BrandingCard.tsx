import {
  Building2,
  Globe2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';

import type { BrandingConfig, TenantBrandingRow } from '../../lib/branding';

export interface BrandingTenantSummary {
  id: string;
  name: string;
  status?: string | null;
  logoUrl?: string | null;
  branding: BrandingConfig;
  brandingRow?: TenantBrandingRow | null;
}

interface BrandingCardProps {
  tenant: BrandingTenantSummary;
  onEdit: (tenant: BrandingTenantSummary) => void;
}

export default function BrandingCard({
  tenant,
  onEdit,
}: BrandingCardProps) {
  const { branding } = tenant;
  const isCustom = branding.isCustomBranding;

  const displayLogo =
    branding.logoUrl || tenant.logoUrl || '/images/ciguena-pumpjack.png';

  return (
    <article className="bg-steel-800 border border-steel-700 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-steel-950 border border-steel-700 flex items-center justify-center p-2 flex-shrink-0">
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt={branding.brandName || tenant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 size={24} className="text-steel-500" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-steel-100 truncate">
                {tenant.name}
              </h3>
              <p className="text-xs text-steel-400 truncate mt-0.5">
                Marca visible: {branding.brandName}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border flex-shrink-0 ${
              isCustom
                ? 'bg-violet-400/10 text-violet-200 border-violet-400/20'
                : 'bg-steel-700/60 text-steel-300 border-steel-600'
            }`}
          >
            <ShieldCheck size={12} />
            {isCustom ? 'Custom' : 'Default Cigüeña'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-steel-900/70 border border-steel-700 rounded-xl px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-steel-500 mb-1.5">
              Primary
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: branding.primaryColor }}
              />
              <span className="text-xs font-mono text-steel-200">
                {branding.primaryColor}
              </span>
            </div>
          </div>

          <div className="bg-steel-900/70 border border-steel-700 rounded-xl px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-steel-500 mb-1.5">
              Accent
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: branding.accentColor }}
              />
              <span className="text-xs font-mono text-steel-200">
                {branding.accentColor}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 min-h-[40px]">
          {branding.customDomain ? (
            <div className="flex items-center gap-2 text-xs text-steel-300">
              <Globe2 size={14} className="text-steel-500 flex-shrink-0" />
              <span className="truncate">{branding.customDomain}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-steel-500">
              <Globe2 size={14} className="flex-shrink-0" />
              <span>Sin dominio personalizado</span>
            </div>
          )}

          <div className="text-[11px] text-steel-500 mt-1.5">
            Modalidad: {branding.showPoweredByBondiApps ? 'Co-branding' : 'White Label completo'}
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-steel-700 bg-steel-900/40">
        <button
          type="button"
          onClick={() => onEdit(tenant)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-violet-400/25 bg-violet-400/10 text-violet-200 hover:bg-violet-400/15 transition-colors text-sm font-medium"
        >
          <Pencil size={15} />
          Editar branding
        </button>
      </div>
    </article>
  );
}
