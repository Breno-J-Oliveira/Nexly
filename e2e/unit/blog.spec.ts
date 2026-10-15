import { expect, test } from '@playwright/test';
import { parsePostSource } from '../../apps/web/src/lib/blog';

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
