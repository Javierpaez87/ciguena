import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, Search, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile, Tenant } from '../../types';

export default function SaGhost() {
  const { startGhostSession } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      const [tenantResult, profileResult] = await Promise.all([
        supabase.from('tenants').select('*').order('name'),
        supabase.from('profiles').select('*').in('role', ['admin', 'worker']).order('full_name'),
      ]);

      if (ignore) return;
      if (tenantResult.error || profileResult.error) {
        setError(tenantResult.error?.message || profileResult.error?.message || 'No se pudo cargar Ghost View.');
      } else {
        setTenants((tenantResult.data ?? []) as Tenant[]);
        setProfiles((profileResult.data ?? []) as Profile[]);
      }
      setLoading(false);
    }
    load();
    return () => { ignore = true; };
  }, []);

  const visibleProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (tenantId && profile.tenant_id !== tenantId) return false;
      if (!normalized) return true;
      return [profile.full_name, profile.email, profile.position, profile.area, profile.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [profiles, query, tenantId]);

  if (loading) return <div className="card p-6 text-steel-300">Cargando empresas y usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="card p-6 border-violet-400/20">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
            <Eye className="text-violet-300" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-steel-50">Ghost View</h2>
            <p className="text-sm text-steel-400 mt-1 max-w-3xl">
              Ingresá visualmente como un administrador o trabajador de cualquier empresa. La sesión real continúa siendo la del Super Admin y todas las acciones de escritura quedan bloqueadas.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="card p-4 border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="card p-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-steel-400">Empresa / tenant</span>
          <select className="input w-full" value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">Todas las empresas</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-steel-400">Buscar usuario</span>
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
            <input className="input w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, email, área o rol" />
          </div>
        </label>
      </div>

      <div className="grid gap-3">
        {visibleProfiles.map((profile) => {
          const tenant = tenants.find((item) => item.id === profile.tenant_id);
          if (!tenant) return null;
          return (
            <div key={profile.id} className="card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-steel-800 border border-steel-700 flex items-center justify-center">
                  {profile.role === 'admin' ? <Shield size={18} className="text-cyan-300" /> : <UserRound size={18} className="text-emerald-300" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-steel-100 truncate">{profile.full_name || profile.email}</div>
                  <div className="text-xs text-steel-400 truncate">{profile.email}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-steel-500">
                    <span className="inline-flex items-center gap-1"><Building2 size={11} />{tenant.name}</span>
                    <span>•</span>
                    <span>{profile.role === 'admin' ? 'Admin empresa' : 'Trabajador'}</span>
                    {profile.area && <><span>•</span><span>{profile.area}</span></>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => startGhostSession({ id: tenant.id, name: tenant.name, logo_url: tenant.logo_url }, profile)}
                className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Eye size={16} /> Ver como este usuario
              </button>
            </div>
          );
        })}

        {visibleProfiles.length === 0 && (
          <div className="card p-8 text-center text-steel-400">No encontramos administradores o trabajadores con esos filtros.</div>
        )}
      </div>
    </div>
  );
}
