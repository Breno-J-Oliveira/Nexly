/** CSV limitado para prévia no navegador; a API revalida todos os dados. */
export function lerCsv(texto: string): Record<string, string>[] {
  if (texto.length > 2 * 1024 * 1024) throw new Error('O arquivo deve ter até 2 MB.');
  texto = texto.replace(/^\uFEFF/, '');
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const separador = primeira.includes(';') ? ';' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [],
    valor = '',
    aspas = false,
    fechou = false;
  for (let i = 0; i <= texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === undefined) throw new Error('Há aspas sem fechamento no CSV.');
      if (c === '"') {
        if (texto[i + 1] === '"') {
          valor += '"';
          i++;
        } else {
          aspas = false;
          fechou = true;
        }
      } else valor += c;
      continue;
    }
    if (c === '"') {
      if (valor.length || fechou) throw new Error('Aspas em posição inválida no CSV.');
      aspas = true;
      continue;
    }
    if (c === separador || c === '\n' || c === '\r' || c === undefined) {
      linha.push(valor.trim());
      valor = '';
      fechou = false;
      if (c !== separador) {
        if (linha.some(Boolean)) linhas.push(linha);
        linha = [];
        if (c === '\r' && texto[i + 1] === '\n') i++;
      }
      if (linhas.length > 501 || linha.length > 10)
        throw new Error('Importe até 500 cadastros e 10 colunas por arquivo.');
      continue;
    }
    if (fechou && !/\s/.test(c)) throw new Error('Conteúdo após fechamento de aspas no CSV.');
    if (!fechou) valor += c;
  }
  const cabecalho = linhas.shift()?.map((s) => s.toLowerCase()) ?? [];
  if (!cabecalho.includes('nome')) throw new Error('Inclua a coluna nome no cabeçalho.');
  if (new Set(cabecalho).size !== cabecalho.length)
    throw new Error('Há colunas repetidas no cabeçalho.');
  const permitidas = ['nome', 'email', 'telefone', 'sku', 'preco', 'estoqueatual'];
  if (cabecalho.some((c) => !permitidas.includes(c)))
    throw new Error('Use somente nome, email, telefone, sku, preco e estoqueAtual.');
  if (!linhas.length) throw new Error('O arquivo não contém cadastros.');
  return linhas.map((dados, i) => {
    if (dados.length !== cabecalho.length)
      throw new Error(`A linha ${i + 2} tem uma quantidade diferente de colunas.`);
    return Object.fromEntries(cabecalho.map((c, j) => [c, dados[j] ?? '']));
  });
}
