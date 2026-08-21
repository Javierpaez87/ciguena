import OnboardingComplianceEditor from '../../components/compliance/OnboardingComplianceEditor';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminCompliance() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  if (!tenantId) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 text-red-200">
        No pudimos identificar el tenant de tu cuenta.
      </div>
    );
  }

  return <OnboardingComplianceEditor tenantId={tenantId} source="admin" />;
}
