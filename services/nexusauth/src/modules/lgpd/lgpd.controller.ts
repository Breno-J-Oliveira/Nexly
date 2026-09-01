import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LgpdService } from './lgpd.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('LGPD/GDPR')
@Controller('me/data')
@UseGuards(JwtAuthGuard)
export class LgpdController {
  constructor(private lgpdService: LgpdService) {}

  /**
   * Export all personal data associated with the authenticated user
   * in a portable JSON format. Implements LGPD Art. 18, V and
   * GDPR Art. 15, 20.
   */
  @Get('export')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Export all personal data (LGPD Art. 18 / GDPR Art. 15)',
  })
  async export(@CurrentUser() user: any) {
    return this.lgpdService.exportUserData(user.sub);
  }

  /**
   * Delete all personal data associated with the authenticated user.
   * Implements LGPD Art. 18, VI and GDPR Art. 17 (right to erasure).
   *
   * This is a soft delete by default. To perform a hard delete,
   * include the `hardDelete: true` option (admin only).
   */
  @Delete()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete all personal data (LGPD Art. 18 / GDPR Art. 17)',
  })
  async delete(
    @CurrentUser() user: any,
    @Body() body: { hardDelete?: boolean; confirmation?: string },
  ) {
    if (body?.hardDelete && user.role !== 'ADMIN') {
      throw new Error('Only admins can perform hard delete');
    }

    if (body?.hardDelete && body?.confirmation !== 'DELETE_MY_DATA_PERMANENTLY') {
      throw new Error(
        'Hard delete requires explicit confirmation: confirmation="DELETE_MY_DATA_PERMANENTLY"',
      );
    }

    return this.lgpdService.deleteUserData(user.sub, {
      hardDelete: body?.hardDelete || false,
    });
  }

  /**
   * Record user consent for various data processing activities.
   * Implements LGPD Art. 7, 8.
   */
  @Post('consent')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Record user consent for data processing (LGPD Art. 7-8)',
  })
  async recordConsent(
    @CurrentUser() user: any,
    @Body()
    consents: {
      marketing?: boolean;
      analytics?: boolean;
      thirdPartySharing?: boolean;
      ipGeolocation?: boolean;
      dataRetention?: boolean;
    },
  ) {
    return this.lgpdService.recordConsent(user.sub, consents);
  }
}
