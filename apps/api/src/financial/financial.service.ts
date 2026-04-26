import { Injectable, NotFoundException, BadRequestException, UnprocessableEntityException, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
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
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  findAll(tenantId: string, condominiumId?: string, status?: InvoiceStatus, skip = 0, take = 50) {
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
      skip,
      take,
    })
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { unit: true },
    })
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
    const [units, condominium] = await Promise.all([
      this.prisma.unit.findMany({
        where: { condominiumId: dto.condominiumId, tenantId, isActive: true },
        select: { id: true },
      }),
      this.prisma.condominium.findFirst({
        where: { id: dto.condominiumId, tenantId },
        select: { monthlyFee: true },
      }),
    ])

    if (!condominium) throw new NotFoundException('Condomínio não encontrado')

    const fee = Number(condominium.monthlyFee)
    if (fee <= 0) {
      throw new UnprocessableEntityException(
        'Taxa condominial não configurada. Defina o valor em Configurações > Condomínio antes de gerar cobranças em lote.',
      )
    }

    const unitIds = units.map((u) => u.id)

    // Busca em lote os que já existem — 1 query em vez de N
    const existing = await this.prisma.invoice.findMany({
      where: { unitId: { in: unitIds }, reference: dto.reference },
      select: { unitId: true },
    })
    const existingUnitIds = new Set(existing.map((e) => e.unitId))

    const pendingUnitIds = unitIds.filter((id) => !existingUnitIds.has(id))
    if (pendingUnitIds.length === 0) return { generated: 0, invoices: [] }

    const dueDate = new Date(dto.dueDate)

    // Cria todas as invoices em 1 única transação
    await this.prisma.invoice.createMany({
      data: pendingUnitIds.map((unitId) => ({
        tenantId,
        condominiumId: dto.condominiumId,
        unitId,
        reference: dto.reference,
        dueDate,
        amount: fee,
      })),
    })

    const invoices = await this.prisma.invoice.findMany({
      where: { unitId: { in: pendingUnitIds }, reference: dto.reference, tenantId },
    })

    // Enfileira todos os jobs de uma vez, sem delay artificial
    await this.invoiceQueue.addBulk(
      invoices.map((inv) => ({ name: 'generate-boleto', data: { invoiceId: inv.id } })),
    )

    await this.cache.del(`stats:${tenantId}:${dto.condominiumId}`)

    return { generated: invoices.length, invoices }
  }

  async markAsPaid(id: string, tenantId: string, paidAmount?: number) {
    const invoice = await this.findOne(id, tenantId)
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Cobrança já paga')

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: paidAmount ?? invoice.amount,
      },
    })
    await this.cache.del(`stats:${tenantId}:${invoice.condominiumId}`)
    return updated
  }

  async cancel(id: string, tenantId: string) {
    const invoice = await this.findOne(id, tenantId)
    if (invoice.externalId) {
      try { await this.asaas.cancelCharge(invoice.externalId) } catch {}
    }
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } })
    await this.cache.del(`stats:${tenantId}:${invoice.condominiumId}`)
    return updated
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
    const cacheKey = `stats:${tenantId}:${condominiumId}`
    const cached = await this.cache.get<object>(cacheKey)
    if (cached) return cached

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

    const stats = {
      total,
      paidCount: paid._count,
      paidAmount: paid._sum.paidAmount ?? 0,
      overdueCount: overdue,
      pendingCount: pending._count,
      pendingAmount: pending._sum.amount ?? 0,
    }

    await this.cache.set(cacheKey, stats, 120_000) // 2 minutos
    return stats
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
