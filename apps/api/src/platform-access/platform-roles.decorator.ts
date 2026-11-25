import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PlatformAccessGuard } from './platform-access.guard';
import { PLATFORM_ROLES_KEY } from './platform-roles.key';

export function PlatformRoles(...papel: [PlatformRole, ...PlatformRole[]]) {
  return applyDecorators(SetMetadata(PLATFORM_ROLES_KEY, papel), UseGuards(PlatformAccessGuard));
}
