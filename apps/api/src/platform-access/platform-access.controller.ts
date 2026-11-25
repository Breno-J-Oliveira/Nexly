import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AuthUser } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { PlatformRequest } from './platform-access.guard';
import { PlatformRoles } from './platform-roles.decorator';
import {
  AddPlatformMemberDto,
  PlatformCandidatesDto,
  UpdatePlatformMemberDto,
} from './platform-team.dto';
import { PlatformTeamService } from './platform-team.service';

@Controller('platform')
export class PlatformAccessController {
  constructor(private readonly equipe: PlatformTeamService) {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @PlatformRoles('OWNER', 'OPERATIONS', 'FINANCE', 'VIEWER')
  me(@Req() request: PlatformRequest) {
    return request.platformMember;
  }

  @Get('team')
  @Header('Cache-Control', 'no-store')
  @PlatformRoles('OWNER')
  listar(@CurrentUser() operador: AuthUser) {
    return this.equipe.listar(operador);
  }

  @Get('team/candidates')
  @Header('Cache-Control', 'no-store')
  @PlatformRoles('OWNER')
  candidatos(@CurrentUser() operador: AuthUser, @Query() query: PlatformCandidatesDto) {
    return this.equipe.candidatos(operador, query.busca);
  }

  @Post('team')
  @Header('Cache-Control', 'no-store')
  @PlatformRoles('OWNER')
  adicionar(@CurrentUser() operador: AuthUser, @Body() dto: AddPlatformMemberDto) {
    return this.equipe.adicionar(operador, dto);
  }

  @Patch('team/:id')
  @Header('Cache-Control', 'no-store')
  @PlatformRoles('OWNER')
  atualizar(
    @CurrentUser() operador: AuthUser,
    @Param('id', new ParseUUIDPipe()) membroId: string,
    @Body() dto: UpdatePlatformMemberDto,
  ) {
    return this.equipe.atualizar(operador, membroId, dto);
  }
}
