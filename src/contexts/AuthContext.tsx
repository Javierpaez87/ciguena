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
  'admin@bondiapps.com': { password: 'bondi2026', profileId: 'super1' },
  'admin@demooilenergyco.com': { password: 'demo2026', profileId: 'admin1' },
  'juan.perez@demooilenergyco.com': { password: 'worker2026', profileId: 'u1' },
  'maria.gomez@demooilenergyco.com': { password: 'worker2026', profileId: 'u2' },
  'carlos.molina@demooilenergyco.com': { password: 'worker2026', profileId: 'u3' },
  'lucia.fernandez@demooilenergyco.com': { password: 'worker2026', profileId: 'u4' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));

    const normalizedEmail = email.trim().toLowerCase();
    const cred = DEMO_CREDENTIALS[normalizedEmail];

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
      email: normalizedEmail,
      role: profile.role as UserRole,
      tenant_id: profile.tenant_id,
      full_name: profile.full_name,
      profile: {
        ...profile,
        email: normalizedEmail,
      },
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
