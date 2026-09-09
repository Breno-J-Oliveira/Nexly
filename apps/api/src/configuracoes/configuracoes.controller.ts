import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { getTenantContext } from '../database/tenant-context';
import { AtualizarConfiguracoesDto } from './dto/atualizar-configuracoes.dto';

@ApiTags('Configuracoes')
@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Obter configurações da empresa' })
  @ApiResponse({ status: 200, description: 'Dados da empresa' })
  async obter() {
    const ctx = getTenantContext();
    if (!ctx) return { nome: 'Nexly', plano: 'FREE' };
    return (
      (await this.prisma.client.empresa.findFirst({ where: { id: ctx.tenantId } })) ?? {
        nome: 'Nexly',
        plano: 'FREE',
      }
    );
  }

  @Put()
  @ApiOperation({ summary: 'Atualizar configurações da empresa' })
  @ApiResponse({ status: 200, description: 'Configurações atualizadas' })
  async atualizar(@Body() body: AtualizarConfiguracoesDto) {
    const ctx = getTenantContext();
    if (!ctx) return { ok: false };
    await this.prisma.client.empresa.update({
      where: { id: ctx.tenantId },
      data: {
        ...(body.nome !== undefined ? { nome: body.nome } : {}),
        ...(body.cnpj !== undefined ? { cnpj: body.cnpj } : {}),
        ...(body.telefone !== undefined ? { telefone: body.telefone } : {}),
        ...(body.emailContato !== undefined ? { emailContato: body.emailContato } : {}),
        ...(body.endereco !== undefined ? { endereco: body.endereco } : {}),
        ...(body.descricao !== undefined ? { descricao: body.descricao } : {}),
        ...(body.instagram !== undefined ? { instagram: body.instagram } : {}),
        ...(body.whatsapp !== undefined ? { whatsapp: body.whatsapp } : {}),
        ...(body.horarios !== undefined ? { horarios: body.horarios as never } : {}),
        ...(body.notificacoes !== undefined ? { notificacoes: body.notificacoes as never } : {}),
      },
    });
    return { ok: true };
  }
}