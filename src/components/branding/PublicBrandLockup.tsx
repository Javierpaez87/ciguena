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

  return (
    <div
      className={`flex items-center gap-3 ${centered ? 'justify-center' : ''} ${className}`}
    >
      <div
        className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-steel-950/70 border brand-border flex items-center justify-center p-1.5`}
        style={{ boxShadow: '0 10px 30px rgb(var(--brand-accent-rgb) / 0.08)' }}
      >
        <img
          src={logo}
          alt={branding.brandName}
          className="w-full h-full object-contain"
        />
      </div>

      <div className={centered ? 'text-left' : ''}>
        <div
          className={`${compact ? 'text-xl' : 'text-2xl'} font-bold brand-text tracking-wide`}
        >
          {branding.brandName}
        </div>
        {branding.showPoweredByBondiApps && (
          <div className="text-xs text-steel-400">Powered by BondiApps</div>
        )}
      </div>
    </div>
  );
}
