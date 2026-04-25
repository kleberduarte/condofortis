import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateCondominiumDto } from './dto/create-condominium.dto'

@Injectable()
export class CondominiumsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.condominium.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const condo = await this.prisma.condominium.findFirst({
      where: { id, tenantId },
      include: {
        blocks: true,
        commonSpaces: { where: { isActive: true } },
        _count: { select: { units: true } },
      },
    })
    if (!condo) throw new NotFoundException('Condomínio não encontrado')
    return condo
  }

  create(dto: CreateCondominiumDto, tenantId: string) {
    return this.prisma.condominium.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, tenantId: string, dto: Partial<CreateCondominiumDto>) {
    await this.findOne(id, tenantId)
    return this.prisma.condominium.update({ where: { id }, data: dto })
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.condominium.update({ where: { id }, data: { isActive: false } })
  }

  // Blocos
  createBlock(condominiumId: string, name: string, tenantId: string) {
    return this.prisma.block.create({ data: { condominiumId, name } })
  }

  findBlocks(condominiumId: string) {
    return this.prisma.block.findMany({ where: { condominiumId }, orderBy: { name: 'asc' } })
  }

  // Espaços comuns
  createSpace(condominiumId: string, data: any) {
    return this.prisma.commonSpace.create({ data: { condominiumId, ...data } })
  }

  findSpaces(condominiumId: string) {
    return this.prisma.commonSpace.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: 'asc' },
    })
  }
}
