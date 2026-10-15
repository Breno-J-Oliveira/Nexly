import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { z } from 'zod';

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

const metadata = z.object({
  title: z.string().optional(),
  description: z.string().default(''),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  categoria: z.string().default('Gestão'),
  tempoLeitura: z.string().default('5 min'),
});

export function parsePostSource(raw: string, slug: string): Post {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  const decoded: unknown = header ? parse(header[1] ?? '', { maxAliasCount: 0 }) : {};
  const data = metadata.parse(decoded ?? {});
  return {
    ...data,
    title: data.title ?? slug,
    date: data.date ?? '',
    slug,
    content: header ? raw.slice(header[0].length) : raw,
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));
  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    return parsePostSource(raw, slug);
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
