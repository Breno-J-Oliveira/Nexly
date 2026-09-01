import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@nexly/shared';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string) {
    return this.prisma.client.usuario.findMany({ where: { empresaId }, select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true } });
  }

  async criar(empresaId: string, dto: { nome: string; email: string; senha: string; role?: Role }) {
    const existente = await this.prisma.client.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new BadRequestException('Email ja cadastrado');
    const senhaHash = await argon2.hash(dto.senha);
    return this.prisma.client.usuario.create({
      data: { empresaId, nome: dto.nome, email: dto.email, senhaHash, role: dto.role || 'CAIXA' },
      select: { id: true, nome: true, email: true, role: true },
    });
  }

  async atualizar(id: string, dto: { nome?: string; role?: Role; ativo?: boolean }) {
    const u = await this.prisma.client.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario nao encontrado');
    return this.prisma.client.usuario.update({
      where: { id }, data: { ...dto },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
  }

  async trocarSenha(id: string, senhaAtual: string, novaSenha: string) {
    const u = await this.prisma.client.usuario.findUnique({ where: { id }, select: { senhaHash: true } });
    if (!u) throw new NotFoundException('Usuario nao encontrado');
    const ok = await argon2.verify(u.senhaHash, senhaAtual);
    if (!ok) throw new BadRequestException('Senha atual incorreta');
    const senhaHash = await argon2.hash(novaSenha);
    return this.prisma.client.usuario.update({ where: { id }, data: { senhaHash }, select: { id: true } });
  }

  async excluir(id: string) {
    return this.prisma.client.usuario.update({ where: { id }, data: { ativo: false }, select: { id: true } });
  }
}
