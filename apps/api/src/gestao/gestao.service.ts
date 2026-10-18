import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isEmail } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EstoqueService } from '../estoque/estoque.service';
import { ComprovacaoDto, ImportacaoDto, PreferenciasDto, TransferenciaDto } from './gestao.dto';
import { entradaFilial, saidaFilial } from './unidade-estoque';

@Injectable()
export class GestaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly estoque: EstoqueService,
  ) {}
  async inicio(empresaId: string) {
    const [empresa, clientes, profissionais, servicos, operacoes] = await Promise.all([
      this.prisma.client.empresa.findFirstOrThrow({
        where: { id: empresaId },
        select: { preferencias: true, primeiroAcessoDispensado: true, preset: true },
      }),
      this.prisma.client.cliente.count({ where: { empresaId, ativo: true } }),
      this.prisma.client.profissional.count({ where: { empresaId, ativo: true } }),
      this.prisma.client.servico.count({ where: { empresaId, ativo: true } }),
      this.prisma.client.agendamento.count({ where: { empresaId } }),
    ]);
    return {
      ...empresa,
      etapas: [
        {
          id: 'clientes',
          nome: 'Cadastre seu primeiro cliente',
          href: '/clientes',
          concluida: clientes > 0,
        },
        {
          id: 'profissionais',
          nome: 'Cadastre quem realiza os atendimentos',
          href: '/profissionais',
          concluida: profissionais > 0,
        },
        {
          id: 'servicos',
          nome: 'Prepare seus serviços e preços',
          href: '/servicos',
          concluida: servicos > 0,
        },
        {
          id: 'agenda',
          nome: 'Registre seu primeiro atendimento',
          href: '/agenda',
          concluida: operacoes > 0,
        },
      ],
    };
  }
  preferencias(empresaId: string, dto: PreferenciasDto) {
    return this.prisma.client.empresa.update({
      where: { id: empresaId },
      data: {
        preferencias: {
          nomeCliente: dto.nomeCliente,
          nomeServico: dto.nomeServico,
          segmento: dto.segmento,
        },
        primeiroAcessoDispensado: !dto.mostrarGuia,
      },
      select: { preferencias: true, primeiroAcessoDispensado: true },
    });
  }
  async monitor(empresaId: string) {
    const [redis, pendentes, falhas, rotinas, comprovacoes] = await Promise.all([
      this.redis.ping(),
      this.prisma.client.jobDuravel.count({ where: { empresaId, status: 'PENDENTE' } }),
      this.prisma.client.jobDuravel.count({ where: { empresaId, status: 'FALHOU' } }),
      this.prisma.client.jobDuravel.findMany({
        where: { empresaId },
        select: {
          id: true,
          tipo: true,
          status: true,
          tentativas: true,
          executarEm: true,
          erro: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.client.comprovacaoOperacional.findMany({
        where: { empresaId },
        orderBy: { verificadoEm: 'desc' },
        take: 20,
      }),
    ]);
    return {
      db: true,
      redis,
      pendentes,
      falhas,
      rotinas,
      comprovacoes,
      emailConfigurado:
        process.env.EMAIL_PROVIDER === 'resend' &&
        !!process.env.RESEND_API_KEY &&
        !!process.env.EMAIL_FROM &&
        /^[a-f\d]{64}$/i.test(process.env.EMAIL_QUEUE_KEY ?? '') &&
        /^https:\/\//.test(process.env.PUBLIC_APP_URL ?? ''),
      geradoEm: new Date(),
    };
  }
  unidades(empresaId: string) {
    return this.prisma.client.filial.findMany({
      where: { empresaId, ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
      take: 200,
    });
  }
  async catalogoFilial(empresaId: string, filialId: string) {
    if (
      !(await this.prisma.client.filial.findFirst({
        where: { id: filialId, empresaId, ativa: true },
      }))
    )
      throw new NotFoundException('Filial indisponível');
    const produtos = await this.prisma.client.produto.findMany({
      where: {
        empresaId,
        ativo: true,
        saldosFilial: { some: { filialId, empresaId, quantidade: { gt: 0 } } },
      },
      include: { saldosFilial: { where: { filialId, empresaId }, select: { quantidade: true } } },
      orderBy: { nome: 'asc' },
      take: 500,
    });
    return {
      data: produtos.map(({ saldosFilial, ...p }) => ({
        ...p,
        estoqueAtual: saldosFilial[0]?.quantidade ?? 0,
      })),
    };
  }
  async comprovar(empresaId: string, usuarioId: string, dto: ComprovacaoDto) {
    if (new Date(dto.verificadoEm).getTime() > Date.now() + 60000)
      throw new BadRequestException('A verificação não pode estar no futuro');
    return this.prisma.client.comprovacaoOperacional.create({
      data: { ...dto, empresaId, usuarioId, verificadoEm: new Date(dto.verificadoEm) },
    });
  }
  async repetirJob(empresaId: string, id: string) {
    const job = await this.prisma.client.jobDuravel.findFirst({
      where: { id, empresaId, status: 'FALHOU' },
    });
    if (!job) throw new NotFoundException('Rotina com falha não encontrada');
    if (job.tipo === 'EMAIL_RECUPERACAO')
      throw new BadRequestException(
        'Solicite um novo link de recuperação, pois o anterior pode ter expirado',
      );
    await this.prisma.client.jobDuravel.updateMany({
      where: { id, empresaId, status: 'FALHOU' },
      data: {
        status: 'PENDENTE',
        executarEm: new Date(),
        tentativas: 0,
        erro: null,
        reserva: null,
      },
    });
    return { ok: true };
  }
  async saldos(empresaId: string) {
    const [filiais, produtos, saldos, transferencias, vendas] = await Promise.all([
      this.prisma.client.filial.findMany({
        where: { empresaId },
        orderBy: { nome: 'asc' },
        take: 200,
      }),
      this.prisma.client.produto.findMany({
        where: { empresaId, ativo: true },
        select: { id: true, nome: true, sku: true, estoqueAtual: true },
        orderBy: { nome: 'asc' },
        take: 500,
      }),
      this.prisma.client.saldoFilial.findMany({ where: { empresaId }, take: 10000 }),
      this.prisma.client.transferenciaFilial.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.client.venda.groupBy({
        by: ['filialId'],
        where: { empresaId, status: 'CONCLUIDA' },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);
    return {
      filiais,
      produtos,
      saldos,
      transferencias,
      vendas,
      limites: { produtos: 500, saldos: 10000 },
    };
  }
  async transferir(empresaId: string, dto: TransferenciaDto) {
    if ((dto.origemId ?? null) === (dto.destinoId ?? null))
      throw new BadRequestException('Selecione unidades diferentes');
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id=${empresaId} FOR UPDATE`;
      const repetida = await tx.transferenciaFilial.findUnique({
        where: { empresaId_chave: { empresaId, chave: dto.chave } },
      });
      if (repetida) {
        if (
          repetida.produtoId !== dto.produtoId ||
          repetida.quantidade !== dto.quantidade ||
          repetida.origemId !== (dto.origemId ?? null) ||
          repetida.destinoId !== (dto.destinoId ?? null)
        )
          throw new ConflictException('A identificação da transferência já foi utilizada');
        return repetida;
      }
      if (!(await tx.produto.findFirst({ where: { id: dto.produtoId, empresaId, ativo: true } })))
        throw new NotFoundException('Produto indisponível');
      for (const filial of [dto.origemId, dto.destinoId].filter(Boolean) as string[]) {
        if (!(await tx.filial.findFirst({ where: { id: filial, empresaId, ativa: true } })))
          throw new BadRequestException('Filial indisponível');
      }
      if (dto.origemId)
        await saidaFilial(
          tx as unknown as Prisma.TransactionClient,
          empresaId,
          dto.origemId,
          dto.produtoId,
          dto.quantidade,
          dto.motivo,
        );
      else
        await this.estoque.registrarSaidaTx(
          tx as unknown as Prisma.TransactionClient,
          dto.produtoId,
          dto.quantidade,
          dto.motivo,
        );
      if (dto.destinoId)
        await entradaFilial(
          tx as unknown as Prisma.TransactionClient,
          empresaId,
          dto.destinoId,
          dto.produtoId,
          dto.quantidade,
          dto.motivo,
        );
      else
        await this.estoque.registrarEntradaTx(
          tx as unknown as Prisma.TransactionClient,
          dto.produtoId,
          dto.quantidade,
          dto.motivo,
        );
      return tx.transferenciaFilial.create({ data: { ...dto, empresaId } });
    });
  }
  async previa(
    empresaId: string,
    dto: ImportacaoDto,
    tx: Prisma.TransactionClient = this.prisma.client as unknown as Prisma.TransactionClient,
  ) {
    const vistos = new Set<string>(),
      erros: { linha: number; mensagem: string }[] = [],
      linhas: Record<string, string | number | null>[] = [];
    let duplicados = 0;
    for (const [i, row] of dto.linhas.entries()) {
      const email = row.email?.trim().toLowerCase() || null,
        telefone = row.telefone?.trim() || null,
        sku = row.sku?.trim() || null;
      if (dto.tipo === 'clientes' && email && !isEmail(email)) {
        erros.push({ linha: i + 2, mensagem: 'E-mail inválido' });
        continue;
      }
      if (dto.tipo === 'produtos' && (!sku || sku.length < 2 || typeof row.preco !== 'number')) {
        erros.push({ linha: i + 2, mensagem: 'Informe SKU e preço válidos' });
        continue;
      }
      const chave =
        dto.tipo === 'produtos' ? sku! : (email ?? telefone ?? row.nome.toLocaleLowerCase('pt-BR'));
      if (vistos.has(chave)) {
        duplicados++;
        continue;
      }
      vistos.add(chave);
      linhas.push(
        dto.tipo === 'clientes'
          ? { nome: row.nome, email, telefone }
          : { nome: row.nome, sku, preco: row.preco!, estoqueAtual: row.estoqueAtual ?? 0 },
      );
    }
    // Consultas em lote, incluindo clientes inativos para evitar reintroduzir cadastros.
    const existentes =
      dto.tipo === 'produtos'
        ? await tx.produto.findMany({
            where: { empresaId, sku: { in: linhas.map((l) => String(l.sku)) } },
            select: { sku: true },
          })
        : await tx.cliente.findMany({
            where: {
              empresaId,
              OR: linhas.map((l) =>
                l.email
                  ? { email: { equals: String(l.email), mode: 'insensitive' as const } }
                  : l.telefone
                    ? { telefone: String(l.telefone) }
                    : { nome: { equals: String(l.nome), mode: 'insensitive' as const } },
              ),
            },
            select: { email: true, telefone: true, nome: true },
          });
    const novas = linhas.filter(
      (l) =>
        !existentes.some((e) =>
          'sku' in e
            ? e.sku === l.sku
            : l.email
              ? e.email?.toLowerCase() === l.email
              : l.telefone
                ? e.telefone === l.telefone
                : e.nome.toLocaleLowerCase('pt-BR') === String(l.nome).toLocaleLowerCase('pt-BR'),
        ),
    );
    duplicados += linhas.length - novas.length;
    return { linhas: novas, erros, duplicados, total: dto.linhas.length };
  }
  async importar(empresaId: string, dto: ImportacaoDto) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ tipo: dto.tipo, linhas: dto.linhas }))
      .digest('hex');
    return this.prisma.client.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM empresas WHERE id=${empresaId} FOR UPDATE`;
        const anterior = await tx.importacao.findUnique({
          where: { empresaId_chave: { empresaId, chave: dto.chave } },
        });
        if (anterior) {
          const resumo = anterior.resumo as { hash?: string };
          if (resumo.hash !== hash)
            throw new ConflictException('A confirmação já foi utilizada em outro arquivo');
          return anterior.resumo;
        }
        const previa = await this.previa(empresaId, dto, tx as unknown as Prisma.TransactionClient);
        if (previa.erros.length)
          throw new BadRequestException('Corrija as linhas indicadas na prévia antes de importar');
        if (dto.tipo === 'clientes')
          await tx.cliente.createMany({
            data: previa.linhas.map((l) => ({
              empresaId,
              nome: String(l.nome),
              email: l.email ? String(l.email) : null,
              telefone: l.telefone ? String(l.telefone) : null,
            })),
          });
        else
          await tx.produto.createMany({
            data: previa.linhas.map((l) => ({
              empresaId,
              nome: String(l.nome),
              sku: String(l.sku),
              preco: Number(l.preco),
              estoqueAtual: Number(l.estoqueAtual),
            })),
          });
        const resumo = { hash, criados: previa.linhas.length, ignorados: previa.duplicados };
        await tx.importacao.create({
          data: { empresaId, chave: dto.chave, tipo: dto.tipo, resumo },
        });
        return resumo;
      },
      { timeout: 20000 },
    );
  }
}
