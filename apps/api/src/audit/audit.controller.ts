import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantContext } from '../database/tenant-context';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('logs')
  @Roles(Role.ADMIN)
  listar(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('limite', new DefaultValuePipe(25), ParseIntPipe) limite: number,
    @Query('recurso') recurso?: string,
    @Query('acao') acao?: string,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    const ctx = getTenantContext();
    return this.service.listar({
      empresaId: ctx?.tenantId ?? '',
      recurso,
      acao,
      inicio,
      fim,
      pagina,
      limite,
    });
  }
}
