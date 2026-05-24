import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-steel-800 border border-steel-700 rounded-2xl shadow-2xl w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="modal-header">
          <h2 className="text-base font-semibold text-steel-100">{title}</h2>
          <button onClick={onClose} className="text-steel-400 hover:text-steel-100 transition-colors p-1 rounded-lg hover:bg-steel-700">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
