'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type ResidentUnit = {
  id: string
  number: string
  block?: { name: string }
  condominium: { id: string; name: string }
}

export function useResidentUnit() {
  const { data: units = [], isLoading } = useQuery<ResidentUnit[]>({
    queryKey: ['my-units'],
    queryFn: async () => {
      const { data } = await api.get('/units/mine')
      return data
    },
    staleTime: 5 * 60_000,
  })

  const primaryUnit = units[0] ?? null

  return {
    unit: primaryUnit,
    unitId: primaryUnit?.id ?? null,
    units,
    isLoading,
  }
}
