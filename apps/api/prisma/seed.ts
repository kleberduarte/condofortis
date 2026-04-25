import { PrismaClient, UserRole, UnitType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('senha123', 12)

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Administradora Demo',
      slug: 'demo',
      cnpj: '00.000.000/0001-00',
      plan: 'professional',
    },
  })

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@condofortis.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@condofortis.com',
      passwordHash,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
    },
  })

  const condominium = await prisma.condominium.create({
    data: {
      tenantId: tenant.id,
      name: 'Condomínio Residencial Fortis',
      cnpj: '11.111.111/0001-11',
      street: 'Rua das Flores',
      number: '100',
      neighborhood: 'Jardim Primavera',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    },
  })

  const syndic = await prisma.user.upsert({
    where: { email: 'sindico@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'sindico@demo.com',
      passwordHash,
      name: 'João Silva',
      role: UserRole.SYNDIC,
      phone: '11999990001',
    },
  })

  const resident = await prisma.user.upsert({
    where: { email: 'morador@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'morador@demo.com',
      passwordHash,
      name: 'Maria Santos',
      role: UserRole.RESIDENT,
      phone: '11999990002',
    },
  })

  const unit = await prisma.unit.create({
    data: {
      condominiumId: condominium.id,
      tenantId: tenant.id,
      number: '101',
      floor: 1,
      type: UnitType.APARTMENT,
      fraction: 0.025,
    },
  })

  await prisma.unitResident.create({
    data: { unitId: unit.id, userId: resident.id, isOwner: true },
  })

  await prisma.commonSpace.createMany({
    data: [
      { condominiumId: condominium.id, name: 'Salão de Festas', capacity: 80, amount: 150 },
      { condominiumId: condominium.id, name: 'Churrasqueira', capacity: 20, amount: 80 },
      { condominiumId: condominium.id, name: 'Quadra Esportiva', capacity: 20, amount: 0 },
      { condominiumId: condominium.id, name: 'Piscina', capacity: 30, amount: 0 },
    ],
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log(`📧 Admin: admin@condofortis.com / senha: senha123`)
  console.log(`📧 Síndico: sindico@demo.com / senha: senha123`)
  console.log(`📧 Morador: morador@demo.com / senha: senha123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
