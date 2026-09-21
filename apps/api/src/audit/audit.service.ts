import { Injectable, Logger } from '@nestjs/common';
import { AuditAcao, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

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

  async listar(params: {
    empresaId: string;
    recurso?: string;
    acao?: string;
    inicio?: string;
    fim?: string;
    pagina: number;
    limite: number;
  }) {
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
