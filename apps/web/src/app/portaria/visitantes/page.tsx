'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Plus, UserCheck, UserX, QrCode,
  CheckCircle2, XCircle, Clock, X, ScanLine,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { toast } from 'sonner'

dayjs.locale('pt-br')

type VisitorRaw = {
  id: string
  name: string
  document?: string
  status: 'EXPECTED' | 'ENTERED' | 'LEFT' | 'DENIED'
  expectedAt?: string
  unit: {
    number: string
    block?: { name: string } | null
    residents?: { user: { name: string } }[]
  }
}

type Visitor = {
  id: string
  name: string
  document: string
  unitNumber: string
  residentName: string
  scheduledAt?: string
  status: 'EXPECTED' | 'ENTERED' | 'LEFT' | 'DENIED'
}

function mapVisitor(v: VisitorRaw): Visitor {
  return {
    id: v.id,
    name: v.name,
    document: v.document ?? '',
    unitNumber: v.unit?.number ?? '',
    residentName: v.unit?.residents?.[0]?.user?.name ?? '',
    scheduledAt: v.expectedAt,
    status: v.status,
  }
}

const STATUS_CONFIG = {
  EXPECTED: { label: 'Esperado', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  ENTERED: { label: 'Entrou', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  LEFT: { label: 'Saiu', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: CheckCircle2 },
  DENIED: { label: 'Negado', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'EXPECTED', label: 'Esperados' },
  { value: 'ENTERED', label: 'Dentro' },
  { value: 'LEFT', label: 'Saíram' },
  { value: 'DENIED', label: 'Negados' },
]

export default function VisitantesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { condominiumId } = useCondominium()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [qrModalOpen, setQrModalOpen] = useState(searchParams.get('scan') === '1')
  const [qrInput, setQrInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['portaria', 'visitors', debouncedSearch, statusFilter, condominiumId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)
      if (condominiumId) params.set('condominiumId', condominiumId)
      const today = dayjs().format('YYYY-MM-DD')
      params.set('date', today)
      const { data } = await api.get<VisitorRaw[]>(`/visitors?${params}`)
      return data.map(mapVisitor)
    },
    enabled: !!condominiumId,
    refetchInterval: 20_000,
    retry: 1,
  })

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/checkin`),
    onSuccess: () => {
      toast.success('Check-in registrado')
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
    onError: () => toast.error('Erro ao registrar entrada'),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/checkout`),
    onSuccess: () => {
      toast.success('Saída registrada')
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
    onError: () => toast.error('Erro ao registrar saída'),
  })

  const denyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/deny`),
    onSuccess: () => {
      toast.success('Visitante negado')
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
    onError: () => toast.error('Erro ao negar visitante'),
  })

  const qrMutation = useMutation({
    mutationFn: (qrCode: string) => api.post<VisitorRaw>('/visitors/authorize', { qrCode }),
    onSuccess: ({ data: v }) => {
      toast.success(`${v.name} autorizado — Apto ${v.unit?.number}`)
      setQrModalOpen(false)
      setQrInput('')
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
    onError: (err: unknown) => {
      const r = (err as { response?: { status?: number; data?: { message?: string } } })?.response
      if (r?.status === 410 && r.data?.message) {
        toast.error(r.data.message)
        return
      }
      toast.error('QR Code inválido ou expirado')
    },
  })

  function handleQrSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (qrInput.trim()) qrMutation.mutate(qrInput.trim())
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, CPF ou unidade…"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Code</span>
          </button>
          <button
            onClick={() => router.push('/portaria/visitantes/cadastrar')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum visitante encontrado</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {visitors.map((v) => {
              const cfg = STATUS_CONFIG[v.status]
              const StatusIcon = cfg.icon

              return (
                <li key={v.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    {v.name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{v.name}</p>
                    <p className="text-sm text-gray-500">
                      {v.document && `CPF ${v.document} · `}Apto {v.unitNumber}
                      {v.residentName && ` · ${v.residentName}`}
                    </p>
                    {v.scheduledAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Previsto: {dayjs(v.scheduledAt).format('DD/MM HH:mm')}
                      </p>
                    )}
                  </div>

                  <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0', cfg.badgeClass)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.status === 'EXPECTED' && (
                      <>
                        <button
                          onClick={() => checkInMutation.mutate(v.id)}
                          disabled={checkInMutation.isPending}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2.5 rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          Liberar
                        </button>
                        <button
                          onClick={() => denyMutation.mutate(v.id)}
                          disabled={denyMutation.isPending}
                          className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-2.5 rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4" />
                          Negar
                        </button>
                      </>
                    )}
                    {v.status === 'ENTERED' && (
                      <button
                        onClick={() => checkOutMutation.mutate(v.id)}
                        disabled={checkOutMutation.isPending}
                        className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2.5 rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Saída
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Autorizar por QR Code</h3>
              <button
                onClick={() => { setQrModalOpen(false); setQrInput('') }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl p-8 gap-3">
              <ScanLine className="w-16 h-16 text-blue-600 animate-pulse" />
              <p className="text-sm text-gray-500 text-center">
                Aponte o leitor para o QR Code ou cole o código abaixo
              </p>
            </div>

            <form onSubmit={handleQrSubmit} className="space-y-3">
              <input
                autoFocus
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Código QR…"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <button
                type="submit"
                disabled={!qrInput.trim() || qrMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl min-h-[44px] transition-colors disabled:opacity-50"
              >
                {qrMutation.isPending ? 'Verificando…' : 'Autorizar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
