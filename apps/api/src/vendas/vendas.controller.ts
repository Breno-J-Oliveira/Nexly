import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { VendasService } from './vendas.service';
import { ListarVendasDto } from './dto/listar-vendas.dto';
import { EstornoDto } from '../gestao/gestao.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@nexly/shared';

@Controller('vendas')
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  criar(@Body() dto: CriarVendaDto) {
    return this.vendasService.criar(dto.clienteId, dto.itens, {
      formaPagamento: dto.formaPagamento,
      desconto: dto.desconto,
      cupomCodigo: dto.cupomCodigo,
      filialId: dto.filialId,
      recebido: dto.recebido,
      chaveOperacao: dto.chaveOperacao,
    });
  }

  @Post(':id/estornar')
  @Roles(Role.ADMIN, Role.GESTOR)
  estornar(@Param('id') id: string, @Body() dto: EstornoDto, @CurrentUser() u: { id: string }) {
    return this.vendasService.estornar(id, dto.motivo, u.id);
  }

  @Get()
  listar(@Query() query: ListarVendasDto) {
    return this.vendasService.listar(query.page ?? 1, query.limit ?? 20, query);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.vendasService.obter(id);
  }
}
