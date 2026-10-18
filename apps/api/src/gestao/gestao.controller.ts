import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { EstoqueModule } from '../estoque/estoque.module';
import { FinanceiroOperacionalService } from './financeiro-operacional.service';
import { GestaoService } from './gestao.service';
import {
  BaixaDto,
  ComprovacaoDto,
  ImportacaoDto,
  LancamentoDto,
  PreferenciasDto,
  TransferenciaDto,
} from './gestao.dto';
type User = { id: string; empresaId: string };
@Controller('gestao')
@Roles(Role.ADMIN, Role.GESTOR)
export class GestaoController {
  constructor(
    private readonly service: GestaoService,
    private readonly financeiro: FinanceiroOperacionalService,
    private readonly audit: AuditService,
  ) {}
  @Get('inicio') inicio(@CurrentUser() u: User) {
    return this.service.inicio(u.empresaId);
  }
  @Put('preferencias') preferencias(@CurrentUser() u: User, @Body() dto: PreferenciasDto) {
    return this.service.preferencias(u.empresaId, dto);
  }
  @Roles(Role.ADMIN) @Get('monitor') monitor(@CurrentUser() u: User) {
    return this.service.monitor(u.empresaId);
  }
  @Roles(Role.ADMIN) @Post('comprovacoes') comprovar(
    @CurrentUser() u: User,
    @Body() dto: ComprovacaoDto,
  ) {
    return this.service.comprovar(u.empresaId, u.id, dto);
  }
  @Roles(Role.ADMIN) @Post('rotinas/:id/repetir') repetir(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.repetirJob(u.empresaId, id);
  }
  @Get('filiais') saldos(@CurrentUser() u: User) {
    return this.service.saldos(u.empresaId);
  }
  @Post('transferencias') transferir(@CurrentUser() u: User, @Body() dto: TransferenciaDto) {
    return this.service.transferir(u.empresaId, dto);
  }
  @Roles(Role.ADMIN, Role.GESTOR, Role.CAIXA) @Get('unidades') unidades(@CurrentUser() u: User) {
    return this.service.unidades(u.empresaId);
  }
  @Roles(Role.ADMIN, Role.GESTOR, Role.CAIXA) @Get('catalogo-filial/:id') catalogoFilial(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.catalogoFilial(u.empresaId, id);
  }
  @Post('importacao/previa') previa(@CurrentUser() u: User, @Body() dto: ImportacaoDto) {
    return this.service.previa(u.empresaId, dto);
  }
  @Post('importacao/confirmar') importar(@CurrentUser() u: User, @Body() dto: ImportacaoDto) {
    return this.service.importar(u.empresaId, dto);
  }
  @Get('financeiro') contas(
    @CurrentUser() u: User,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('filialId') filialId?: string,
    @Query('pagina') pagina = '1',
  ) {
    return this.financeiro.listar(u.empresaId, inicio, fim, filialId, Number(pagina));
  }
  @Get('financeiro/resumo') resumo(
    @CurrentUser() u: User,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('filialId') filialId?: string,
  ) {
    return this.financeiro.resumo(u.empresaId, inicio, fim, filialId);
  }
  @Post('financeiro') criarConta(@CurrentUser() u: User, @Body() dto: LancamentoDto) {
    return this.financeiro.criar(u.empresaId, dto);
  }
  @Post('financeiro/:id/baixar') baixar(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BaixaDto,
  ) {
    return this.financeiro.baixar(u.empresaId, id, dto);
  }
  @Post('financeiro/:id/cancelar') cancelar(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.financeiro.cancelar(u.empresaId, id);
  }
  @Post('financeiro/:id/baixas/:baixaId/estornar') estornarBaixa(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('baixaId', ParseUUIDPipe) baixaId: string,
  ) {
    return this.financeiro.estornarBaixa(u.empresaId, id, baixaId);
  }
  @Roles(Role.ADMIN) @Get('historico') historico(
    @CurrentUser() u: User,
    @Query('pagina') pagina = '1',
    @Query('recurso') recurso?: string,
    @Query('acao') acao?: string,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.audit.listar({
      empresaId: u.empresaId,
      pagina: Number(pagina),
      limite: 25,
      recurso,
      acao,
      inicio,
      fim,
    });
  }
}
@Module({
  imports: [AuditModule, EstoqueModule],
  controllers: [GestaoController],
  providers: [GestaoService, FinanceiroOperacionalService],
})
export class GestaoModule {}
