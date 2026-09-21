import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AtualizarCupomDto } from './dto/atualizar-cupom.dto';
import { CriarCupomDto } from './dto/criar-cupom.dto';

@Injectable()
export class CuponsService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.client.cupom.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async criar(dto: CriarCupomDto) {
    try {
      return await this.prisma.client.cupom.create({
        data: {
          codigo: dto.codigo,
          tipo: dto.tipo,
          valor: dto.valor,
          usoMaximo: dto.usoMaximo ?? null,
          validade: dto.validade ? new Date(dto.validade) : null,
          ativo: dto.ativo ?? true,
        } as Prisma.CupomUncheckedCreateInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um cupom com esse código');
      }
      throw error;
    }
  }

  async atualizar(id: string, dto: AtualizarCupomDto) {
    const existente = await this.prisma.client.cupom.findFirst({ where: { id } });
    if (!existente) throw new NotFoundException('Cupom não encontrado');

    try {
      return await this.prisma.client.cupom.update({
        where: { id },
        data: {
          ...(dto.codigo !== undefined ? { codigo: dto.codigo } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
          ...(dto.usoMaximo !== undefined ? { usoMaximo: dto.usoMaximo } : {}),
          ...(dto.validade !== undefined
            ? { validade: dto.validade ? new Date(dto.validade) : null }
            : {}),
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um cupom com esse código');
      }
      throw error;
    }
  }

  async excluir(id: string) {
    const existente = await this.prisma.client.cupom.findFirst({ where: { id } });
    if (!existente) throw new NotFoundException('Cupom não encontrado');
    await this.prisma.client.cupom.delete({ where: { id } });
    return { success: true };
  }

  async validar(codigo: string) {
    const cupom = await this.prisma.client.cupom.findFirst({ where: { codigo } });

    if (!cupom || !cupom.ativo) {
      throw new UnprocessableEntityException('Cupom inválido ou inativo');
    }
    if (cupom.validade && cupom.validade < new Date()) {
      throw new UnprocessableEntityException('Cupom expirado');
    }
    if (cupom.usoMaximo !== null && cupom.usoAtual >= cupom.usoMaximo) {
      throw new UnprocessableEntityException('Cupom esgotado');
    }

    return {
      valido: true,
      id: cupom.id,
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: Number(cupom.valor),
    };
  }
}
