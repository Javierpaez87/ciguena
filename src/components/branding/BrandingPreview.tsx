import { BookOpen, LayoutDashboard, Users } from 'lucide-react';

interface BrandingPreviewProps {
  brandName: string;
  logoUrl: string | null;
  compactLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  showPoweredByBondiApps: boolean;
}

export default function BrandingPreview({
  brandName,
  logoUrl,
  compactLogoUrl,
  primaryColor,
  accentColor,
  showPoweredByBondiApps,
}: BrandingPreviewProps) {
  const resolvedLogo = logoUrl || compactLogoUrl;

  return (
    <div className="rounded-2xl border border-steel-700 bg-[#0b1020] overflow-hidden shadow-xl shadow-black/20">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-steel-100">Preview</div>
          <div className="text-[10px] text-steel-500 mt-0.5">
            Referencia visual. La aplicación real se conecta al theme en la siguiente batería.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: primaryColor }}
          />
          <span
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[150px_1fr] min-h-[270px]">
        <aside
          className="p-3 border-r border-white/10"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="h-11 flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-black/25 border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt={brandName || 'Marca'}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {brandName || 'Marca'}
              </div>
              {showPoweredByBondiApps && (
                <div className="text-[8px] text-white/60 mt-0.5">
                  by BondiApps
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold"
              style={{ backgroundColor: accentColor, color: '#07111f' }}
            >
              <LayoutDashboard size={12} /> Dashboard
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] text-white/70">
              <BookOpen size={12} /> Capacitaciones
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] text-white/70">
              <Users size={12} /> Trabajadores
            </div>
          </div>
        </aside>

        <main className="p-4 bg-steel-950/70">
          <div className="text-sm font-semibold text-steel-100">Dashboard</div>
          <div className="text-[10px] text-steel-500 mt-0.5">
            Bienvenido a {brandName || 'la plataforma'}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
              <div className="text-[9px] uppercase tracking-wider text-steel-500">
                Cumplimiento
              </div>
              <div className="text-xl font-bold text-steel-100 mt-1">92%</div>
              <div className="h-1.5 bg-steel-700 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: accentColor, width: '92%' }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-900 p-3">
              <div className="text-[9px] uppercase tracking-wider text-steel-500">
                Pendientes
              </div>
              <div className="text-xl font-bold text-steel-100 mt-1">8</div>
              <button
                type="button"
                className="mt-3 px-2.5 py-1.5 rounded-md text-[9px] font-bold"
                style={{ backgroundColor: accentColor, color: '#07111f' }}
              >
                Ver capacitaciones
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-steel-700 bg-steel-900 p-3 mt-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-medium text-steel-200">
                  Identidad visual
                </div>
                <div className="text-[9px] text-steel-500 mt-0.5">
                  Primary + Accent aplicados a elementos de marca.
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-lg border border-white/10"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
