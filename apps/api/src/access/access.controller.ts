import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AccessService } from './access.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access')
export class AccessController {
  constructor(private readonly service: AccessService) {}

  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.DOORMAN)
  @ApiOperation({ summary: 'Log de acessos' })
  getLogs(
    @CurrentUser() user: any,
    @Query('condominiumId') condominiumId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getLogs(user.tenantId, condominiumId, limit)
  }

  @Get('stats/:condominiumId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.DOORMAN)
  @ApiOperation({ summary: 'Estatísticas do dia' })
  getDailyStats(@Query('condominiumId') condominiumId: string, @CurrentUser() user: any) {
    return this.service.getDailyStats(user.tenantId, condominiumId)
  }

  @Post('logs')
  @Roles(UserRole.DOORMAN, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar acesso manualmente' })
  register(@Body() body: any, @CurrentUser() user: any) {
    return this.service.register({ ...body, tenantId: user.tenantId })
  }
}
