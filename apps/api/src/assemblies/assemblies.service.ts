import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export class CreateAssemblyDto {
  condominiumId: string
  title: string
  description?: string
  scheduledAt: string
}

export class CreatePollDto {
  question: string
  options: string[]
  isMultiple?: boolean
  closesAt?: string
}

@Injectable()
export class AssembliesService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, condominiumId?: string) {
    return this.prisma.assembly.findMany({
      where: { tenantId, ...(condominiumId ? { condominiumId } : {}) },
      include: {
        polls: { include: { options: true } },
        _count: { select: { polls: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id, tenantId },
      include: { polls: { include: { options: true } } },
    })
    if (!assembly) throw new NotFoundException('Assembleia não encontrada')
    return assembly
  }

  create(dto: CreateAssemblyDto, tenantId: string) {
    return this.prisma.assembly.create({
      data: {
        tenantId,
        condominiumId: dto.condominiumId,
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        status: 'SCHEDULED',
      },
    })
  }

  async updateStatus(id: string, tenantId: string, status: 'SCHEDULED' | 'OPEN' | 'CLOSED') {
    await this.findOne(id, tenantId)
    return this.prisma.assembly.update({ where: { id }, data: { status } })
  }

  async addPoll(assemblyId: string, tenantId: string, dto: CreatePollDto) {
    await this.findOne(assemblyId, tenantId)
    return this.prisma.poll.create({
      data: {
        assemblyId,
        question: dto.question,
        isMultiple: dto.isMultiple ?? false,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        options: {
          create: dto.options.map((text) => ({ text })),
        },
      },
      include: { options: true },
    })
  }

  async vote(pollId: string, optionId: string, userId: string) {
    const option = await this.prisma.pollOption.findUnique({ where: { id: optionId } })
    if (!option || option.pollId !== pollId) throw new NotFoundException('Opção não encontrada')

    const existing = await this.prisma.userVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    })
    if (existing) throw new ConflictException('Você já votou nesta votação')

    return this.prisma.$transaction([
      this.prisma.pollOption.update({
        where: { id: optionId },
        data: { votes: { increment: 1 } },
      }),
      this.prisma.userVote.create({
        data: { pollId, optionId, userId },
      }),
    ])
  }
}
