import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { AuthUser, Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  companyId: string;
  password: string;
  requestedAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (payload: RegisterPayload) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type SupabaseProfile = Profile & {
  auth_user_id?: string;
  phone?: string | null;
  requested_admin?: boolean;
};

function buildAuthUser(email: string, profile: SupabaseProfile): AuthUser {
  return {
    id: profile.id,
    email,
    role: profile.role as UserRole,
    tenant_id: profile.tenant_id,
    full_name: profile.full_name,
    profile: {
      ...profile,
      email,
    },
  };
}

async function getProfileForAuthUser(authUserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    return { profile: null, error };
  }

  return { profile: data as SupabaseProfile, error: null };
}

function normalizeRegisterError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes('already') || lower.includes('registered') || lower.includes('ya existe')) {
    return 'Ya existe una cuenta registrada con ese email.';
  }

  if (lower.includes('rate limit') || lower.includes('email rate')) {
    return 'No pudimos completar el registro en este momento. Intentá nuevamente en unos minutos o contactá a BondiApps.';
  }

  return message || 'No pudimos crear la cuenta. Intentá nuevamente o contactá a BondiApps.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const authUser = data.session.user;
    const email = authUser.email ?? '';

    const { profile } = await getProfileForAuthUser(authUser.id);

    if (!profile || profile.status !== 'active') {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setUser(buildAuthUser(email, profile));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;

      if (!authUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      getProfileForAuthUser(authUser.id).then(({ profile }) => {
        if (!profile || profile.status !== 'active') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser(buildAuthUser(authUser.email ?? '', profile));
        setIsLoading(false);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      setIsLoading(false);
      return { error: 'Email o contraseña incorrectos.' };
    }

    const { profile, error: profileError } = await getProfileForAuthUser(data.user.id);

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setUser(null);
      setIsLoading(false);
      return { error: 'Tu usuario no tiene un perfil asociado. Contactá a BondiApps.' };
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      setUser(null);
      setIsLoading(false);

      if (profile.status === 'pending') {
        return { error: 'Tu cuenta está pendiente de validación.' };
      }

      return { error: 'Tu cuenta no se encuentra activa.' };
    }

    setUser(buildAuthUser(normalizedEmail, profile));
    setIsLoading(false);
    return { error: null };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      setIsLoading(false);

      if (!response.ok) {
        return {
          error: normalizeRegisterError(result.error),
        };
      }

      return { error: null };
    } catch {
      setIsLoading(false);
      return {
        error: 'No pudimos conectar con el servidor de registro. Intentá nuevamente en unos minutos.',
      };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);

    const redirectTo = `${window.location.origin}`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    setIsLoading(false);

    if (error) {
      return { error: 'No pudimos enviar el correo de recuperación.' };
    }

    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, resetPassword, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
