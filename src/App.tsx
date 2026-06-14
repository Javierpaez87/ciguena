import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AppLayout from './components/layout/AppLayout';

// Super Admin
import SaDashboard from './pages/superadmin/SaDashboard';
import SaTenants from './pages/superadmin/SaTenants';
import SaTrainings from './pages/superadmin/SaTrainings';
import SaBuilder from './pages/superadmin/SaBuilder';
import SaTests from './pages/superadmin/SaTests';
import SaFeedback from './pages/superadmin/SaFeedback';
import SaGhost from './pages/superadmin/SaGhost';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTrainings from './pages/admin/AdminTrainings';
import AdminTrainingCatalog from './pages/admin/AdminTrainingCatalog';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminReports from './pages/admin/AdminReports';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminSignatures from './pages/admin/AdminSignatures';
import AdminSignatureConsent from './pages/admin/AdminSignatureConsent';

// Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTrainings from './pages/worker/WorkerTrainings';
import WorkerPlayer from './pages/worker/WorkerPlayer';
import WorkerTest from './pages/worker/WorkerTest';
import WorkerCertificates from './pages/worker/WorkerCertificates';
import WorkerFeedback from './pages/worker/WorkerFeedback';
import EthicsSignaturePage from './pages/worker/EthicsSignaturePage';
import { getEthicsRequirement } from './lib/ethics';
import { getAdminSignatureRequirement } from './lib/adminSignatures';
import type { EthicsAcceptance, EthicsCode } from './types';
import GhostReadOnlyBoundary from './components/layout/GhostReadOnlyBoundary';

const VIEW_META: Record<string, { title: string; subtitle: string }> = {
  'sa-dashboard': {
    title: 'Dashboard Global',
    subtitle: 'Visión general de todos los tenants y métricas de uso',
  },
  'sa-tenants': {
    title: 'Empresas / Tenants',
    subtitle: 'Gestión de empresas cliente y habilitación de trainings',
  },
  'sa-trainings': {
    title: 'Catálogo de Trainings',
    subtitle: 'Administración del catálogo centralizado de BondiApps',
  },
  'sa-builder': {
    title: 'Builder de Training',
    subtitle: 'Constructor de módulos y lecciones',
  },
  'sa-tests': {
    title: 'Tests & Evaluaciones',
    subtitle: 'Configuración de preguntas, opciones y puntajes',
  },
  'sa-feedback': {
    title: 'Feedback Global',
    subtitle: 'Opiniones de usuarios de todos los tenants',
  },
  'sa-ghost': {
    title: 'Ghost View',
    subtitle: 'Observá la plataforma como cualquier admin o trabajador, sin realizar cambios',
  },

  'admin-dashboard': {
    title: 'Dashboard',
    subtitle: 'Resumen de actividad y cumplimiento de tu empresa',
  },
  'admin-users': {
    title: 'Usuarios / Trabajadores',
    subtitle: 'Gestión del personal de tu empresa',
  },
  'admin-trainings': {
    title: 'Trainings Habilitados',
    subtitle: 'Catálogo disponible para tu empresa',
  },
  'admin-training-catalog': {
    title: 'Catálogo de Trainings',
    subtitle: 'Trainings disponibles, contenidos propios y desarrollos a medida',
  },
  'admin-assignments': {
    title: 'Asignaciones',
    subtitle: 'Estado y seguimiento de trainings asignados',
  },
  'admin-certificates': {
    title: 'Certificados',
    subtitle: 'Certificados emitidos, vigentes y vencidos',
  },
  'admin-reports': {
    title: 'Reportes',
    subtitle: 'Exportaciones y análisis por usuario, training o área',
  },
  'admin-feedback': {
    title: 'Feedback',
    subtitle: 'Opiniones de los trabajadores de tu empresa',
  },
  'admin-signatures': {
    title: 'Signatures',
    subtitle: 'Firmas autorizadas para certificados de tu empresa',
  },

  'worker-dashboard': {
    title: 'Mi Dashboard',
    subtitle: 'Tu actividad, progreso y certificados',
  },
  'worker-trainings': {
    title: 'Mis Trainings',
    subtitle: 'Todos tus trainings asignados',
  },
  'worker-player': {
    title: 'Player de Training',
    subtitle: 'Visualizá el contenido y marcá lecciones como completadas',
  },
  'worker-test': {
    title: 'Evaluación',
    subtitle: 'Respondé las preguntas para obtener tu certificado',
  },
  'worker-certificates': {
    title: 'Mis Certificados',
    subtitle: 'Tus certificados emitidos y su vigencia',
  },
  'worker-feedback': {
    title: 'Dar Feedback',
    subtitle: 'Compartí tu experiencia con los trainings o la plataforma',
  },
};

