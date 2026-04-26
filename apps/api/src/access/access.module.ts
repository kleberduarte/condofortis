import { Module } from '@nestjs/common'
import { AccessController } from './access.controller'
import { AccessService } from './access.service'
import { VisitorsController } from './visitors.controller'
import { VisitorsService } from './visitors.service'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [EventsModule],
  controllers: [AccessController, VisitorsController],
  providers: [AccessService, VisitorsService],
  exports: [AccessService],
})
export class AccessModule {}
