'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, UserPlus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { toast } from 'sonner'
import dayjs from 'dayjs'

const schema = z.object({
  name: z.string().min(3, 'Nome obrigatório (mín. 3 caracteres)'),
  document: z.string().min(11, 'CPF obrigatório').max(14),
  unitId: z.string().min(1, 'Selecione uma unidade'),
  expectedAt: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Unit = { id: string; number: string; floor?: string; residentName?: string }

async function fetchUnits(search: string, condominiumId: string): Promise<Unit[]> {
  if (!search || search.length < 1) return []
  const params = new URLSearchParams({ search, limit: '10' })
  if (condominiumId) params.set('condominiumId', condominiumId)
  const { data } = await api.get(`/units?${params}`)
  return (data as any[]).map((u: any) => ({
    id: u.id,
    number: u.number,
    floor: u.floor?.toString(),
    residentName: u.residents?.[0]?.user?.name,
  }))
}

export default function CadastrarVisitantePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { condominiumId } = useCondominium()
  const preselectedUnit = searchParams.get('unit')

  const [unitSearch, setUnitSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  const { data: unitResults = [], isFetching: searchingUnits } = useQuery({
    queryKey: ['units', 'search', unitSearch, condominiumId],
    queryFn: () => fetchUnits(unitSearch, condominiumId),
    enabled: unitSearch.length >= 1 && !selectedUnit && !!condominiumId,
    staleTime: 10_000,
  })

  // Load preselected unit
  useQuery({
    queryKey: ['unit', preselectedUnit],
    queryFn: async () => {
      if (!preselectedUnit) return null
      const { data } = await api.get(`/units/${preselectedUnit}`)
      setSelectedUnit(data)
      setValue('unitId', data.id)
      return data
    },
    enabled: !!preselectedUnit && !selectedUnit,
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expectedAt: dayjs().format('YYYY-MM-DDTHH:mm'),
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/visitors', { ...data, condominiumId }),
    onSuccess: () => {
      toast.success('Visitante registrado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
      router.push('/portaria/visitantes')
    },
    onError: () => toast.error('Erro ao registrar visitante'),
  })

  function selectUnit(unit: Unit) {
    setSelectedUnit(unit)
    setValue('unitId', unit.id)
    setUnitSearch('')
  }

  function onSubmit(data: FormData) {
    createMutation.mutate(data)
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Visitante</h1>
          <p className="text-sm text-gray-500">Preencha os dados do visitante</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Dados do Visitante</h2>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome completo *
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
              placeholder="Nome do visitante"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CPF *
            </label>
            <input
              {...register('document')}
              type="text"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
              placeholder="000.000.000-00"
            />
            {errors.document && <p className="text-red-500 text-xs mt-1">{errors.document.message}</p>}
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data/Hora prevista
            </label>
            <input
              {...register('expectedAt')}
              type="datetime-local"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
            />
          </div>
        </div>

        {/* Unidade destino */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Unidade de destino *</h2>

          {selectedUnit ? (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">Apto {selectedUnit.number}</p>
                {selectedUnit.residentName && (
                  <p className="text-sm text-blue-600 dark:text-blue-300">{selectedUnit.residentName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedUnit(null); setValue('unitId', '') }}
                className="text-xs text-blue-700 dark:text-blue-300 underline hover:no-underline"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchingUnits && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Número do apto ou nome do morador…"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
              />

              {unitResults.length > 0 && (
                <ul className="mt-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden shadow-md">
                  {unitResults.map((unit) => (
                    <li
                      key={unit.id}
                      onClick={() => selectUnit(unit)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Apto {unit.number}</p>
                        {unit.residentName && <p className="text-sm text-gray-500">{unit.residentName}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <input type="hidden" {...register('unitId')} />
          {errors.unitId && <p className="text-red-500 text-xs">{errors.unitId.message}</p>}
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl min-h-[52px] text-base transition-colors disabled:opacity-50"
        >
          <UserPlus className="w-5 h-5" />
          {createMutation.isPending ? 'Registrando…' : 'Registrar e Liberar Entrada'}
        </button>
      </form>
    </div>
  )
}
