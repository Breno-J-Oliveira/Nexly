'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <div className="rounded-3xl border p-8 shadow-2xl" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#6366F1' }}>
          <img src="/logo.svg" alt="Nexly" className="h-6 w-6 object-contain" />
        </div>
      </div>
      <h1 className="mt-6 text-center text-[24px] font-semibold" style={{ color: '#FAFAFA' }}>Recuperar senha</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>Informe seu e-mail para receber as instruções de redefinição.</p>

      {!enviado ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@empresa.com" className="w-full rounded-xl border bg-[#111116] px-4 py-3 text-[14px] text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Button type="submit" className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">Enviar instruções</Button>
        </form>
      ) : (
        <div className="mt-8 rounded-xl border p-4 text-center" style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[14px]" style={{ color: '#A1A1AA' }}>Se houver uma conta associada a <strong style={{ color: '#FAFAFA' }}>{email}</strong>, enviaremos as instruções de redefinição em breve.</p>
        </div>
      )}

      <p className="mt-6 text-center text-[13px]" style={{ color: '#71717A' }}>
        Lembrou a senha?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: '#818CF8' }}>Fazer login</Link>
      </p>
    </div>
  );
}
