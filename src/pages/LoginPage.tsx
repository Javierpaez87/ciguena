import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginPage({ onRegister, onForgotPassword }: LoginPageProps) {
  const { login, isLoading } = useAuth();
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

  return (
    <div className="min-h-screen bg-steel-950 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-petroleum-950 via-steel-900 to-petroleum-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 border border-amber-400 rounded-full" />
          <div className="absolute top-40 left-40 w-96 h-96 border border-amber-400 rounded-full" />
          <div className="absolute bottom-20 right-10 w-48 h-48 border border-amber-400 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-steel-950/70 border border-amber-500/30 flex items-center justify-center p-1.5 shadow-lg shadow-amber-500/10">
              <img src="/images/ciguena-pumpjack.png" alt="Cigüeña" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 tracking-wide">CIGÜEÑA</div>
              <div className="text-xs text-steel-400">by BondiApps</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-steel-50 mb-4 leading-tight">
            Cumplimiento operativo<br />para equipos de Oil &amp; Gas
          </h2>

          <p className="text-steel-300 leading-relaxed text-sm max-w-sm mb-4">
            Gestioná capacitaciones, certificaciones, evaluaciones y seguimiento de avances desde una única plataforma.
          </p>

          <p className="text-steel-400 leading-relaxed text-sm max-w-sm">
            Cada usuario accede a las herramientas y la información correspondientes a su empresa y a su rol.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { label: 'Gestión por empresa', desc: 'Usuarios, permisos y contenidos organizados por compañía' },
            { label: 'Certificados automáticos', desc: 'Emisión, descarga y seguimiento de vigencia' },
            { label: 'Trazabilidad', desc: 'Seguimiento de trainings, evaluaciones y cumplimiento' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-5 h-5 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              </div>
              <div>
                <div className="text-sm font-medium text-steel-100">{item.label}</div>
                <div className="text-xs text-steel-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative text-xs text-steel-600">
          © 2026 BondiApps. Todos los derechos reservados.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-steel-900 border border-amber-500/30 flex items-center justify-center p-1.5 shadow-lg shadow-amber-500/10">
              <img src="/images/ciguena-pumpjack.png" alt="Cigüeña" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">CIGÜEÑA</div>
              <div className="text-xs text-steel-400">by BondiApps</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-steel-50 mb-1">Iniciar sesión</h1>
            <p className="text-sm text-steel-400">
              Ingresá con tu cuenta para acceder a la plataforma.
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
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
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

          <div className="mt-6 pt-6 border-t border-steel-700 text-center">
            <p className="text-sm text-steel-400">
              ¿Todavía no tenés cuenta?{' '}
              <button
                type="button"
                onClick={onRegister}
                className="font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Crear cuenta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
