import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateOccurrenceDto, UpdateOccurrenceStatusDto } from './dto/create-occurrence.dto'
import { OccurrenceStatus } from '@condofortis/types'

@Injectable()
export class OccurrencesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, condominiumId?: string) {
    return this.prisma.occurrence.findMany({
      where: { tenantId, ...(condominiumId && { condominiumId }) },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        unit: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const occurrence = await this.prisma.occurrence.findFirst({
      where: { id, tenantId },
      include: {
        reporter: { select: { id: true, name: true, role: true } },
        unit: { select: { id: true, number: true } },
      },
    })
    if (!occurrence) throw new NotFoundException('Ocorrência não encontrada')
    return occurrence
  }

  async create(dto: CreateOccurrenceDto, tenantId: string, reportedBy: string) {
    return this.prisma.occurrence.create({
      data: { ...dto, tenantId, reportedBy, status: OccurrenceStatus.OPEN },
    })
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateOccurrenceStatusDto) {
    await this.findOne(id, tenantId)
    return this.prisma.occurrence.update({
      where: { id },
      data: { status: dto.status },
    })
  }
}
