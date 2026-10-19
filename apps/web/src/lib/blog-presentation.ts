export function formatBlogDate(value: string): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function normalizeBlogSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function matchesBlogSearch(
  post: { title: string; description: string; categoria: string },
  query: string,
): boolean {
  const text = normalizeBlogSearch(`${post.title} ${post.description} ${post.categoria}`);
  return normalizeBlogSearch(query.slice(0, 120))
    .split(/\s+/)
    .every((term) => text.includes(term));
}
