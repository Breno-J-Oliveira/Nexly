import type { Prisma } from '@prisma/client';
import type { ListarProdutosDto } from './dto/listar-produtos.dto';

export type BuscaProduto = Pick<ListarProdutosDto, 'search' | 'sku'>;

export function filtroBuscaProduto({ search, sku }: BuscaProduto): Prisma.ProdutoWhereInput {
  return {
    ...(sku ? { sku } : {}),
    ...(search
      ? {
          OR: [
            { nome: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
