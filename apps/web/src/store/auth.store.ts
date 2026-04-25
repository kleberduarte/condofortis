import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthTokens } from '@condofortis/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: { name: string; email: string; role: string } | null
  setAuth: (tokens: AuthTokens) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (tokens) => {
        const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: { name: payload.name || payload.email, email: payload.email, role: payload.role },
        })
      },
      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null })
        window.location.href = '/auth/login'
      },
    }),
    { name: 'condofortis-auth' },
  ),
)