const DEFAULT_VIEW: Record<string, string> = {
  super_admin: 'sa-dashboard',
  admin: 'admin-dashboard',
  worker: 'worker-dashboard',
};

type AuthScreen = 'login' | 'register' | 'forgot-password';

function AppContent() {
  const { user, isGhostMode } = useAuth();

  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [activeView, setActiveView] = useState(
    () => DEFAULT_VIEW[user?.role ?? 'worker'] ?? 'worker-dashboard'
  );
  const [viewData, setViewData] = useState<unknown>(null);

  const [isCheckingEthics, setIsCheckingEthics] = useState(false);
  const [isCheckingAdminSignature, setIsCheckingAdminSignature] = useState(false);

  const [ethicsGate, setEthicsGate] = useState<{
    mustSign: boolean;
    tenant: { id: string; name: string; logo_url: string | null } | null;
    ethicsCode: EthicsCode | null;
    acceptance: EthicsAcceptance | null;
    error: string | null;
  }>({
    mustSign: false,
    tenant: null,
    ethicsCode: null,
    acceptance: null,
    error: null,
  });

  const [adminSignatureGate, setAdminSignatureGate] = useState<{
    mustSign: boolean;
    tenant: { id: string; name: string; logo_url: string | null } | null;
    error: string | null;
  }>({
    mustSign: false,
    tenant: null,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setEthicsGate({
        mustSign: false,
        tenant: null,
        ethicsCode: null,
        acceptance: null,
        error: null,
      });

      setAdminSignatureGate({
        mustSign: false,
        tenant: null,
        error: null,
      });

      return;
    }

    const defaultView = DEFAULT_VIEW[user.role] ?? 'worker-dashboard';
    setActiveView(defaultView);
    setViewData(null);
  }, [user?.id, user?.role]);

  useEffect(() => {
    let ignore = false;

    async function checkAdminSignatureGate() {
      if (!user || user.role !== 'admin' || isGhostMode) {
        setAdminSignatureGate({
          mustSign: false,
          tenant: null,
          error: null,
        });
        return;
      }

      setIsCheckingAdminSignature(true);

      const result = await getAdminSignatureRequirement(user);

      if (!ignore) {
        setAdminSignatureGate({
          mustSign: result.mustSign,
          tenant: result.tenant,
          error: result.error,
        });

        setIsCheckingAdminSignature(false);
      }
    }

    checkAdminSignatureGate();

    return () => {
      ignore = true;
    };
  }, [user?.id, user?.role, user?.tenant_id, isGhostMode]);

  useEffect(() => {
    let ignore = false;

    async function checkEthicsGate() {
      if (!user || user.role !== 'worker' || isGhostMode) {
        setEthicsGate({
          mustSign: false,
          tenant: null,
          ethicsCode: null,
          acceptance: null,
          error: null,
        });
        return;
      }

      setIsCheckingEthics(true);

      const result = await getEthicsRequirement(user);

      if (!ignore) {
        setEthicsGate(result);
        setIsCheckingEthics(false);
      }
    }

    checkEthicsGate();

    return () => {
      ignore = true;
    };
  }, [user?.id, user?.role, user?.tenant_id, isGhostMode]);

  const navigate = (view: string, data?: unknown) => {
    setActiveView(view);

    if (data !== undefined) {
      setViewData(data);
    } else {
      setViewData(null);
    }
  };

  if (!user) {
    if (authScreen === 'register') {
      return <RegisterPage onBackToLogin={() => setAuthScreen('login')} />;
    }

    if (authScreen === 'forgot-password') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthScreen('login')} />;
    }

    return (
      <LoginPage
        onRegister={() => setAuthScreen('register')}
        onForgotPassword={() => setAuthScreen('forgot-password')}
      />
    );
  }

  if (user?.role === 'admin' && isCheckingAdminSignature) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center text-steel-300">
        Verificando conformidad de firma...
      </div>
    );
  }

  if (
    user?.role === 'admin' &&
    adminSignatureGate.mustSign &&
    adminSignatureGate.tenant
  ) {
    return (
      <AdminSignatureConsent
        user={user}
        tenant={adminSignatureGate.tenant}
        onSigned={() =>
          setAdminSignatureGate(current => ({
            ...current,
            mustSign: false,
          }))
        }
      />
    );
  }

  if (user?.role === 'worker' && isCheckingEthics) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center text-steel-300">
        Verificando usuario...
      </div>
    );
  }

  if (
    user?.role === 'worker' &&
    ethicsGate.mustSign &&
    ethicsGate.tenant &&
    ethicsGate.ethicsCode
  ) {
    return (
      <EthicsSignaturePage
        user={user}
        tenant={ethicsGate.tenant}
        ethicsCode={ethicsGate.ethicsCode}
        onSigned={() =>
          setEthicsGate(current => ({
            ...current,
            mustSign: false,
          }))
        }
      />
    );
  }

  const meta = VIEW_META[activeView] ?? {
    title: 'CIGÜEÑA',
    subtitle: '',
  };

  const renderView = () => {
    switch (activeView) {
      // Super Admin
      case 'sa-dashboard':
        return <SaDashboard />;
      case 'sa-tenants':
        return <SaTenants />;
      case 'sa-trainings':
        return <SaTrainings />;
      case 'sa-builder':
        return <SaBuilder />;
      case 'sa-tests':
        return <SaTests />;
      case 'sa-feedback':
        return <SaFeedback />;
      case 'sa-ghost':
        return <SaGhost />;

      // Admin
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-trainings':
        return <AdminTrainings />;
      case 'admin-training-catalog':
        return <AdminTrainingCatalog />;
      case 'admin-assignments':
        return <AdminAssignments />;
      case 'admin-certificates':
        return <AdminCertificates />;
      case 'admin-reports':
        return <AdminReports />;
      case 'admin-feedback':
        return <AdminFeedback />;
      case 'admin-signatures':
        return <AdminSignatures />;

      // Worker
      case 'worker-dashboard':
        return <WorkerDashboard onNavigate={navigate} />;
      case 'worker-trainings':
        return <WorkerTrainings onNavigate={navigate} />;
      case 'worker-player':
        return (
          <WorkerPlayer
            assignment={(viewData as any)?.assignment}
            onNavigate={navigate}
          />
        );
      case 'worker-test':
        return (
          <WorkerTest
            assignment={(viewData as any)?.assignment}
            onNavigate={navigate}
          />
        );
      case 'worker-certificates':
        return <WorkerCertificates />;
      case 'worker-feedback':
        return <WorkerFeedback />;

      default:
        return (
          <div className="text-steel-400 text-sm">
            Vista no encontrada: {activeView}
          </div>
        );
    }
  };

  return (
    <AppLayout
      activeView={activeView}
      onNavigate={navigate}
      title={meta.title}
      subtitle={meta.subtitle}
    >
      <GhostReadOnlyBoundary>{renderView()}</GhostReadOnlyBoundary>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
