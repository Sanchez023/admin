'use client';

import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center font-medium text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const variants: Record<Variant, string> = {
    primary:
      'bg-primary hover:bg-primary-light dark:bg-dark-primary dark:hover:bg-dark-primary-lighter text-white focus-visible:ring-primary-lighter dark:focus-visible:ring-dark-primary-lighter',
    secondary:
      'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover focus-visible:ring-primary-lighter',
    danger:
      'bg-red-500 hover:bg-red-600 text-white focus-visible:ring-red-400',
    ghost:
      'text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover focus-visible:ring-primary-lighter',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
