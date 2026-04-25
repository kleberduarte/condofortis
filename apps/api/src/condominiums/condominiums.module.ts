import { Module } from '@nestjs/common'
import { CondominiumsController } from './condominiums.controller'
import { CondominiumsService } from './condominiums.service'

@Module({
  controllers: [CondominiumsController],
  providers: [CondominiumsService],
  exports: [CondominiumsService],
})
export class CondominiumsModule {}
