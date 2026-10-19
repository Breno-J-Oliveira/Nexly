import { expect, test } from '@playwright/test';
import { parsePostSource } from '../../apps/web/src/lib/blog';
import { formatBlogDate, matchesBlogSearch } from '../../apps/web/src/lib/blog-presentation';

test('blog preserves quoted Portuguese metadata and MDX content', () => {
  const post = parsePostSource(
    '---\r\ntitle: "Gestão: edição"\r\ndate: "2026-10-15"\r\n---\r\n# Conteúdo\nTexto',
    'gestao',
  );
  expect(post.title).toBe('Gestão: edição');
  expect(post.content).toBe('# Conteúdo\nTexto');
  expect(post.categoria).toBe('Gestão');
});

test('blog rejects alias expansion and structured values in metadata', () => {
  expect(() =>
    parsePostSource('---\ntitle: &a "Nome"\ndescription: *a\n---\ntexto', 'alias'),
  ).toThrow();
  expect(() => parsePostSource('---\ntitle: {nested: value}\n---\ntexto', 'objeto')).toThrow();
});

test('blog validates calendar dates and keeps explicit publication and revision dates', () => {
  const post = parsePostSource(
    '---\ndate: "2025-07-01"\nupdatedAt: "2026-10-18"\n---\nConteúdo',
    'post',
  );
  expect(post.date).toBe('2025-07-01');
  expect(post.updatedAt).toBe('2026-10-18');
  expect(() => parsePostSource('---\ndate: "2025-02-30"\n---\nTexto', 'invalid')).toThrow();
  expect(() => parsePostSource('---\nupdatedAt: "2026-13-01"\n---\nTexto', 'invalid')).toThrow();
});

test('blog dates retain their calendar day across host timezones', () => {
  expect(formatBlogDate('2025-07-01')).toMatch(/^1 de jul/);
  expect(formatBlogDate('')).toBe('');
  expect(formatBlogDate('invalid')).toBe('');
  expect(formatBlogDate('2025-02-30')).toBe('');
});

test('blog search ignores accents and case and combines words across fields', () => {
  const post = {
    title: 'Gestão de estoque',
    description: 'Uma rotina para salões',
    categoria: 'Gestão',
  };
  expect(matchesBlogSearch(post, '  GESTAO  saloes ')).toBe(true);
  expect(matchesBlogSearch(post, 'Estoque')).toBe(true);
  expect(matchesBlogSearch(post, 'finanças')).toBe(false);
  expect(matchesBlogSearch(post, '')).toBe(true);
});

test('reading time follows article length unless the author provides an estimate', () => {
  expect(parsePostSource('Palavra '.repeat(410), 'long').tempoLeitura).toBe('3 min');
  expect(parsePostSource('', 'empty').tempoLeitura).toBe('1 min');
  expect(parsePostSource('---\ntempoLeitura: "4 min"\n---\nTexto', 'custom').tempoLeitura).toBe(
    '4 min',
  );
});
