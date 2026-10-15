import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OperacoesService } from './operacoes.service';
import {
  AutomacaoDto,
  CampanhaDto,
  ConsentimentoDto,
  DocumentoDto,
  FilialDto,
  RecorrenciaDto,
  TarefaDto,
} from './operacoes.dto';
type User = { empresaId: string };
function pagina(page: number) {
  if (page < 1 || page > 100000) throw new BadRequestException('Pagina invalida');
  return page;
}
@Controller('operacoes')
@Roles(Role.ADMIN, Role.GESTOR)
export class OperacoesController {
  constructor(private readonly service: OperacoesService) {}
  @Get('opcoes') opcoes(@CurrentUser() u: User, @Query('busca') busca?: string) {
    return this.service.opcoes(u.empresaId, (busca || '').slice(0, 100));
  }
  @Get('tarefas') tarefas(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: string,
    @Query('filialId') filialId?: string,
  ) {
    return this.service.tarefas(u.empresaId, pagina(page), status, filialId);
  }
  @Post('tarefas') criarTarefa(@CurrentUser() u: User, @Body() dto: TarefaDto) {
    return this.service.salvarTarefa(u.empresaId, dto);
  }
  @Put('tarefas/:id') editarTarefa(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TarefaDto,
  ) {
    return this.service.salvarTarefa(u.empresaId, dto, id);
  }
  @Delete('tarefas/:id') excluirTarefa(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.excluirTarefa(u.empresaId, id);
  }
  @Get('filiais') filiais(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.filiais(u.empresaId, pagina(page));
  }
  @Post('filiais') criarFilial(@CurrentUser() u: User, @Body() dto: FilialDto) {
    return this.service.salvarFilial(u.empresaId, dto);
  }
  @Put('filiais/:id') editarFilial(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FilialDto,
  ) {
    return this.service.salvarFilial(u.empresaId, dto, id);
  }
  @Get('documentos') documentos(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.documentos(u.empresaId, pagina(page));
  }
  @Get('documentos/:id') documento(@CurrentUser() u: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.documento(u.empresaId, id);
  }
  @Post('documentos') criarDocumento(@CurrentUser() u: User, @Body() dto: DocumentoDto) {
    return this.service.salvarDocumento(u.empresaId, dto);
  }
  @Put('documentos/:id') editarDocumento(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DocumentoDto,
  ) {
    return this.service.salvarDocumento(u.empresaId, dto, id);
  }
  @Delete('documentos/:id') excluirDocumento(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.excluirDocumento(u.empresaId, id);
  }
  @Get('campanhas') campanhas(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.campanhas(u.empresaId, pagina(page));
  }
  @Post('campanhas') criarCampanha(@CurrentUser() u: User, @Body() dto: CampanhaDto) {
    return this.service.salvarCampanha(u.empresaId, dto);
  }
  @Put('campanhas/:id') editarCampanha(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampanhaDto,
  ) {
    return this.service.salvarCampanha(u.empresaId, dto, id);
  }
  @Put('consentimentos') consentimento(@CurrentUser() u: User, @Body() dto: ConsentimentoDto) {
    return this.service.consentimento(u.empresaId, dto);
  }
  @Get('campanhas/:id/contatos') contatos(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.contatosMarketing(u.empresaId, id, pagina(page));
  }
  @Get('automacoes') automacoes(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.automacoes(u.empresaId, pagina(page));
  }
  @Post('automacoes') criarAutomacao(@CurrentUser() u: User, @Body() dto: AutomacaoDto) {
    return this.service.salvarAutomacao(u.empresaId, dto);
  }
  @Put('automacoes/:id') editarAutomacao(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutomacaoDto,
  ) {
    return this.service.salvarAutomacao(u.empresaId, dto, id);
  }
  @Post('automacoes/processar') processar(@CurrentUser() u: User) {
    return this.service.processarAutomacoes(u.empresaId);
  }
  @Get('recorrencias') recorrencias(
    @CurrentUser() u: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.recorrencias(u.empresaId, pagina(page));
  }
  @Post('recorrencias') criarRecorrencia(@CurrentUser() u: User, @Body() dto: RecorrenciaDto) {
    return this.service.criarRecorrencia(u.empresaId, dto);
  }
  @Post('recorrencias/:id/cancelar') cancelar(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelarRecorrencia(u.empresaId, id);
  }
}
@Module({ controllers: [OperacoesController], providers: [OperacoesService] })
export class OperacoesModule {}
