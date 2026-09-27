import { BadRequestException } from '@nestjs/common';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  decodeCursor,
  encodeCursor,
  montarPagina,
  normalizarLimite,
} from './cursor';

describe('pagination/cursor', () => {
  describe('normalizarLimite', () => {
    it('usa o padrão quando ausente ou inválido', () => {
      expect(normalizarLimite()).toBe(LIMITE_PADRAO);
      expect(normalizarLimite(null)).toBe(LIMITE_PADRAO);
      expect(normalizarLimite(0)).toBe(LIMITE_PADRAO);
      expect(normalizarLimite(-5)).toBe(LIMITE_PADRAO);
      expect(normalizarLimite(Number.NaN)).toBe(LIMITE_PADRAO);
    });

    it('respeita o teto e trunca decimais', () => {
      expect(normalizarLimite(10)).toBe(10);
      expect(normalizarLimite(500)).toBe(LIMITE_MAXIMO);
      expect(normalizarLimite(100.9)).toBe(100);
    });
  });

  describe('encodeCursor/decodeCursor', () => {
    it('faz round-trip do payload', () => {
      const payload = { nome: 'Ana', id: 'abc-123' };
      expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
    });

    it('gera cursor URL-safe (sem +, / ou =)', () => {
      expect(encodeCursor({ id: 'a/b+c=d?' })).not.toMatch(/[/+=?]/);
    });

    it('lança 400 CURSOR_INVALIDO quando o base64 não é objeto', () => {
      const numero = Buffer.from('123', 'utf8').toString('base64url');
      expect(() => decodeCursor(numero)).toThrow(BadRequestException);
    });

    it('lança 400 quando o base64 decodifica para array', () => {
      const array = Buffer.from('[1,2]', 'utf8').toString('base64url');
      expect(() => decodeCursor(array)).toThrow(BadRequestException);
    });

    it('lança 400 para string lixo', () => {
      expect(() => decodeCursor('%%%')).toThrow(BadRequestException);
    });
  });

  describe('montarPagina', () => {
    type Item = { nome: string; id: string };
    const chave = (i: Item): Record<string, string> => ({ nome: i.nome, id: i.id });
    const itens = (n: number): Item[] =>
      Array.from({ length: n }, (_, k) => ({ nome: `N${k}`, id: `id${k}` }));

    it('sem próxima página: hasNext=false e nextCursor=null', () => {
      const pagina = montarPagina(itens(3), 5, chave);
      expect(pagina.data).toHaveLength(3);
      expect(pagina.hasNext).toBe(false);
      expect(pagina.nextCursor).toBeNull();
    });

    it('com item extra: corta no limite e usa o último devolvido no cursor', () => {
      const pagina = montarPagina(itens(6), 5, chave);
      expect(pagina.data).toHaveLength(5);
      expect(pagina.hasNext).toBe(true);
      expect(pagina.nextCursor).not.toBeNull();
      // cursor aponta para o ÚLTIMO item devolvido (N4), nunca para o extra (N5)
      expect(decodeCursor(pagina.nextCursor ?? '')).toEqual({ nome: 'N4', id: 'id4' });
    });

    it('lista vazia devolve página vazia', () => {
      const pagina = montarPagina([], 5, chave);
      expect(pagina.data).toEqual([]);
      expect(pagina.hasNext).toBe(false);
      expect(pagina.nextCursor).toBeNull();
    });
  });
});
