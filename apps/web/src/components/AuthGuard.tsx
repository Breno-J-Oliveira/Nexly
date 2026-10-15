'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionError, retryAt, retrySession } = useAuth();
  const router = useRouter();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = (): void => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    if (retryAt <= Date.now()) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!loading && !user && !sessionError) {
      router.replace('/login');
    }
  }, [loading, user, sessionError, router]);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0C0C10]">
        <div
          role="status"
          aria-label="Recuperando seu acesso"
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent"
        />
      </div>
    );
  }

  if (sessionError && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0C0C10] px-6 text-center text-[#FAFAFA]">
        <section
          aria-label="Recuperar acesso"
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111116] p-8"
        >
          <h1 className="text-xl font-semibold">Vamos recuperar seu acesso</h1>
          <p role="alert" className="my-4 text-sm leading-6 text-[#A1A1AA]">
            {sessionError}
          </p>
          <Button type="button" disabled={remaining > 0} onClick={() => void retrySession()}>
            {remaining > 0 ? `Tentar novamente em ${remaining}s` : 'Tentar novamente'}
          </Button>
        </section>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
