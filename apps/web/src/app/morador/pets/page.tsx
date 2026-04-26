'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PawPrint, Plus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useResidentUnit } from '@/hooks/use-resident-unit'
import { toast } from 'sonner'

type Pet = {
  id: string
  name: string
  species: string
  breed?: string
  isActive: boolean
}

const SPECIES_EMOJI: Record<string, string> = {
  Cão: '🐕',
  Gato: '🐈',
  Pássaro: '🦜',
  Peixe: '🐟',
  Coelho: '🐇',
  Hamster: '🐹',
  Tartaruga: '🐢',
  Outro: '🐾',
}

export default function MoradorPetsPage() {
  const { unitId, unit, isLoading: loadingUnit } = useResidentUnit()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'Cão', breed: '' })

  const { data: pets = [], isLoading } = useQuery<Pet[]>({
    queryKey: ['my-pets', unitId],
    queryFn: async () => {
      const { data } = await api.get(`/units/${unitId}/pets`)
      return data
    },
    enabled: !!unitId,
  })

  const addPet = useMutation({
    mutationFn: () =>
      api.post(`/units/${unitId}/pets`, {
        name: form.name,
        species: form.species,
        breed: form.breed || undefined,
      }),
    onSuccess: () => {
      toast.success('Pet cadastrado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['my-pets', unitId] })
      setShowModal(false)
      setForm({ name: '', species: 'Cão', breed: '' })
    },
    onError: () => toast.error('Erro ao cadastrar pet'),
  })

  const activePets = pets.filter((p) => p.isActive)
  const unitLabel = unit
    ? `${unit.block ? `Bloco ${unit.block.name} — ` : ''}Apto ${unit.number}`
    : ''

  if (loadingUnit || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Pets</h1>
          <p className="text-gray-500 mt-1">
            {unitLabel ? `Pets cadastrados na ${unitLabel}` : 'Pets cadastrados na sua unidade'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Cadastrar Pet
        </button>
      </div>

      {activePets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pet cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Cadastre seus pets para o condomínio ter o registro</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            Cadastrar primeiro pet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activePets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                {SPECIES_EMOJI[pet.species] ?? '🐾'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{pet.name}</p>
                <p className="text-sm text-gray-500">
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cadastrar Pet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do pet *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Rex, Mel, Bolinha…"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Espécie *
                  </label>
                  <select
                    value={form.species}
                    onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    {Object.keys(SPECIES_EMOJI).map((s) => (
                      <option key={s} value={s}>
                        {SPECIES_EMOJI[s]} {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raça
                  </label>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
                    placeholder="Ex: Golden, SRD…"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => addPet.mutate()}
              disabled={!form.name || !unitId || addPet.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {addPet.isPending ? 'Cadastrando…' : 'Cadastrar Pet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
