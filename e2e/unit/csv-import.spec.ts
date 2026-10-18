import { test, expect } from '@playwright/test';
import { lerCsv } from '@nexly/shared';
test('CSV aceita BOM, aspas escapadas, delimitador e linha dentro do nome', () => {
  expect(
    lerCsv(
      '\uFEFFnome;email\r\n"Maria; Silva";m@example.test\r\n"João ""J""\nSilva";j@example.test',
    ),
  ).toEqual([
    { nome: 'Maria; Silva', email: 'm@example.test' },
    { nome: 'João "J"\nSilva', email: 'j@example.test' },
  ]);
});
test('CSV rejeita estrutura ambígua, colunas repetidas e listas excessivas', () => {
  for (const value of [
    'nome;nome\na;b',
    'nome;email\na;b;c',
    'nome\n"sem fechar',
    'nome\n"a"x',
    'senha\nvalor',
    'nome\n',
  ])
    expect(() => lerCsv(value)).toThrow();
  expect(() => lerCsv('nome\n' + Array(501).fill('Nome').join('\n'))).toThrow(/500/);
});
test('CSV aceita vírgula e preserva texto que parece fórmula sem executar', () => {
  expect(lerCsv('nome,email\n"=SOMA(1;2)",a@example.test')[0]?.nome).toBe('=SOMA(1;2)');
});
