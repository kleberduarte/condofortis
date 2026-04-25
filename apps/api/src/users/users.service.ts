import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { AuthService } from '../auth/auth.service'
import { CreateUserDto } from './dto/create-user.dto'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

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

    const passwordHash = await this.authService.hashPassword(dto.password)

    return this.prisma.user.create({
      data: { ...dto, tenantId, passwordHash, password: undefined },
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
