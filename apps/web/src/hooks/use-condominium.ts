'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export type Condominium = {
  id: string
  name: string
  city: string
  state: string
  _count?: { units: number }
}

async function fetchCondominiums(): Promise<Condominium[]> {
  const { data } = await api.get('/condominiums')
  return data
}

export function useCondominium() {
  const { condominiumId, condominiumName, setCondominium, accessToken } = useAuthStore()

  const { data: condominiums = [], isLoading } = useQuery({
    queryKey: ['condominiums'],
    queryFn: fetchCondominiums,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    if (!condominiumId && condominiums.length > 0) {
      setCondominium(condominiums[0].id, condominiums[0].name)
    }
  }, [condominiums, condominiumId, setCondominium])

  return {
    condominiumId: condominiumId ?? '',
    condominiumName: condominiumName ?? '',
    condominiums,
    setCondominium,
    isLoading: isLoading && !condominiumId,
  }
}
