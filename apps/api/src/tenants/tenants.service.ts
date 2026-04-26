import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export class CreateTenantDto {
  name: string
  slug: string
  cnpj?: string
  plan?: string
}

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, condominiums: true } } },
    })
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { users: true, condominiums: true } } },
    })
    if (!tenant) throw new NotFoundException('Tenant não encontrado')
    return tenant
  }

  async create(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, ...(dto.cnpj ? [{ cnpj: dto.cnpj }] : [])] },
    })
    if (exists) throw new ConflictException('Slug ou CNPJ já cadastrado')
    return this.prisma.tenant.create({ data: { ...dto, plan: dto.plan ?? 'starter' } })
  }

  async update(id: string, dto: Partial<CreateTenantDto> & { isActive?: boolean; plan?: string }) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: dto })
  }
}
