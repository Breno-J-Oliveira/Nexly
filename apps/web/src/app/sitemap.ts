import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexly.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['/', '/funcionalidades', '/precos', '/privacidade', '/termos'].map(
    (route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: route === '/' ? 1 : 0.8,
    }),
  );

  const posts = getAllPosts();
  const blogRoutes = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
