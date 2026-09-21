import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  categoria: string;
  tempoLeitura: string;
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));
  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    return {
      slug,
      title: (data.title as string) ?? slug,
      description: (data.description as string) ?? '',
      date: (data.date as string) ?? '',
      categoria: (data.categoria as string) ?? 'Gestão',
      tempoLeitura: (data.tempoLeitura as string) ?? '5 min',
      content,
    };
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
