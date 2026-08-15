'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500',
    secondary: 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
    ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className ?? ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
