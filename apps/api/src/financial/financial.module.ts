import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { FinancialController } from './financial.controller'
import { FinancialService } from './financial.service'
import { AsaasService } from './asaas.service'
import { InvoiceProcessor } from './invoice.processor'

@Module({
  imports: [BullModule.registerQueue({ name: 'invoices' })],
  controllers: [FinancialController],
  providers: [FinancialService, AsaasService, InvoiceProcessor],
  exports: [FinancialService],
})
export class FinancialModule {}
