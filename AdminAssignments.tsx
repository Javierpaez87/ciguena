import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-steel-800 rounded-2xl flex items-center justify-center text-steel-500 mb-4 border border-steel-700">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-steel-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-steel-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
