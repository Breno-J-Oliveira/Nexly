import { isISO8601 } from 'class-validator';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuditAcao, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RECURSO_PARA_MODELO, paraJson, sanitizar } from './audit-diff';

export interface RegistrarAuditoriaParams {
  empresaId: string;
  usuarioId?: string;
  acao: AuditAcao;
  recurso: string;
  recursoId?: string;
  dadosAntigos?: object;
  dadosNovos?: object;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Registra em background (fire-and-forget) — nunca bloqueia a resposta. */
  registrar(params: RegistrarAuditoriaParams): void {
    void this.persistir(params).catch((err) => {
      this.logger.error(`Falha ao registrar auditoria: ${(err as Error).message}`);
    });
  }

  async persistir(params: RegistrarAuditoriaParams): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        recurso: params.recurso,
        recursoId: params.recursoId ?? null,
        dadosAntigos: (params.dadosAntigos as Prisma.InputJsonValue) ?? undefined,
        dadosNovos: (params.dadosNovos as Prisma.InputJsonValue) ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  /**
   * Estado ATUAL do registro, para o AuditLog guardar o **diff real**
   * (`dadosAntigos` × `dadosNovos`) de uma edição ou exclusão.
   *
   * Retorna `undefined` quando o recurso não tem model mapeado ou quando o
   * `recursoId` não pertence ao tenant. O resultado é sanitizado — credenciais
   * e segredos nunca entram no log de auditoria.
   */
  async buscarAntes(
    recurso: string,
    recursoId: string | undefined,
    empresaId: string,
  ): Promise<Record<string, unknown> | undefined> {
    if (!recursoId || !RECURSO_PARA_MODELO[recurso]) return undefined;
    const where = { id: recursoId, empresaId };

    switch (recurso) {
      case 'Tarefas':
        return sanitizar(paraJson(await this.prisma.client.tarefa.findFirst({ where })));
      case 'Filiais':
        return sanitizar(paraJson(await this.prisma.client.filial.findFirst({ where })));
      case 'Documentos':
        return sanitizar(paraJson(await this.prisma.client.documento.findFirst({ where })));
      case 'Campanhas':
        return sanitizar(paraJson(await this.prisma.client.campanha.findFirst({ where })));
      case 'Automacoes':
        return sanitizar(paraJson(await this.prisma.client.automacao.findFirst({ where })));
      case 'Recorrencias':
        return sanitizar(paraJson(await this.prisma.client.recorrencia.findFirst({ where })));
      case 'Clientes':
        return sanitizar(paraJson(await this.prisma.client.cliente.findFirst({ where })));
      case 'Produtos':
        return sanitizar(paraJson(await this.prisma.client.produto.findFirst({ where })));
      case 'Servicos':
        return sanitizar(paraJson(await this.prisma.client.servico.findFirst({ where })));
      case 'Profissionais':
        return sanitizar(paraJson(await this.prisma.client.profissional.findFirst({ where })));
      case 'Agendamentos':
        return sanitizar(paraJson(await this.prisma.client.agendamento.findFirst({ where })));
      case 'Vendas':
        return sanitizar(paraJson(await this.prisma.client.venda.findFirst({ where })));
      case 'Usuarios':
        return sanitizar(paraJson(await this.prisma.client.usuario.findFirst({ where })));
      case 'Fornecedores':
        return sanitizar(paraJson(await this.prisma.client.fornecedor.findFirst({ where })));
      case 'Cupons':
        return sanitizar(paraJson(await this.prisma.client.cupom.findFirst({ where })));
      case 'Avaliacoes':
        return sanitizar(paraJson(await this.prisma.client.avaliacao.findFirst({ where })));
      case 'Notificacoes':
        return sanitizar(paraJson(await this.prisma.client.notificacao.findFirst({ where })));
      default:
        return undefined;
    }
  }

  async listar(params: {
    empresaId: string;
    recurso?: string;
    acao?: string;
    inicio?: string;
    fim?: string;
    pagina: number;
    limite: number;
  }) {
    if (
      !Number.isInteger(params.pagina) ||
      params.pagina < 1 ||
      params.pagina > 100000 ||
      !Number.isInteger(params.limite) ||
      params.limite < 1 ||
      params.limite > 100
    )
      throw new BadRequestException('Paginação inválida');
    if (params.acao && !Object.values(AuditAcao).includes(params.acao as AuditAcao))
      throw new BadRequestException('Ação inválida');
    for (const data of [params.inicio, params.fim])
      if (data && !isISO8601(data, { strict: true }))
        throw new BadRequestException('Período inválido');
    if (params.inicio && params.fim && Date.parse(params.inicio) > Date.parse(params.fim))
      throw new BadRequestException('O início deve ser anterior ao fim');
    const where: Prisma.AuditLogWhereInput = {
      empresaId: params.empresaId,
      ...(params.recurso ? { recurso: params.recurso } : {}),
      ...(params.acao ? { acao: params.acao as AuditAcao } : {}),
      ...(params.inicio || params.fim
        ? {
            criadoEm: {
              ...(params.inicio ? { gte: new Date(params.inicio) } : {}),
              ...(params.fim ? { lte: new Date(params.fim) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (params.pagina - 1) * params.limite,
        take: params.limite,
        include: { usuario: { select: { nome: true, email: true } } },
      }),
      this.prisma.client.auditLog.count({ where }),
    ]);

    return { data, total, pagina: params.pagina, limite: params.limite };
  }
}
