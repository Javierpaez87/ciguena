import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  BarChart2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  Menu,
  X,
  Play,
  Wrench,
  LogOut,
  FileSignature,
  LibraryBig,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const superAdminNav: NavItem[] = [
  {
    id: 'sa-dashboard',
    label: 'Dashboard Global',
    icon: <LayoutDashboard size={18} />,
  },
  {
    id: 'sa-tenants',
    label: 'Empresas / Tenants',
    icon: <Building2 size={18} />,
  },
  {
    id: 'sa-trainings',
    label: 'Catálogo de Trainings',
    icon: <BookOpen size={18} />,
  },
  {
    id: 'sa-builder',
    label: 'Builder de Training',
    icon: <Wrench size={18} />,
  },
  {
    id: 'sa-tests',
    label: 'Tests & Evaluaciones',
    icon: <ClipboardList size={18} />,
  },
  {
    id: 'sa-feedback',
    label: 'Feedback Global',
    icon: <MessageSquare size={18} />,
  },
];

const adminNav: NavItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    id: 'admin-users',
    label: 'Usuarios / Trabajadores',
    icon: <Users size={18} />,
  },
  {
    id: 'admin-trainings',
    label: 'Trainings Habilitados',
    icon: <BookOpen size={18} />,
  },
  {
    id: 'admin-training-catalog',
    label: 'Catálogo de Trainings',
    icon: <LibraryBig size={18} />,
  },
  {
    id: 'admin-assignments',
    label: 'Asignaciones',
    icon: <ClipboardList size={18} />,
  },
  {
    id: 'admin-certificates',
    label: 'Certificados',
    icon: <Award size={18} />,
  },
  {
    id: 'admin-reports',
    label: 'Reportes',
    icon: <BarChart2 size={18} />,
  },
  {
    id: 'admin-feedback',
    label: 'Feedback',
    icon: <MessageSquare size={18} />,
  },
  {
    id: 'admin-signatures',
    label: 'Signatures',
    icon: <FileSignature size={18} />,
  },
];

const workerNav: NavItem[] = [
  {
    id: 'worker-dashboard',
    label: 'Mi Dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    id: 'worker-trainings',
    label: 'Mis Trainings',
    icon: <Play size={18} />,
  },
  {
    id: 'worker-certificates',
    label: 'Mis Certificados',
    icon: <Award size={18} />,
  },
  {
    id: 'worker-feedback',
    label: 'Dar Feedback',
    icon: <MessageSquare size={18} />,
  },
];

function normalizeRole(role?: string | null) {
  return (role || '').trim().toLowerCase();
}

function isSuperAdminRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
}

function getSidebarStyles(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (isSuperAdminRole(normalizedRole)) {
    return {
      sidebar: 'bg-[#1c1633]',
      border: 'border-violet-400/20',
      mobileButton: 'bg-[#1c1633] border-violet-400/30',
      sectionBorder: 'border-violet-400/20',
      roleIcon: 'text-violet-300',
      roleText: 'text-violet-300',
      roleBadge: 'bg-violet-400/10 border border-violet-400/20',
      collapseButton:
        'bg-[#2a2147] border-violet-400/30 hover:bg-[#352958]',
      activeItem:
        'bg-violet-400/15 text-violet-100 border border-violet-400/20',
      inactiveItem:
        'text-steel-300 hover:bg-violet-400/10 hover:text-violet-100 border border-transparent',
    };
  }

  if (normalizedRole === 'admin') {
    return {
      sidebar: 'bg-[#092733]',
      border: 'border-cyan-400/15',
      mobileButton: 'bg-[#092733] border-cyan-400/25',
      sectionBorder: 'border-cyan-400/15',
      roleIcon: 'text-cyan-300',
      roleText: 'text-cyan-300',
      roleBadge: 'bg-cyan-400/10 border border-cyan-400/20',
      collapseButton:
        'bg-[#103746] border-cyan-400/25 hover:bg-[#164657]',
      activeItem:
        'bg-cyan-400/15 text-cyan-100 border border-cyan-400/20',
      inactiveItem:
        'text-steel-300 hover:bg-cyan-400/10 hover:text-cyan-100 border border-transparent',
    };
  }

  return {
    sidebar: 'bg-steel-900',
    border: 'border-steel-700',
    mobileButton: 'bg-steel-800 border-steel-700',
    sectionBorder: 'border-steel-700',
    roleIcon: 'text-emerald-400',
    roleText: 'text-emerald-400',
    roleBadge: 'bg-emerald-400/10 border border-emerald-400/20',
    collapseButton:
      'bg-steel-700 border-steel-600 hover:bg-steel-600',
    activeItem:
      'bg-emerald-400/10 text-emerald-100 border border-emerald-400/20',
    inactiveItem:
      'text-steel-300 hover:bg-steel-800 hover:text-steel-100 border border-transparent',
  };
}

export default function Sidebar({
  activeView,
  onNavigate,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const normalizedRole = normalizeRole(user?.role);
  const isSuperAdmin = isSuperAdminRole(normalizedRole);
  const styles = getSidebarStyles(normalizedRole);

  const navItems = isSuperAdmin
    ? superAdminNav
    : normalizedRole === 'admin'
      ? adminNav
      : workerNav;

  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : normalizedRole === 'admin'
      ? 'Admin Empresa'
      : 'Trabajador';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b ${styles.sectionBorder} ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-steel-950/70 border border-amber-500/30 flex items-center justify-center p-1 shadow-lg shadow-amber-500/10">
          <img
            src="/images/ciguena-pumpjack.png"
            alt="Cigüeña"
            className="w-full h-full object-contain"
          />
        </div>

        {!collapsed && (
          <div>
            <div className="text-base font-bold text-amber-400 leading-tight tracking-wide">
              CIGÜEÑA
            </div>

            <div className="text-[10px] text-steel-400 leading-tight">
              by BondiApps
            </div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className={`px-4 py-3 border-b ${styles.sectionBorder}`}>
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${styles.roleBadge}`}
          >
            <Shield size={13} className={styles.roleIcon} />

            <span className={`text-xs font-semibold ${styles.roleText}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-steel-500">
              Navegación
            </span>
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? styles.activeItem : styles.inactiveItem
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>

              {!collapsed && <span className="truncate">{item.label}</span>}

              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-amber-500 text-petroleum-950 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User and logout */}
      <div
        className={`px-2 pb-4 border-t ${styles.sectionBorder} pt-4`}
      >
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-steel-100 truncate">
              {user?.full_name || 'Usuario'}
            </div>

            <div className="text-xs text-steel-400 truncate">
              {user?.email || 'Sin email'}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 border rounded-lg text-steel-300 ${styles.mobileButton}`}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ${
          styles.sidebar
        } ${styles.border} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-steel-400 hover:text-steel-100"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>

        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex flex-col border-r transition-all duration-300 ${
          styles.sidebar
        } ${styles.border} ${
          collapsed ? 'w-16' : 'w-60'
        } flex-shrink-0 relative`}
      >
        <SidebarContent />

        <button
          onClick={() => setCollapsed((current) => !current)}
          className={`absolute -right-3 top-20 border rounded-full p-1 text-steel-300 hover:text-steel-100 transition-colors ${styles.collapseButton}`}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </div>
    </>
  );
}

