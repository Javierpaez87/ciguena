import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import PublicBrandLockup from '../components/branding/PublicBrandLockup';

interface LoginPageProps {
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginPage({ onRegister, onForgotPassword }: LoginPageProps) {
  const { login, isLoading } = useAuth();
  const { branding, isDomainBound } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error: loginError } = await login(email, password);
    if (loginError) setError(loginError);
  };

  const isWhiteLabel = branding.isCustomBranding || isDomainBound;
  const brandPossessive = isWhiteLabel ? ` de ${branding.brandName}` : '';
  const heroTitle = isWhiteLabel
    ? 'Capacitación y cumplimiento operativo'
    : 'Cumplimiento operativo para equipos de Oil & Gas';
  const heroDescription = isWhiteLabel
    ? 'Accedé a tus capacitaciones, evaluaciones, certificados y seguimiento de avances desde un único lugar.'
    : 'Gestioná capacitaciones, certificaciones, evaluaciones y seguimiento de avances desde una única plataforma.';
  const heroSecondaryDescription = isWhiteLabel
    ? 'Consultá tus pendientes, completá tus entrenamientos y mantené tus certificaciones al día.'
    : 'Cada usuario accede a las herramientas y la información correspondientes a su empresa y a su rol.';
  const heroFeatures = isWhiteLabel
    ? [
        { label: 'Tus capacitaciones', desc: `Accedé a los entrenamientos asignados por ${branding.brandName}.` },
        { label: 'Certificados', desc: 'Descargá y consultá la vigencia de tus certificaciones.' },
        { label: 'Seguimiento de avances', desc: 'Revisá fácilmente qué completaste y qué tenés pendiente.' },
      ]
    : [
        { label: 'Gestión por empresa', desc: 'Usuarios, permisos y contenidos organizados por compañía' },
        { label: 'Certificados automáticos', desc: 'Emisión, descarga y seguimiento de vigencia' },
        { label: 'Trazabilidad', desc: 'Seguimiento de trainings, evaluaciones y cumplimiento' },
      ];
  const copyright = isWhiteLabel
    ? branding.showPoweredByBondiApps
      ? `© 2026 ${branding.brandName}. Platform by BondiApps.`
      : `© 2026 ${branding.brandName}. Todos los derechos reservados.`
    : '© 2026 BondiApps. Todos los derechos reservados.';

  return (
    <div className="min-h-screen bg-steel-950 flex">
      <div
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-petroleum-950 via-steel-900 to-petroleum-900 p-12 flex-col justify-between relative overflow-hidden"
        style={isWhiteLabel ? {
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgb(var(--brand-accent-rgb) / 0.14), transparent 32%), radial-gradient(circle at 86% 82%, rgb(var(--brand-primary-rgb) / 0.10), transparent 36%), linear-gradient(to bottom right, #08202B, #0F172A, #102933)',
        } : undefined}
      >
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute top-20 left-20 w-64 h-64 border brand-border rounded-full" />
          <div className="absolute top-40 left-40 w-96 h-96 border brand-border rounded-full" />
          <div className="absolute bottom-20 right-10 w-48 h-48 border brand-border rounded-full" />
        </div>

        <div className="relative">
          <PublicBrandLockup className="mb-12" />

          {isWhiteLabel && (
            <div className="mb-5 h-1 w-14 rounded-full brand-bg" aria-hidden="true" />
          )}

          <h2 className="text-3xl font-bold text-steel-50 mb-4 leading-tight max-w-lg">
            {heroTitle}
          </h2>

          <p className="text-steel-300 leading-relaxed text-sm max-w-md mb-4">
            {heroDescription}
          </p>

          <p className="text-steel-400 leading-relaxed text-sm max-w-md">
            {heroSecondaryDescription}
          </p>
        </div>

        <div className="relative space-y-4">
          {heroFeatures.map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-5 h-5 brand-bg-soft border brand-border rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--brand-accent)' }} />
              </div>
              <div>
                <div className="text-sm font-medium text-steel-100">{item.label}</div>
                <div className="text-xs text-steel-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative text-xs text-steel-600">{copyright}</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {isWhiteLabel && (
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full blur-3xl"
            style={{ backgroundColor: 'rgb(var(--brand-accent-rgb) / 0.08)' }}
            aria-hidden="true"
          />
        )}

        <div className="w-full max-w-md relative">
          <div className="lg:hidden mb-8">
            <PublicBrandLockup compact centered />
          </div>

          <div className="mb-8">
            {isWhiteLabel && (
              <div className="mb-4 h-1 w-12 rounded-full brand-bg" aria-hidden="true" />
            )}
            <h1 className="text-2xl font-bold text-steel-50 mb-1">Iniciar sesión</h1>
            <p className="text-sm text-steel-400">
              Ingresá con tu cuenta para acceder a la plataforma{brandPossessive}.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0" htmlFor="login-password">Contraseña</label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-medium brand-text hover:brightness-110 transition-all"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          {isWhiteLabel ? (
            <div className="mt-7 pt-6 border-t border-steel-700">
              <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-steel-500">
                {`¿Primera vez en ${branding.brandName} Capacitaciones?`}
              </p>

              <button
                type="button"
                onClick={onRegister}
                className="btn-brand-outline mt-3 w-full justify-center py-3"
              >
                <UserPlus size={17} />
                Crear mi cuenta
              </button>

              {isDomainBound && (
                <p className="mt-3 text-center text-xs leading-relaxed text-steel-500">
                  {`Si recibiste una invitación de ${branding.brandName}, creá tu cuenta usando el mismo email de la invitación.`}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-steel-700 text-center">
              <p className="text-sm text-steel-400">
                ¿Todavía no tenés cuenta?{' '}
                <button
                  type="button"
                  onClick={onRegister}
                  className="font-semibold brand-text hover:brightness-110 transition-all"
                >
                  Crear cuenta
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
