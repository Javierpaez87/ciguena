import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrandingProvider, useBranding } from './contexts/BrandingContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AppLayout from './components/layout/AppLayout';

// Super Admin
import SaDashboard from './pages/superadmin/SaDashboard';
import SaTenants from './pages/superadmin/SaTenants';
import SaWhiteLabel from './pages/superadmin/SaWhiteLabel';
import SaCompliance from './pages/superadmin/SaCompliance';
import SaTrainings from './pages/superadmin/SaTrainings';
import SaBuilder from './pages/superadmin/SaBuilder';
import SaTests from './pages/superadmin/SaTests';
import SaFeedback from './pages/superadmin/SaFeedback';
import SaGhost from './pages/superadmin/SaGhost';
import SaEmailQa from './pages/superadmin/SaEmailQa';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTrainings from './pages/admin/AdminTrainings';
import AdminTrainingCatalog from './pages/admin/AdminTrainingCatalog';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminLiveTrainings from './pages/admin/AdminLiveTrainings';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminReports from './pages/admin/AdminReports';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminSignatures from './pages/admin/AdminSignatures';
import AdminSignatureConsent from './pages/admin/AdminSignatureConsent';
import AdminCompliance from './pages/admin/AdminCompliance';

// Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTrainings from './pages/worker/WorkerTrainings';
import WorkerLiveTrainings from './pages/worker/WorkerLiveTrainings';
import WorkerLiveTrainingRoom from './pages/worker/WorkerLiveTrainingRoom';
import WorkerPlayer from './pages/worker/WorkerPlayer';
import WorkerTest from './pages/worker/WorkerTest';
import WorkerCertificates from './pages/worker/WorkerCertificates';
import WorkerFeedback from './pages/worker/WorkerFeedback';
import WorkerOnboardingPage from './pages/worker/WorkerOnboardingPage';
import { getWorkerOnboardingRequirement, type WorkerOnboardingRequirement } from './lib/workerOnboarding';
import { getAdminSignatureRequirement } from './lib/adminSignatures';
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
  'sa-white-label': {
    title: 'White Label',
    subtitle: 'Identidad visual y configuración de marca por cliente',
  },
  'sa-compliance': {
    title: 'Onboarding & Compliance',
    subtitle: 'Modalidad de onboarding, firma y Código de Ética por cliente',
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
  'sa-email-qa': {
    title: 'QA Email Audit',
    subtitle: 'Dispará los templates de email a un único destinatario controlado',
  },

  'admin-dashboard': {
    title: 'Dashboard',
    subtitle: 'Resumen de actividad y cumplimiento de tu empresa',
  },
  'admin-users': {
    title: 'Usuarios / Trabajadores',
    subtitle: 'Gestión del personal de tu empresa',
  },
  'admin-compliance': {
    title: 'Onboarding & Compliance',
    subtitle: 'Configuración de validación de datos, firma y Código de Ética',
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
  'admin-live-trainings': {
    title: 'Capacitaciones en Vivo',
    subtitle: 'Creación, calendarización, asistencia y certificación de capacitaciones sincrónicas',
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
  'worker-live-trainings': {
    title: 'Mis capacitaciones en vivo',
    subtitle: 'Capacitaciones sincrónicas asignadas y registro de asistencia',
  },
  'worker-live-room': {
    title: 'Sala de capacitación',
    subtitle: 'Ingreso interno a la plataforma para registrar asistencia',
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


function getDeepLinkedView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const liveTrainingId = params.get('liveTrainingId') || params.get('id');

  if (view === 'worker-live-room' && liveTrainingId) {
    return {
      view: 'worker-live-room',
      data: { liveTrainingId },
    };
  }

  return null;
}

type AuthScreen = 'login' | 'register' | 'forgot-password';

function getInitialAuthScreen(): AuthScreen {
  const params = new URLSearchParams(window.location.search);
  return params.get('auth') === 'register' ? 'register' : 'login';
}

function clearRegistrationQueryParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('email');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function AppContent() {
  const { user, isGhostMode, logout } = useAuth();
  const {
    branding,
    isLoading: isBrandingLoading,
    domainTenantId,
    domainTenantName,
    domainHostname,
    isDomainBound,
  } = useBranding();

  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen);
  const [activeView, setActiveView] = useState(
    () => DEFAULT_VIEW[user?.role ?? 'worker'] ?? 'worker-dashboard'
  );
  const [viewData, setViewData] = useState<unknown>(null);

  const [isCheckingWorkerOnboarding, setIsCheckingWorkerOnboarding] = useState(false);
  const [workerOnboardingRefresh, setWorkerOnboardingRefresh] = useState(0);
  const [isCheckingAdminSignature, setIsCheckingAdminSignature] = useState(false);

  const [workerOnboardingGate, setWorkerOnboardingGate] = useState<WorkerOnboardingRequirement | null>(null);

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
      setWorkerOnboardingGate(null);

      setAdminSignatureGate({
        mustSign: false,
        tenant: null,
        error: null,
      });

      return;
    }

    const deepLinkedView = getDeepLinkedView();

    if (deepLinkedView) {
      setActiveView(deepLinkedView.view);
      setViewData(deepLinkedView.data);
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

    async function checkWorkerOnboardingGate() {
      if (!user || user.role !== 'worker' || isGhostMode) {
        setWorkerOnboardingGate(null);
        setIsCheckingWorkerOnboarding(false);
        return;
      }

      setIsCheckingWorkerOnboarding(true);

      const result = await getWorkerOnboardingRequirement(user);

      if (!ignore) {
        setWorkerOnboardingGate(result);
        setIsCheckingWorkerOnboarding(false);
      }
    }

    checkWorkerOnboardingGate();

    return () => {
      ignore = true;
    };
  }, [user?.id, user?.role, user?.tenant_id, isGhostMode, workerOnboardingRefresh]);

  const navigate = (view: string, data?: unknown) => {
    setActiveView(view);

    if (data !== undefined) {
      setViewData(data);
    } else {
      setViewData(null);
    }
  };

  // Do not render the default Cigüeña login while a custom hostname is still
  // being resolved. This prevents a brand flash before SPI (or another tenant) loads.
  if (isBrandingLoading) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-steel-300">
          <div className="h-5 w-5 rounded-full border-2 border-steel-600 border-t-current animate-spin" />
          <span className="text-sm">Preparando acceso...</span>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/reset-password') {
    return (
      <ResetPasswordPage
        onPasswordUpdated={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  if (!user) {
    if (authScreen === 'register') {
      return (
        <RegisterPage
          onBackToLogin={() => {
            clearRegistrationQueryParams();
            setAuthScreen('login');
          }}
        />
      );
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

  // A branded hostname belongs to one tenant. Prevent a worker/admin from
  // opening another tenant through that hostname even if their credentials are valid.
  if (
    user &&
    isDomainBound &&
    domainTenantId &&
    user.role !== 'super_admin' &&
    user.tenant_id !== domainTenantId
  ) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="card-dark max-w-lg w-full text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border brand-border brand-bg-soft flex items-center justify-center">
            <img
              src={branding.logoCompactUrl || branding.logoUrl}
              alt={branding.brandName}
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-steel-50">Acceso de otra organización</h1>
          <p className="mt-2 text-sm leading-relaxed text-steel-400">
            Este acceso corresponde a <span className="font-semibold text-steel-200">{domainTenantName || branding.brandName}</span>.
            Tu cuenta pertenece a otra organización.
          </p>
          <p className="mt-2 text-xs text-steel-500">{domainHostname}</p>
          <button
            type="button"
            className="btn-primary mt-6 mx-auto justify-center"
            onClick={() => void logout()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
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

  if (user?.role === 'worker' && isCheckingWorkerOnboarding) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center text-steel-300">
        Verificando onboarding...
      </div>
    );
  }

  if (
    user?.role === 'worker' &&
    workerOnboardingGate?.error
  ) {
    return (
      <div className="min-h-screen bg-steel-950 flex items-center justify-center p-6">
        <div className="card max-w-lg w-full text-center">
          <div className="text-lg font-semibold text-steel-100 mb-2">No pudimos verificar tu onboarding</div>
          <div className="text-sm text-steel-400 mb-5">{workerOnboardingGate.error}</div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setWorkerOnboardingRefresh((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (
    user?.role === 'worker' &&
    workerOnboardingGate?.mustComplete &&
    workerOnboardingGate.tenant
  ) {
    return (
      <WorkerOnboardingPage
        user={user}
        requirement={workerOnboardingGate}
        onCompleted={() => window.location.reload()}
      />
    );
  }

  const baseMeta = VIEW_META[activeView] ?? {
    title: branding.brandName,
    subtitle: '',
  };

  const meta = activeView === 'worker-live-room'
    ? {
        ...baseMeta,
        subtitle: `Ingreso interno desde ${branding.brandName} para registrar asistencia`,
      }
    : baseMeta;

  const renderView = () => {
    switch (activeView) {
      // Super Admin
      case 'sa-dashboard':
        return <SaDashboard />;
      case 'sa-tenants':
        return <SaTenants />;
      case 'sa-white-label':
        return <SaWhiteLabel />;
      case 'sa-compliance':
        return <SaCompliance />;
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
      case 'sa-email-qa':
        return <SaEmailQa />;

      // Admin
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-compliance':
        return <AdminCompliance />;
      case 'admin-trainings':
        return <AdminTrainings />;
      case 'admin-training-catalog':
        return <AdminTrainingCatalog />;
      case 'admin-assignments':
        return <AdminAssignments />;
      case 'admin-live-trainings':
        return <AdminLiveTrainings onNavigate={navigate} />;
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
      case 'worker-live-trainings':
        return <WorkerLiveTrainings onNavigate={navigate} />;
      case 'worker-live-room':
        return (
          <WorkerLiveTrainingRoom
            liveTrainingId={(viewData as any)?.liveTrainingId}
            onNavigate={navigate}
          />
        );
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
      <BrandingProvider>
        <AppContent />
      </BrandingProvider>
    </AuthProvider>
  );
}
