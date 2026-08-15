import { Controller, Get } from '@nestjs/common';
import { AuthUser } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getDashboard(user.empresaId);
  }
}
