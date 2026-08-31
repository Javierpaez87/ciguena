import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import OnboardingComplianceEditor from '../../components/compliance/OnboardingComplianceEditor';
import { supabase } from '../../lib/supabase';

type Tenant = { id: string; name: string; status?: string | null };

export default function SaCompliance() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('tenants')
        .select('id, name, status')
        .order('name');

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Tenant[];
      setTenants(rows);
      setSelectedTenantId((current) => current || rows[0]?.id || '');
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="card text-steel-300">Cargando empresas...</div>;
  if (error) return <div className="card border-red-500/30 bg-red-500/10 text-red-200">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-steel-100">Onboarding & Compliance</h2>
            <p className="text-sm text-steel-400 mt-1">Definí el comportamiento default de cada cliente. Si el Admin del tenant configura un override, ese override tiene prioridad.</p>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <label className="label">Cliente / Tenant</label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500 pointer-events-none" />
            <select className="input pl-10" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedTenantId && (
        <OnboardingComplianceEditor key={selectedTenantId} tenantId={selectedTenantId} source="superadmin" />
      )}
    </div>
  );
}
