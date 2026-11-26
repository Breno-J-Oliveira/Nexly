import { Controller, Get, Header } from '@nestjs/common';
import { AuthUser, Role } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PlatformRoles } from '../platform-access/platform-roles.decorator';
import { PlatformWorkspaceService } from './platform-workspace.service';

@Controller('platform/workspace')
export class PlatformWorkspaceController {
  constructor(private readonly workspace: PlatformWorkspaceService) {}

  @Get()
  @Roles(Role.ADMIN)
  @PlatformRoles('OWNER')
  @Header('Cache-Control', 'no-store')
  resumo(@CurrentUser() usuario: AuthUser) {
    return this.workspace.resumo(usuario);
  }
}
