'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Post } from '@/lib/blog';
import { formatBlogDate, matchesBlogSearch } from '@/lib/blog-presentation';
import { BlogArtwork } from './BlogArtwork';

type PostSummary = Omit<Post, 'content'>;

export function BlogExplorer({ posts }: { posts: PostSummary[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const categories = [
    'Todos',
    ...Array.from(new Set(posts.map((post) => post.categoria))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
  ];
  const visible = posts.filter(
    (post) =>
      (category === 'Todos' || post.categoria === category) && matchesBlogSearch(post, search),
  );
  const filtered = Boolean(search.trim()) || category !== 'Todos';
  const reset = () => {
    setSearch('');
    setCategory('Todos');
  };

  return (
    <section
      id="artigos"
      aria-labelledby="articles-title"
      className="scroll-mt-24 pb-20 pt-16 sm:pt-20"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            Explore no seu ritmo
          </p>
          <h2
            id="articles-title"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Um próximo passo para o seu negócio
          </h2>
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="blog-search" className="mb-2 block text-sm text-[#A1A1AA]">
            Buscar no blog
          </label>
          <input
            id="blog-search"
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agenda, estoque, finanças…"
            className="min-h-12 w-full rounded-xl border border-white/10 bg-[#111116] px-4 text-sm text-white placeholder:text-[#A1A1AA] focus:border-indigo-400"
          />
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Filtrar artigos por tema">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${category === item ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' : 'border-white/10 bg-transparent text-[#A1A1AA] hover:border-white/25 hover:text-white'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-5 flex min-h-8 items-center justify-between gap-4 text-sm text-[#A1A1AA]">
        <p role="status" aria-live="polite" aria-atomic="true">
          {visible.length} {visible.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={reset}
            className="rounded px-2 py-1 text-indigo-300 underline underline-offset-4"
          >
            Limpar filtros
          </button>
        )}
      </div>
      {visible.length ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <article
              key={post.slug}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111116] transition-colors hover:border-indigo-400/40 focus-within:border-indigo-400"
            >
              <Link
                href={`/blog/${post.slug}`}
                aria-labelledby={`post-title-${post.slug}`}
                className="flex h-full flex-col rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
              >
                <BlogArtwork category={post.categoria} />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-medium text-indigo-300">{post.categoria}</span>
                    <span className="text-[#A1A1AA]">{post.tempoLeitura} de leitura</span>
                  </div>
                  <h3
                    id={`post-title-${post.slug}`}
                    className="mt-4 text-xl font-semibold leading-snug tracking-tight text-[#FAFAFA] transition-colors group-hover:text-indigo-200"
                  >
                    {post.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-[#A1A1AA]">{post.description}</p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-xs text-[#A1A1AA]">
                    {post.date && <time dateTime={post.date}>{formatBlogDate(post.date)}</time>}
                    <span aria-hidden="true" className="text-indigo-300">
                      Ler artigo ↗
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#111116] px-6 py-14 text-center">
          <h3 className="text-xl font-semibold">Nenhum artigo por aqui ainda</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#A1A1AA]">
            {posts.length
              ? 'Tente outra palavra ou escolha um tema diferente para continuar explorando.'
              : 'Novos conteúdos serão publicados neste espaço. Enquanto isso, conheça os recursos do Nexly.'}
          </p>
          {posts.length ? (
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Ver todos os artigos
            </button>
          ) : (
            <Link
              href="/funcionalidades"
              className="mt-6 inline-flex rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white"
            >
              Conhecer funcionalidades
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
