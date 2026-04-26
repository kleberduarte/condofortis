import {
  PrismaClient,
  UserRole,
  UnitType,
  InvoiceStatus,
  OccurrenceStatus,
  VisitorStatus,
  AccessType,
  AssemblyStatus,
  ReservationStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
/** ts-node (CommonJS): default import de dayjs quebra em runtime */
import dayjs = require('dayjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const passwordHash = await bcrypt.hash('senha123', 10)

  // ── Tenant ──────────────────────────────────────────────────────────────────
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

  // ── Users ────────────────────────────────────────────────────────────────────
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

  const doorman = await prisma.user.upsert({
    where: { email: 'porteiro@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'porteiro@demo.com',
      passwordHash,
      name: 'Carlos Ferreira',
      role: UserRole.DOORMAN,
      phone: '11999990003',
    },
  })

  const residentNames = [
    { name: 'Maria Santos', email: 'maria@demo.com', phone: '11999990010' },
    { name: 'Pedro Oliveira', email: 'pedro@demo.com', phone: '11999990011' },
    { name: 'Ana Costa', email: 'ana@demo.com', phone: '11999990012' },
    { name: 'Lucas Mendes', email: 'lucas@demo.com', phone: '11999990013' },
    { name: 'Fernanda Lima', email: 'fernanda@demo.com', phone: '11999990014' },
    { name: 'Rafael Souza', email: 'rafael@demo.com', phone: '11999990015' },
    { name: 'Juliana Rocha', email: 'juliana@demo.com', phone: '11999990016' },
    { name: 'Bruno Alves', email: 'bruno@demo.com', phone: '11999990017' },
  ]

  const residents = await Promise.all(
    residentNames.map((r) =>
      prisma.user.upsert({
        where: { email: r.email },
        update: {},
        create: { tenantId: tenant.id, passwordHash, role: UserRole.RESIDENT, ...r },
      }),
    ),
  )

  // ── Condominium ──────────────────────────────────────────────────────────────
  let condominium = await prisma.condominium.findFirst({
    where: { tenantId: tenant.id, cnpj: '11.111.111/0001-11' },
  })

  if (!condominium) {
    condominium = await prisma.condominium.create({
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
        monthlyFee: 650,
      },
    })
  }

  // ── Blocks ───────────────────────────────────────────────────────────────────
  const blockNames = ['A', 'B', 'C']
  const blocks = await Promise.all(
    blockNames.map(async (name) => {
      let block = await prisma.block.findFirst({ where: { condominiumId: condominium!.id, name } })
      if (!block) block = await prisma.block.create({ data: { condominiumId: condominium!.id, name } })
      return block
    }),
  )

  // ── Units ────────────────────────────────────────────────────────────────────
  const unitDefs = [
    { number: '101', floor: 1, blockIdx: 0, fraction: 0.025, residentIdx: 0 },
    { number: '102', floor: 1, blockIdx: 0, fraction: 0.025, residentIdx: 1 },
    { number: '201', floor: 2, blockIdx: 0, fraction: 0.025, residentIdx: 2 },
    { number: '202', floor: 2, blockIdx: 0, fraction: 0.025, residentIdx: 3 },
    { number: '101', floor: 1, blockIdx: 1, fraction: 0.025, residentIdx: 4 },
    { number: '102', floor: 1, blockIdx: 1, fraction: 0.025, residentIdx: 5 },
    { number: '201', floor: 2, blockIdx: 1, fraction: 0.025, residentIdx: 6 },
    { number: '202', floor: 2, blockIdx: 1, fraction: 0.025, residentIdx: 7 },
    { number: '01', floor: null, blockIdx: 2, fraction: 0.01, residentIdx: null },
    { number: '02', floor: null, blockIdx: 2, fraction: 0.01, residentIdx: null },
  ]

  const units = await Promise.all(
    unitDefs.map(async (u) => {
      let unit = await prisma.unit.findFirst({
        where: {
          condominiumId: condominium!.id,
          blockId: blocks[u.blockIdx].id,
          number: u.number,
        },
      })
      if (!unit) {
        unit = await prisma.unit.create({
          data: {
            condominiumId: condominium!.id,
            tenantId: tenant.id,
            blockId: blocks[u.blockIdx].id,
            number: u.number,
            floor: u.floor ?? undefined,
            type: u.blockIdx === 2 ? UnitType.GARAGE : UnitType.APARTMENT,
            fraction: u.fraction,
          },
        })
      }
      if (u.residentIdx !== null) {
        const exists = await prisma.unitResident.findFirst({
          where: { unitId: unit.id, userId: residents[u.residentIdx].id },
        })
        if (!exists) {
          await prisma.unitResident.create({
            data: { unitId: unit.id, userId: residents[u.residentIdx].id, isOwner: true },
          })
        }
      }
      return unit
    }),
  )

  // ── Common spaces ─────────────────────────────────────────────────────────────
  const spaces = [
    { name: 'Salão de Festas', capacity: 80, amount: 150, description: 'Espaço para eventos com cozinha equipada' },
    { name: 'Churrasqueira', capacity: 20, amount: 80, description: 'Área coberta com churrasqueira e mesas' },
    { name: 'Piscina', capacity: 30, amount: 0, description: 'Piscina adulto e infantil' },
    { name: 'Quadra Esportiva', capacity: 20, amount: 0, description: 'Quadra poliesportiva' },
    { name: 'Salão de Jogos', capacity: 15, amount: 0, description: 'Mesas de sinuca, pingue-pongue e pebolim' },
  ]

  const commonSpaces = await Promise.all(
    spaces.map(async (s) => {
      let space = await prisma.commonSpace.findFirst({ where: { condominiumId: condominium!.id, name: s.name } })
      if (!space) space = await prisma.commonSpace.create({ data: { condominiumId: condominium!.id, ...s } })
      return space
    }),
  )

  // ── Invoices ──────────────────────────────────────────────────────────────────
  const invoiceMonths = [
    { ref: '2026-02', daysOffset: -60, status: InvoiceStatus.PAID },
    { ref: '2026-03', daysOffset: -30, status: InvoiceStatus.PAID },
    { ref: '2026-04', daysOffset: 0, status: InvoiceStatus.OVERDUE },
    { ref: '2026-05', daysOffset: 30, status: InvoiceStatus.PENDING },
  ]

  for (const unit of units.slice(0, 8)) {
    for (const m of invoiceMonths) {
      const exists = await prisma.invoice.findFirst({ where: { unitId: unit.id, reference: m.ref } })
      if (!exists) {
        await prisma.invoice.create({
          data: {
            tenantId: tenant.id,
            condominiumId: condominium.id,
            unitId: unit.id,
            reference: m.ref,
            dueDate: dayjs().add(m.daysOffset, 'day').toDate(),
            amount: 650,
            status: m.status,
            paidAt: m.status === InvoiceStatus.PAID ? dayjs().add(m.daysOffset + 5, 'day').toDate() : null,
            paidAmount: m.status === InvoiceStatus.PAID ? 650 : null,
          },
        })
      }
    }
  }

  // ── Occurrences ───────────────────────────────────────────────────────────────
  const occurrenceData = [
    { title: 'Vazamento no corredor do 2º andar', description: 'Água escorrendo pelo teto do corredor entre os apartamentos 201 e 202', status: OccurrenceStatus.IN_PROGRESS },
    { title: 'Lâmpada queimada no hall de entrada', description: 'A lâmpada do hall principal do Bloco A está queimada há 3 dias', status: OccurrenceStatus.OPEN },
    { title: 'Barulho excessivo apt 102', description: 'Música alta após as 22h nos fins de semana', status: OccurrenceStatus.OPEN },
    { title: 'Reforma concluída - portão eletrônico', description: 'O portão eletrônico foi substituído e está funcionando normalmente', status: OccurrenceStatus.RESOLVED },
    { title: 'Piscina com vazamento', description: 'Nível da piscina caindo mais rápido que o normal', status: OccurrenceStatus.CLOSED },
  ]

  for (const [i, occ] of occurrenceData.entries()) {
    const exists = await prisma.occurrence.findFirst({
      where: { condominiumId: condominium.id, title: occ.title },
    })
    if (!exists) {
      await prisma.occurrence.create({
        data: {
          tenantId: tenant.id,
          condominiumId: condominium.id,
          unitId: units[i % units.length].id,
          reportedBy: residents[i % residents.length].id,
          createdAt: dayjs().subtract(i * 3 + 1, 'day').toDate(),
          resolvedAt: ([OccurrenceStatus.RESOLVED, OccurrenceStatus.CLOSED] as OccurrenceStatus[]).includes(occ.status)
            ? dayjs().subtract(1, 'day').toDate()
            : null,
          ...occ,
        },
      })
    }
  }

  // ── Reservations ──────────────────────────────────────────────────────────────
  const reservationData = [
    { spaceIdx: 0, userIdx: 0, daysOffset: 3, start: '14:00', end: '22:00', status: ReservationStatus.CONFIRMED },
    { spaceIdx: 1, userIdx: 1, daysOffset: 1, start: '10:00', end: '14:00', status: ReservationStatus.CONFIRMED },
    { spaceIdx: 2, userIdx: 2, daysOffset: 0, start: '08:00', end: '12:00', status: ReservationStatus.CONFIRMED },
    { spaceIdx: 0, userIdx: 3, daysOffset: -7, start: '18:00', end: '23:00', status: ReservationStatus.COMPLETED },
    { spaceIdx: 4, userIdx: 4, daysOffset: 7, start: '09:00', end: '11:00', status: ReservationStatus.PENDING },
  ]

  for (const r of reservationData) {
    const date = dayjs().add(r.daysOffset, 'day').startOf('day').toDate()
    const exists = await prisma.reservation.findFirst({
      where: { spaceId: commonSpaces[r.spaceIdx].id, userId: residents[r.userIdx].id, date },
    })
    if (!exists) {
      await prisma.reservation.create({
        data: {
          tenantId: tenant.id,
          spaceId: commonSpaces[r.spaceIdx].id,
          userId: residents[r.userIdx].id,
          date,
          startTime: r.start,
          endTime: r.end,
          status: r.status,
          amount: Number(commonSpaces[r.spaceIdx].amount),
        },
      })
    }
  }

  // ── Visitors ──────────────────────────────────────────────────────────────────
  const visitorData = [
    { name: 'Roberto Visitante', document: '111.222.333-44', status: VisitorStatus.EXPECTED, unitIdx: 0 },
    { name: 'Patrícia Técnica', document: '555.666.777-88', status: VisitorStatus.ENTERED, unitIdx: 1 },
    { name: 'Entrega Correios', document: null, plate: 'ABC1234', status: VisitorStatus.LEFT, unitIdx: 2 },
    { name: 'Juliana Amiga', document: '999.888.777-66', status: VisitorStatus.EXPECTED, unitIdx: 3 },
  ]

  for (const v of visitorData) {
    const exists = await prisma.visitor.findFirst({
      where: { condominiumId: condominium.id, name: v.name },
    })
    if (!exists) {
      const { unitIdx: _unitIdx, ...visitorFields } = v
      await prisma.visitor.create({
        data: {
          tenantId: tenant.id,
          condominiumId: condominium.id,
          unitId: units[v.unitIdx].id,
          expectedAt: dayjs().add(1, 'hour').toDate(),
          enteredAt: v.status === VisitorStatus.ENTERED || v.status === VisitorStatus.LEFT
            ? dayjs().subtract(1, 'hour').toDate()
            : null,
          leftAt: v.status === VisitorStatus.LEFT ? dayjs().toDate() : null,
          ...visitorFields,
        },
      })
    }
  }

  // ── Access logs ───────────────────────────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    await prisma.accessLog.create({
      data: {
        tenantId: tenant.id,
        condominiumId: condominium.id,
        userId: residents[i % residents.length].id,
        accessType: i % 3 === 0 ? AccessType.QRCODE : i % 3 === 1 ? AccessType.TAG : AccessType.MANUAL,
        direction: i % 4 === 0 ? 'OUT' : 'IN',
        description: i % 4 === 0 ? 'Saída registrada' : 'Entrada autorizada',
        createdAt: dayjs().subtract(i * 40, 'minute').toDate(),
      },
    })
  }

  // ── Assembly ──────────────────────────────────────────────────────────────────
  let assembly = await prisma.assembly.findFirst({ where: { condominiumId: condominium.id } })
  if (!assembly) {
    assembly = await prisma.assembly.create({
      data: {
        tenantId: tenant.id,
        condominiumId: condominium.id,
        title: 'Assembleia Geral Ordinária — 2º Semestre 2026',
        description: 'Aprovação do orçamento, eleição do síndico e deliberações gerais.',
        scheduledAt: dayjs().add(14, 'day').toDate(),
        status: AssemblyStatus.SCHEDULED,
        polls: {
          create: [
            {
              question: 'Aprovação do orçamento de R$ 180.000 para 2026/2027',
              options: {
                create: [
                  { text: 'Aprovar', votes: 18 },
                  { text: 'Rejeitar', votes: 4 },
                  { text: 'Aprovar com ressalvas', votes: 8 },
                ],
              },
            },
            {
              question: 'Instalação de câmeras de segurança adicionais',
              options: {
                create: [
                  { text: 'Sim, autorizo', votes: 25 },
                  { text: 'Não autorizo', votes: 5 },
                ],
              },
            },
            {
              question: 'Reajuste da taxa condominial em 8%',
              options: {
                create: [
                  { text: 'Aprovar 8%', votes: 12 },
                  { text: 'Aprovar 5%', votes: 10 },
                  { text: 'Manter taxa atual', votes: 8 },
                ],
              },
            },
          ],
        },
      },
    })
  }

  // ── Notifications ─────────────────────────────────────────────────────────────
  const notifData = [
    { title: 'Cobrança vencida', body: 'Sua taxa condominial de Abril/2026 venceu. Regularize para evitar juros.' },
    { title: 'Reserva confirmada', body: 'Sua reserva do Salão de Festas para 28/04 foi confirmada!' },
    { title: 'Nova ocorrência registrada', body: 'Uma nova ocorrência foi aberta: "Barulho excessivo apt 102"' },
    { title: 'Assembleia agendada', body: 'A AGO 2026/2027 está agendada para daqui a 14 dias. Confirme presença.' },
  ]

  for (const [i, notif] of notifData.entries()) {
    const exists = await prisma.notification.findFirst({
      where: { userId: residents[0].id, title: notif.title },
    })
    if (!exists) {
      await prisma.notification.create({
        data: {
          tenantId: tenant.id,
          userId: residents[0].id,
          ...notif,
          createdAt: dayjs().subtract(i * 2, 'hour').toDate(),
          readAt: i > 1 ? dayjs().subtract(1, 'hour').toDate() : null,
        },
      })
    }
  }

  console.log('\n✅ Seed concluído com sucesso!')
  console.log('─'.repeat(50))
  console.log('👤 Credenciais de acesso (senha: senha123)')
  console.log('─'.repeat(50))
  console.log('🔑  Super Admin:  admin@condofortis.com')
  console.log('🏢  Síndico:      sindico@demo.com')
  console.log('🚪  Porteiro:     porteiro@demo.com')
  console.log('🏠  Morador:      maria@demo.com')
  console.log('─'.repeat(50))
  console.log(`🏗️  Condomínio: ${condominium.name}`)
  console.log(`🧱  Blocos: ${blocks.map((b) => b.name).join(', ')}`)
  console.log(`🏘️  Unidades: ${units.length}`)
  console.log(`👥  Moradores: ${residents.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
