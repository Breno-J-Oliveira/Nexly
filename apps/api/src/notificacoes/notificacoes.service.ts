import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string) { return (this.prisma.client as any).notificacao.findMany({ where: { usuarioId }, orderBy: { createdAt: 'desc' }, take: 50 }); }

  async naoLidas(usuarioId: string) { return (this.prisma.client as any).notificacao.count({ where: { usuarioId, lida: false } }); }

  async marcarLida(id: string) { return (this.prisma.client as any).notificacao.update({ where: { id }, data: { lida: true } }); }

  async criar(empresaId: string, usuarioId: string, titulo: string, mensagem: string, link?: string) {
    try { return await (this.prisma.client as any).notificacao.create({ data: { empresaId, usuarioId, titulo, mensagem, link } }); }
    catch (e) { this.logger.warn('Erro criar notificacao: ' + (e as Error).message); return null; }
  }
}
