import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { compileMDX } from 'next-mdx-remote/rsc';
import { mdxComponents } from '@/components/mdx-components';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

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
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Nexly' },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm" style={{ color: '#71717A' }}>
        <Link href="/blog" className="hover:text-[#A1A1AA]">
          Blog
        </Link>{' '}
        → {post.title}
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818CF8' }}
          >
            {post.categoria}
          </span>
          <h1 className="mt-3 text-3xl font-bold" style={{ color: '#FAFAFA' }}>
            {post.title}
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#71717A' }}>
            {new Date(post.date).toLocaleDateString('pt-BR')} · {post.tempoLeitura}
          </p>
          <div className="mt-6">{content}</div>
        </article>

        <aside>
          <div
            className="rounded-2xl border p-6"
            style={{
              backgroundColor: 'rgba(99,102,241,0.08)',
              borderColor: 'rgba(99,102,241,0.2)',
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>
              Comece grátis no Nexly
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#A1A1AA' }}>
              Agenda, estoque e PDV em uma única plataforma.
            </p>
            <Link
              href="/cadastro"
              className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: '#6366F1', color: '#fff' }}
            >
              Criar conta grátis
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
