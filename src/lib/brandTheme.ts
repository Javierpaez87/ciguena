import type { BrandingConfig } from './branding';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channelToHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel)))
    .toString(16)
    .padStart(2, '0');
}

export function mixHex(
  foreground: string,
  background: string,
  foregroundWeight: number,
): string {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  const weight = Math.max(0, Math.min(1, foregroundWeight));

  return `#${channelToHex(fg.r * weight + bg.r * (1 - weight))}${channelToHex(
    fg.g * weight + bg.g * (1 - weight),
  )}${channelToHex(fg.b * weight + bg.b * (1 - weight))}`.toUpperCase();
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function getReadableTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);

  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  const luminance =
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];

  return luminance > 0.46 ? '#071B24' : '#F8FAFC';
}

/**
 * White Label visual rule:
 *
 * The product shell stays neutral and consistent across every tenant.
 * Brand colors are accents, not large background surfaces.
 *
 * This keeps SPI, Cigüeña and future brands feeling like the same
 * polished product with a different identity instead of unrelated themes.
 */
export function getTenantBrandTheme(branding: BrandingConfig) {
  const accent = branding.accentColor;
  const accentReadable = mixHex(accent, '#FFFFFF', 0.68);

  return {
    // Stable product surfaces. Do NOT derive these from client colors.
    sidebarBackground: '#0F172A',
    headerBackground: '#0F172A',
    pageBackground: '#020617',
    elevatedBackground: '#1E293B',

    // Structural borders remain neutral.
    border: 'rgba(51, 65, 85, 0.95)',
    borderStrong: 'rgba(71, 85, 105, 0.95)',

    // Brand is used only as a controlled accent.
    softPrimary: rgba(accent, 0.14),
    softAccent: rgba(accent, 0.10),
    accentText: accentReadable,
    activeText: '#F8FAFC',
  };
}
