import { saleDateFilter } from './sale-date-filter';

describe('limites de vendas e exportacao', () => {
  it('inclui o ultimo dia completo para datas legadas', () => {
    expect(saleDateFilter('2026-10-15', '2026-10-15')).toEqual({
      gte: new Date('2026-10-15T00:00:00Z'),
      lte: new Date('2026-10-15T23:59:59.999Z'),
    });
  });
  it('preserva o fim do dia brasileiro transmitido pelo navegador', () => {
    expect(
      saleDateFilter(
        '2026-10-15T00:00:00-03:00',
        '2026-10-15T23:59:59.999-03:00',
      )?.lte?.toISOString(),
    ).toBe('2026-10-16T02:59:59.999Z');
  });
  it.each([
    ['2026-02-31', undefined],
    ['2026-10-15T10:00:00', undefined],
    ['invalid', undefined],
    ['2026-10-16', '2026-10-15'],
  ])('recusa limites invalidos %s / %s', (start, end) => {
    expect(() => saleDateFilter(start, end)).toThrow();
  });
  it('permite um limite aberto e ausencia de filtros', () => {
    expect(saleDateFilter(undefined, '2026-10-15')?.gte).toBeUndefined();
    expect(saleDateFilter()).toBeUndefined();
  });
});
