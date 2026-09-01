'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#18181F',
          color: '#FAFAFA',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          fontSize: 13,
          padding: '12px 16px',
        },
        duration: 4000,
      }}
    />
  );
}

export function toastSuccess(msg: string) {
  return toast.success(msg, {
    style: { borderColor: 'rgba(34,197,94,0.30)' },
  });
}

export function toastError(msg: string) {
  return toast.error(msg, {
    style: { borderColor: 'rgba(239,68,68,0.30)' },
  });
}
