'use client';

import { useEffect, useState } from 'react';

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"
    >
      <p className="font-semibold">Você está sem conexão</p>
      <p className="mt-1">
        Mantenha esta página aberta para preservar o que digitou. Aguarde a conexão voltar e tente
        salvar novamente.
      </p>
    </div>
  );
}
