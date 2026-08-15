import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';

const usuarioSelect = {
  id: true,
  empresaId: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string) {
    return this.prisma.client.usuario.findMany({
      where: { empresaId },
      select: usuarioSelect,
      orderBy: { nome: 'asc' },
    });
  }

  async criar(empresaId: string, dto: CriarUsuarioDto) {
    const existing = await this.prisma.client.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await argon2.hash(dto.senha, { type: argon2.argon2id });

    return this.prisma.client.usuario.create({
      data: {
        empresaId,
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        role: dto.role,
      },
      select: usuarioSelect,
    });
  }

  async atualizar(empresaId: string, usuarioAtualId: string, id: string, dto: AtualizarUsuarioDto) {
    if (id === usuarioAtualId && dto.role) {
      throw new BadRequestException('Você não pode alterar a própria role');
    }
    await this.obterOuFalhar(empresaId, id);

    return this.prisma.client.usuario.update({
      where: { id },
      data: { nome: dto.nome, role: dto.role },
      select: usuarioSelect,
    });
  }

  async desativar(empresaId: string, usuarioAtualId: string, id: string) {
    if (id === usuarioAtualId) {
      throw new BadRequestException('Você não pode desativar a si mesmo');
    }
    await this.obterOuFalhar(empresaId, id);

    return this.prisma.client.usuario.update({
      where: { id },
      data: { ativo: false },
      select: usuarioSelect,
    });
  }

  async trocarSenha(usuarioAtualId: string, dto: TrocarSenhaDto) {
    const usuario = await this.prisma.client.usuario.findUnique({
      where: { id: usuarioAtualId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const senhaValida = await argon2.verify(usuario.senhaHash, dto.senhaAtual);
    if (!senhaValida) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const novaSenhaHash = await argon2.hash(dto.novaSenha, { type: argon2.argon2id });
    await this.prisma.client.usuario.update({
      where: { id: usuarioAtualId },
      data: { senhaHash: novaSenhaHash },
    });

    return { success: true };
  }

  private async obterOuFalhar(empresaId: string, id: string) {
    const usuario = await this.prisma.client.usuario.findFirst({
      where: { id, empresaId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }
}
