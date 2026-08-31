import { useBranding } from '../../contexts/BrandingContext';

interface PublicBrandLockupProps {
  compact?: boolean;
  centered?: boolean;
  className?: string;
  logoSurface?: 'plain' | 'neon';
}

export default function PublicBrandLockup({
  compact = false,
  centered = false,
  className = '',
  logoSurface = 'plain',
}: PublicBrandLockupProps) {
  const { branding } = useBranding();
  const logo =
    branding.logoNegativeUrl?.trim() ||
    branding.logoUrl?.trim() ||
    branding.logoCompactUrl?.trim();
  const customLogo =
    branding.logoNegativeUrl?.trim() ||
    branding.logoUrl?.trim() ||
    branding.logoCompactUrl?.trim();

  if (branding.isCustomBranding) {
    return (
      <div
        className={`flex flex-col ${centered ? 'items-center text-center' : 'items-start'} ${className}`}
      >
        <div
          className={`${logoSurface === 'neon' ? 'relative rounded-2xl border px-4 py-3 backdrop-blur-md' : ''} ${centered ? 'mx-auto' : ''}`}
          style={logoSurface === 'neon' ? {
            background:
              'linear-gradient(145deg, rgb(var(--brand-primary-rgb) / 0.26), rgb(8 32 43 / 0.58))',
            borderColor: 'rgb(var(--brand-accent-rgb) / 0.52)',
            boxShadow:
              '0 0 0 1px rgb(var(--brand-accent-rgb) / 0.08), 0 0 22px rgb(var(--brand-accent-rgb) / 0.24), 0 14px 38px rgb(0 0 0 / 0.22), inset 0 0 24px rgb(var(--brand-accent-rgb) / 0.08)',
          } : undefined}
        >
          {logoSurface === 'neon' && (
            <div
              className="pointer-events-none absolute inset-x-8 -bottom-4 h-8 rounded-full blur-2xl"
              style={{ backgroundColor: 'rgb(var(--brand-accent-rgb) / 0.16)' }}
              aria-hidden="true"
            />
          )}

          <img
            src={customLogo}
            alt={branding.brandName}
            className={`${
              compact
                ? 'w-[190px] sm:w-[210px] max-h-14'
                : 'w-[285px] sm:w-[315px] xl:w-[340px] max-h-24'
            } relative h-auto object-contain`}
            style={logoSurface === 'neon' ? {
              filter:
                'brightness(1.28) saturate(1.12) drop-shadow(0 0 8px rgb(var(--brand-accent-rgb) / 0.16))',
            } : undefined}
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
