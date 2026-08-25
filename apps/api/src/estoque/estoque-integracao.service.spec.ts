import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from './estoque.service';
import { EstoqueIntegracaoService } from './estoque-integracao.service';

describe('EstoqueIntegracaoService', () => {
  let service: EstoqueIntegracaoService;
  let prisma: {
    client: { insumoServico: { findMany: jest.Mock } };
  };
  let estoque: { registrarSaida: jest.Mock };

  beforeEach(async () => {
    prisma = { client: { insumoServico: { findMany: jest.fn() } } };
    estoque = { registrarSaida: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EstoqueIntegracaoService,
        { provide: PrismaService, useValue: prisma },
        { provide: EstoqueService, useValue: estoque },
      ],
    }).compile();

    service = moduleRef.get(EstoqueIntegracaoService);
  });

  it('dá baixa em todos os insumos do serviço ao receber evento de conclusão', async () => {
    prisma.client.insumoServico.findMany.mockResolvedValue([
      { produtoId: 'p1', quantidade: 2 },
      { produtoId: 'p2', quantidade: 1 },
    ]);

    await service.handleAgendamentoConcluido({
      agendamentoId: 'ag1',
      servicoId: 's1',
    });

    expect(estoque.registrarSaida).toHaveBeenCalledTimes(2);
    expect(estoque.registrarSaida).toHaveBeenNthCalledWith(
      1,
      'p1',
      2,
      'Consumo no atendimento #ag1',
      'ag1',
    );
    expect(estoque.registrarSaida).toHaveBeenNthCalledWith(
      2,
      'p2',
      1,
      'Consumo no atendimento #ag1',
      'ag1',
    );
  });

  it('não quebra quando o serviço não tem insumos configurados', async () => {
    prisma.client.insumoServico.findMany.mockResolvedValue([]);

    await expect(
      service.handleAgendamentoConcluido({ agendamentoId: 'ag1', servicoId: 's1' }),
    ).resolves.not.toThrow();
    expect(estoque.registrarSaida).not.toHaveBeenCalled();
  });

  it('continua dando baixa nos demais insumos quando um falha', async () => {
    prisma.client.insumoServico.findMany.mockResolvedValue([
      { produtoId: 'p1', quantidade: 1 },
      { produtoId: 'p2', quantidade: 1 },
      { produtoId: 'p3', quantidade: 1 },
    ]);
    estoque.registrarSaida
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Saldo insuficiente'))
      .mockResolvedValueOnce(undefined);

    // Não deve lançar — falhas são logadas e o fluxo continua.
    await expect(
      service.handleAgendamentoConcluido({ agendamentoId: 'ag1', servicoId: 's1' }),
    ).resolves.not.toThrow();

    expect(estoque.registrarSaida).toHaveBeenCalledTimes(3);
  });
});