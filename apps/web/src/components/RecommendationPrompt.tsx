'use client';
import { useState } from 'react';
import { useWorkspace } from '@/lib/workspace';
import { api } from '@/lib/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { RecommendationForm } from './RecommendationForm';
export function RecommendationPrompt() {
  const { profile, reload } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [erro, setErro] = useState('');
  async function later(escolha: 'DEPOIS' | 'NUNCA') {
    try {
      await api.post('/experiencia/lembrar', { escolha });
      await reload();
      setHidden(true);
    } catch {
      setErro('Não foi possível salvar sua preferência. Tente novamente.');
    }
  }
  if (!profile.pedirRecomendacao || hidden) return null;
  return (
    <>
      <section className="mb-6 rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-4">
        <h2 className="text-sm font-semibold">Como está sendo usar o Nexly?</h2>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Você já teve tempo de experimentar. Quer compartilhar sua experiência?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>Compartilhar experiência</Button>
          <Button variant="ghost" onClick={() => void later('DEPOIS')}>
            Lembrar em 30 dias
          </Button>
          <Button variant="ghost" onClick={() => void later('NUNCA')}>
            Não perguntar novamente
          </Button>
        </div>
        {erro && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {erro}
          </p>
        )}
      </section>
      <Modal open={open} title="Sua experiência com o Nexly" onClose={() => setOpen(false)}>
        <RecommendationForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
