import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { AccessType } from '@condofortis/types'

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

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

  register(data: {
    tenantId: string
    condominiumId: string
    userId?: string
    visitorId?: string
    accessType: AccessType
    direction: 'IN' | 'OUT'
    description?: string
  }) {
    return this.prisma.accessLog.create({ data })
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
