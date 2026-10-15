import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { ProdutosService } from './produtos.service';
import { ListarProdutosDto } from './dto/listar-produtos.dto';
import { PaginacaoDto } from '../common/dto/paginacao.dto';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  listar(@Query() query: ListarProdutosDto) {
    return this.produtosService.listar(query.page ?? 1, query.limit ?? 20, query);
  }

  @Get('alerta')
  listarEmAlerta(@Query() query: PaginacaoDto) {
    return this.produtosService.listarEmAlerta(query.limit ?? 20);
  }

  @Get('categorias')
  categorias() {
    return this.produtosService.categorias();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.produtosService.obter(id);
  }

  @Post()
  criar(@Body() dto: CriarProdutoDto) {
    return this.produtosService.criar(dto);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarProdutoDto) {
    return this.produtosService.atualizar(id, dto);
  }

  @Delete(':id')
  desativar(@Param('id') id: string) {
    return this.produtosService.desativar(id);
  }
}
