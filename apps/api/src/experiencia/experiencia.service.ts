import { ForbiddenException, Injectable } from '@nestjs/common';
import { normalizeModules } from '@nexly/shared';
import { PrismaService } from '../database/prisma.service';
import { DepoimentoDto, WorkspaceDto } from './experiencia.dto';

export function podePedirRecomendacao(
  usuario: {
    createdAt: Date;
    diasDeUso: number;
    naoPedirAvaliacao: boolean;
    lembrarAvaliacaoEm: Date | null;
  },
  temDepoimento: boolean,
  agora = new Date(),
): boolean {
  return (
    !temDepoimento &&
    !usuario.naoPedirAvaliacao &&
    usuario.diasDeUso >= 3 &&
    agora.getTime() - usuario.createdAt.getTime() >= 7 * 86400000 &&
    (!usuario.lembrarAvaliacaoEm || usuario.lembrarAvaliacaoEm <= agora)
  );
}

@Injectable()
export class ExperienciaService {
  constructor(private readonly prisma: PrismaService) {}

  async perfil(id: string, empresaId: string) {
    const [usuario, empresa, depoimento] = await Promise.all([
      this.prisma.client.usuario.findFirstOrThrow({
        where: { id, empresaId },
        select: {
          createdAt: true,
          diasDeUso: true,
          naoPedirAvaliacao: true,
          lembrarAvaliacaoEm: true,
        },
      }),
      this.prisma.client.empresa.findFirstOrThrow({
        where: { id: empresaId },
        select: { preset: true, modulos: true },
      }),
      this.prisma.client.depoimento.findFirst({
        where: { usuarioId: id, empresaId },
        select: {
          nota: true,
          texto: true,
          nomePublico: true,
          ocupacao: true,
          autorizaPublicacao: true,
          status: true,
        },
      }),
    ]);
    return {
      ...empresa,
      diasDeUso: usuario.diasDeUso,
      podeRecomendar:
        usuario.diasDeUso >= 3 && Date.now() - usuario.createdAt.getTime() >= 7 * 86400000,
      pedirRecomendacao: podePedirRecomendacao(usuario, !!depoimento),
      depoimento,
    };
  }

  async atividade(id: string, empresaId: string) {
    const hoje = new Date().toISOString().slice(0, 10);
    await this.prisma.client.usuario.updateMany({
      where: { id, empresaId, OR: [{ ultimoDiaUso: null }, { ultimoDiaUso: { not: hoje } }] },
      data: { ultimoDiaUso: hoje, diasDeUso: { increment: 1 } },
    });
    return this.perfil(id, empresaId);
  }

  async workspace(empresaId: string, dto: WorkspaceDto) {
    const modulos = normalizeModules(dto.modulos);
    return this.prisma.client.empresa.update({
      where: { id: empresaId },
      data: { preset: dto.preset, modulos },
      select: { preset: true, modulos: true },
    });
  }

  async recomendar(id: string, empresaId: string, dto: DepoimentoDto) {
    const usuario = await this.prisma.client.usuario.findFirstOrThrow({
      where: { id, empresaId },
      select: { createdAt: true, diasDeUso: true },
    });
    if (usuario.diasDeUso < 3 || Date.now() - usuario.createdAt.getTime() < 7 * 86400000)
      throw new ForbiddenException(
        'Experimente o Nexly por 7 dias, em pelo menos 3 dias diferentes, antes de recomendar.',
      );
    // Editing a published text always sends it back to moderation.
    await this.prisma.client.depoimento.upsert({
      where: { usuarioId: id },
      create: { ...dto, usuarioId: id, empresaId, status: 'PENDENTE' },
      update: { ...dto, status: 'PENDENTE' },
    });
    return { salvo: true, status: 'PENDENTE' };
  }

  async lembrar(id: string, empresaId: string, escolha: 'DEPOIS' | 'NUNCA') {
    await this.prisma.client.usuario.updateMany({
      where: { id, empresaId },
      data:
        escolha === 'NUNCA'
          ? { naoPedirAvaliacao: true }
          : { lembrarAvaliacaoEm: new Date(Date.now() + 30 * 86400000) },
    });
    return { salvo: true };
  }

  async retirar(id: string, empresaId: string) {
    await this.prisma.client.depoimento.deleteMany({ where: { usuarioId: id, empresaId } });
    await this.lembrar(id, empresaId, 'NUNCA');
    return { retirado: true };
  }

  publicos() {
    return this.prisma.client.depoimento.findMany({
      where: { status: 'APROVADO', autorizaPublicacao: true, usuario: { ativo: true } },
      select: { id: true, nomePublico: true, ocupacao: true, texto: true, nota: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 6,
    });
  }
}
