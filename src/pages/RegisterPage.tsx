import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, X } from 'lucide-react';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

const companies = [
  { id: 'demo-oil-energy-co', name: 'Demo Oil Energy Co.' },
];

export default function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requestedAdmin, setRequestedAdmin] = useState(false);
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [message, setMessage] = useState('');

  const handleAdminRequestChange = (checked: boolean) => {
    if (checked) {
      setShowAdminWarning(true);
      return;
    }
    setRequestedAdmin(false);
  };

  const confirmAdminRequest = () => {
    setRequestedAdmin(true);
    setShowAdminWarning(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setMessage('Formulario listo. En el siguiente paso lo conectaremos con Supabase.');
  };

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-xl">
        <button
          type="button"
          onClick={onBackToLogin}
          className="mb-6 inline-flex items-center gap-2 text-sm text-steel-400 hover:text-steel-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al inicio de sesión
        </button>

        <div className="bg-steel-900 border border-steel-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-xl bg-steel-950 border border-amber-500/30 flex items-center justify-center p-1.5">
              <img src="/images/ciguena-pumpjack.png" alt="Cigüeña" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-steel-50">Crear cuenta</h1>
              <p className="text-sm text-steel-400">Completá tus datos para solicitar acceso a Cigüeña.</p>
            </div>
          </div>

          {message && (
            <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="register-name">Nombre y apellido</label>
              <input id="register-name" className="input" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="register-email">Email</label>
                <input id="register-email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label className="label" htmlFor="register-phone">Teléfono</label>
                <input id="register-phone" type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} required autoComplete="tel" placeholder="+54 9 ..." />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="register-company">Empresa</label>
              <select id="register-company" className="input" value={companyId} onChange={e => setCompanyId(e.target.value)} required>
                <option value="">Seleccioná tu empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
                <option value="not-found">No encuentro mi empresa</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="register-password">Contraseña</label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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

              <div>
                <label className="label" htmlFor="register-confirm-password">Confirmar contraseña</label>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="rounded-xl border border-steel-700 bg-steel-950/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestedAdmin}
                  onChange={e => handleAdminRequestChange(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-amber-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-steel-100">Solicitar acceso como administrador</span>
                  <span className="block mt-1 text-xs leading-relaxed text-steel-400">
                    El acceso administrativo requiere validación previa porque permite consultar y gestionar información sensible de la empresa.
                  </span>
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3">Crear cuenta</button>
          </form>

          <p className="mt-6 text-center text-sm text-steel-400">
            ¿Ya tenés una cuenta?{' '}
            <button type="button" onClick={onBackToLogin} className="font-semibold text-amber-400 hover:text-amber-300">
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>

      {showAdminWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-steel-700 bg-steel-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-amber-500/15 p-2 text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-steel-50">Solicitud de acceso como administrador</h2>
                  <p className="mt-3 text-sm leading-relaxed text-steel-300">
                    El rol de administrador permite acceder y gestionar información sensible de la empresa, incluyendo usuarios, capacitaciones, avances y certificados.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-steel-300">
                    Por razones de seguridad, tu solicitud deberá ser validada por BondiApps y por la empresa seleccionada. Hasta que se complete la aprobación, tu cuenta no contará con permisos administrativos.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAdminWarning(false)} className="text-steel-500 hover:text-steel-200" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={() => setShowAdminWarning(false)} className="btn-secondary justify-center">
                Cancelar
              </button>
              <button type="button" onClick={confirmAdminRequest} className="btn-primary justify-center">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
