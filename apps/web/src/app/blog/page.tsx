import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';
import { formatBlogDate } from '@/lib/blog-presentation';
import { BlogArtwork } from '@/components/BlogArtwork';
import { BlogExplorer } from '@/components/BlogExplorer';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guias práticos sobre agenda, estoque, finanças e privacidade para cuidar melhor do seu negócio.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Nexly — Ideias para uma gestão mais leve',
    description: 'Conteúdo prático para transformar a rotina do seu negócio.',
    url: '/blog',
    type: 'website',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const featured =
    posts.find((post) => post.slug === 'como-reduzir-no-show-80-porcento') ?? posts[0];

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section className="relative pb-12 pt-14 sm:pb-16 sm:pt-20" aria-labelledby="blog-title">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-transparent" />
        <div className="public-polish relative mx-auto max-w-3xl text-center">
          <Link
            href="/"
            className="inline-flex rounded py-2 text-sm text-[#A1A1AA] hover:text-white"
          >
            ← Página inicial
          </Link>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-[#818CF8]">
            Blog Nexly
          </p>
          <h1
            id="blog-title"
            className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
          >
            Boas ideias para uma gestão melhor.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#A1A1AA]">
            Menos dúvidas na rotina, mais espaço para cuidar do seu negócio. Encontre orientações
            práticas para organizar a agenda, os números e o próximo passo.
          </p>
          <a
            href="#artigos"
            className="mt-7 inline-flex min-h-11 items-center gap-3 rounded text-sm font-semibold text-[#818CF8] hover:text-white"
          >
            Explorar os artigos <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      {featured && (
        <section
          aria-label="Artigo em destaque"
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#111116]"
        >
          <div className="grid md:grid-cols-2">
            <BlogArtwork category={featured.categoria} large />
            <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 font-medium text-[#818CF8]">
                  Em destaque
                </span>
                <span className="text-[#A1A1AA]">
                  {featured.categoria} · {featured.tempoLeitura} de leitura
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                <Link href={`/blog/${featured.slug}`} className="rounded hover:text-[#818CF8]">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#A1A1AA]">{featured.description}</p>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                {featured.date && (
                  <time dateTime={featured.date} className="text-xs text-[#A1A1AA]">
                    {formatBlogDate(featured.date)}
                  </time>
                )}
                <Link
                  href={`/blog/${featured.slug}`}
                  className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-[#6366F1] px-5 py-3 text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-[#4F46E5]"
                >
                  Ler o guia <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
      <BlogExplorer
        posts={posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          description: post.description,
          date: post.date,
          updatedAt: post.updatedAt,
          categoria: post.categoria,
          tempoLeitura: post.tempoLeitura,
        }))}
      />
      <section
        aria-labelledby="blog-cta-title"
        className="mb-20 flex flex-col justify-between gap-7 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-[#111116] p-7 sm:p-10 md:flex-row md:items-center"
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
            Da leitura para a rotina
          </p>
          <h2 id="blog-cta-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Seu negócio, organizado do seu jeito.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">
            Conheça os módulos do Nexly e escolha os recursos que fazem sentido para você.
          </p>
        </div>
        <Link
          href="/funcionalidades"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-5 text-sm font-semibold text-indigo-100 hover:bg-indigo-400/20"
        >
          Conhecer o Nexly ↗
        </Link>
      </section>
    </div>
  );
}
