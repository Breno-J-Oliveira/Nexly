import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';

test('concorrência preserva estoque, agenda, recebimentos e isolamento entre empresas', async ({
  request,
}) => {
  test.setTimeout(120_000);
  const local = (value: string) => ['localhost', '127.0.0.1'].includes(new URL(value).hostname);
  const origin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  test.skip(
    !local(process.env.DATABASE_URL || 'http://unavailable') || !local(origin),
    'Estresse apenas em API e banco locais',
  );
  const db = new PrismaClient();
  const id = randomUUID(),
    email = `stress-${id}@example.test`;
  const empresa = await db.empresa.create({
    data: {
      nome: 'TESTE concorrência',
      cnpj: id,
      usuarios: {
        create: {
          nome: 'Gestor teste',
          email,
          role: 'ADMIN',
          senhaHash: await argon2.hash('StressTeste123!'),
        },
      },
    },
  });
  const outra = await db.empresa.create({
    data: { nome: 'TESTE outra empresa', cnpj: randomUUID() },
  });
  try {
    const login = await request.post(`${origin}/api/auth/login`, {
      data: { email, senha: 'StressTeste123!' },
    });
    expect(login.ok()).toBe(true);
    const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` };
    const vender = (produtoId: string, chaveOperacao: string, cupomCodigo?: string) =>
      request.post(`${origin}/api/vendas`, {
        headers,
        data: {
          itens: [{ produtoId, quantidade: 1 }],
          chaveOperacao,
          formaPagamento: 'Pix',
          cupomCodigo,
        },
      });
    const produto = await db.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Última unidade',
        sku: 'LAST',
        preco: 10,
        estoqueAtual: 1,
      },
    });
    const chave = randomUUID();
    const repetidas = await Promise.all(
      Array.from({ length: 20 }, () => vender(produto.id, chave)),
    );
    expect(repetidas.map((r) => r.status())).toEqual(Array(20).fill(201));
    const idsRepetidos = await Promise.all(repetidas.map(async (r) => (await r.json()).id));
    expect(new Set(idsRepetidos).size).toBe(1);
    expect(await db.venda.count({ where: { empresaId: empresa.id } })).toBe(1);
    expect(
      await db.movimentacaoEstoque.count({ where: { produtoId: produto.id, tipo: 'SAIDA' } }),
    ).toBe(1);
    expect((await db.produto.findUniqueOrThrow({ where: { id: produto.id } })).estoqueAtual).toBe(
      0,
    );

    const disputado = await db.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Unidade disputada',
        sku: 'RACE',
        preco: 10,
        estoqueAtual: 1,
      },
    });
    const concorrentes = await Promise.all(
      Array.from({ length: 12 }, () => vender(disputado.id, randomUUID())),
    );
    expect(concorrentes.filter((r) => r.status() === 201)).toHaveLength(1);
    expect(concorrentes.filter((r) => r.status() === 409)).toHaveLength(11);
    expect((await db.produto.findUniqueOrThrow({ where: { id: disputado.id } })).estoqueAtual).toBe(
      0,
    );

    // Repetir uma venda não deve validar novamente o cupom já consumido por ela.
    const comCupom = await db.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Venda com cupom',
        sku: 'COUPON',
        preco: 10,
        estoqueAtual: 20,
      },
    });
    const cupom = await db.cupom.create({
      data: { empresaId: empresa.id, codigo: 'UNICO', tipo: 'FIXO', valor: 2, usoMaximo: 1 },
    });
    const chaveCupom = randomUUID();
    const comCupomRepetidas = await Promise.all(
      Array.from({ length: 16 }, () => vender(comCupom.id, chaveCupom, cupom.codigo)),
    );
    expect(comCupomRepetidas.map((r) => r.status())).toEqual(Array(16).fill(201));
    expect(await db.venda.count({ where: { empresaId: empresa.id, cupomId: cupom.id } })).toBe(1);
    expect((await db.cupom.findUniqueOrThrow({ where: { id: cupom.id } })).usoAtual).toBe(1);
    expect((await db.produto.findUniqueOrThrow({ where: { id: comCupom.id } })).estoqueAtual).toBe(
      19,
    );
    expect((await vender(comCupom.id, chaveCupom)).status()).toBe(409);
    expect((await vender(comCupom.id, randomUUID(), cupom.codigo)).status()).toBe(422);

    const conta = await db.lancamentoFinanceiro.create({
      data: {
        empresaId: empresa.id,
        descricao: 'Conta de teste',
        tipo: 'RECEBER',
        valor: 10,
        vencimento: new Date(),
      },
    });
    const chavePagamento = randomUUID();
    const pagamentos = await Promise.all(
      Array.from({ length: 12 }, () =>
        request.post(`${origin}/api/gestao/financeiro/${conta.id}/baixar`, {
          headers,
          data: { valor: 10, chave: chavePagamento },
        }),
      ),
    );
    expect(pagamentos.map((r) => r.status())).toEqual(Array(12).fill(201));
    expect(await db.baixaFinanceira.count({ where: { lancamentoId: conta.id } })).toBe(1);
    expect(
      Number(
        (await db.lancamentoFinanceiro.findUniqueOrThrow({ where: { id: conta.id } })).valorPago,
      ),
    ).toBe(10);

    const cliente = await db.cliente.create({
      data: { empresaId: empresa.id, nome: 'Cliente teste' },
    });
    const profissional = await db.profissional.create({
      data: { empresaId: empresa.id, nome: 'Profissional teste' },
    });
    const servico = await db.servico.create({
      data: { empresaId: empresa.id, nome: 'Serviço teste', duracaoMin: 30, preco: 30 },
    });
    const dataHora = new Date(Date.now() + 86400_000).toISOString();
    const agendamentos = await Promise.all(
      Array.from({ length: 8 }, () =>
        request.post(`${origin}/api/agendamentos`, {
          headers,
          data: {
            clienteId: cliente.id,
            profissionalId: profissional.id,
            servicoId: servico.id,
            dataHora,
          },
        }),
      ),
    );
    expect(agendamentos.filter((r) => r.status() === 201)).toHaveLength(1);
    expect(agendamentos.filter((r) => r.status() === 409)).toHaveLength(7);
    expect(await db.agendamento.count({ where: { empresaId: empresa.id } })).toBe(1);

    const estrangeiro = await db.produto.create({
      data: {
        empresaId: outra.id,
        nome: 'Produto privado',
        sku: 'PRIVATE',
        preco: 10,
        estoqueAtual: 5,
      },
    });
    expect((await vender(estrangeiro.id, randomUUID())).status()).toBe(404);
    expect(
      (await request.get(`${origin}/api/produtos/${estrangeiro.id}`, { headers })).status(),
    ).toBe(404);
    expect(
      (await db.produto.findUniqueOrThrow({ where: { id: estrangeiro.id } })).estoqueAtual,
    ).toBe(5);
    expect(await db.venda.count({ where: { empresaId: outra.id } })).toBe(0);
  } finally {
    await db.agendamento.deleteMany({ where: { empresaId: empresa.id } });
    await db.empresa.deleteMany({ where: { id: { in: [empresa.id, outra.id] } } });
    await db.$disconnect();
  }
});
