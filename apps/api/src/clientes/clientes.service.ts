import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(page: number, limit: number, search?: string) {
    const where: Prisma.ClienteWhereInput = {
      ativo: true,
      ...(search
        ? {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { telefone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.cliente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.client.cliente.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async obter(id: string) {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id, ativo: true },
      include: {
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          take: 10,
          include: { servico: true, profissional: true },
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return cliente;
  }

  criar(dto: CriarClienteDto) {
    return this.prisma.client.cliente.create({
      data: {
        nome: dto.nome,
        telefone: dto.telefone,
        email: dto.email,
      } as Prisma.ClienteUncheckedCreateInput,
    });
  }

  async atualizar(id: string, dto: AtualizarClienteDto) {
    await this.obter(id);
    await this.prisma.client.cliente.updateMany({
      where: { id },
      data: { nome: dto.nome, telefone: dto.telefone, email: dto.email },
    });
    return this.obter(id);
  }

  async desativar(id: string) {
    await this.obter(id);
    await this.prisma.client.cliente.updateMany({
      where: { id },
      data: { ativo: false },
    });
    return { success: true };
  }
}
