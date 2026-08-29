import { useBranding } from '../../contexts/BrandingContext';
import { mixHex, rgba } from '../../lib/brandTheme';

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

  // The tenant accent can be quite dark (SPI is a good example).
  // Build a lighter presentation color for borders/glow so the logo card
  // remains visible on the dark product shell without altering the uploaded logo.
  const neonEdge = mixHex(branding.accentColor, '#FFFFFF', 0.42);
  const neonGlow = mixHex(branding.accentColor, '#38BDF8', 0.58);

  if (branding.isCustomBranding) {
    return (
      <div
        className={`flex flex-col ${centered ? 'items-center text-center' : 'items-start'} ${className}`}
      >
        <div
          className={`${logoSurface === 'neon' ? 'relative isolate rounded-2xl border px-5 py-3.5 backdrop-blur-md' : ''} ${centered ? 'mx-auto' : ''}`}
          style={logoSurface === 'neon' ? {
            background: `linear-gradient(145deg, rgba(255, 255, 255, 0.095), ${rgba(branding.primaryColor, 0.22)} 52%, rgba(2, 6, 23, 0.76))`,
            borderColor: rgba(neonEdge, 0.88),
            boxShadow: `0 0 0 1px ${rgba(neonEdge, 0.16)}, 0 0 18px ${rgba(neonGlow, 0.36)}, 0 0 42px ${rgba(neonGlow, 0.20)}, 0 14px 38px rgba(0, 0, 0, 0.28), inset 0 0 26px ${rgba(neonGlow, 0.10)}`,
          } : undefined}
        >
          {logoSurface === 'neon' && (
            <>
              <div
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] blur-2xl"
                style={{ backgroundColor: rgba(neonGlow, 0.16) }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-x-8 -bottom-5 -z-10 h-10 rounded-full blur-2xl"
                style={{ backgroundColor: rgba(neonGlow, 0.28) }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-x-5 top-0 h-px rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${rgba(neonEdge, 0.92)}, transparent)` }}
                aria-hidden="true"
              />
            </>
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
              filter: `brightness(1.30) saturate(1.14) drop-shadow(0 0 9px ${rgba(neonGlow, 0.22)})`,
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
