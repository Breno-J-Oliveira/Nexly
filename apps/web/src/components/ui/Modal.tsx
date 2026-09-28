'use client';

import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}

export function Modal({ open, title, children, onClose, width = 'max-w-md' }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={(e) => {
        // Fecha apenas quando o clique é no backdrop (não no conteúdo).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={'w-full ' + width + ' rounded-2xl p-6 animate-slide-up'}
        style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.10)' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-white/5" style={{ color: '#71717A' }}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
