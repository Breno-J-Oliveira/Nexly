import { BadRequestException } from '@nestjs/common';

/** Limite padrão de itens por página. */
export const LIMITE_PADRAO = 25;

/** Teto de itens por página — impede uma listagem de virar um dump. */
export const LIMITE_MAXIMO = 100;

/** Normaliza o `limit` recebido na query (padrão 25, máximo 100). */
export function normalizarLimite(valor?: number | null): number {
  if (!valor || valor < 1 || Number.isNaN(valor)) return LIMITE_PADRAO;
  return Math.min(Math.floor(valor), LIMITE_MAXIMO);
}

/** Serializa o cursor em base64url (URL-safe, sem padding). */
export function encodeCursor(payload: Record<string, string | number | null>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Desserializa e valida o cursor. Lança 400 (`CURSOR_INVALIDO`) quando o
 * valor é malformado — nunca 500, e nunca um cursor "meio válido".
 */
export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('cursor não é um objeto');
    }
    return parsed as T;
  } catch {
    throw new BadRequestException({
      code: 'CURSOR_INVALIDO',
      message: 'Cursor de paginação inválido. Recarregue a lista.',
    });
  }
}

export interface PaginaComCursor<T> {
  data: T[];
  hasNext: boolean;
  nextCursor: string | null;
}

/**
 * Monta a página a partir de `limit + 1` registros.
 *
 * A consulta de keyset deve pedir `limit + 1`: se vier um item a mais, existe
 * próxima página — e o cursor é extraído do último item DEVOLVIDO (não do
 * extra), garantindo que nada seja pulado nem repetido.
 */
export function montarPagina<T>(
  itens: T[],
  limite: number,
  chaveDoItem: (item: T) => Record<string, string | number | null>,
): PaginaComCursor<T> {
  const hasNext = itens.length > limite;
  const data = hasNext ? itens.slice(0, limite) : itens;
  const ultimo = data[data.length - 1];
  return {
    data,
    hasNext,
    nextCursor: hasNext && ultimo ? encodeCursor(chaveDoItem(ultimo)) : null,
  };
}
