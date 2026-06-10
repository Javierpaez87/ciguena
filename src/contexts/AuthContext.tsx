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

function buildAuthUser(authUserId: string, email: string, profile: Profile): AuthUser {
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

  return { profile: data as Profile, error: null };
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

    setUser(buildAuthUser(authUser.id, email, profile));
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

        setUser(buildAuthUser(authUser.id, authUser.email ?? '', profile));
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

    setUser(buildAuthUser(data.user.id, normalizedEmail, profile));
    setIsLoading(false);
    return { error: null };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);

    const normalizedEmail = payload.email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          phone: payload.phone,
          requested_admin: payload.requestedAdmin,
        },
      },
    });

    if (error || !data.user) {
      setIsLoading(false);
      return { error: error?.message ?? 'No pudimos crear la cuenta.' };
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      auth_user_id: data.user.id,
      tenant_id: payload.companyId,
      full_name: payload.fullName,
      email: normalizedEmail,
      phone: payload.phone,
      role: 'worker',
      status: 'pending',
      requested_admin: payload.requestedAdmin,
    });

    if (profileError) {
      setIsLoading(false);
      return { error: profileError.message };
    }

    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);

    return { error: null };
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
