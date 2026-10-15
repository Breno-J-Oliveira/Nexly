import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@nexly/shared';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string) {
    return this.prisma.client.usuario.findMany({
      where: { empresaId },
      select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
    });
  }

  async criar(empresaId: string, dto: { nome: string; email: string; senha: string; role?: Role }) {
    const existente = await this.prisma.client.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new BadRequestException('Email ja cadastrado');
    const senhaHash = await argon2.hash(dto.senha, { type: argon2.argon2id });
    return this.prisma.client.usuario.create({
      data: { empresaId, nome: dto.nome, email: dto.email, senhaHash, role: dto.role || 'CAIXA' },
      select: { id: true, nome: true, email: true, role: true },
    });
  }

  async atualizar(
    empresaId: string,
    id: string,
    dto: { nome?: string; role?: Role; ativo?: boolean },
  ) {
    return this.prisma.client.$transaction(async (tx) => {
      // Serializa mudanças de administradores da mesma empresa, inclusive entre réplicas.
      await tx.$queryRaw`SELECT id FROM empresas WHERE id=${empresaId} FOR UPDATE`;
      const usuario = await tx.usuario.findFirst({ where: { id, empresaId } });
      if (!usuario) throw new NotFoundException('Usuário não encontrado');
      const removeAdmin =
        usuario.ativo &&
        usuario.role === 'ADMIN' &&
        (dto.ativo === false || (dto.role !== undefined && dto.role !== Role.ADMIN));
      if (
        removeAdmin &&
        (await tx.usuario.count({ where: { empresaId, ativo: true, role: 'ADMIN' } })) <= 1
      ) {
        throw new ConflictException({
          code: 'LAST_ADMIN_REQUIRED',
          message:
            'Mantenha pelo menos um administrador ativo. Promova outro usuário antes de continuar.',
        });
      }
      await tx.usuario.updateMany({ where: { id, empresaId }, data: dto });
      // Desativar e reativar não pode restaurar credenciais antigas.
      if (dto.ativo === false || (dto.role !== undefined && dto.role !== usuario.role)) {
        await tx.authSession.updateMany({
          where: { usuarioId: id, revogado: false },
          data: { revogado: true },
        });
        await tx.refreshToken.updateMany({
          where: { usuarioId: id, revogado: false },
          data: { revogado: true },
        });
      }
      return tx.usuario.findFirst({
        where: { id, empresaId },
        select: { id: true, nome: true, email: true, role: true, ativo: true },
      });
    });
  }

  async trocarSenha(id: string, senhaAtual: string, novaSenha: string) {
    if (senhaAtual === novaSenha)
      throw new BadRequestException('Escolha uma senha diferente da atual');
    const u = await this.prisma.client.usuario.findFirst({
      where: { id },
      select: { senhaHash: true },
    });
    if (!u) throw new NotFoundException('Usuario nao encontrado');
    const ok = await argon2.verify(u.senhaHash, senhaAtual);
    if (!ok) throw new BadRequestException('Senha atual incorreta');
    const senhaHash = await argon2.hash(novaSenha, { type: argon2.argon2id });
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const changed = await tx.usuario.updateMany({
        where: { id, senhaHash: u.senhaHash },
        data: { senhaHash, twoFactorChallengeHash: null, twoFactorChallengeExpiresAt: null },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'Sua senha foi alterada por outra solicitação. Entre novamente.',
        );
      await tx.authSession.updateMany({
        where: { usuarioId: id, revogado: false },
        data: { revogado: true },
      });
      await tx.refreshToken.updateMany({
        where: { usuarioId: id, revogado: false },
        data: { revogado: true },
      });
      return changed;
    });
    return updated;
  }

  async excluir(empresaId: string, id: string) {
    return this.atualizar(empresaId, id, { ativo: false });
  }

  async convidar(empresaId: string, dto: { email: string; role: Role }) {
    const existente = await this.prisma.client.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new BadRequestException('Email ja cadastrado');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const convite = await this.prisma.client.conviteUsuario.create({
      data: { empresaId, email: dto.email, role: dto.role, token, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002';
    const link = `${appUrl}/aceitar-convite?token=${token}`;
    // Simula envio de e-mail — substituir por Resend quando RESEND_API_KEY existir.
    this.logger.warn(
      'Provedor de e-mail não configurado: convite disponível para compartilhamento manual.',
    );

    return { conviteId: convite.id, link };
  }
}
