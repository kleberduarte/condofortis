import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateVisitorDto } from './dto/create-visitor.dto'
import * as crypto from 'crypto'

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, condominiumId?: string) {
    return this.prisma.visitor.findMany({
      where: { tenantId, ...(condominiumId ? { condominiumId } : {}), status: { not: 'LEFT' } },
      include: { unit: { include: { block: true } } },
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

  async authorize(qrCode: string) {
    const visitor = await this.prisma.visitor.findUnique({ where: { qrCode }, include: { unit: true } })
    if (!visitor) throw new NotFoundException('QR Code inválido')
    if (visitor.status === 'DENIED') throw new NotFoundException('Acesso negado')

    return visitor
  }

  async checkin(id: string, tenantId: string) {
    const visitor = await this.findOne(id, tenantId)
    return this.prisma.visitor.update({
      where: { id },
      data: { status: 'ENTERED', enteredAt: new Date() },
    })
  }

  async checkout(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.visitor.update({
      where: { id },
      data: { status: 'LEFT', leftAt: new Date() },
    })
  }

  async deny(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.visitor.update({ where: { id }, data: { status: 'DENIED' } })
  }
}
