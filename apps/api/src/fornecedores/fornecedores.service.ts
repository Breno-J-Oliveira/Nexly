import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.client.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  criar(dto: CriarFornecedorDto) {
    return this.prisma.client.fornecedor.create({
      data: {
        nome: dto.nome,
        cnpj: dto.cnpj ?? null,
        telefone: dto.telefone ?? null,
        email: dto.email ?? null,
      } as Prisma.FornecedorUncheckedCreateInput,
    });
  }

  async atualizar(id: string, dto: AtualizarFornecedorDto) {
    const existente = await this.prisma.client.fornecedor.findFirst({ where: { id } });
    if (!existente) throw new NotFoundException('Fornecedor não encontrado');

    return this.prisma.client.fornecedor.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.cnpj !== undefined ? { cnpj: dto.cnpj } : {}),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      },
    });
  }

  async excluir(id: string) {
    const existente = await this.prisma.client.fornecedor.findFirst({ where: { id } });
    if (!existente) throw new NotFoundException('Fornecedor não encontrado');

    await this.prisma.client.fornecedor.update({
      where: { id },
      data: { ativo: false },
    });
    return { success: true };
  }
}
