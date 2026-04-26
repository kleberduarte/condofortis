'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useCondominium } from '@/hooks/use-condominium'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Occurrence = {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  resolvedAt?: string
  unit?: { number: string; block?: { name: string } }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  IN_PROGRESS: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  RESOLVED: { label: 'Resolvida', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CLOSED: { label: 'Encerrada', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
}

export default function MoradorOcorrenciasPage() {
  const { condominiumId } = useCondominium()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '' })

  const { data: occurrences = [], isLoading } = useQuery<Occurrence[]>({
    queryKey: ['my-occurrences', condominiumId],
    queryFn: async () => {
      const { data } = await api.get('/occurrences', { params: { condominiumId } })
      return data
    },
    enabled: !!condominiumId,
  })

  const createOccurrence = useMutation({
    mutationFn: () =>
      api.post('/occurrences', {
        condominiumId,
        title: form.title,
        description: form.description,
      }),
    onSuccess: () => {
      toast.success('Ocorrência registrada!')
      queryClient.invalidateQueries({ queryKey: ['my-occurrences'] })
      setShowModal(false)
      setForm({ title: '', description: '' })
    },
    onError: () => toast.error('Erro ao registrar ocorrência'),
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ocorrências</h1>
          <p className="text-gray-500 mt-1">Registre e acompanhe problemas no condomínio</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Ocorrência
        </button>
      </div>

      {occurrences.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma ocorrência registrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
          {occurrences.map((o) => {
            const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.OPEN
            const isOpen = expanded === o.id
            return (
              <div key={o.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : o.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${['OPEN', 'IN_PROGRESS'].includes(o.status) ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <AlertTriangle className={`w-4 h-4 ${['OPEN', 'IN_PROGRESS'].includes(o.status) ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{o.title}</p>
                      <p className="text-xs text-gray-500">{dayjs(o.createdAt).format('DD/MM/YYYY')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/20">
                    <p className="leading-relaxed">{o.description}</p>
                    {o.resolvedAt && (
                      <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                        Resolvida em {dayjs(o.resolvedAt).format('DD/MM/YYYY')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Ocorrência</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Descreva o problema brevemente"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Detalhe o problema, local e horário"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => createOccurrence.mutate()}
              disabled={!form.title || !form.description || createOccurrence.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {createOccurrence.isPending ? 'Registrando…' : 'Registrar Ocorrência'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
