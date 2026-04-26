'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Building2, Plus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'

type Condominium = {
  id: string
  name: string
  cnpj?: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  monthlyFee: number
  blocks: { id: string; name: string }[]
  commonSpaces: { id: string; name: string; capacity?: number; amount: number; isActive: boolean }[]
  _count: { units: number }
}

const condoSchema = z.object({
  name: z.string().min(3, 'Nome obrigatório'),
  cnpj: z.string().optional(),
  street: z.string().min(2, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: z.string().min(8, 'CEP obrigatório'),
  monthlyFee: z.coerce.number().min(0, 'Valor inválido').optional(),
})

type CondoForm = z.infer<typeof condoSchema>

const spaceSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  capacity: z.string().optional(),
  amount: z.string().default('0'),
  rules: z.string().optional(),
})
type SpaceForm = z.infer<typeof spaceSchema>

export default function ConfiguracoesPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [showSpaceModal, setShowSpaceModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockName, setBlockName] = useState('')

  const { data: condo, isLoading } = useQuery<Condominium>({
    queryKey: ['condominium-detail', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/condominiums/${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const { register, handleSubmit, reset: resetCondo, formState: { errors, isDirty } } = useForm<CondoForm>({
    resolver: zodResolver(condoSchema),
  })

  const { register: registerSpace, handleSubmit: handleSpace, reset: resetSpace, formState: { errors: spaceErrors } } = useForm<SpaceForm>({
    resolver: zodResolver(spaceSchema),
  })

  useEffect(() => {
    if (condo) {
      resetCondo({
        name: condo.name,
        cnpj: condo.cnpj ?? '',
        street: condo.street,
        number: condo.number,
        complement: condo.complement ?? '',
        neighborhood: condo.neighborhood,
        city: condo.city,
        state: condo.state,
        zipCode: condo.zipCode,
        monthlyFee: Number(condo.monthlyFee) || 0,
      })
    }
  }, [condo, resetCondo])

  const updateCondo = useMutation({
    mutationFn: (data: CondoForm) => api.patch(`/condominiums/${condominiumId}`, data),
    onSuccess: () => {
      toast.success('Dados salvos com sucesso')
      queryClient.invalidateQueries({ queryKey: ['condominium-detail'] })
      queryClient.invalidateQueries({ queryKey: ['condominiums'] })
    },
    onError: () => toast.error('Erro ao salvar dados'),
  })

  const createSpace = useMutation({
    mutationFn: (data: SpaceForm) =>
      api.post(`/condominiums/${condominiumId}/spaces`, {
        ...data,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        amount: Number(data.amount),
      }),
    onSuccess: () => {
      toast.success('Espaço criado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['condominium-detail'] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      setShowSpaceModal(false)
      resetSpace()
    },
    onError: () => toast.error('Erro ao criar espaço'),
  })

  const createBlock = useMutation({
    mutationFn: (name: string) => api.post(`/condominiums/${condominiumId}/blocks`, { name }),
    onSuccess: () => {
      toast.success('Bloco criado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['condominium-detail'] })
      setShowBlockModal(false)
      setBlockName('')
    },
    onError: () => toast.error('Erro ao criar bloco'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-500 mt-1">Dados e configurações do condomínio</p>
      </div>

      {/* Condominium data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dados do Condomínio</h2>
        </div>

        <form onSubmit={handleSubmit((d) => updateCondo.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input
                {...register('name')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
              <input
                {...register('cnpj')}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Taxa Condominial Mensal (R$)
              </label>
              <input
                {...register('monthlyFee')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {errors.monthlyFee && <p className="text-red-500 text-xs mt-1">{errors.monthlyFee.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Usada para gerar cobranças em lote no módulo Financeiro</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP *</label>
              <input
                {...register('zipCode')}
                placeholder="00000-000"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rua *</label>
              <input
                {...register('street')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número *</label>
              <input
                {...register('number')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
              <input
                {...register('complement')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bairro *</label>
              <input
                {...register('neighborhood')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade *</label>
              <input
                {...register('city')}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UF *</label>
              <input
                {...register('state')}
                maxLength={2}
                placeholder="SP"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white uppercase"
              />
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateCondo.isPending || !isDirty}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {updateCondo.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Blocks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Blocos / Torres</h2>
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {(!condo?.blocks || condo.blocks.length === 0) ? (
          <p className="text-sm text-gray-400">Nenhum bloco cadastrado</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {condo.blocks.map((b) => (
              <span key={b.id} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium">
                Bloco {b.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Common spaces */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Espaços Comuns</h2>
          <button
            onClick={() => setShowSpaceModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {(!condo?.commonSpaces || condo.commonSpaces.length === 0) ? (
          <p className="text-sm text-gray-400">Nenhum espaço comum cadastrado</p>
        ) : (
          <div className="space-y-2">
            {condo.commonSpaces.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{s.name}</p>
                  {s.capacity && <p className="text-xs text-gray-500">{s.capacity} pessoas</p>}
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {Number(s.amount) > 0
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.amount))
                    : 'Grátis'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add block modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Novo Bloco</h3>
              <button onClick={() => { setShowBlockModal(false); setBlockName('') }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Bloco *</label>
              <input
                autoFocus
                type="text"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                placeholder="Ex: A, B, Torre 1…"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <button
              onClick={() => blockName && createBlock.mutate(blockName)}
              disabled={!blockName || createBlock.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {createBlock.isPending ? 'Criando…' : 'Criar Bloco'}
            </button>
          </div>
        </div>
      )}

      {/* Add space modal */}
      {showSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Novo Espaço Comum</h3>
              <button onClick={() => { setShowSpaceModal(false); resetSpace() }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSpace((d) => createSpace.mutate(d))} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  {...registerSpace('name')}
                  type="text"
                  placeholder="Ex: Salão de Festas, Piscina…"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                {spaceErrors.name && <p className="text-red-500 text-xs mt-1">{spaceErrors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacidade</label>
                  <input
                    {...registerSpace('capacity')}
                    type="number"
                    placeholder="Nº de pessoas"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa (R$)</label>
                  <input
                    {...registerSpace('amount')}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <textarea
                  {...registerSpace('description')}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createSpace.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {createSpace.isPending ? 'Criando…' : 'Criar Espaço'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
