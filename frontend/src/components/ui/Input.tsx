'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full rounded-lg border border-border dark:border-dark-border
          bg-surface dark:bg-dark-surface
          px-3 py-2 text-sm text-text-primary dark:text-dark-text
          placeholder:text-text-muted dark:placeholder:text-dark-text-muted
          focus:outline-none focus:ring-2 focus:ring-primary-lighter dark:focus:ring-dark-primary-lighter focus:border-primary-lighter
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
