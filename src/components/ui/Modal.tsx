import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  stickyFooter?: boolean;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, size = 'md', children, footer, stickyFooter = false }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={`bg-steel-800 border border-steel-700 rounded-2xl shadow-2xl w-full ${sizeMap[size]} max-h-[90vh] ${
          stickyFooter ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
        }`}
      >
        <div className={`modal-header ${stickyFooter ? 'flex-shrink-0' : ''}`}>
          <h2 className="text-base font-semibold text-steel-100">{title}</h2>
          <button onClick={onClose} className="text-steel-400 hover:text-steel-100 transition-colors p-1 rounded-lg hover:bg-steel-700">
            <X size={18} />
          </button>
        </div>
        <div className={`modal-body ${stickyFooter ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>{children}</div>
        {footer && (
          <div className={`modal-footer ${stickyFooter ? 'flex-shrink-0 bg-steel-800' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
