import { Injectable, NotFoundException } from '@nestjs/common';
import { Cliente, Prisma } from '@prisma/client';
import {
  decodeCursor,
  encodeCursor,
  montarPagina,
  normalizarLimite,
} from '../common/pagination/cursor';
import { PrismaService } from '../database/prisma.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

/**
 * Retorno da listagem: o modo offset inclui `total`/`page` (retrocompatível),
 * o modo keyset (`cursor`) omite — contar o total seria O(n) e não faz sentido
 * quando o cliente pagina por cursor.
 */
export interface ListaClientesResult {
  data: Cliente[];
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
  total?: number;
  page?: number;
}

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista clientes ativos.
   *
   * - Sem `cursor`: paginação por offset (`?page=`/`?limit=`), retrocompatível.
   * - Com `cursor`: paginação **keyset** por `(nome, id)`, O(1) por página e
   *   estável mesmo com cadastros concorrentes (offset pula/repeita itens).
   */
  async listar(
    page: number,
    limit: number,
    search?: string,
    cursor?: string,
  ): Promise<ListaClientesResult> {
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

    const limite = normalizarLimite(limit);

    if (cursor) {
      const c = decodeCursor<{ nome: string; id: string }>(cursor);
      const itens = await this.prisma.client.cliente.findMany({
        where: {
          AND: [
            where,
            {
              OR: [{ nome: { gt: c.nome } }, { nome: c.nome, id: { gt: c.id } }],
            },
          ],
        },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        take: limite + 1,
      });
      const pagina = montarPagina(itens, limite, (cl) => ({ nome: cl.nome, id: cl.id }));
      return { ...pagina, limit: limite };
    }

    const [data, total] = await Promise.all([
      this.prisma.client.cliente.findMany({
        where,
        skip: (page - 1) * limite,
        take: limite,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.client.cliente.count({ where }),
    ]);

    const ultimo = data.at(-1);
    const hasNext = page * limite < total;
    return {
      data,
      total,
      page,
      limit: limite,
      hasNext,
      nextCursor: hasNext && ultimo ? encodeCursor({ nome: ultimo.nome, id: ultimo.id }) : null,
    };
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
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
      },
    });
    return this.obter(id);
  }

  /**
   * Métricas agregadas do cliente para o drawer de histórico.
   *
   * - totalVisitas: agendamentos CONCLUIDO.
   * - totalGasto: soma do `total` das vendas vinculadas ao cliente.
   * - ticketMedio: totalGasto / totalVisitas.
   * - frequenciaMediaDias: intervalo médio entre visitas (dias).
   */
  async metricas(id: string) {
    await this.obter(id);

    const [agendamentos, vendas] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where: { clienteId: id, status: 'CONCLUIDO' },
        orderBy: { dataHora: 'asc' },
        select: { dataHora: true, servicoId: true },
      }),
      this.prisma.client.venda.findMany({
        where: { clienteId: id },
        select: { total: true },
      }),
    ]);

    const totalVisitas = agendamentos.length;
    const totalGasto = vendas.reduce((acc, v) => acc + Number(v.total), 0);
    const ticketMedio = totalVisitas > 0 ? totalGasto / totalVisitas : 0;
    const primeiraVisita = agendamentos[0]?.dataHora;
    const ultimaVisita = agendamentos[totalVisitas - 1]?.dataHora;
    const frequenciaMediaDias =
      totalVisitas < 2 || !primeiraVisita || !ultimaVisita
        ? 0
        : ultimaVisita.getTime() - primeiraVisita.getTime();

    // Serviço mais agendado por este cliente.
    let servicoFavorito: { id: string; nome: string } | null = null;
    if (totalVisitas > 0) {
      const contagem = new Map<string, number>();
      for (const a of agendamentos) {
        contagem.set(a.servicoId, (contagem.get(a.servicoId) ?? 0) + 1);
      }
      let max = 0;
      let favServicoId = '';
      for (const [sid, n] of contagem) {
        if (n > max) {
          max = n;
          favServicoId = sid;
        }
      }
      if (favServicoId) {
        const sv = await this.prisma.client.servico.findFirst({
          where: { id: favServicoId, ativo: true },
          select: { id: true, nome: true },
        });
        if (sv) servicoFavorito = sv;
      }
    }

    return {
      totalVisitas,
      totalGasto,
      ticketMedio,
      // frequenciaMediaDias = 0 quando insuficiente; senão média entre
      // visitas consecutivas em dias.
      frequenciaMediaDias:
        totalVisitas < 2
          ? 0
          : Math.round(frequenciaMediaDias / (totalVisitas - 1) / (1000 * 60 * 60 * 24)),
      servicoFavorito,
    };
  }

  /**
   * Histórico (últimos 20 atendimentos CONCLUIDO ou CANCELADO).
   */
  async historico(id: string) {
    await this.obter(id);

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: {
        clienteId: id,
        status: { in: ['CONCLUIDO', 'CANCELADO'] },
      },
      include: { servico: true, profissional: true },
      orderBy: { dataHora: 'desc' },
      take: 20,
    });

    return agendamentos.map((a) => ({
      id: a.id,
      dataHora: a.dataHora,
      status: a.status,
      servico: { nome: a.servico.nome, preco: a.servico.preco },
      profissional: { nome: a.profissional.nome },
    }));
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
