import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LgpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Exporta todos os dados da empresa do tenant como objeto estruturado. */
  async exportar(empresaId: string) {
    const [clientes, profissionais, servicos, produtos, movimentacoes, agendamentos, vendas] =
      await Promise.all([
        this.prisma.client.cliente.findMany({ where: { empresaId } }),
        this.prisma.client.profissional.findMany({ where: { empresaId } }),
        this.prisma.client.servico.findMany({ where: { empresaId } }),
        this.prisma.client.produto.findMany({ where: { empresaId } }),
        this.prisma.client.movimentacaoEstoque.findMany({ where: { empresaId } }),
        this.prisma.client.agendamento.findMany({ where: { empresaId } }),
        this.prisma.client.venda.findMany({ where: { empresaId } }),
      ]);

    return {
      exportadoEm: new Date().toISOString(),
      empresaId,
      clientes,
      profissionais,
      servicos,
      produtos,
      movimentacoes,
      agendamentos,
      vendas,
    };
  }

  /** Exporta os dados de um único cliente (titular). */
  async exportarCliente(empresaId: string, clienteId: string) {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, empresaId },
      include: {
        agendamentos: true,
        vendas: true,
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  /** Anonimiza um cliente (direito ao esquecimento), preservando agendamentos. */
  async anonimizarCliente(
    empresaId: string,
    clienteId: string,
    usuarioId: string,
    password: string,
  ) {
    await this.verificarSenha(usuarioId, password);

    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');

    await this.prisma.client.cliente.updateMany({
      where: { id: clienteId },
      data: {
        nome: 'Cliente Removido',
        telefone: null,
        email: null,
        observacoes: null,
      },
    });

    this.audit.registrar({
      empresaId,
      usuarioId,
      acao: 'EXCLUIR',
      recurso: 'Cliente',
      recursoId: clienteId,
      dadosAntigos: { nome: cliente.nome, email: cliente.email },
      dadosNovos: { nome: 'Cliente Removido', anonimizado: true },
    });

    return { success: true };
  }

  /** Agenda a exclusão da conta (30 dias), conforme LGPD. */
  async solicitarExclusao(
    empresaId: string,
    usuarioId: string,
    password: string,
    confirmacao: string,
  ) {
    await this.verificarSenha(usuarioId, password);

    if (confirmacao !== 'EXCLUIR MINHA CONTA') {
      throw new BadRequestException('Confirmação incorreta');
    }

    const executarEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.client.exclusaoConta.create({
      data: { empresaId, executarEm },
    });

    return { agendadaParaExclusaoEm: executarEm };
  }

  async statusExclusao(empresaId: string) {
    const pendente = await this.prisma.client.exclusaoConta.findFirst({
      where: { empresaId, executada: false },
      orderBy: { solicitadaEm: 'desc' },
    });
    if (!pendente) return { emExclusao: false };
    return { emExclusao: true, executarEm: pendente.executarEm };
  }

  async cancelarExclusao(empresaId: string) {
    await this.prisma.client.exclusaoConta.updateMany({
      where: { empresaId, executada: false },
      data: { executada: true },
    });
    return { success: true };
  }

  private async verificarSenha(usuarioId: string, password: string): Promise<void> {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    const ok = await argon2.verify(usuario.senhaHash, password);
    if (!ok) throw new BadRequestException('Senha incorreta');
  }
}
