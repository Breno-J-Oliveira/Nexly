import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog — Nexly',
  description: 'Insights e conteúdos para crescer seu negócio de beleza, estética ou pet.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#818CF8' }}>
        Blog
      </p>
      <h1 className="mt-2 text-4xl font-bold" style={{ color: '#FAFAFA' }}>
        Insights para crescer seu negócio
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:border-[#6366F1]/40"
            style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818CF8' }}
            >
              {post.categoria}
            </span>
            <h2 className="mt-3 text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              {post.title}
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#A1A1AA' }}>
              {post.description}
            </p>
            <p className="mt-4 text-xs" style={{ color: '#71717A' }}>
              {new Date(post.date).toLocaleDateString('pt-BR')} · {post.tempoLeitura}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
