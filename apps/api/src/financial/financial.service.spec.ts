import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bull'
import { FinancialService } from './financial.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { AsaasService } from './asaas.service'


const mockPrisma = {
  invoice: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  unit: { findMany: jest.fn() },
  condominium: { findFirst: jest.fn() },
}

const mockQueue = { add: jest.fn() }
const mockAsaas = { cancelCharge: jest.fn() }

describe('FinancialService', () => {
  let service: FinancialService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AsaasService, useValue: mockAsaas },
        { provide: getQueueToken('invoices'), useValue: mockQueue },
      ],
    }).compile()

    service = module.get<FinancialService>(FinancialService)
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create an invoice and enqueue boleto generation', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null)
      const invoice = { id: 'inv-1', unitId: 'unit-1', reference: '2026-01' }
      mockPrisma.invoice.create.mockResolvedValue(invoice)

      const result = await service.create(
        { unitId: 'unit-1', condominiumId: 'condo-1', reference: '2026-01', dueDate: '2026-01-15', amount: 650 },
        'tenant-1',
      )

      expect(result).toEqual(invoice)
      expect(mockQueue.add).toHaveBeenCalledWith('generate-boleto', { invoiceId: 'inv-1' })
    })

    it('should throw BadRequestException when invoice already exists for the period', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'existing' })

      await expect(
        service.create(
          { unitId: 'unit-1', condominiumId: 'condo-1', reference: '2026-01', dueDate: '2026-01-15', amount: 650 },
          'tenant-1',
        ),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('generateBulk', () => {
    it('should throw UnprocessableEntityException when monthlyFee is 0', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([{ id: 'unit-1' }])
      mockPrisma.condominium.findFirst.mockResolvedValue({ id: 'condo-1', monthlyFee: 0 })

      await expect(
        service.generateBulk({ condominiumId: 'condo-1', reference: '2026-01', dueDate: '2026-01-15' }, 'tenant-1'),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('should generate invoices for all active units skipping duplicates', async () => {
      const units = [{ id: 'unit-1' }, { id: 'unit-2' }]
      mockPrisma.unit.findMany.mockResolvedValue(units)
      mockPrisma.condominium.findFirst.mockResolvedValue({ id: 'condo-1', monthlyFee: 650 })
      mockPrisma.invoice.findFirst
        .mockResolvedValueOnce({ id: 'dup' }) // unit-1 already has invoice
        .mockResolvedValueOnce(null)          // unit-2 is new
      mockPrisma.invoice.create.mockResolvedValue({ id: 'new-inv' })

      const result = await service.generateBulk(
        { condominiumId: 'condo-1', reference: '2026-01', dueDate: '2026-01-15' },
        'tenant-1',
      )

      expect(result.generated).toBe(1)
      expect(mockPrisma.invoice.create).toHaveBeenCalledTimes(1)
    })

    it('should throw NotFoundException when condominium not found', async () => {
      mockPrisma.unit.findMany.mockResolvedValue([])
      mockPrisma.condominium.findFirst.mockResolvedValue(null)

      await expect(
        service.generateBulk({ condominiumId: 'x', reference: '2026-01', dueDate: '2026-01-15' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      const invoice = { id: 'inv-1', status: 'PENDING', amount: 650 }
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice)
      const updated = { ...invoice, status: 'PAID' }
      mockPrisma.invoice.update.mockResolvedValue(updated)

      const result = await service.markAsPaid('inv-1', 'tenant-1')

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
      )
      expect(result.status).toBe('PAID')
    })

    it('should throw BadRequestException when invoice is already paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1', status: 'PAID', amount: 650 })

      await expect(service.markAsPaid('inv-1', 'tenant-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('getStats', () => {
    it('should aggregate financial stats for a condominium', async () => {
      mockPrisma.invoice.count.mockResolvedValue(10)
      mockPrisma.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { paidAmount: 4550 }, _count: 7 })
        .mockResolvedValueOnce({ _sum: { amount: 1300 }, _count: 2 })
      mockPrisma.invoice.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1)

      const result = await service.getStats('tenant-1', 'condo-1')

      expect(result).toEqual(
        expect.objectContaining({ paidAmount: 4550, pendingAmount: 1300 }),
      )
    })
  })
})
