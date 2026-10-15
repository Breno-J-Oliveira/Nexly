'use client';
import { useEffect, useState } from 'react';
import { env } from '@/lib/env';
type Item = { id: string; nomePublico: string; ocupacao: string; texto: string; nota: number };
export function PublicRecommendations() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    void fetch(`${env.NEXT_PUBLIC_API_URL}/api/experiencia/recomendacoes`, {
      signal: c.signal,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Indisponível');
        setItems((await r.json()) as Item[]);
      })
      .catch(() => {
        if (!c.signal.aborted) setErro(true);
      });
    return () => c.abort();
  }, []);
  if (erro)
    return (
      <p className="mt-8 text-center text-sm text-[#A1A1AA]">
        As recomendações estão temporariamente indisponíveis.
      </p>
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
