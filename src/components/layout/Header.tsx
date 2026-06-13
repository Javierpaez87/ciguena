import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function normalizeRole(role?: string | null) {
  return (role || '').trim().toLowerCase();
}

function getHeaderStyles(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole === 'super_admin' ||
    normalizedRole === 'superadmin'
  ) {
    return {
      header: 'bg-[#1c1633]',
      border: 'border-violet-400/20',
      avatar: 'bg-violet-500/20 text-violet-100 border-violet-400/30',
      divider: 'border-violet-400/20',
      button:
        'text-violet-300 hover:text-violet-100 hover:bg-violet-400/10',
      notification: 'bg-violet-400',
      roleLabel: 'Super Admin',
      roleText: 'text-violet-300',
    };
  }

  if (normalizedRole === 'admin') {
    return {
      header: 'bg-[#092733]',
      border: 'border-cyan-400/15',
      avatar: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/25',
      divider: 'border-cyan-400/15',
      button:
        'text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10',
      notification: 'bg-cyan-400',
      roleLabel: 'Admin Empresa',
      roleText: 'text-cyan-300',
    };
  }

  return {
    header: 'bg-steel-900',
    border: 'border-steel-700',
    avatar: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/20',
    divider: 'border-steel-700',
    button:
      'text-steel-400 hover:text-steel-100 hover:bg-steel-800',
    notification: 'bg-amber-500',
    roleLabel: 'Trabajador',
    roleText: 'text-emerald-400',
  };
}

function getUserInitial(fullName?: string | null, email?: string | null) {
  const source = fullName?.trim() || email?.trim() || 'U';
  return source.charAt(0).toUpperCase();
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  const styles = getHeaderStyles(user?.role);
  const userName = user?.full_name || 'Usuario';
  const userEmail = user?.email || 'Sin email';

  return (
    <header
      className={`border-b px-6 py-4 flex items-center justify-between flex-shrink-0 transition-colors duration-300 ${styles.header} ${styles.border}`}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-steel-50 truncate">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs text-steel-400 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`relative p-2 rounded-lg transition-colors ${styles.button}`}
          aria-label="Notificaciones"
        >
          <Bell size={18} />

          <span
            className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${styles.notification}`}
          />
        </button>

        <div
          className={`flex items-center gap-2 pl-3 border-l ${styles.divider}`}
        >
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-semibold flex-shrink-0 ${styles.avatar}`}
          >
            {getUserInitial(user?.full_name, user?.email)}
          </div>

          <div className="hidden sm:block min-w-0">
            <div className="text-sm font-medium text-steel-100 leading-tight truncate max-w-[220px]">
              {userName}
            </div>

            <div className="text-xs text-steel-400 leading-tight truncate max-w-[220px]">
              {userEmail}
            </div>

            <div
              className={`text-[10px] font-semibold leading-tight mt-0.5 ${styles.roleText}`}
            >
              {styles.roleLabel}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
