import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthUser, Profile, Tenant, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  companyId: string;
  password: string;
  requestedAdmin: boolean;
}

export interface GhostSession {
  tenant: Pick<Tenant, 'id' | 'name' | 'logo_url'>;
  profile: Profile;
}

interface AuthContextValue {
  /** Usuario efectivo. En Ghost View representa al admin/worker observado. */
  user: AuthUser | null;
  /** Usuario autenticado real. Nunca cambia durante Ghost View. */
  sessionUser: AuthUser | null;
  ghostSession: GhostSession | null;
  isGhostMode: boolean;
  isReadOnly: boolean;
  startGhostSession: (tenant: GhostSession['tenant'], profile: Profile) => void;
  stopGhostSession: () => void;
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
    profile: { ...profile, email },
  };
}

async function getProfileForAuthUser(authUserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) return { profile: null, error };
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

function isSuperAdmin(role?: string | null) {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'super_admin' || normalized === 'superadmin';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [ghostSession, setGhostSession] = useState<GhostSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.user) {
      setSessionUser(null);
      setGhostSession(null);
      setIsLoading(false);
      return;
    }

    const authUser = data.session.user;
    const { profile } = await getProfileForAuthUser(authUser.id);

    if (!profile || profile.status !== 'active') {
      setSessionUser(null);
      setGhostSession(null);
      setIsLoading(false);
      return;
    }

    setSessionUser(buildAuthUser(authUser.email ?? '', profile));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      if (!authUser) {
        setSessionUser(null);
        setGhostSession(null);
        setIsLoading(false);
        return;
      }

      getProfileForAuthUser(authUser.id).then(({ profile }) => {
        if (!profile || profile.status !== 'active') {
          setSessionUser(null);
          setGhostSession(null);
          setIsLoading(false);
          return;
        }
        setSessionUser(buildAuthUser(authUser.email ?? '', profile));
        setIsLoading(false);
      });
    });
    return () => subscription.unsubscribe();
  }, [loadSession]);

  const startGhostSession = useCallback((tenant: GhostSession['tenant'], profile: Profile) => {
    if (!isSuperAdmin(sessionUser?.role)) return;
    if (profile.tenant_id !== tenant.id) return;
    if (profile.role !== 'admin' && profile.role !== 'worker') return;
    setGhostSession({ tenant, profile });
  }, [sessionUser?.role]);

  const stopGhostSession = useCallback(() => setGhostSession(null), []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error || !data.user) {
      setIsLoading(false);
      return { error: 'Email o contraseña incorrectos.' };
    }

    const { profile, error: profileError } = await getProfileForAuthUser(data.user.id);
    if (profileError || !profile) {
      await supabase.auth.signOut();
      setSessionUser(null);
      setIsLoading(false);
      return { error: 'Tu usuario no tiene un perfil asociado. Contactá a BondiApps.' };
    }

    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      setSessionUser(null);
      setIsLoading(false);
      return { error: profile.status === 'pending' ? 'Tu cuenta está pendiente de validación.' : 'Tu cuenta no se encuentra activa.' };
    }

    setSessionUser(buildAuthUser(normalizedEmail, profile));
    setGhostSession(null);
    setIsLoading(false);
    return { error: null };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/register-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      setIsLoading(false);
      return response.ok ? { error: null } : { error: normalizeRegisterError(result.error) };
    } catch {
      setIsLoading(false);
      return { error: 'No pudimos conectar con el servidor de registro. Intentá nuevamente en unos minutos.' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
    setIsLoading(false);
    return { error: error ? 'No pudimos enviar el correo de recuperación.' : null };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setGhostSession(null);
    await supabase.auth.signOut();
    setSessionUser(null);
    setIsLoading(false);
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    if (!ghostSession) return sessionUser;
    return buildAuthUser(ghostSession.profile.email || '', ghostSession.profile);
  }, [ghostSession, sessionUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    sessionUser,
    ghostSession,
    isGhostMode: Boolean(ghostSession),
    isReadOnly: Boolean(ghostSession),
    startGhostSession,
    stopGhostSession,
    login,
    register,
    resetPassword,
    logout,
    isLoading,
  }), [user, sessionUser, ghostSession, startGhostSession, stopGhostSession, login, register, resetPassword, logout, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
