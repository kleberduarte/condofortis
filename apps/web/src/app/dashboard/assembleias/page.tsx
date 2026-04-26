'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Vote, Plus, X, ChevronDown, Calendar, Clock, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Poll = {
  id: string
  question: string
  isMultiple: boolean
  closesAt?: string
  options: { id: string; text: string; votes: number }[]
}

type Assembly = {
  id: string
  title: string
  description?: string
  scheduledAt: string
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED'
  polls: Poll[]
  _count: { polls: number }
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Agendada', icon: Calendar, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  OPEN: { label: 'Em andamento', icon: Clock, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CLOSED: { label: 'Encerrada', icon: XCircle, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

const assemblySchema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  description: z.string().optional(),
  scheduledAt: z.string().min(1, 'Data obrigatória'),
})

type AssemblyForm = z.infer<typeof assemblySchema>

export default function AssembleiasPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [showNewModal, setShowNewModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: assemblies = [], isLoading } = useQuery<Assembly[]>({
    queryKey: ['assemblies', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/assemblies?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AssemblyForm>({
    resolver: zodResolver(assemblySchema),
    defaultValues: { scheduledAt: dayjs().add(7, 'day').format('YYYY-MM-DDTHH:mm') },
  })

  const createAssembly = useMutation({
    mutationFn: (data: AssemblyForm) =>
      api.post('/assemblies', { ...data, condominiumId }),
    onSuccess: () => {
      toast.success('Assembleia criada')
      queryClient.invalidateQueries({ queryKey: ['assemblies'] })
      setShowNewModal(false)
      reset()
    },
    onError: () => toast.error('Erro ao criar assembleia'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/assemblies/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status atualizado')
      queryClient.invalidateQueries({ queryKey: ['assemblies'] })
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post(`/assemblies/polls/${pollId}/vote/${optionId}`),
    onSuccess: () => {
      toast.success('Voto registrado')
      queryClient.invalidateQueries({ queryKey: ['assemblies'] })
    },
    onError: () => toast.error('Erro ao registrar voto'),
  })

  const STATUS_TRANSITIONS: Record<string, { label: string; next: string } | null> = {
    SCHEDULED: { label: 'Iniciar', next: 'OPEN' },
    OPEN: { label: 'Encerrar', next: 'CLOSED' },
    CLOSED: null,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assembleias</h1>
          <p className="text-gray-500 mt-1">Reuniões e votações do condomínio</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Assembleia
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assemblies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Vote className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma assembleia cadastrada</p>
          <p className="text-sm mt-1">Crie a primeira assembleia do condomínio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assemblies.map((a) => {
            const cfg = STATUS_CONFIG[a.status]
            const StatusIcon = cfg.icon
            const transition = STATUS_TRANSITIONS[a.status]
            const isExpanded = expandedId === a.id

            return (
              <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-300 leading-none">
                      {dayjs(a.scheduledAt).format('DD')}
                    </span>
                    <span className="text-[10px] text-blue-500 uppercase leading-none mt-0.5">
                      {dayjs(a.scheduledAt).format('MMM')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{a.title}</p>
                    <p className="text-sm text-gray-500">
                      {dayjs(a.scheduledAt).format('DD/MM/YYYY [às] HH:mm')}
                      {a._count.polls > 0 && ` · ${a._count.polls} votação${a._count.polls > 1 ? 'ões' : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', cfg.badge)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {transition && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: a.id, status: transition.next }) }}
                        disabled={updateStatus.isPending}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-colors disabled:opacity-50"
                      >
                        {transition.label}
                      </button>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4 space-y-4 bg-gray-50 dark:bg-gray-900/30">
                    {a.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{a.description}</p>
                    )}

                    {a.polls.length === 0 ? (
                      <p className="text-sm text-gray-400">Nenhuma votação cadastrada para esta assembleia.</p>
                    ) : (
                      <div className="space-y-4">
                        {a.polls.map((poll) => {
                          const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0)
                          return (
                            <div key={poll.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{poll.question}</p>
                              <div className="space-y-2">
                                {poll.options.map((opt) => {
                                  const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
                                  return (
                                    <div key={opt.id} className="space-y-1">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                                        <span className="text-gray-500 text-xs">{opt.votes} voto{opt.votes !== 1 ? 's' : ''} ({pct}%)</span>
                                      </div>
                                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full transition-all"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      {a.status === 'OPEN' && (
                                        <button
                                          onClick={() => vote.mutate({ pollId: poll.id, optionId: opt.id })}
                                          disabled={vote.isPending}
                                          className="text-xs text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-50"
                                        >
                                          Votar nesta opção
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New assembly modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Assembleia</h3>
              <button onClick={() => { setShowNewModal(false); reset() }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createAssembly.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  {...register('title')}
                  type="text"
                  placeholder="Ex: Assembleia Ordinária 2026"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data e Hora *</label>
                <input
                  {...register('scheduledAt')}
                  type="datetime-local"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição / Pauta</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Descreva os pontos de pauta da assembleia…"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createAssembly.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {createAssembly.isPending ? 'Criando…' : 'Criar Assembleia'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
