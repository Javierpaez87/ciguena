import React from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-steel-900 border-b border-steel-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-steel-50">{title}</h1>
        {subtitle && <p className="text-xs text-steel-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-steel-400 hover:text-steel-100 hover:bg-steel-800 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-steel-700">
          <div className="w-8 h-8 bg-petroleum-600 rounded-full flex items-center justify-center text-sm font-semibold text-petroleum-100">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-steel-100 leading-tight">{user?.full_name}</div>
            <div className="text-xs text-steel-400 leading-tight">{user?.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
