import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { ProdutosService } from './produtos.service';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('categoria') categoria?: string,
    @Query('search') search?: string,
    @Query('estoqueAbaixoDe') estoqueAbaixoDe?: string,
  ) {
    return this.produtosService.listar(page, limit, {
      categoria,
      search,
      estoqueAbaixoDe: estoqueAbaixoDe ? Number(estoqueAbaixoDe) : undefined,
    });
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
