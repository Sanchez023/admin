'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={`
        w-full rounded-lg border border-border dark:border-dark-border
        bg-surface dark:bg-dark-surface
        px-3 py-2 text-sm text-text-primary dark:text-dark-text
        focus:outline-none focus:ring-2 focus:ring-primary-lighter dark:focus:ring-dark-primary-lighter
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
