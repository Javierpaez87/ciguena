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
  const customLogo =
    branding.logoUrl?.trim() ||
    branding.logoNegativeUrl?.trim() ||
    branding.logoCompactUrl?.trim();

  if (branding.isCustomBranding) {
    return (
      <div
        className={`flex flex-col ${centered ? 'items-center text-center' : 'items-start'} ${className}`}
      >
        <div
          className={`${
            compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
          } rounded-lg bg-white ring-1 ring-black/5 shadow-md`}
        >
          <img
            src={customLogo}
            alt={branding.brandName}
            className={`${
              compact
                ? 'w-[185px] sm:w-[205px] max-h-14'
                : 'w-[260px] sm:w-[285px] xl:w-[310px] max-h-20'
            } h-auto object-contain ${centered ? 'mx-auto' : ''}`}
          />
        </div>

        <div
          className={`${compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'} text-steel-400 leading-relaxed`}
        >
          <span className="font-semibold text-steel-300">{branding.brandName}</span>{' '}
          Plataforma de capacitaciones
        </div>

        {branding.showPoweredByBondiApps && (
          <div className="mt-1 text-[10px] text-steel-500">
            Powered by BondiApps
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 ${centered ? 'justify-center' : ''} ${className}`}
    >
      <div
        className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl p-1.5 bg-steel-950/75 border brand-border flex items-center justify-center`}
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
          className={`${compact ? 'text-xl' : 'text-2xl'} leading-none font-bold brand-text tracking-wide`}
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
