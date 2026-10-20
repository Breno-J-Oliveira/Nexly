import { Prisma } from '@prisma/client';
import { commissionTotals } from './commission-totals';
import { validate } from 'class-validator';
import { CriarProfissionalDto } from '../profissionais/dto/criar-profissional.dto';
import { AtualizarProfissionalDto } from '../profissionais/dto/atualizar-profissional.dto';

describe('valores históricos de comissão', () => {
  it('preserva preço e percentual da conclusão mesmo que o cadastro mude', () => {
    expect(
      commissionTotals(
        [
          {
            servico: { preco: 500 },
            valorServicoConcluido: new Prisma.Decimal(120),
            comissaoPercentualAplicada: new Prisma.Decimal(25),
          },
        ],
        80,
      ),
    ).toEqual({ faturamento: 120, comissao: 30, totalServicos: 1, estimados: 0 });
  });
  it('preserva comissão zero e serviço gratuito sem usar o valor atual', () => {
    expect(
      commissionTotals(
        [{ servico: { preco: 500 }, valorServicoConcluido: 0, comissaoPercentualAplicada: 0 }],
        80,
      ),
    ).toEqual({ faturamento: 0, comissao: 0, totalServicos: 1, estimados: 0 });
  });
  it('identifica registros legados como estimativas sem inventar snapshots', () => {
    expect(
      commissionTotals(
        [
          {
            servico: { preco: 120 },
            valorServicoConcluido: null,
            comissaoPercentualAplicada: null,
          },
        ],
        25,
      ),
    ).toEqual({ faturamento: 120, comissao: 30, totalServicos: 1, estimados: 1 });
  });
  it('arredonda centavos por atendimento e soma com precisão decimal', () => {
    expect(
      commissionTotals(
        Array.from({ length: 3 }, () => ({
          servico: { preco: 0.1 },
          valorServicoConcluido: 0.1,
          comissaoPercentualAplicada: 25,
        })),
        0,
      ),
    ).toEqual({ faturamento: 0.3, comissao: 0.09, totalServicos: 3, estimados: 0 });
  });
  it.each([-1, 100.01, 0.001, NaN, Infinity, null])(
    'recusa percentual inválido: %s',
    async (rate) => {
      for (const Type of [CriarProfissionalDto, AtualizarProfissionalDto]) {
        expect(
          (
            await validate(Object.assign(new Type(), { nome: 'Teste', comissaoPercentual: rate }))
          ).some((error) => error.property === 'comissaoPercentual'),
        ).toBe(true);
      }
    },
  );
  it.each([0, 0.01, 25.5, 100])('aceita percentual válido: %s', async (rate) => {
    for (const Type of [CriarProfissionalDto, AtualizarProfissionalDto])
      expect(
        await validate(Object.assign(new Type(), { nome: 'Teste', comissaoPercentual: rate })),
      ).toEqual([]);
  });
});
