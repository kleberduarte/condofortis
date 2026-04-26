import { Controller, Get, Patch, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário logado' })
  findAll(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notificationsService.findAll(user.id, user.tenantId)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Quantidade de notificações não lidas' })
  async unreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.notificationsService.getUnreadCount(user.id)
    return { count }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllRead(@CurrentUser() user: { id: string; tenantId: string }) {
    return this.notificationsService.markAllRead(user.id, user.tenantId)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  markRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.notificationsService.markRead(id, user.id)
  }
}
