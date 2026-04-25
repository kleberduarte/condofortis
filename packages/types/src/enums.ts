export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',           // Administradora
  SYNDIC = 'SYNDIC',         // Síndico
  DOORMAN = 'DOORMAN',       // Porteiro
  RESIDENT = 'RESIDENT',     // Morador
}

export enum UnitType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  COMMERCIAL = 'COMMERCIAL',
  GARAGE = 'GARAGE',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum OccurrenceStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum AccessType {
  FACIAL = 'FACIAL',
  QRCODE = 'QRCODE',
  BIOMETRIC = 'BIOMETRIC',
  TAG = 'TAG',
  MANUAL = 'MANUAL',
}

export enum VisitorStatus {
  EXPECTED = 'EXPECTED',
  ENTERED = 'ENTERED',
  LEFT = 'LEFT',
  DENIED = 'DENIED',
}
