'use client';
import { useEffect, useState } from 'react';
import { env } from '@/lib/env';
type Item = { id: string; nomePublico: string; ocupacao: string; texto: string; nota: number };
function validRecommendations(value: unknown): value is Item[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return (
        ['id', 'nomePublico', 'ocupacao', 'texto'].every(
          (key) => typeof record[key] === 'string' && record[key].length <= 5000,
        ) &&
        typeof record.nota === 'number' &&
        Number.isInteger(record.nota) &&
        record.nota >= 1 &&
        record.nota <= 5
      );
    })
  );
}
export function PublicRecommendations() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setItems(null);
    setErro(false);
    const timer = setTimeout(() => {
      setErro(true);
      c.abort();
    }, 10000);
    void fetch(`${env.NEXT_PUBLIC_API_URL}/api/experiencia/recomendacoes`, {
      signal: c.signal,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Indisponível');
        const data: unknown = await r.json();
        if (!validRecommendations(data)) throw new Error('Resposta inválida');
        if (!c.signal.aborted) setItems(data);
      })
      .catch(() => {
        if (!c.signal.aborted) setErro(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [attempt]);
  if (erro)
    return (
      <div className="mt-8 rounded-xl border border-white/10 p-6 text-sm text-[#AAA7BA]">
        <p role="status">As recomendações estão temporariamente indisponíveis.</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-3 min-h-11 rounded text-sm font-medium text-[#C7C5FF] underline underline-offset-4"
        >
          Carregar recomendações novamente
        </button>
      </div>
    );
  if (!items)
    return (
      <p role="status" className="mt-8 text-center text-sm text-[#71717A]">
        Carregando experiências…
      </p>
    );
  if (!items.length)
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-xl border border-white/10 bg-[#111116] p-6 text-center">
        <p className="text-sm text-[#A1A1AA]">
          As primeiras recomendações reais aparecerão aqui após a autorização dos usuários e
          revisão.
        </p>
        <p className="mt-3 text-xs text-[#71717A]">
          Quem usa o Nexly pode compartilhar sua experiência em Meu Nexly.
        </p>
      </div>
    );
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {items.map((d) => (
        <figure key={d.id} className="rounded-xl border border-white/10 bg-[#111116] p-6">
          <p aria-label={`Nota ${d.nota} de 5`} className="text-yellow-400">
            {'★'.repeat(d.nota)}
            {'☆'.repeat(5 - d.nota)}
          </p>
          <blockquote className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#A1A1AA]">
            “{d.texto}”
          </blockquote>
          <figcaption className="mt-5">
            <strong className="block text-sm">{d.nomePublico}</strong>
            <span className="text-xs text-[#71717A]">{d.ocupacao}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
