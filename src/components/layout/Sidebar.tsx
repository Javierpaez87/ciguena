import React, { useState } from 'react';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, Award, BarChart2,
  MessageSquare, Settings, ChevronLeft, ChevronRight, Building2,
  Shield, Menu, X, Bell, GraduationCap, FileText, Play,
  Wrench, LogOut, ChevronDown
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
  { id: 'sa-dashboard', label: 'Dashboard Global', icon: <LayoutDashboard size={18} /> },
  { id: 'sa-tenants', label: 'Empresas / Tenants', icon: <Building2 size={18} /> },
  { id: 'sa-trainings', label: 'Catálogo de Trainings', icon: <BookOpen size={18} /> },
  { id: 'sa-builder', label: 'Builder de Training', icon: <Wrench size={18} /> },
  { id: 'sa-tests', label: 'Tests & Evaluaciones', icon: <ClipboardList size={18} /> },
  { id: 'sa-feedback', label: 'Feedback Global', icon: <MessageSquare size={18} /> },
];

const adminNav: NavItem[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'admin-users', label: 'Usuarios / Trabajadores', icon: <Users size={18} /> },
  { id: 'admin-trainings', label: 'Trainings Habilitados', icon: <BookOpen size={18} /> },
  { id: 'admin-assignments', label: 'Asignaciones', icon: <ClipboardList size={18} /> },
  { id: 'admin-certificates', label: 'Certificados', icon: <Award size={18} /> },
  { id: 'admin-reports', label: 'Reportes', icon: <BarChart2 size={18} /> },
  { id: 'admin-feedback', label: 'Feedback', icon: <MessageSquare size={18} /> },
];

const workerNav: NavItem[] = [
  { id: 'worker-dashboard', label: 'Mi Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'worker-trainings', label: 'Mis Trainings', icon: <Play size={18} /> },
  { id: 'worker-certificates', label: 'Mis Certificados', icon: <Award size={18} /> },
  { id: 'worker-feedback', label: 'Dar Feedback', icon: <MessageSquare size={18} /> },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = user?.role === 'super_admin' ? superAdminNav
    : user?.role === 'admin' ? adminNav
    : workerNav;

  const roleLabel = user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'admin' ? 'Admin Empresa'
    : 'Trabajador';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-steel-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-steel-950/70 border border-amber-500/30 flex items-center justify-center p-1 shadow-lg shadow-amber-500/10">
          <img src="/images/ciguena-pumpjack.png" alt="Cigüeña" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-base font-bold text-amber-400 leading-tight tracking-wide">CIGÜEÑA</div>
            <div className="text-[10px] text-steel-400 leading-tight">by BondiApps</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-steel-700">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-amber-500" />
            <span className="text-xs text-amber-400 font-semibold">{roleLabel}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-steel-500">Navegación</span>
          </div>
        )}
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className={`sidebar-item w-full ${activeView === item.id ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto bg-amber-500 text-petroleum-950 text-xs font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-2 pb-4 border-t border-steel-700 pt-4">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-steel-100 truncate">{user?.full_name}</div>
            <div className="text-xs text-steel-400 truncate">{user?.email}</div>
          </div>
        )}
        <button
          onClick={logout}
          className={`sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-steel-800 border border-steel-700 rounded-lg text-steel-300"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-steel-900 border-r border-steel-700 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-steel-400 hover:text-steel-100">
          <X size={20} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col bg-steel-900 border-r border-steel-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 relative`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-steel-700 border border-steel-600 rounded-full p-1 text-steel-300 hover:text-steel-100 hover:bg-steel-600 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </>
  );
}
