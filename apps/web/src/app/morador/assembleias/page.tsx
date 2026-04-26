'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Vote, ChevronDown, Calendar, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
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
  SCHEDULED: {
    label: 'Agendada',
    icon: Calendar,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  OPEN: {
    label: 'Em andamento',
    icon: Clock,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  CLOSED: {
    label: 'Encerrada',
    icon: XCircle,
    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  },
}

export default function MoradorAssembleiasPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({})

  const { data: assemblies = [], isLoading } = useQuery<Assembly[]>({
    queryKey: ['assemblies-morador', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/assemblies?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post(`/assemblies/polls/${pollId}/vote/${optionId}`),
    onSuccess: (_, { pollId, optionId }) => {
      toast.success('Voto registrado com sucesso!')
      setVotedPolls((prev) => ({ ...prev, [pollId]: optionId }))
      queryClient.invalidateQueries({ queryKey: ['assemblies-morador'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (msg?.includes('já votou')) {
        toast.error('Você já votou nesta votação.')
      } else {
        toast.error('Erro ao registrar voto')
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assembleias</h1>
        <p className="text-gray-500 mt-1">Reuniões e votações do seu condomínio</p>
      </div>

      {assemblies.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhuma assembleia agendada</p>
          <p className="text-sm text-gray-400 mt-1">As assembleias do condomínio aparecem aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assemblies.map((a) => {
            const cfg = STATUS_CONFIG[a.status]
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === a.id

            return (
              <div
                key={a.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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
                      {a._count.polls > 0 &&
                        ` · ${a._count.polls} votação${a._count.polls > 1 ? 'ões' : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                        cfg.badge,
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-gray-400 transition-transform',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4 space-y-4 bg-gray-50 dark:bg-gray-900/40">
                    {a.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {a.description}
                      </p>
                    )}

                    {a.polls.length === 0 ? (
                      <p className="text-sm text-gray-400">Sem votações nesta assembleia.</p>
                    ) : (
                      <div className="space-y-4">
                        {a.polls.map((poll) => {
                          const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0)
                          const myVote = votedPolls[poll.id]
                          const canVote = a.status === 'OPEN' && !myVote

                          return (
                            <div
                              key={poll.id}
                              className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {poll.question}
                                </p>
                                {myVote && (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                    <CheckCircle2 className="w-3 h-3" /> Votado
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2.5">
                                {poll.options.map((opt) => {
                                  const pct =
                                    totalVotes > 0
                                      ? Math.round((opt.votes / totalVotes) * 100)
                                      : 0
                                  const isMyChoice = myVote === opt.id

                                  return (
                                    <div key={opt.id} className="space-y-1">
                                      <div className="flex items-center justify-between text-sm">
                                        <span
                                          className={cn(
                                            'text-gray-700 dark:text-gray-300',
                                            isMyChoice && 'font-semibold text-blue-600 dark:text-blue-400',
                                          )}
                                        >
                                          {isMyChoice && '✓ '}{opt.text}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {opt.votes} voto{opt.votes !== 1 ? 's' : ''} ({pct}%)
                                        </span>
                                      </div>
                                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className={cn(
                                            'h-full rounded-full transition-all',
                                            isMyChoice ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
                                          )}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      {canVote && (
                                        <button
                                          onClick={() =>
                                            vote.mutate({ pollId: poll.id, optionId: opt.id })
                                          }
                                          disabled={vote.isPending}
                                          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline disabled:opacity-50"
                                        >
                                          Votar nesta opção
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {a.status === 'CLOSED' && (
                                <p className="text-xs text-gray-400 italic">Votação encerrada</p>
                              )}
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
    </div>
  )
}
