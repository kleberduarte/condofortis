import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { PrismaService } from '../common/prisma/prisma.service'
import { AsaasService } from './asaas.service'

@Processor('invoices')
export class InvoiceProcessor {
  private readonly logger = new Logger(InvoiceProcessor.name)

  constructor(
    private prisma: PrismaService,
    private asaas: AsaasService,
  ) {}

  @Process('generate-boleto')
  async generateBoleto(job: Job<{ invoiceId: string }>) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: job.data.invoiceId },
      include: { unit: { include: { residents: { include: { user: true } } } } },
    })

    if (!invoice || invoice.externalId) return

    try {
      // Pega o proprietário da unidade para associar ao cliente no Asaas
      const owner = invoice.unit.residents.find((r) => r.isOwner)
      if (!owner) return

      const customer = await this.asaas.createCustomer({
        name: owner.user.name,
        email: owner.user.email ?? undefined,
        phone: owner.user.phone ?? undefined,
      })

      const charge = await this.asaas.createCharge({
        customer: customer.id,
        billingType: 'BOLETO',
        value: Number(invoice.amount),
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        description: `Condomínio - ${invoice.reference}`,
        externalReference: invoice.id,
      })

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          externalId: charge.id,
          barcode: charge.bankSlipUrl ?? null,
          pixCode: charge.pixTransaction?.payload ?? null,
        },
      })

      this.logger.log(`Boleto gerado para invoice ${invoice.id}`)
    } catch (err) {
      this.logger.error(`Erro ao gerar boleto para invoice ${invoice.id}`, err)
      throw err
    }
  }
}
