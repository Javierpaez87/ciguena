import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onBackToLogin}
          className="mb-6 inline-flex items-center gap-2 text-sm text-steel-400 hover:text-steel-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al inicio de sesión
        </button>

        <div className="rounded-2xl border border-steel-700 bg-steel-900 p-6 sm:p-8 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Mail size={22} />
          </div>

          {!submitted ? (
            <>
              <h1 className="text-2xl font-bold text-steel-50">Recuperar contraseña</h1>
              <p className="mt-2 text-sm leading-relaxed text-steel-400">
                Ingresá el correo electrónico asociado a tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-3">
                  Enviar enlace de recuperación
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-steel-50">Revisá tu correo</h1>
              <p className="mt-2 text-sm leading-relaxed text-steel-400">
                Si existe una cuenta asociada a <span className="font-medium text-steel-200">{email}</span>, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-steel-500">
                El correo puede tardar unos minutos. Revisá también la carpeta de correo no deseado.
              </p>
              <button type="button" onClick={onBackToLogin} className="btn-primary mt-6 w-full justify-center py-3">
                Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
