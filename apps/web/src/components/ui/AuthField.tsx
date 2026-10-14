'use client';

import { forwardRef, useEffect, useId, useState } from 'react';

/** Evita submit nativo de credenciais enquanto os handlers ainda não estão prontos. */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}

type FieldProps = { label: string; error?: string; right?: React.ReactNode };
const fieldClass =
  'w-full rounded-[10px] border bg-[#18181F] px-4 py-3 text-[14px] text-[#FAFAFA] placeholder:text-[#71717A] transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20';

export const AuthInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function AuthInput({ label, error, right, id, className = '', ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[13px] font-medium text-[#A1A1AA]">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : props['aria-describedby']}
          className={`${fieldClass} ${error ? 'border-red-500/50' : 'border-white/10'} ${right ? 'pr-12' : ''} ${className}`}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && (
        <span id={`${inputId}-error`} role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
});

export const AuthSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function AuthSelect({ label, error, id, className = '', children, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[13px] font-medium text-[#A1A1AA]">
        {label}
      </label>
      <select
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : props['aria-describedby']}
        className={`${fieldClass} ${error ? 'border-red-500/50' : 'border-white/10'} ${className}`}
      >
        {children}
      </select>
      {error && (
        <span id={`${inputId}-error`} role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
});
