'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  // `useId` garante um id único por instância e a associação label↔input,
  // exigida por leitores de tela (WCAG 1.3.1 / 4.1.2).
  const idGerado = useId();
  const inputId = id ?? idGerado;
  const erroId = `${inputId}-erro`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#D4D4D8]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? erroId : undefined}
        className={`rounded-lg border bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1] ${
          error ? 'border-red-500' : 'border-[rgba(255,255,255,0.10)]'
        } ${className ?? ''}`}
        {...props}
      />
      {error && (
        <span id={erroId} role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
});
