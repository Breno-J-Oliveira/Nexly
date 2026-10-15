'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { api } from '@/lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { toastSuccess } from './ui/Toaster';

export function RecommendationForm({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const { profile, reload } = useWorkspace();
  const [form, setForm] = useState({
    nota: profile.depoimento?.nota || 0,
    texto: profile.depoimento?.texto || '',
    nomePublico: profile.depoimento?.nomePublico || user?.nome || '',
    ocupacao: profile.depoimento?.ocupacao || '',
    autorizaPublicacao: profile.depoimento?.autorizaPublicacao || false,
  });
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  async function save() {
    setBusy(true);
    setErro('');
    try {
      await api.put('/experiencia/recomendacao', form);
      await reload();
      setSalvo(true);
      toastSuccess('Obrigado! Sua experiência foi registrada.');
      onSaved?.();
    } catch {
      setErro(
        'Não foi possível enviar. Use de 20 a 1000 caracteres, escolha uma nota e confira os campos. A recomendação fica disponível após 7 dias de conta e 3 dias de uso.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (salvo)
    return (
      <p role="status" className="text-sm text-green-400">
        Obrigado! Sua experiência foi registrada. Publicações autorizadas passam por revisão antes
        de aparecer na landing.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="text-sm leading-relaxed text-[#A1A1AA]">
        Como foi sua experiência com o Nexly? Todas as notas são bem-vindas. A publicação é
        opcional.
      </p>
      <fieldset>
        <legend className="mb-2 text-sm">Sua nota</legend>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-sm">
              <input
                type="radio"
                name="nota"
                required
                value={n}
                checked={form.nota === n}
                onChange={() => setForm({ ...form, nota: n })}
                className="mr-1 accent-[#6366F1]"
              />
              {n} ★
            </label>
          ))}
        </div>
      </fieldset>
      <Input
        label="Nome que pode aparecer na publicação"
        minLength={2}
        maxLength={80}
        required
        value={form.nomePublico}
        onChange={(e) => setForm({ ...form, nomePublico: e.target.value })}
      />
      <Input
        label="Profissão ou tipo de negócio"
        minLength={2}
        maxLength={100}
        required
        value={form.ocupacao}
        onChange={(e) => setForm({ ...form, ocupacao: e.target.value })}
      />
      <label className="block text-sm">
        Seu comentário
        <textarea
          required
          minLength={20}
          maxLength={1000}
          value={form.texto}
          onChange={(e) => setForm({ ...form, texto: e.target.value })}
          className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-[#18181F] p-3"
        />
        <span className="text-xs text-[#71717A]">
          {form.texto.length}/1000. Evite dados de clientes, pacientes ou informações sensíveis.
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs leading-relaxed text-[#A1A1AA]">
        <input
          type="checkbox"
          checked={form.autorizaPublicacao}
          onChange={(e) => setForm({ ...form, autorizaPublicacao: e.target.checked })}
          className="mt-1 accent-[#6366F1]"
        />
        <span>
          Autorizo publicar meu nome informado, profissão, nota e comentário na landing do Nexly.
          Posso retirar essa autorização em Meu Nexly.
        </span>
      </label>
      {erro && (
        <p role="alert" className="text-sm text-red-400">
          {erro}
        </p>
      )}
      <Button type="submit" loading={busy}>
        Enviar minha experiência
      </Button>
    </form>
  );
}
