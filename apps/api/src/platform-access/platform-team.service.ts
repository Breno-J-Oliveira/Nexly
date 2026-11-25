import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '@nexly/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AddPlatformMemberDto, UpdatePlatformMemberDto } from './platform-team.dto';

const memberSelect = {
  id: true,
  usuarioId: true,
  papel: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
  usuario: { select: { nome: true, email: true, ativo: true, twoFactorEnabled: true } },
} satisfies Prisma.PlatformMemberSelect;

function publicMember({
  usuario,
  ...membro
}: Prisma.PlatformMemberGetPayload<{
  select: typeof memberSelect;
}>) {
  return {
    ...membro,
    nome: usuario.nome,
    email: usuario.email,
    usuarioAtivo: usuario.ativo,
    doisFatoresAtivo: usuario.twoFactorEnabled,
  };
}

@Injectable()
export class PlatformTeamService {
  private readonly logger = new Logger(PlatformTeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listar(operador: AuthUser) {
    const membros = await this.prisma.client.platformMember.findMany({
      where: { usuario: { empresaId: operador.empresaId } },
      orderBy: [{ ativo: 'desc' }, { papel: 'asc' }, { criadoEm: 'asc' }, { id: 'asc' }],
      select: memberSelect,
    });
    return membros.map(publicMember);
  }

  async candidatos(operador: AuthUser, busca?: string) {
    const termo = busca?.trim();
    const candidatos = await this.prisma.client.usuario.findMany({
      where: {
        empresaId: operador.empresaId,
        ativo: true,
        platformMember: { is: null },
        ...(termo && {
          OR: [
            { nome: { contains: termo, mode: 'insensitive' } },
            { email: { contains: termo, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      take: 30,
      select: { id: true, nome: true, email: true, twoFactorEnabled: true },
    });
    return candidatos.map(({ id, twoFactorEnabled, ...candidato }) => ({
      usuarioId: id,
      ...candidato,
      doisFatoresAtivo: twoFactorEnabled,
    }));
  }

  async adicionar(operador: AuthUser, dto: AddPlatformMemberDto) {
    const membro = await this.prisma.client
      .$transaction(async (tx) => {
        const usuario = await tx.usuario.findFirst({
          where: { id: dto.usuarioId, empresaId: operador.empresaId, ativo: true },
          select: { id: true },
        });
        if (!usuario) throw new NotFoundException('Conta ativa da equipe interna não encontrada.');

        return tx.platformMember.create({
          data: { usuarioId: usuario.id, papel: dto.papel },
          select: memberSelect,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            code: 'PLATFORM_MEMBER_EXISTS',
            message:
              'Essa conta já tem um vínculo. Atualize a lista e gerencie o acesso existente.',
          });
        }
        throw error;
      });
    this.logger.log({
      acao: 'platform.team.adicionar',
      operadorId: operador.id,
      membroId: membro.id,
    });
    return publicMember(membro);
  }

  async atualizar(operador: AuthUser, membroId: string, dto: UpdatePlatformMemberDto) {
    const ativo = dto.ativo ?? undefined;
    if (dto.papel === undefined && ativo === undefined) {
      throw new BadRequestException('Informe o novo papel ou estado do acesso.');
    }
    const membro = await this.prisma.client.$transaction(async (tx) => {
      const atualizados = await tx.platformMember.updateMany({
        where: {
          id: membroId,
          papel: { not: 'OWNER' },
          usuario: { empresaId: operador.empresaId, ...(ativo === true && { ativo: true }) },
        },
        data: { papel: dto.papel, ativo },
      });
      if (!atualizados.count) throw new NotFoundException('Membro editável não encontrado.');

      return tx.platformMember.findUniqueOrThrow({ where: { id: membroId }, select: memberSelect });
    });
    this.logger.log({ acao: 'platform.team.atualizar', operadorId: operador.id, membroId });
    return publicMember(membro);
  }
}
