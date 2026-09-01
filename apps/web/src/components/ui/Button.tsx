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
    primary: 'text-[#09090B] hover:opacity-90' style={{backgroundColor:'#6366F1'}},
    secondary: 'border text-[#FAFAFA] hover:opacity-80' style={{borderColor:'rgba(255,255,255,0.10)',backgroundColor:'#111116'}},
    ghost: 'text-[#A1A1AA] hover:text-[#FAFAFA]' style={{backgroundColor:'transparent'}},
    danger: 'bg-[#EF4444] text-white hover:opacity-90',
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
