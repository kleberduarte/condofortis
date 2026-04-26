'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, FileText, CheckCircle2, AlertCircle, Clock, X, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Occurrence = {
  id: string
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
  resolvedAt?: string
  reporter: { name: string; role: string }
  unit?: { number: string } | null
}

const STATUS_CONFIG = {
  OPEN: { label: 'Aberta', icon: AlertCircle, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  IN_PROGRESS: { label: 'Em andamento', icon: Clock, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  RESOLVED: { label: 'Resolvida', icon: CheckCircle2, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CLOSED: { label: 'Encerrada', icon: X, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  OPEN: [{ label: 'Iniciar', next: 'IN_PROGRESS' }],
  IN_PROGRESS: [{ label: 'Resolver', next: 'RESOLVED' }],
  RESOLVED: [{ label: 'Encerrar', next: 'CLOSED' }],
  CLOSED: [],
}

export default function OcorrenciasPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: occurrences = [], isLoading } = useQuery<Occurrence[]>({
    queryKey: ['occurrences', condominiumId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ condominiumId })
      const { data } = await api.get(`/occurrences?${params}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/occurrences/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status atualizado')
      queryClient.invalidateQueries({ queryKey: ['occurrences'] })
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const filtered = occurrences.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        o.title.toLowerCase().includes(s) ||
        o.reporter.name.toLowerCase().includes(s) ||
        o.unit?.number?.includes(s)
      )
    }
    return true
  })

  const counts = {
    OPEN: occurrences.filter((o) => o.status === 'OPEN').length,
    IN_PROGRESS: occurrences.filter((o) => o.status === 'IN_PROGRESS').length,
    RESOLVED: occurrences.filter((o) => o.status === 'RESOLVED').length,
    CLOSED: occurrences.filter((o) => o.status === 'CLOSED').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ocorrências</h1>
        <p className="text-gray-500 mt-1">Gerencie as ocorrências do condomínio</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          const StatusIcon = cfg.icon
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center gap-3 text-left transition-all border-2',
                statusFilter === s ? 'border-blue-500' : 'border-transparent',
              )}
            >
              <span className={cn('p-2 rounded-lg', cfg.badge.split(' ').slice(0, 2).join(' '))}>
                <StatusIcon className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts[s]}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, morador ou unidade…"
          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma ocorrência encontrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((o) => {
              const cfg = STATUS_CONFIG[o.status]
              const StatusIcon = cfg.icon
              const transitions = STATUS_TRANSITIONS[o.status] ?? []
              const isExpanded = expandedId === o.id

              return (
                <li key={o.id}>
                  <div
                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    <span className={cn('mt-0.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0', cfg.badge)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{o.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.reporter.name}
                        {o.unit && ` · Apto ${o.unit.number}`}
                        {' · '}{dayjs(o.createdAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {transitions.map((t) => (
                        <button
                          key={t.next}
                          onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: o.id, status: t.next }) }}
                          disabled={updateStatus.isPending}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 transition-colors disabled:opacity-50"
                        >
                          {t.label}
                        </button>
                      ))}
                      <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line pt-3">{o.description}</p>
                      {o.resolvedAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          Resolvida em: {dayjs(o.resolvedAt).format('DD/MM/YYYY HH:mm')}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
