import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface AppLayoutProps {
  activeView: string;
  onNavigate: (view: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AppLayout({ activeView, onNavigate, title, subtitle, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-steel-950">
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
