import { useBranding } from '../../contexts/BrandingContext';

interface PublicBrandLockupProps {
  compact?: boolean;
  centered?: boolean;
  className?: string;
}

export default function PublicBrandLockup({
  compact = false,
  centered = false,
  className = '',
}: PublicBrandLockupProps) {
  const { branding } = useBranding();
  const logo =
    branding.logoNegativeUrl?.trim() ||
    branding.logoUrl?.trim() ||
    branding.logoCompactUrl?.trim();
  const emphasizeBrand = !compact && branding.isCustomBranding;

  return (
    <div
      className={`flex items-center ${emphasizeBrand ? 'gap-4' : 'gap-3'} ${centered ? 'justify-center' : ''} ${className}`}
    >
      <div
        className={`${compact ? 'w-10 h-10' : emphasizeBrand ? 'w-14 h-14' : 'w-12 h-12'} ${emphasizeBrand ? 'rounded-2xl p-2' : 'rounded-xl p-1.5'} bg-steel-950/75 border brand-border flex items-center justify-center`}
        style={{
          boxShadow:
            '0 12px 34px rgb(var(--brand-accent-rgb) / 0.12), inset 0 0 0 1px rgb(var(--brand-accent-rgb) / 0.04)',
        }}
      >
        <img
          src={logo}
          alt={branding.brandName}
          className="w-full h-full object-contain"
        />
      </div>

      <div className={centered ? 'text-left' : ''}>
        <div
          className={`${compact ? 'text-xl' : emphasizeBrand ? 'text-[1.75rem]' : 'text-2xl'} leading-none font-bold brand-text tracking-wide`}
        >
          {branding.brandName}
        </div>
        {branding.showPoweredByBondiApps && (
          <div className={`${compact ? 'mt-1' : 'mt-1.5'} text-xs text-steel-400`}>
            Powered by BondiApps
          </div>
        )}
      </div>
    </div>
  );
}
