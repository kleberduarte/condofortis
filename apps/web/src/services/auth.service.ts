import { api } from '@/lib/api'
import { AuthTokens, LoginDto } from '@condofortis/types'

export const authService = {
  login: async (dto: LoginDto): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/login', dto)
    return data
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken })
    return data
  },
}
