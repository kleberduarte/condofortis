import { GoneException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { EventsGateway } from '../events/events.gateway'
import { CreateVisitorDto } from './dto/create-visitor.dto'
import * as crypto from 'crypto'

/** Janela após `expectedAt` em que o QR ainda é aceito na portaria. */
const VISITOR_QR_VALID_MINUTES_AFTER_EXPECTED = 30

@Injectable()
export class VisitorsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async findAll(
    tenantId: string,
    condominiumId?: string,
    status?: string,
    search?: string,
    date?: string,
    residentUserId?: string,
  ) {
    const dateFilter = date
      ? {
          createdAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
          },
        }
      : {}

    let unitIdIn: string[] | undefined
    if (residentUserId) {
      const units = await this.prisma.unit.findMany({
        where: {
          tenantId,
          isActive: true,
          residents: { some: { userId: residentUserId, movedOutAt: null } },
        },
        select: { id: true },
      })
      unitIdIn = units.map((u) => u.id)
      if (unitIdIn.length === 0) return []
    }

    // Morador vê todo o histórico da unidade; portaria padrão oculta quem já saiu
    const statusWhere =
      status !== undefined && status !== ''
        ? { status: status as any }
        : residentUserId
          ? {}
          : { status: { not: 'LEFT' as const } }

    return this.prisma.visitor.findMany({
      where: {
        tenantId,
        ...(condominiumId ? { condominiumId } : {}),
        ...(unitIdIn ? { unitId: { in: unitIdIn } } : {}),
        ...statusWhere,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { document: { contains: search, mode: 'insensitive' } },
                { unit: { number: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...dateFilter,
      },
      include: {
        unit: {
          include: {
            block: true,
            residents: {
              where: { movedOutAt: null },
              include: { user: { select: { id: true, name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const visitor = await this.prisma.visitor.findFirst({ where: { id, tenantId } })
    if (!visitor) throw new NotFoundException('Visitante não encontrado')
    return visitor
  }

  async create(dto: CreateVisitorDto, tenantId: string) {
    const qrCode = crypto.randomBytes(16).toString('hex')
    return this.prisma.visitor.create({
      data: {
        ...dto,
        tenantId,
        qrCode,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
      },
    })
  }

  private qrExpiresAt(expectedAt: Date): Date {
    return new Date(expectedAt.getTime() + VISITOR_QR_VALID_MINUTES_AFTER_EXPECTED * 60_000)
  }

  async authorize(qrCode: string) {
    const visitor = await this.prisma.visitor.findUnique({ where: { qrCode }, include: { unit: true } })
    if (!visitor) throw new NotFoundException('QR Code inválido')
    if (visitor.status === 'DENIED') throw new NotFoundException('Acesso negado')

    if (visitor.status === 'EXPECTED' && visitor.expectedAt) {
      const expiresAt = this.qrExpiresAt(visitor.expectedAt)
      if (new Date() > expiresAt) {
        throw new GoneException(
          'QR Code expirado. O acesso é válido até 30 minutos após o horário previsto de chegada.',
        )
      }
    }

    return visitor
  }

  async checkin(id: string, tenantId: string) {
    const visitor = await this.findOne(id, tenantId)
    const updated = await this.prisma.visitor.update({
      where: { id },
      data: { status: 'ENTERED', enteredAt: new Date() },
    })
    this.events.emitToCondominium(visitor.condominiumId, 'visitor.update', updated)
    return updated
  }

  async checkout(id: string, tenantId: string) {
    const visitor = await this.findOne(id, tenantId)
    const updated = await this.prisma.visitor.update({
      where: { id },
      data: { status: 'LEFT', leftAt: new Date() },
    })
    this.events.emitToCondominium(visitor.condominiumId, 'visitor.update', updated)
    return updated
  }

  async deny(id: string, tenantId: string) {
    const visitor = await this.findOne(id, tenantId)
    const updated = await this.prisma.visitor.update({ where: { id }, data: { status: 'DENIED' } })
    this.events.emitToCondominium(visitor.condominiumId, 'visitor.update', updated)
    return updated
  }
}
