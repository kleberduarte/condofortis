import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { PrismaModule } from '../common/prisma/prisma.module'
import { EventsModule } from '../events/events.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationProcessor } from './notification.processor'

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' }), PrismaModule, EventsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
