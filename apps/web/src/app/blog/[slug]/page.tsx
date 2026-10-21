import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { compileMDX } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx-components';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { formatBlogDate } from '@/lib/blog-presentation';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date || undefined,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const related = getAllPosts()
    .filter((item) => item.slug !== post.slug)
    .sort((a, b) => Number(b.categoria === post.categoria) - Number(a.categoria === post.categoria))
    .slice(0, 3);
  const articleUrl = new URL(
    `/blog/${post.slug}`,
    process.env.NEXT_PUBLIC_SITE_URL || 'https://nexly-web.vercel.app',
  ).toString();

  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
    options: { parseFrontmatter: false },
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    ...(post.date ? { datePublished: post.date } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    author: { '@type': 'Organization', name: 'Nexly' },
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav aria-label="Caminho da página" className="text-sm text-[#A1A1AA]">
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <li>
            <Link href="/" className="rounded hover:text-white">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="rounded hover:text-white">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-indigo-300">
            {post.title}
          </li>
        </ol>
      </nav>
      <div className="mt-10 grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
        <article className="min-w-0">
          <header className="border-b border-white/10 pb-8">
            <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              {post.categoria}
            </span>
            <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl sm:leading-[1.16]">
              {post.title}
            </h1>
            <p className="mt-5 text-base leading-8 text-[#A1A1AA]">{post.description}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#A1A1AA]">
              <span className="font-medium text-[#E4E4E7]">Conteúdo Nexly</span>
              {post.date && <time dateTime={post.date}>{formatBlogDate(post.date)}</time>}
              <span>{post.tempoLeitura} de leitura</span>
            </div>
            {post.updatedAt && (
              <p className="mt-3 text-xs text-[#A1A1AA]">
                Revisado em <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time>
              </p>
            )}
          </header>
          <div className="mt-8 break-words">{content}</div>
          <div className="mt-10 border-t border-white/10 pt-7">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-indigo-200 hover:text-white"
            >
              ← Todos os artigos
            </Link>
          </div>
        </article>
        <aside aria-label="Conheça o Nexly" className="min-w-0">
          <div className="rounded-2xl border border-white/10 bg-[#111116] p-6 lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
              Sua rotina, mais simples
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-snug tracking-tight">
              Conheça o seu próximo espaço de trabalho.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#A1A1AA]">
              Escolha os recursos de agenda, clientes e gestão que fazem sentido para o seu negócio.
            </p>
            <Link
              href="/cadastro"
              className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/funcionalidades"
              className="mt-3 flex min-h-11 items-center justify-center rounded-xl text-sm text-indigo-200 hover:text-white"
            >
              Ver funcionalidades ↗
            </Link>
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-16 border-t border-white/10 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            Continue explorando
          </p>
          <h2 id="related-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Mais ideias para a sua rotina
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <article
                key={item.slug}
                className="rounded-2xl border border-white/10 bg-[#111116] p-6"
              >
                <p className="text-xs text-indigo-300">
                  {item.categoria} · {item.tempoLeitura}
                </p>
                <h3 className="mt-3 text-lg font-semibold leading-snug">
                  <Link href={`/blog/${item.slug}`} className="rounded hover:text-indigo-200">
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
