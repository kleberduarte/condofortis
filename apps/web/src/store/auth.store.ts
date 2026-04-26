import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthTokens } from '@condofortis/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: { id: string; name: string; email: string; role: string } | null
  condominiumId: string | null
  condominiumName: string | null
  setAuth: (tokens: AuthTokens) => void
  setCondominium: (id: string, name: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      condominiumId: null,
      condominiumName: null,
      setAuth: (tokens) => {
        const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: payload.sub,
            name: payload.name || payload.email,
            email: payload.email,
            role: payload.role,
          },
        })
        document.cookie = `condofortis-role=${payload.role}; path=/; SameSite=Lax`
      },
      setCondominium: (id, name) => set({ condominiumId: id, condominiumName: name }),
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, condominiumId: null, condominiumName: null })
        document.cookie = 'condofortis-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        window.location.href = '/auth/login'
      },
    }),
    { name: 'condofortis-auth' },
  ),
)
