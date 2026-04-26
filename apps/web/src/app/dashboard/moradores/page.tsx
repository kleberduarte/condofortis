'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Building2, Users, ChevronDown, ChevronRight, Home, X, PawPrint } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Resident = {
  id: string
  userId: string
  isOwner: boolean
  movedInAt: string
  user: { id: string; name: string; email: string; phone?: string }
}

type Pet = {
  id: string
  name: string
  species: string
  breed?: string
}

type Unit = {
  id: string
  number: string
  floor?: number
  type: string
  isActive: boolean
  block?: { name: string } | null
  residents: Resident[]
  pets: Pet[]
}

const unitSchema = z.object({
  number: z.string().min(1, 'Número obrigatório'),
  floor: z.string().optional(),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'GARAGE']),
})

type UnitForm = z.infer<typeof unitSchema>

const TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  GARAGE: 'Garagem',
}

export default function MoradoresPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)
  const [showNewUnit, setShowNewUnit] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ['units', condominiumId, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ condominiumId })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const { data } = await api.get(`/units?${params}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitForm>({ resolver: zodResolver(unitSchema), defaultValues: { type: 'APARTMENT' } })

  const createUnit = useMutation({
    mutationFn: (data: UnitForm) =>
      api.post('/units', { ...data, condominiumId, floor: data.floor ? Number(data.floor) : undefined }),
    onSuccess: () => {
      toast.success('Unidade criada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['units'] })
      setShowNewUnit(false)
      reset()
    },
    onError: () => toast.error('Erro ao criar unidade'),
  })

  const totalResidents = units.reduce((acc, u) => acc + u.residents.length, 0)
  const occupiedUnits = units.filter((u) => u.residents.length > 0).length

  const filteredUnits = units

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moradores</h1>
          <p className="text-gray-500 mt-1">Unidades e residentes do condomínio</p>
        </div>
        <button
          onClick={() => setShowNewUnit(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Unidade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total de Unidades</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <Home className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ocupadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{occupiedUnits}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Moradores</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalResidents}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por unidade ou nome do morador…"
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
      </div>

      {/* Units list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma unidade encontrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUnits.map((unit) => (
              <li key={unit.id}>
                <button
                  onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{unit.number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {unit.block ? `Bloco ${unit.block.name} — ` : ''}Apto {unit.number}
                        {unit.floor !== null && unit.floor !== undefined ? ` · ${unit.floor}º andar` : ''}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {TYPE_LABEL[unit.type] ?? unit.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {unit.residents.length === 0
                        ? 'Sem moradores cadastrados'
                        : `${unit.residents.length} morador${unit.residents.length > 1 ? 'es' : ''}: ${unit.residents.map((r) => r.user.name).join(', ')}`}
                      {unit.pets.length > 0 && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          · 🐾 {unit.pets.length} pet{unit.pets.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>

                  {unit.residents.length > 0 ? (
                    expandedUnit === unit.id
                      ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : null}
                </button>

                {expandedUnit === unit.id && unit.residents.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {unit.residents.map((r) => (
                        <li key={r.id} className="flex items-center gap-4 pl-14 pr-5 py-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {r.user.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {r.user.name}
                              {r.isOwner && (
                                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                  Proprietário
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{r.user.email}{r.user.phone && ` · ${r.user.phone}`}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {unit.pets.length > 0 && (
                      <div className="pl-14 pr-5 py-3 border-t border-gray-100 dark:border-gray-700/50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <PawPrint className="w-3.5 h-3.5" /> Pets ({unit.pets.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unit.pets.map((pet) => (
                            <span
                              key={pet.id}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-medium"
                            >
                              🐾 {pet.name}
                              {pet.breed ? ` · ${pet.breed}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New unit modal */}
      {showNewUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Unidade</h3>
              <button onClick={() => { setShowNewUnit(false); reset() }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createUnit.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número *</label>
                  <input
                    {...register('number')}
                    type="text"
                    placeholder="Ex: 101"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Andar</label>
                  <input
                    {...register('floor')}
                    type="number"
                    placeholder="Ex: 1"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  {Object.entries(TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={createUnit.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {createUnit.isPending ? 'Criando…' : 'Criar Unidade'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
