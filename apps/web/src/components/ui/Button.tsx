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
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-100 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-[#6366F1] text-[#09090B] hover:bg-[#4F46E5] active:scale-[0.97]',
    secondary: 'border border-[rgba(255,255,255,0.10)] bg-[#111116] text-[#FAFAFA] hover:bg-[#18181F]',
    ghost: 'text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAFA]',
    danger: 'bg-[#EF4444] text-white hover:bg-red-500',
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
