import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser, UserRole } from '../types';
import { mockProfiles } from '../lib/mockData';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_CREDENTIALS: Record<string, { password: string; profileId: string }> = {
  'admin@bondiapps.com': { password: 'bondi2024', profileId: 'super1' },
  'admin@ypf.com': { password: 'ypf2024', profileId: 'admin1' },
  'juan.perez@ypf.com': { password: 'worker2024', profileId: 'u1' },
  'maria.gomez@ypf.com': { password: 'worker2024', profileId: 'u2' },
  'carlos.molina@ypf.com': { password: 'worker2024', profileId: 'u3' },
  'lucia.fernandez@ypf.com': { password: 'worker2024', profileId: 'u4' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const cred = DEMO_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      setIsLoading(false);
      return { error: 'Email o contraseña incorrectos.' };
    }

    const profile = mockProfiles.find(p => p.id === cred.profileId);
    if (!profile) {
      setIsLoading(false);
      return { error: 'Perfil no encontrado.' };
    }

    setUser({
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      tenant_id: profile.tenant_id,
      full_name: profile.full_name,
      profile,
    });

    setIsLoading(false);
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
