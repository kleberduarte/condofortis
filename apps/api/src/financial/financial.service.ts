import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../common/prisma/prisma.service'
import { AsaasService } from './asaas.service'
import { CreateInvoiceDto, GenerateBulkInvoicesDto } from './dto/create-invoice.dto'
import { InvoiceStatus } from '@condofortis/types'
import dayjs from 'dayjs'

@Injectable()
export class FinancialService {
  constructor(
    private prisma: PrismaService,
    private asaas: AsaasService,
    @InjectQueue('invoices') private invoiceQueue: Queue,
  ) {}

  findAll(tenantId: string, condominiumId?: string, status?: InvoiceStatus) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(condominiumId ? { condominiumId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        unit: { include: { block: true } },
      },
      orderBy: { dueDate: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: { unit: true } })
    if (!invoice) throw new NotFoundException('Cobrança não encontrada')
    return invoice
  }

  async create(dto: CreateInvoiceDto, tenantId: string) {
    const exists = await this.prisma.invoice.findFirst({
      where: { unitId: dto.unitId, reference: dto.reference, tenantId },
    })
    if (exists) throw new BadRequestException('Cobrança já existe para esta unidade neste período')

    const invoice = await this.prisma.invoice.create({
      data: { ...dto, tenantId, dueDate: new Date(dto.dueDate) },
    })

    await this.invoiceQueue.add('generate-boleto', { invoiceId: invoice.id })
    return invoice
  }

  async generateBulk(dto: GenerateBulkInvoicesDto, tenantId: string) {
    const units = await this.prisma.unit.findMany({
      where: { condominiumId: dto.condominiumId, tenantId, isActive: true },
    })

    const condominium = await this.prisma.condominium.findFirst({
      where: { id: dto.condominiumId, tenantId },
    })

    if (!condominium) throw new NotFoundException('Condomínio não encontrado')

    // Busca taxa de condomínio (simplificado: usa fração ideal)
    const invoices = []
    for (const unit of units) {
      const exists = await this.prisma.invoice.findFirst({
        where: { unitId: unit.id, reference: dto.reference },
      })
      if (exists) continue

      const invoice = await this.prisma.invoice.create({
        data: {
          tenantId,
          condominiumId: dto.condominiumId,
          unitId: unit.id,
          reference: dto.reference,
          dueDate: new Date(dto.dueDate),
          amount: 500, // valor fixo por enquanto — virá de orçamento
        },
      })
      invoices.push(invoice)
      await this.invoiceQueue.add('generate-boleto', { invoiceId: invoice.id }, { delay: 1000 })
    }

    return { generated: invoices.length, invoices }
  }

  async markAsPaid(id: string, tenantId: string, paidAmount?: number) {
    const invoice = await this.findOne(id, tenantId)
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Cobrança já paga')

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: paidAmount ?? invoice.amount,
      },
    })
  }

  async cancel(id: string, tenantId: string) {
    const invoice = await this.findOne(id, tenantId)
    if (invoice.externalId) {
      try { await this.asaas.cancelCharge(invoice.externalId) } catch {}
    }
    return this.prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } })
  }

  getOverdue(tenantId: string, condominiumId?: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(condominiumId ? { condominiumId } : {}),
        status: 'OVERDUE',
      },
      include: { unit: { include: { residents: { include: { user: true } } } } },
      orderBy: { dueDate: 'asc' },
    })
  }

  async getStats(tenantId: string, condominiumId: string) {
    const [total, paid, overdue, pending] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId, condominiumId } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, condominiumId, status: 'PAID' },
        _sum: { paidAmount: true },
        _count: true,
      }),
      this.prisma.invoice.count({ where: { tenantId, condominiumId, status: 'OVERDUE' } }),
      this.prisma.invoice.aggregate({
        where: { tenantId, condominiumId, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return {
      total,
      paidCount: paid._count,
      paidAmount: paid._sum.paidAmount ?? 0,
      overdueCount: overdue,
      pendingCount: pending._count,
      pendingAmount: pending._sum.amount ?? 0,
    }
  }

  // Processar inadimplência (chamado via cron)
  async processOverdue() {
    const today = dayjs().startOf('day').toDate()
    await this.prisma.invoice.updateMany({
      where: { status: 'PENDING', dueDate: { lt: today } },
      data: { status: 'OVERDUE' },
    })
  }
}
