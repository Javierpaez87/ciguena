import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const { resetPassword, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError);
      return;
    }

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

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

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
                    disabled={isLoading}
                  />
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                <span>Solicitud enviada correctamente.</span>
              </div>

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
