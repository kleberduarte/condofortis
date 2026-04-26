import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { EventsGateway } from '../events/events.gateway'
import { AccessType } from '@condofortis/types'

@Injectable()
export class AccessService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  getLogs(tenantId: string, condominiumId?: string, limit = 50) {
    return this.prisma.accessLog.findMany({
      where: { tenantId, ...(condominiumId ? { condominiumId } : {}) },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async register(data: {
    tenantId: string
    condominiumId: string
    userId?: string
    visitorId?: string
    accessType: AccessType
    direction: 'IN' | 'OUT'
    description?: string
  }) {
    const log = await this.prisma.accessLog.create({
      data,
      include: { user: { select: { id: true, name: true, role: true } } },
    })
    this.events.emitToCondominium(data.condominiumId, 'access.new', log)
    return log
  }

  getDailyStats(tenantId: string, condominiumId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.prisma.accessLog.groupBy({
      by: ['direction'],
      where: {
        tenantId,
        condominiumId,
        createdAt: { gte: today, lt: tomorrow },
      },
      _count: true,
    })
  }
}
