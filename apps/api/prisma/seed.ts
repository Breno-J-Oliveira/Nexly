import { PrismaClient, Role, StatusAgendamento, TipoMovimentacao } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const SENHA_DEMO = 'nexly123';
const EMAIL_DEMO = 'admin@nexly.com.br';

function diasAtras(n: number, hora = 9, minuto = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

function diasFuturo(n: number, hora = 9, minuto = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

function minutosDepois(base: Date, minutos: number): Date {
  return new Date(base.getTime() + minutos * 60_000);
}

async function main(): Promise<void> {
  console.log('[seed] iniciando...');
  const existente = await prisma.usuario.findUnique({ where: { email: EMAIL_DEMO } });
  console.log('[seed] usuario existente:', existente?.email ?? 'nenhum');
  if (existente) {
    console.log('Seed: empresa demo já existe, ignorando.');
    return;
  }

  const senhaHash = await argon2.hash(SENHA_DEMO, { type: argon2.argon2id });

  // ── Empresa + Admin ────────────────────────────────────────
  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Salão Beleza Total',
      cnpj: '12.345.678/0001-90',
      usuarios: {
        create: {
          nome: 'Admin Demo',
          email: EMAIL_DEMO,
          senhaHash,
          role: Role.ADMIN,
        },
      },
    },
  });
  console.log(`✓ Empresa: ${empresa.nome}`);

  // ── Profissionais ──────────────────────────────────────────
  const ana = await prisma.profissional.create({
    data: { empresaId: empresa.id, nome: 'Ana Silva', especialidade: 'Cabeleireira' },
  });
  const bruno = await prisma.profissional.create({
    data: { empresaId: empresa.id, nome: 'Bruno Costa', especialidade: 'Barbeiro' },
  });
  const carla = await prisma.profissional.create({
    data: { empresaId: empresa.id, nome: 'Carla Souza', especialidade: 'Manicure' },
  });
  console.log('✓ Profissionais: Ana, Bruno, Carla');

  // ── Produtos ───────────────────────────────────────────────
  const shampoo = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Shampoo Profissional 1L', sku: 'SH-001',
      preco: 45.9, estoqueAtual: 30, estoqueMinimo: 5, categoria: 'Cosméticos',
    },
  });
  const tinta = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Tinta de Cabelo Castanho', sku: 'TT-002',
      preco: 28.5, estoqueAtual: 18, estoqueMinimo: 5, categoria: 'Coloração',
    },
  });
  const oleo = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Óleo Reparador 100ml', sku: 'OL-003',
      preco: 35.0, estoqueAtual: 3, estoqueMinimo: 5, categoria: 'Tratamento',
    },
  });
  const gel = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Gel Fixador 250g', sku: 'GL-004',
      preco: 22.0, estoqueAtual: 0, estoqueMinimo: 4, categoria: 'Finalização',
    },
  });
  const base = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Base para Unha 9ml', sku: 'BS-005',
      preco: 12.0, estoqueAtual: 50, estoqueMinimo: 10, categoria: 'Manicure',
    },
  });
  const acetona = await prisma.produto.create({ data: { empresaId: empresa.id, nome: "Acetona 500ml", sku: "ACE-001", preco: 12.00, estoqueAtual: 60, estoqueMinimo: 10, categoria: "Removedores" } });

  const esmalte = await prisma.produto.create({
    data: {
      empresaId: empresa.id, nome: 'Esmalte Vermelho 8ml', sku: 'ES-006',
      preco: 8.5, estoqueAtual: 25, estoqueMinimo: 10, categoria: 'Manicure',
    },
  });
  console.log('✓ Produtos: 6 cadastrados (2 com alerta de estoque)');

  // ── Serviços ───────────────────────────────────────────────
  const corteFeminino = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Corte Feminino', duracaoMin: 45, preco: 60.0 },
  });
  const corteMasculino = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Corte Masculino', duracaoMin: 30, preco: 40.0 },
  });
  const escova = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Escova Progressiva', duracaoMin: 90, preco: 150.0 },
  });
  const coloracao = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Coloração', duracaoMin: 90, preco: 180.0 },
  });
  const barba = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Barba', duracaoMin: 30, preco: 30.0 },
  });
  const manicure = await prisma.servico.create({
    data: { empresaId: empresa.id, nome: 'Manicure', duracaoMin: 45, preco: 35.0 },
  });
  console.log('✓ Serviços: 6 cadastrados');

  // ── Insumos por serviço (a "feature central" do Nexly) ─────
  await prisma.insumoServico.createMany({
    data: [
      { servicoId: corteFeminino.id, produtoId: shampoo.id, quantidade: 1 },
      { servicoId: coloracao.id, produtoId: shampoo.id, quantidade: 1 },
      { servicoId: coloracao.id, produtoId: tinta.id, quantidade: 1 },
      { servicoId: escova.id, produtoId: shampoo.id, quantidade: 1 },
      { servicoId: escova.id, produtoId: oleo.id, quantidade: 1 },
      { servicoId: manicure.id, produtoId: base.id, quantidade: 1 },
      { servicoId: manicure.id, produtoId: esmalte.id, quantidade: 1 },
    ],
  });
  console.log('✓ Insumos: configurados para 4 serviços');

  // ── Clientes ───────────────────────────────────────────────
  const maria = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'Maria Oliveira', telefone: '11999990001', email: 'maria@example.com' },
  });
  const joao = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'João Pereira', telefone: '11999990002', email: 'joao@example.com' },
  });
  const anaC = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'Ana Costa', telefone: '11999990003' },
  });
  const pedro = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'Pedro Almeida', telefone: '11999990004', email: 'pedro@example.com' },
  });
  const lucia = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'Lúcia Ferreira', telefone: '11999990005' },
  });
  console.log('✓ Clientes: 5 cadastrados');

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

  // ── Agendamentos (30 dias no passado + hoje + 7 dias no futuro) ───
  const servicos = [corteFeminino, corteMasculino, escova, coloracao, barba, manicure];
  const profissionais = [ana, bruno, carla];
  const clientes = [maria, joao, anaC, pedro, lucia];

  function pick<T>(arr: T[], i: number): T {
    const v = arr[i % arr.length];
    if (v === undefined) throw new Error(`seed: índice ${i} fora de ${arr.length}`);
    return v;
  }

  for (let i = 0; i < 30; i++) {
    const dia = diasAtras(i + 1, 9 + (i % 8), 0);
    const s = pick(servicos, i);
    const pro = pick(profissionais, i);
    const cli = pick(clientes, i);
    const status = i % 11 === 0 ? StatusAgendamento.CANCELADO : StatusAgendamento.CONCLUIDO;
    await prisma.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cli.id,
        profissionalId: pro.id,
        servicoId: s.id,
        dataHora: dia,
        dataHoraFim: minutosDepois(dia, s.duracaoMin),
        status,
      },
    });
  }

  // Hoje: 3 agendamentos em horários diferentes
  for (let i = 0; i < 3; i++) {
    const inicio = diasFuturo(0, 9 + i * 2, 0);
    const s = pick([corteMasculino, manicure, escova], i);
    const pro = pick(profissionais, i);
    const cli = pick(clientes, i);
    await prisma.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cli.id,
        profissionalId: pro.id,
        servicoId: s.id,
        dataHora: inicio,
        dataHoraFim: minutosDepois(inicio, s.duracaoMin),
        status: i === 0 ? StatusAgendamento.CONCLUIDO : StatusAgendamento.AGENDADO,
      },
    });
  }

  // Futuros: 7 agendamentos distribuídos
  for (let i = 0; i < 7; i++) {
    const inicio = diasFuturo(i + 1, 10 + (i % 5), 0);
    const s = pick(servicos, i);
    const pro = pick(profissionais, i);
    const cli = pick(clientes, i + 2);
    await prisma.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cli.id,
        profissionalId: pro.id,
        servicoId: s.id,
        dataHora: inicio,
        dataHoraFim: minutosDepois(inicio, s.duracaoMin),
        status: i % 2 === 0 ? StatusAgendamento.AGENDADO : StatusAgendamento.CONFIRMADO,
      },
    });
  }
  console.log('✓ Agendamentos: 30 passados + 3 hoje + 7 futuros');

  // ── Vendas e movimentações (para dashboard e estoque) ──────
  await prisma.movimentacaoEstoque.createMany({
    data: [
      { empresaId: empresa.id, produtoId: shampoo.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 50, motivo: 'Compra fornecedor Beauty' },
      { empresaId: empresa.id, produtoId: tinta.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 30, motivo: 'Compra fornecedor Color' },
      { empresaId: empresa.id, produtoId: base.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 80, motivo: 'Compra fornecedor Nails' },
      { empresaId: empresa.id, produtoId: oleo.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 40, motivo: 'Compra fornecedor Beauty' },
      { empresaId: empresa.id, produtoId: esmalte.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 100, motivo: 'Compra fornecedor Nails' },
      { empresaId: empresa.id, produtoId: acetona.id, tipo: TipoMovimentacao.ENTRADA, quantidade: 60, motivo: 'Compra fornecedor Nails' },
    ],
  });

  for (let i = 0; i < 20; i++) {
    const createdAt = diasAtras((i % 15) + 1, 14, 0);
    const cli = pick(clientes, i);
    const v = await prisma.venda.create({
      data: {
        empresaId: empresa.id,
        clienteId: cli.id,
        total: 0,
        createdAt,
      },
    });
    const itens: { produto: typeof shampoo; qtd: number }[] = [
      { produto: shampoo, qtd: 1 },
      { produto: oleo, qtd: 1 },
      { produto: esmalte, qtd: 2 },
    ].slice(0, (i % 3) + 1);

    let total = 0;
    for (const it of itens) {
      const preco = Number(it.produto.preco);
      total += preco * it.qtd;
      await prisma.itemVenda.create({
        data: {
          vendaId: v.id,
          produtoId: it.produto.id,
          quantidade: it.qtd,
          precoUnitario: preco,
        },
      });
      await prisma.movimentacaoEstoque.create({
        data: {
          empresaId: empresa.id,
          produtoId: it.produto.id,
          tipo: TipoMovimentacao.SAIDA,
          quantidade: it.qtd,
          motivo: `Venda #${v.id.slice(0, 8)}`,
          createdAt,
        },
      });
    }
    await prisma.venda.update({ where: { id: v.id }, data: { total } });
  }
  console.log('✓ Vendas: 20 no PDV + 3 entradas manuais');

  console.log('\n────────────────────────────────────────');
  console.log('  Seed concluído!');
  console.log('  Login: ' + EMAIL_DEMO + ' / ' + SENHA_DEMO);
  console.log('────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
