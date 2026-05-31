import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';

// Super Admin
import SaDashboard from './pages/superadmin/SaDashboard';
import SaTenants from './pages/superadmin/SaTenants';
import SaTrainings from './pages/superadmin/SaTrainings';
import SaBuilder from './pages/superadmin/SaBuilder';
import SaTests from './pages/superadmin/SaTests';
import SaFeedback from './pages/superadmin/SaFeedback';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTrainings from './pages/admin/AdminTrainings';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminReports from './pages/admin/AdminReports';
import AdminFeedback from './pages/admin/AdminFeedback';

// Worker
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTrainings from './pages/worker/WorkerTrainings';
import WorkerPlayer from './pages/worker/WorkerPlayer';
import WorkerTest from './pages/worker/WorkerTest';
import WorkerCertificates from './pages/worker/WorkerCertificates';
import WorkerFeedback from './pages/worker/WorkerFeedback';

const VIEW_META: Record<string, { title: string; subtitle: string }> = {
  'sa-dashboard': { title: 'Dashboard Global', subtitle: 'Visión general de todos los tenants y métricas de uso' },
  'sa-tenants': { title: 'Empresas / Tenants', subtitle: 'Gestión de empresas cliente y habilitación de trainings' },
  'sa-trainings': { title: 'Catálogo de Trainings', subtitle: 'Administración del catálogo centralizado de BondiApps' },
  'sa-builder': { title: 'Builder de Training', subtitle: 'Constructor de módulos y lecciones' },
  'sa-tests': { title: 'Tests & Evaluaciones', subtitle: 'Configuración de preguntas, opciones y puntajes' },
  'sa-feedback': { title: 'Feedback Global', subtitle: 'Opiniones de usuarios de todos los tenants' },
  'admin-dashboard': { title: 'Dashboard', subtitle: 'Resumen de actividad y cumplimiento de tu empresa' },
  'admin-users': { title: 'Usuarios / Trabajadores', subtitle: 'Gestión del personal de tu empresa' },
  'admin-trainings': { title: 'Trainings Habilitados', subtitle: 'Catálogo disponible para tu empresa' },
  'admin-assignments': { title: 'Asignaciones', subtitle: 'Estado y seguimiento de trainings asignados' },
  'admin-certificates': { title: 'Certificados', subtitle: 'Certificados emitidos, vigentes y vencidos' },
  'admin-reports': { title: 'Reportes', subtitle: 'Exportaciones y análisis por usuario, training o área' },
  'admin-feedback': { title: 'Feedback', subtitle: 'Opiniones de los trabajadores de tu empresa' },
  'worker-dashboard': { title: 'Mi Dashboard', subtitle: 'Tu actividad, progreso y certificados' },
  'worker-trainings': { title: 'Mis Trainings', subtitle: 'Todos tus trainings asignados' },
  'worker-player': { title: 'Player de Training', subtitle: 'Visualizá el contenido y marcá lecciones como completadas' },
  'worker-test': { title: 'Evaluación', subtitle: 'Respondé las preguntas para obtener tu certificado' },
  'worker-certificates': { title: 'Mis Certificados', subtitle: 'Tus certificados emitidos y su vigencia' },
  'worker-feedback': { title: 'Dar Feedback', subtitle: 'Compartí tu experiencia con los trainings o la plataforma' },
};

const DEFAULT_VIEW: Record<string, string> = {
  super_admin: 'sa-dashboard',
  admin: 'admin-dashboard',
  worker: 'worker-dashboard',
};

function AppContent() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState(() => DEFAULT_VIEW[user?.role ?? 'worker'] ?? 'worker-dashboard');
  const [viewData, setViewData] = useState<unknown>(null);

  useEffect(() => {
    if (!user) return;

    const defaultView = DEFAULT_VIEW[user.role] ?? 'worker-dashboard';
    setActiveView(defaultView);
    setViewData(null);
  }, [user?.id, user?.role]);

  const navigate = (view: string, data?: unknown) => {
    setActiveView(view);
    if (data !== undefined) setViewData(data);
    else setViewData(null);
  };

  if (!user) return <LoginPage />;

  const meta = VIEW_META[activeView] ?? { title: 'CIGÜEÑA', subtitle: '' };

  const renderView = () => {
    switch (activeView) {
      // Super Admin
      case 'sa-dashboard': return <SaDashboard />;
      case 'sa-tenants': return <SaTenants />;
      case 'sa-trainings': return <SaTrainings />;
      case 'sa-builder': return <SaBuilder />;
      case 'sa-tests': return <SaTests />;
      case 'sa-feedback': return <SaFeedback />;
      // Admin
      case 'admin-dashboard': return <AdminDashboard />;
      case 'admin-users': return <AdminUsers />;
      case 'admin-trainings': return <AdminTrainings />;
      case 'admin-assignments': return <AdminAssignments />;
      case 'admin-certificates': return <AdminCertificates />;
      case 'admin-reports': return <AdminReports />;
      case 'admin-feedback': return <AdminFeedback />;
      // Worker
      case 'worker-dashboard': return <WorkerDashboard onNavigate={navigate} />;
      case 'worker-trainings': return <WorkerTrainings onNavigate={navigate} />;
      case 'worker-player': return <WorkerPlayer assignment={(viewData as any)?.assignment} onNavigate={navigate} />;
      case 'worker-test': return <WorkerTest assignment={(viewData as any)?.assignment} onNavigate={navigate} />;
      case 'worker-certificates': return <WorkerCertificates />;
      case 'worker-feedback': return <WorkerFeedback />;
      default: return <div className="text-steel-400 text-sm">Vista no encontrada: {activeView}</div>;
    }
  };

  return (
    <AppLayout activeView={activeView} onNavigate={navigate} title={meta.title} subtitle={meta.subtitle}>
      {renderView()}
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
