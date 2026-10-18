import type { ValidationError } from 'class-validator';
const labels: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  senha: 'Senha',
  preco: 'Preço',
  custoAtual: 'Custo de aquisição',
  duracaoMin: 'Duração',
  dataHora: 'Data e horário',
  clienteId: 'Cliente',
  profissionalId: 'Profissional',
  servicoId: 'Serviço',
  quantidade: 'Quantidade',
  estoqueMinimo: 'Estoque mínimo',
  estoqueAtual: 'Estoque',
  valor: 'Valor',
  filialId: 'Filial',
  vencimento: 'Vencimento',
  descricao: 'Descrição',
  titulo: 'Título',
  telefone: 'Telefone',
  cnpj: 'CNPJ',
  codigo: 'Código',
  ativo: 'Situação',
  role: 'Função',
  token: 'Link de recuperação',
  chave: 'Identificação da operação',
  origemId: 'Unidade de origem',
  destinoId: 'Unidade de destino',
};
const messages: Record<string, string> = {
  isEmail: 'informe um e-mail válido',
  isUuid: 'selecione um registro válido',
  isString: 'informe um texto válido',
  isNumber: 'informe um número válido',
  isInt: 'informe um número inteiro',
  isBoolean: 'selecione uma opção válida',
  isEnum: 'selecione uma opção válida',
  isIn: 'selecione uma opção válida',
  isDateString: 'informe uma data válida',
  isIso8601: 'informe uma data válida',
  isTimeZone: 'selecione um fuso horário válido',
  isObject: 'confira as configurações informadas',
  isArray: 'informe uma lista válida',
  arrayMinSize: 'inclua ao menos um item',
  arrayMaxSize: 'a lista excede o limite de itens',
  whitelistValidation: 'este campo não é permitido',
};
export function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.entries(error.constraints ?? {}).map(([rule, original]) => {
      const label = labels[error.property] ?? error.property;
      if (rule === 'isLength' || rule === 'minLength' || rule === 'maxLength')
        return `${label}: confira a quantidade de caracteres permitida`;
      if (rule === 'min' || rule === 'max')
        return `${label}: o valor está fora dos limites permitidos`;
      if (rule === 'matches' && !/must match/.test(original)) return original;
      return `${label}: ${messages[rule] ?? 'confira o formato e os limites deste campo'}`;
    }),
    ...validationMessages(error.children ?? []),
  ]);
}
