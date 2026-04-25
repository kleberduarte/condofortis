import { UserRole, UnitType, InvoiceStatus, ReservationStatus, OccurrenceStatus, AccessType, VisitorStatus } from './enums'

export interface Tenant {
  id: string
  name: string
  slug: string
  cnpj?: string
  plan: string
  isActive: boolean
  createdAt: Date
}

export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  phone?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  createdAt: Date
}

export interface Condominium {
  id: string
  tenantId: string
  name: string
  cnpj?: string
  address: Address
  totalUnits: number
  isActive: boolean
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface Unit {
  id: string
  condominiumId: string
  tenantId: string
  block?: string
  number: string
  floor?: number
  type: UnitType
  fraction: number  // fração ideal em %
  residents: User[]
}

export interface Invoice {
  id: string
  tenantId: string
  condominiumId: string
  unitId: string
  dueDate: Date
  amount: number
  status: InvoiceStatus
  barcode?: string
  pixCode?: string
  paidAt?: Date
}

export interface Reservation {
  id: string
  tenantId: string
  condominiumId: string
  spaceId: string
  userId: string
  date: Date
  startTime: string
  endTime: string
  status: ReservationStatus
  amount?: number
}

export interface Occurrence {
  id: string
  tenantId: string
  condominiumId: string
  unitId?: string
  reportedBy: string
  title: string
  description: string
  status: OccurrenceStatus
  createdAt: Date
}

export interface AccessLog {
  id: string
  tenantId: string
  condominiumId: string
  userId?: string
  visitorId?: string
  accessType: AccessType
  direction: 'IN' | 'OUT'
  createdAt: Date
}

export interface Visitor {
  id: string
  tenantId: string
  condominiumId: string
  unitId: string
  name: string
  document?: string
  plate?: string
  qrCode?: string
  status: VisitorStatus
  expectedAt?: Date
  enteredAt?: Date
  leftAt?: Date
}
