// src/pages/ResetPasswordPage.tsx

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  onPasswordUpdated: () => void;
}

export default function ResetPasswordPage({
  onPasswordUpdated,
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(Boolean(session));
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validatePassword = () => {
    if (!password || !confirmPassword) {
      return 'Ingresá y confirmá tu nueva contraseña.';
    }

    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUpdating(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsUpdating(false);

    if (updateError) {
      setError('No pudimos actualizar la contraseña. Volvé a solicitar el enlace de recuperación.');
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      onPasswordUpdated();
    }, 1800);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-steel-300">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Validando enlace de recuperación...</span>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-steel-700 bg-steel-900 p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertCircle size={22} />
            </div>

            <h1 className="text-2xl font-bold text-steel-50">
              Enlace inválido o vencido
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-steel-400">
              No pudimos validar tu sesión de recuperación. Volvé a solicitar un nuevo enlace para cambiar tu contraseña.
            </p>

            <button
              type="button"
              onClick={onPasswordUpdated}
              className="btn-primary mt-6 w-full justify-center py-3"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-steel-700 bg-steel-900 p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle size={22} />
            </div>

            <h1 className="text-2xl font-bold text-steel-50">
              Contraseña actualizada
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-steel-400">
              Ya podés ingresar a Cigüeña con tu nueva contraseña.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm text-steel-500">
              <Loader2 size={14} className="animate-spin" />
              Redirigiendo...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-steel-700 bg-steel-900 p-6 sm:p-8 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Lock size={22} />
          </div>

          <h1 className="text-2xl font-bold text-steel-50">
            Crear nueva contraseña
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-steel-400">
            Ingresá una nueva contraseña para recuperar el acceso a tu cuenta.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle
                size={16}
                className="mt-0.5 flex-shrink-0 text-red-400"
              />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="new-password">
                Nueva contraseña
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                  disabled={isUpdating}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirm-password">
                Confirmar contraseña
              </label>

              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repetí la nueva contraseña"
                required
                autoComplete="new-password"
                disabled={isUpdating}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary w-full justify-center py-3"
            >
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Actualizando...
                </span>
              ) : (
                'Actualizar contraseña'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
