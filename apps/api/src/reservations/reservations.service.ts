import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateReservationDto } from './dto/create-reservation.dto'

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, condominiumId?: string) {
    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        ...(condominiumId ? { space: { condominiumId } } : {}),
        status: { not: 'CANCELLED' },
      },
      include: {
        space: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'asc' },
    })
  }

  findMyReservations(userId: string, tenantId: string) {
    return this.prisma.reservation.findMany({
      where: { userId, tenantId, status: { not: 'CANCELLED' } },
      include: { space: true },
      orderBy: { date: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const res = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { space: true, user: true },
    })
    if (!res) throw new NotFoundException('Reserva não encontrada')
    return res
  }

  async create(dto: CreateReservationDto, userId: string, tenantId: string) {
    const space = await this.prisma.commonSpace.findUnique({ where: { id: dto.spaceId } })
    if (!space || !space.isActive) throw new NotFoundException('Espaço não disponível')

    // Verifica conflito de horário
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        spaceId: dto.spaceId,
        date: new Date(dto.date),
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { lte: dto.endTime }, endTime: { gte: dto.startTime } },
        ],
      },
    })

    if (conflict) throw new ConflictException('Horário já reservado para este espaço')

    return this.prisma.reservation.create({
      data: {
        tenantId,
        spaceId: dto.spaceId,
        userId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        notes: dto.notes,
        amount: space.amount,
        status: 'CONFIRMED',
      },
      include: { space: true },
    })
  }

  async cancel(id: string, userId: string, tenantId: string, isAdmin: boolean) {
    const reservation = await this.findOne(id, tenantId)

    if (!isAdmin && reservation.userId !== userId) {
      throw new ForbiddenException('Você só pode cancelar suas próprias reservas')
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
  }

  getAvailability(spaceId: string, date: string) {
    return this.prisma.reservation.findMany({
      where: {
        spaceId,
        date: new Date(date),
        status: { not: 'CANCELLED' },
      },
      select: { startTime: true, endTime: true },
    })
  }
}
