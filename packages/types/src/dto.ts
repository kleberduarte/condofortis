export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JwtPayload {
  sub: string
  email: string
  role: string
  tenantId: string
  condominiumId?: string
  iat?: number
  exp?: number
}
