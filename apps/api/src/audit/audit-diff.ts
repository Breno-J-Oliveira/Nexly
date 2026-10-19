/**
 * Campos que NUNCA podem ser gravados no log de auditoria — nem em texto,
 * nem em hash. Substituídos por `[REDACTED]`.
 */
const CAMPOS_SENSIVEIS = new Set([
  'senha',
  'senhaAtual',
  'novaSenha',
  'senhaHash',
  'password',
  'code',
  'tempToken',
  'credential',
  'registrationToken',
  'googleSubject',
  'nonce',
  'refreshToken',
  'accessToken',
  'token',
  'numeroCartao',
  'cvv',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'twoFactorChallengeHash',
  'twoFactorChallengeExpiresAt',
  'twoFactorLastUsedStep',
  'secret',
]);

/**
 * Recurso da rota (como o AuditInterceptor deriva do path) → model Prisma.
 * Só recursos com `id` + `empresaId` podem ter o "antes" recuperado.
 */
export const RECURSO_PARA_MODELO: Record<string, string> = {
  Tarefas: 'tarefa',
  Filiais: 'filial',
  Documentos: 'documento',
  Campanhas: 'campanha',
  Automacoes: 'automacao',
  Recorrencias: 'recorrencia',
  Clientes: 'cliente',
  Produtos: 'produto',
  Servicos: 'servico',
  Profissionais: 'profissional',
  Agendamentos: 'agendamento',
  Vendas: 'venda',
  Usuarios: 'usuario',
  Fornecedores: 'fornecedor',
  Cupons: 'cupom',
  Avaliacoes: 'avaliacao',
  Notificacoes: 'notificacao',
};

/**
 * Remove recursivamente campos sensíveis de um payload antes de gravá-lo no
 * AuditLog. Retorna `undefined` para entradas que não são objetos.
 */
export function sanitizar(dados: unknown): Record<string, unknown> | undefined {
  if (dados === null || dados === undefined) return undefined;
  if (typeof dados !== 'object' || Array.isArray(dados)) return undefined;

  const resultado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(dados as Record<string, unknown>)) {
    if (CAMPOS_SENSIVEIS.has(chave)) {
      resultado[chave] = '[REDACTED]';
      continue;
    }
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      resultado[chave] = sanitizar(valor);
      continue;
    }
    resultado[chave] = valor;
  }
  return resultado;
}

/**
 * Normaliza um registro Prisma para JSON simples (Decimal → number,
 * Date → ISO). É o formato gravado nas colunas `Json` do AuditLog.
 */
export function paraJson(valor: unknown): Record<string, unknown> | undefined {
  if (valor === null || valor === undefined || typeof valor !== 'object') return undefined;
  return JSON.parse(JSON.stringify(valor)) as Record<string, unknown>;
}
