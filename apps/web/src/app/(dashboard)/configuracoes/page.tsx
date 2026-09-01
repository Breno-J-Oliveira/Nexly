'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';

export default function ConfiguracoesPage() {
  const [nome, setNome] = useState('');
  const [plano, setPlano] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get('/configuracoes').then(r => {
      setNome(r.data.nome ?? '');
      setPlano(r.data.plano ?? 'FREE');
    }).catch(() => {});
  }, []);

  const salvar = async () => {
    setSalvando(true);
    await api.put('/configuracoes', { nome });
    toastSuccess('Configuracoes salvas!');
    setSalvando(false);
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Configuracoes</h2>
      <p className="mt-1 text-sm" style={{ color: '#71717A' }}>Gerencie as configuracoes da sua empresa</p>
      <div className="mt-6 rounded-xl p-6" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Input label="Nome da empresa" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do seu negocio" />
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>Plano atual</label>
          <p className="rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#818CF8' }}>{plano}</p>
        </div>
        <div className="mt-6">
          <Button onClick={salvar} loading={salvando}>Salvar alteracoes</Button>
        </div>
      </div>
    </div>
  );
}
