import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Status = { enabled: boolean; allowed: boolean; can_manage: boolean };
type Snapshot = { identity: string; status: Status | null; error: boolean };
const Context = createContext<{ status: Status | null; error: boolean; refresh: () => Promise<void>; setEnabled: (enabled: boolean) => Promise<void> } | null>(null);

export function MaintenanceProvider({children}: {children: ReactNode}) {
  const { sessionUser, isLoading } = useAuth();
  const identity = sessionUser?.id ?? 'anonymous';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const {data, error} = await supabase.rpc('get_platform_maintenance');
      if (request !== generation.current) return;
      if (error || typeof data?.enabled !== 'boolean' || typeof data?.allowed !== 'boolean' || typeof data?.can_manage !== 'boolean') throw new Error('Invalid maintenance status');
      setSnapshot({identity, status: data as Status, error: false});
    } catch {
      if (request === generation.current) setSnapshot({identity, status: null, error: true});
    }
  }, [identity]);
  useEffect(() => {
    if (isLoading) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    const onFocus = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => { generation.current++; window.clearInterval(timer); document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus); };
  }, [refresh, isLoading]);
  const setEnabled = useCallback(async (enabled: boolean) => {
    const {error} = await supabase.rpc('set_platform_maintenance', {p_enabled: enabled});
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);
  const current = snapshot?.identity === identity ? snapshot : null;
  return <Context.Provider value={{status: current?.status ?? null, error: current?.error ?? false, refresh, setEnabled}}>{children}</Context.Provider>;
}
export function useMaintenance() {
  const value = useContext(Context);
  if (!value) throw new Error('MaintenanceProvider missing');
  return value;
}
