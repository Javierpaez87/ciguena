import React, { useState } from 'react';
import { Flame, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: err } = await login(email, password);
    if (err) setError(err);
  };

  const demoAccounts = [
    { label: 'Super Admin BondiApps', email: 'admin@bondiapps.com', password: 'bondi2024', color: 'amber' },
    { label: 'Admin YPF Demo', email: 'admin@ypf.com', password: 'ypf2024', color: 'blue' },
    { label: 'Trabajador (Juan Pérez)', email: 'juan.perez@ypf.com', password: 'worker2024', color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-steel-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-petroleum-950 via-steel-900 to-petroleum-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 border border-amber-400 rounded-full" />
          <div className="absolute top-40 left-40 w-96 h-96 border border-amber-400 rounded-full" />
          <div className="absolute bottom-20 right-10 w-48 h-48 border border-amber-400 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Flame size={24} className="text-petroleum-950" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 tracking-wide">CIGÜEÑA</div>
              <div className="text-xs text-steel-400">by BondiApps</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-steel-50 mb-4 leading-tight">
            Capacitación Industrial<br />para Oil & Gas
          </h2>
          <p className="text-steel-300 leading-relaxed text-sm max-w-sm">
            Plataforma de cumplimiento operativo: gestión de trainings, certificaciones y aptitud laboral para la industria energética.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { label: 'Gestión multi-tenant', desc: 'Múltiples empresas en una sola plataforma' },
            { label: 'Certificados automáticos', desc: 'Emisión y seguimiento de vigencia' },
            { label: 'Cumplimiento normativo', desc: 'HSE, EPP, Trabajos en altura y más' },
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
          © 2024 BondiApps. Todos los derechos reservados.
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Flame size={20} className="text-petroleum-950" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-400">CIGÜEÑA</div>
              <div className="text-xs text-steel-400">by BondiApps</div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-steel-50 mb-1">Iniciar sesión</h1>
            <p className="text-sm text-steel-400">Ingresá con tus credenciales para acceder a la plataforma.</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="label">Email</label>
              <input
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
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200"
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

          {/* Demo accounts */}
          <div className="border-t border-steel-700 pt-5">
            <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={12} />
              Cuentas demo
            </p>
            <div className="space-y-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  className="w-full text-left px-3 py-2.5 bg-steel-800 hover:bg-steel-700 border border-steel-700 hover:border-steel-600 rounded-lg transition-all group"
                >
                  <div className={`text-xs font-semibold mb-0.5 ${acc.color === 'amber' ? 'text-amber-400' : acc.color === 'blue' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {acc.label}
                  </div>
                  <div className="text-xs text-steel-400">{acc.email} · {acc.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
