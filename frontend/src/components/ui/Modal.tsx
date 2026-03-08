'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl';
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClass = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`
          ${maxWidthClass} w-full mx-4 max-h-[90vh] flex flex-col
          rounded-2xl shadow-modal
          bg-surface dark:bg-dark-surface border border-border dark:border-dark-border
          transition-all duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border dark:border-dark-border px-6 py-4">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-text-primary dark:text-dark-text"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 max-h-[60vh]">{children}</div>
        {footer !== undefined && (
          <div className="flex justify-end gap-3 border-t border-border dark:border-dark-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-3">{children}</div>;
}
