import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { z } from 'zod';

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  categoria: string;
  tempoLeitura: string;
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Data de publicação inválida');

const metadata = z.object({
  title: z.string().optional(),
  description: z.string().default(''),
  date: dateString.optional(),
  updatedAt: dateString.optional(),
  categoria: z.string().default('Gestão'),
  tempoLeitura: z.string().optional(),
});

export function parsePostSource(raw: string, slug: string): Post {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  const decoded: unknown = header ? parse(header[1] ?? '', { maxAliasCount: 0 }) : {};
  const data = metadata.parse(decoded ?? {});
  const content = header ? raw.slice(header[0].length) : raw;
  const words = content
    .replace(/https?:\/\/\S+/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    ...data,
    title: data.title ?? slug,
    date: data.date ?? '',
    tempoLeitura: data.tempoLeitura ?? `${Math.max(1, Math.ceil(words / 200))} min`,
    slug,
    content,
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
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
