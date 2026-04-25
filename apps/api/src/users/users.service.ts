import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { unitResidents: { include: { unit: true } } },
    })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  async create(dto: CreateUserDto, tenantId: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const { password: _pw, ...rest } = dto

    return this.prisma.user.create({
      data: { ...rest, tenantId, passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
