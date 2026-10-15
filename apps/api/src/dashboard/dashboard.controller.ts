import { filtrarDashboard } from './dashboard-access';
import { Controller, Get } from '@nestjs/common';
import { AuthUser } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: AuthUser) {
    const data = await this.dashboardService.getDashboard(user.empresaId);
    return filtrarDashboard(data as Record<string, unknown>, user.role);
  }
}
