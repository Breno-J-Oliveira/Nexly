import { Body, Controller, Get, Put } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { getTenantContext } from '../database/tenant-context';

@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async obter() {
    const ctx = getTenantContext();
    if (!ctx) return { nome: 'Nexly', plano: 'FREE' };
    return (await this.prisma.client.empresa.findUnique({ where: { id: ctx.tenantId } })) ?? { nome: 'Nexly', plano: 'FREE' };
  }

  @Put()
  async atualizar(@Body() body: { nome?: string }) {
    const ctx = getTenantContext();
    if (!ctx || !body.nome) return { ok: false };
    await this.prisma.client.empresa.update({ where: { id: ctx.tenantId }, data: { nome: body.nome } });
    return { ok: true, nome: body.nome };
  }
}