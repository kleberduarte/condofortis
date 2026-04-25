import { Module } from '@nestjs/common'
import { OccurrencesController } from './occurrences.controller'
import { OccurrencesService } from './occurrences.service'

@Module({
  controllers: [OccurrencesController],
  providers: [OccurrencesService],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
