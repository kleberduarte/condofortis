import { Test, TestingModule } from '@nestjs/testing'
import { AccessService } from './access.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { EventsGateway } from '../events/events.gateway'
import { AccessType } from '@condofortis/types'

const mockPrisma = {
  accessLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn(),
  },
}

const mockEvents = { emitToCondominium: jest.fn() }

describe('AccessService', () => {
  let service: AccessService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile()

    service = module.get<AccessService>(AccessService)
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should create an access log and emit WebSocket event', async () => {
      const log = {
        id: 'log-1',
        condominiumId: 'condo-1',
        direction: 'IN',
        accessType: AccessType.MANUAL,
      }
      mockPrisma.accessLog.create.mockResolvedValue(log)

      const result = await service.register({
        tenantId: 'tenant-1',
        condominiumId: 'condo-1',
        accessType: AccessType.MANUAL,
        direction: 'IN',
      })

      expect(result).toEqual(log)
      expect(mockEvents.emitToCondominium).toHaveBeenCalledWith(
        'condo-1',
        'access.new',
        log,
      )
    })
  })

  describe('getLogs', () => {
    it('should return logs filtered by tenantId and condominiumId', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }]
      mockPrisma.accessLog.findMany.mockResolvedValue(logs)

      const result = await service.getLogs('tenant-1', 'condo-1', 10)

      expect(result).toEqual(logs)
      expect(mockPrisma.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', condominiumId: 'condo-1' },
          take: 10,
        }),
      )
    })

    it('should default to limit 50 when not specified', async () => {
      mockPrisma.accessLog.findMany.mockResolvedValue([])

      await service.getLogs('tenant-1')

      expect(mockPrisma.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      )
    })
  })

  describe('getDailyStats', () => {
    it('should group access logs by direction for today', async () => {
      const stats = [
        { direction: 'IN', _count: 15 },
        { direction: 'OUT', _count: 12 },
      ]
      mockPrisma.accessLog.groupBy.mockResolvedValue(stats)

      const result = await service.getDailyStats('tenant-1', 'condo-1')

      expect(result).toEqual(stats)
      expect(mockPrisma.accessLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['direction'] }),
      )
    })
  })
})
