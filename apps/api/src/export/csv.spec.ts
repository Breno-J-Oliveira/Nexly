import { csvCell } from './csv';

describe('CSV seguro', () => {
  it('escapa aspas, delimitador e quebras mantendo uma célula', () => {
    expect(csvCell('Nome; "apelido"\nLinha', true)).toBe('"Nome; ""apelido""\nLinha"');
  });
  it.each(['=HYPERLINK("x")', '+1+1', '-1+1', '@SUM(A1)', '  =1+1', '\t=1+1'])(
    'neutraliza fórmula %s',
    (value) => {
      expect(csvCell(value, true)).toContain("'");
    },
  );
  it('preserva números e nomes normais', () => {
    expect(csvCell('Maria', true)).toBe('"Maria"');
    expect(csvCell(-10)).toBe('"-10"');
  });
});
