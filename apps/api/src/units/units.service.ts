import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateUnitDto } from './dto/create-unit.dto'

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  findAll(tenantId: string, condominiumId?: string) {
    return this.prisma.unit.findMany({
      where: { tenantId, ...(condominiumId ? { condominiumId } : {}), isActive: true },
      include: {
        block: true,
        residents: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      },
      orderBy: [{ block: { name: 'asc' } }, { number: 'asc' }],
    })
  }

  async findOne(id: string, tenantId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, tenantId },
      include: {
        block: true,
        residents: { include: { user: true } },
        pets: { where: { isActive: true } },
      },
    })
    if (!unit) throw new NotFoundException('Unidade não encontrada')
    return unit
  }

  async create(dto: CreateUnitDto, tenantId: string) {
    const exists = await this.prisma.unit.findFirst({
      where: { condominiumId: dto.condominiumId, blockId: dto.blockId ?? null, number: dto.number },
    })
    if (exists) throw new ConflictException('Unidade já cadastrada neste bloco/condomínio')
    return this.prisma.unit.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, tenantId: string, dto: Partial<CreateUnitDto>) {
    await this.findOne(id, tenantId)
    return this.prisma.unit.update({ where: { id }, data: dto })
  }

  async addResident(unitId: string, userId: string, isOwner: boolean, tenantId: string) {
    await this.findOne(unitId, tenantId)
    return this.prisma.unitResident.create({ data: { unitId, userId, isOwner } })
  }

  async removeResident(unitId: string, userId: string) {
    return this.prisma.unitResident.updateMany({
      where: { unitId, userId, movedOutAt: null },
      data: { movedOutAt: new Date() },
    })
  }

  async addPet(unitId: string, tenantId: string, data: any) {
    await this.findOne(unitId, tenantId)
    return this.prisma.pet.create({ data: { unitId, tenantId, ...data } })
  }

  findPets(unitId: string) {
    return this.prisma.pet.findMany({ where: { unitId, isActive: true } })
  }
}
