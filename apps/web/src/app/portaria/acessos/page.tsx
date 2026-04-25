'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search, Plus, X, Clock3, LogIn, LogOut,
  QrCode, Tag, Fingerprint, User,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type AccessLog = {
  id: string
  personName: string
  unitNumber?: string
  accessType: 'MANUAL' | 'QRCODE' | 'FACIAL' | 'BIOMETRIC' | 'TAG'
  direction: 'IN' | 'OUT'
  createdAt: string
  notes?: string
  operatorName?: string
}

const ACCESS_TYPE_CONFIG = {
  MANUAL: { label: 'Manual', icon: User, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
  QRCODE: { label: 'QR Code', icon: QrCode, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  FACIAL: { label: 'Facial', icon: Fingerprint, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  BIOMETRIC: { label: 'Biométrico', icon: Fingerprint, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  TAG: { label: 'Tag/Card', icon: Tag, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
}

const manualSchema = z.object({
  personName: z.string().min(3, 'Nome obrigatório'),
  unitId: z.string().optional(),
  direction: z.enum(['IN', 'OUT']),
  notes: z.string().optional(),
})

type ManualForm = z.infer<typeof manualSchema>

async function fetchLogs(search: string, date: string): Promise<AccessLog[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (date) params.set('date', date)
  const { data } = await api.get(`/access/logs?${params}&limit=50`)
  return data
}

export default function AcessosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['portaria', 'access-logs', debouncedSearch, date],
    queryFn: () => fetchLogs(debouncedSearch, date),
    refetchInterval: 15_000,
    retry: 1,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualForm>({
    resolver: zodResolver(manualSchema),
    defaultValues: { direction: 'IN' },
  })

  const manualMutation = useMutation({
    mutationFn: (data: ManualForm) =>
      api.post('/access/logs/manual', { ...data, accessType: 'MANUAL' }),
    onSuccess: () => {
      toast.success('Acesso registrado manualmente')
      setShowManualModal(false)
      reset()
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
    onError: () => toast.error('Erro ao registrar acesso'),
  })

  const inCount = logs.filter((l) => l.direction === 'IN').length
  const outCount = logs.filter((l) => l.direction === 'OUT').length

  function groupByHour(logs: AccessLog[]) {
    const groups: Record<string, AccessLog[]> = {}
    logs.forEach((log) => {
      const hour = dayjs(log.createdAt).format('HH:00')
      if (!groups[hour]) groups[hour] = []
      groups[hour].push(log)
    })
    return groups
  }

  const grouped = groupByHour(logs)
  const hours = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-5">
      {/* ── Contador do dia ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{inCount}</p>
          <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
            <LogIn className="w-3.5 h-3.5" /> Entradas
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{outCount}</p>
          <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Saídas
          </p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pessoa ou unidade…"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
          />
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
        />

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Manual
        </button>
      </div>

      {/* ── Log de acessos agrupado por hora ── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400">
          <Clock3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum acesso registrado</p>
          <p className="text-sm mt-1">
            {date === dayjs().format('YYYY-MM-DD') ? 'Nenhum acesso hoje ainda' : `Sem registros em ${dayjs(date).format('DD/MM/YYYY')}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hours.map((hour) => (
            <div key={hour} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <Clock3 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{hour}</span>
                <span className="text-xs text-gray-400 ml-auto">{grouped[hour].length} registro(s)</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {grouped[hour].map((log) => {
                  const typeCfg = ACCESS_TYPE_CONFIG[log.accessType] || ACCESS_TYPE_CONFIG.MANUAL
                  const TypeIcon = typeCfg.icon

                  return (
                    <li key={log.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Direção */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        log.direction === 'IN'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30',
                      )}>
                        {log.direction === 'IN'
                          ? <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />
                          : <LogOut className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {log.personName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.unitNumber && `Apto ${log.unitNumber} · `}
                          {dayjs(log.createdAt).format('HH:mm:ss')}
                          {log.notes && ` · ${log.notes}`}
                        </p>
                      </div>

                      {/* Tipo */}
                      <span className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0', typeCfg.color)}>
                        <TypeIcon className="w-3 h-3" />
                        {typeCfg.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal registro manual ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registro Manual</h3>
              <button
                onClick={() => { setShowManualModal(false); reset() }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => manualMutation.mutate(d))} className="space-y-4">
              {/* Direção */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['IN', 'OUT'] as const).map((dir) => (
                    <label
                      key={dir}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-colors text-sm font-semibold',
                        'has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700',
                        'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
                      )}
                    >
                      <input type="radio" value={dir} {...register('direction')} className="sr-only" />
                      {dir === 'IN' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                      {dir === 'IN' ? 'Entrada' : 'Saída'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da pessoa *
                </label>
                <input
                  {...register('personName')}
                  autoFocus
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
                  placeholder="Nome completo"
                />
                {errors.personName && <p className="text-red-500 text-xs mt-1">{errors.personName.message}</p>}
              </div>

              {/* Unidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unidade (opcional)
                </label>
                <input
                  {...register('unitId')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
                  placeholder="Nº do apartamento"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <input
                  {...register('notes')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
                  placeholder="Ex: prestador de serviço"
                />
              </div>

              <button
                type="submit"
                disabled={manualMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 min-h-[48px]"
              >
                {manualMutation.isPending ? 'Registrando…' : 'Registrar Acesso'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
