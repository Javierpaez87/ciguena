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

export function getTenantBrandTheme(branding: BrandingConfig) {
  const primary = branding.primaryColor;
  const accent = branding.accentColor;
  const accentReadable = mixHex(accent, '#FFFFFF', 0.68);

  return {
    sidebarBackground: mixHex(primary, '#0F172A', 0.24),
    headerBackground: mixHex(primary, '#0F172A', 0.20),
    pageBackground: mixHex(primary, '#020617', 0.10),
    elevatedBackground: mixHex(primary, '#1E293B', 0.16),
    border: rgba(accent, 0.22),
    borderStrong: rgba(accent, 0.34),
    softPrimary: rgba(primary, 0.18),
    softAccent: rgba(accent, 0.13),
    accentText: accentReadable,
    activeText: '#F8FAFC',
  };
}
