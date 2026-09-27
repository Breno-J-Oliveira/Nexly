import { RECURSO_PARA_MODELO, paraJson, sanitizar } from './audit-diff';

describe('audit-diff', () => {
  describe('sanitizar', () => {
    it('substitui campos sensíveis por [REDACTED]', () => {
      expect(sanitizar({ nome: 'Ana', senha: 'segredo123' })).toEqual({
        nome: 'Ana',
        senha: '[REDACTED]',
      });
    });

    it('redige credenciais em qualquer profundidade', () => {
      expect(sanitizar({ usuario: { email: 'a@b.com', novaSenha: 'x' } })).toEqual({
        usuario: { email: 'a@b.com', novaSenha: '[REDACTED]' },
      });
    });

    it('cobre senha, tokens, 2FA e cartão', () => {
      const entrada = {
        senha: 's',
        senhaAtual: 's',
        novaSenha: 's',
        senhaHash: 'h',
        password: 'p',
        code: '123456',
        tempToken: 't',
        refreshToken: 'r',
        accessToken: 'a',
        token: 'x',
        numeroCartao: '4111',
        cvv: '123',
        twoFactorSecret: 'sec',
        twoFactorBackupCodes: ['b1'],
        secret: 'k',
      };
      const saida = sanitizar(entrada) ?? {};
      expect(Object.keys(entrada)).toHaveLength(15);
      for (const chave of Object.keys(entrada)) {
        expect(saida[chave]).toBe('[REDACTED]');
      }
    });

    it('preserva campos de negócio (incluindo aninhados e arrays)', () => {
      const entrada = {
        nome: 'Corte',
        preco: 40,
        itens: [{ produtoId: 'p1', quantidade: 2 }],
      };
      expect(sanitizar(entrada)).toEqual(entrada);
    });

    it('não redige o código do cupom (dado de negócio)', () => {
      expect(sanitizar({ codigo: 'NEXLY10' })).toEqual({ codigo: 'NEXLY10' });
    });

    it('retorna undefined para entrada que não é objeto', () => {
      expect(sanitizar(null)).toBeUndefined();
      expect(sanitizar(undefined)).toBeUndefined();
      expect(sanitizar('texto')).toBeUndefined();
      expect(sanitizar([1, 2])).toBeUndefined();
    });
  });

  describe('paraJson', () => {
    it('converte Date para ISO', () => {
      expect(paraJson({ id: '1', criadoEm: new Date('2025-01-02T03:04:05.000Z') })).toEqual({
        id: '1',
        criadoEm: '2025-01-02T03:04:05.000Z',
      });
    });

    it('retorna undefined para não-objetos', () => {
      expect(paraJson(null)).toBeUndefined();
      expect(paraJson(42)).toBeUndefined();
    });
  });

  describe('RECURSO_PARA_MODELO', () => {
    it('mapeia os recursos auditáveis', () => {
      expect(RECURSO_PARA_MODELO.Clientes).toBe('cliente');
      expect(RECURSO_PARA_MODELO.Produtos).toBe('produto');
      expect(RECURSO_PARA_MODELO.Usuarios).toBe('usuario');
      expect(RECURSO_PARA_MODELO.Vendas).toBe('venda');
    });
  });
});
