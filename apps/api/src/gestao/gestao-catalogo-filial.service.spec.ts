import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { RedisService } from '../redis/redis.service';
import { BuscaCatalogoFilialDto } from './gestao.dto';
import { GestaoService } from './gestao.service';

function fixture() {
  const client = {
    filial: { findFirst: jest.fn().mockResolvedValue({ id: 'filial' }) },
    produto: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    client,
    service: new GestaoService(
      { client } as unknown as PrismaService,
      {} as RedisService,
      {} as EstoqueService,
    ),
  };
}

describe('Catálogo do PDV da filial', () => {
  it('filtra por nome ou código no banco antes do limite existente', async () => {
    const { client, service } = fixture();

    await service.catalogoFilial('empresa', 'filial', { search: 'shampoo' });

    expect(client.produto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { nome: { contains: 'shampoo', mode: 'insensitive' } },
            { sku: { contains: 'shampoo', mode: 'insensitive' } },
          ],
        }),
        take: 500,
      }),
    );
  });

  it('consulta código exato com a quantidade da filial da empresa autenticada', async () => {
    const { client, service } = fixture();
    client.produto.findMany.mockResolvedValueOnce([
      { id: 'produto', sku: '000123', estoqueAtual: 99, saldosFilial: [{ quantidade: 3 }] },
    ]);

    await expect(service.catalogoFilial('empresa', 'filial', { sku: '000123' })).resolves.toEqual({
      data: [{ id: 'produto', sku: '000123', estoqueAtual: 3 }],
    });

    expect(client.produto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa',
          ativo: true,
          sku: '000123',
          saldosFilial: {
            some: { filialId: 'filial', empresaId: 'empresa', quantidade: { gt: 0 } },
          },
        },
        include: {
          saldosFilial: {
            where: { filialId: 'filial', empresaId: 'empresa' },
            select: { quantidade: true },
          },
        },
      }),
    );
  });

  it('não busca produto quando a filial não pertence à empresa ou está inativa', async () => {
    const { client, service } = fixture();
    client.filial.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.catalogoFilial('empresa', 'outra-filial', { sku: '000123' }),
    ).rejects.toThrow('Filial indisponível');
    expect(client.filial.findFirst).toHaveBeenCalledWith({
      where: { id: 'outra-filial', empresaId: 'empresa', ativa: true },
    });
    expect(client.produto.findMany).not.toHaveBeenCalled();
  });

  it('normaliza o código e valida tamanho antes de consultar o catálogo', async () => {
    const busca = plainToInstance(BuscaCatalogoFilialDto, { sku: ' 0012 ' });
    await expect(validate(busca)).resolves.toEqual([]);
    expect(busca.sku).toBe('0012');

    const invalida = plainToInstance(BuscaCatalogoFilialDto, { sku: '0'.repeat(61) });
    await expect(validate(invalida)).resolves.toEqual([
      expect.objectContaining({ property: 'sku' }),
    ]);
  });
});
