import { useBranding } from '../../contexts/BrandingContext';

interface TenantBrandMarkProps {
  subtitle?: string;
  size?: 'sm' | 'md';
}

export default function TenantBrandMark({
  subtitle,
  size = 'md',
}: TenantBrandMarkProps) {
  const { branding } = useBranding();

  const logo = branding.logoNegativeUrl || branding.logoUrl;
  const iconSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const nameSize = size === 'sm' ? 'text-xl' : 'text-2xl';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${iconSize} rounded-xl bg-steel-900 border brand-border-soft flex items-center justify-center p-1.5 shadow-lg`}
        style={{ boxShadow: '0 8px 24px rgb(var(--brand-primary-rgb) / 0.10)' }}
      >
        <img
          src={logo}
          alt={branding.brandName}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="min-w-0">
        <div className={`${nameSize} font-bold brand-text tracking-wide truncate`}>
          {branding.brandName}
        </div>
        {subtitle && (
          <div className="text-xs text-steel-400 truncate">{subtitle}</div>
        )}
        {branding.showPoweredByBondiApps && (
          <div className="text-[10px] text-steel-500 leading-tight">
            Powered by BondiApps
          </div>
        )}
      </div>
    </div>
  );
}
