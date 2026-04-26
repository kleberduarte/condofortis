import { ConflictException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AssembliesService } from './assemblies.service'
import { PrismaService } from '../common/prisma/prisma.service'

const mockPrisma = {
  assembly: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  poll: { create: jest.fn() },
  pollOption: { findUnique: jest.fn(), update: jest.fn() },
  userVote: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('AssembliesService', () => {
  let service: AssembliesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssembliesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<AssembliesService>(AssembliesService)
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create an assembly with SCHEDULED status', async () => {
      const assembly = { id: 'a-1', title: 'AGO 2026', status: 'SCHEDULED' }
      mockPrisma.assembly.create.mockResolvedValue(assembly)

      const result = await service.create(
        { condominiumId: 'condo-1', title: 'AGO 2026', scheduledAt: '2026-06-01T18:00' },
        'tenant-1',
      )

      expect(result).toEqual(assembly)
      expect(mockPrisma.assembly.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SCHEDULED' }) }),
      )
    })
  })

  describe('vote', () => {
    it('should register vote and increment option count', async () => {
      mockPrisma.pollOption.findUnique.mockResolvedValue({ id: 'opt-1', pollId: 'poll-1', votes: 0 })
      mockPrisma.userVote.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'opt-1', votes: 1 },
        { id: 'uv-1' },
      ])

      const result = await service.vote('poll-1', 'opt-1', 'user-1')

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual(expect.arrayContaining([{ id: 'opt-1', votes: 1 }]))
    })

    it('should throw ConflictException when user already voted', async () => {
      mockPrisma.pollOption.findUnique.mockResolvedValue({ id: 'opt-1', pollId: 'poll-1' })
      mockPrisma.userVote.findUnique.mockResolvedValue({ id: 'uv-existing' })

      await expect(service.vote('poll-1', 'opt-1', 'user-1')).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException for invalid option', async () => {
      mockPrisma.pollOption.findUnique.mockResolvedValue(null)

      await expect(service.vote('poll-1', 'bad-opt', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when option belongs to different poll', async () => {
      mockPrisma.pollOption.findUnique.mockResolvedValue({ id: 'opt-1', pollId: 'other-poll' })

      await expect(service.vote('poll-1', 'opt-1', 'user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateStatus', () => {
    it('should update assembly status', async () => {
      const assembly = { id: 'a-1', status: 'SCHEDULED', tenantId: 'tenant-1' }
      mockPrisma.assembly.findFirst.mockResolvedValue(assembly)
      mockPrisma.assembly.update.mockResolvedValue({ ...assembly, status: 'OPEN' })

      const result = await service.updateStatus('a-1', 'tenant-1', 'OPEN')

      expect(result.status).toBe('OPEN')
    })

    it('should throw NotFoundException for unknown assembly', async () => {
      mockPrisma.assembly.findFirst.mockResolvedValue(null)

      await expect(service.updateStatus('bad-id', 'tenant-1', 'OPEN')).rejects.toThrow(NotFoundException)
    })
  })
})
