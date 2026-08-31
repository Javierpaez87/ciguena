import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { getTenantBrandTheme } from '../../lib/brandTheme';

interface AppLayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function getBackgroundClass(role?: string | null) {
  const normalizedRole = (role || '').trim().toLowerCase();

  if (
    normalizedRole === 'superadmin' ||
    normalizedRole === 'super_admin'
  ) {
    return 'bg-[#151126]';
  }

  if (normalizedRole === 'admin') {
    return 'bg-[#071b24]';
  }

  return 'bg-steel-950';
}

export default function AppLayout({
  activeView,
  onNavigate,
  title,
  subtitle,
  children,
}: AppLayoutProps) {
  const { user } = useAuth();
  const { branding } = useBranding();

  const normalizedRole = (user?.role || '').trim().toLowerCase();
  const isSuperAdmin =
    normalizedRole === 'superadmin' || normalizedRole === 'super_admin';
  const useCustomBranding = !isSuperAdmin && branding.isCustomBranding;
  const brandTheme = getTenantBrandTheme(branding);
  const backgroundClass = getBackgroundClass(user?.role);

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${backgroundClass}`}
      style={
        useCustomBranding
          ? { backgroundColor: brandTheme.pageBackground }
          : undefined
      }
    >
      <Sidebar activeView={activeView} onNavigate={onNavigate} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
