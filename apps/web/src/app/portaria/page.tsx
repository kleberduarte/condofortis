'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Search, QrCode, UserCheck, UserX, Clock, ChevronRight,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Visitor = {
  id: string
  name: string
  document: string
  unitNumber: string
  residentName: string
  scheduledAt: string
  status: 'EXPECTED' | 'ENTERED' | 'LEFT' | 'DENIED'
  photoUrl?: string
}

type AccessLog = {
  id: string
  name: string
  unitNumber: string
  type: string
  enteredAt: string
}

const STATUS_CONFIG = {
  EXPECTED: { label: 'Esperado', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Clock },
  ENTERED: { label: 'Entrou', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 },
  LEFT: { label: 'Saiu', color: 'text-gray-500 bg-gray-50 dark:bg-gray-800', icon: CheckCircle2 },
  DENIED: { label: 'Negado', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: XCircle },
}

async function fetchExpectedToday(): Promise<Visitor[]> {
  const today = dayjs().format('YYYY-MM-DD')
  const { data } = await api.get(`/access/visitors?status=EXPECTED&date=${today}`)
  return data
}

async function fetchRecentAccesses(): Promise<AccessLog[]> {
  const { data } = await api.get('/access/logs?limit=5')
  return data
}

async function searchResidents(query: string) {
  if (!query || query.length < 2) return []
  const { data } = await api.get(`/units?search=${encodeURIComponent(query)}&limit=8`)
  return data
}

export default function PortariaHome() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: expected = [], isLoading: loadingExpected } = useQuery({
    queryKey: ['portaria', 'expected-today'],
    queryFn: fetchExpectedToday,
    refetchInterval: 30_000,
    retry: 1,
  })

  const { data: recentAccesses = [], isLoading: loadingAccesses } = useQuery({
    queryKey: ['portaria', 'recent-accesses'],
    queryFn: fetchRecentAccesses,
    refetchInterval: 15_000,
    retry: 1,
  })

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['portaria', 'search', searchQuery],
    queryFn: () => searchResidents(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 10_000,
  })

  const checkInMutation = useMutation({
    mutationFn: (visitorId: string) =>
      api.patch(`/access/visitors/${visitorId}/checkin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
  })

  const denyMutation = useMutation({
    mutationFn: (visitorId: string) =>
      api.patch(`/access/visitors/${visitorId}/deny`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portaria'] })
    },
  })

  const pendingCount = expected.filter((v) => v.status === 'EXPECTED').length

  return (
    <div className="space-y-6">
      {/* ── Busca central ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 md:p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Busca rápida</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar morador, unidade ou visitante…"
            className="w-full pl-12 pr-12 py-3 md:py-4 text-base md:text-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        {/* Resultados inline */}
        {searchQuery.length >= 2 && (
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {searchResults.length === 0 && !searching && (
              <p className="text-sm text-gray-400 py-3 text-center">Nenhum resultado encontrado</p>
            )}
            {searchResults.map((unit: { id: string; number: string; residentName?: string; floor?: string }) => (
              <div
                key={unit.id}
                className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded-lg cursor-pointer"
                onClick={() => router.push(`/portaria/visitantes/cadastrar?unit=${unit.id}`)}
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Apto {unit.number}</p>
                  {unit.residentName && (
                    <p className="text-sm text-gray-500">{unit.residentName}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ações rápidas ── */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/portaria/visitantes/cadastrar')}
          className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl p-5 min-h-[100px] transition-colors shadow-sm"
        >
          <UserCheck className="w-8 h-8" />
          <span className="text-base font-bold">Registrar Visitante</span>
        </button>

        <button
          onClick={() => router.push('/portaria/visitantes?scan=1')}
          className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl p-5 min-h-[100px] transition-colors shadow-sm"
        >
          <QrCode className="w-8 h-8" />
          <span className="text-base font-bold">Escanear QR Code</span>
        </button>
      </div>

      {/* ── Visitantes esperados hoje ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Esperados hoje</h2>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/portaria/visitantes')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Ver todos
          </button>
        </div>

        {loadingExpected ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expected.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum visitante esperado para hoje</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {expected.map((visitor) => {
              const cfg = STATUS_CONFIG[visitor.status]
              const StatusIcon = cfg.icon
              const isPending = visitor.status === 'EXPECTED'

              return (
                <li key={visitor.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">
                    {visitor.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{visitor.name}</p>
                    <p className="text-sm text-gray-500">
                      Apto {visitor.unitNumber} · {visitor.residentName}
                    </p>
                    {visitor.scheduledAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dayjs(visitor.scheduledAt).format('HH:mm')}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0', cfg.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>

                  {/* Ações (só se pendente) */}
                  {isPending && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => checkInMutation.mutate(visitor.id)}
                        disabled={checkInMutation.isPending}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Liberar</span>
                      </button>
                      <button
                        onClick={() => denyMutation.mutate(visitor.id)}
                        disabled={denyMutation.isPending}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-2 rounded-lg min-h-[44px] transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        <span className="hidden sm:inline">Negar</span>
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Últimos acessos ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Últimos acessos</h2>
          <button
            onClick={() => router.push('/portaria/acessos')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Ver histórico
          </button>
        </div>

        {loadingAccesses ? (
          <div className="p-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentAccesses.length === 0 ? (
          <p className="p-6 text-sm text-center text-gray-400">Nenhum acesso registrado hoje</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentAccesses.map((log) => (
              <li key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.name}</p>
                  <p className="text-xs text-gray-500">Apto {log.unitNumber} · {log.type}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                  {dayjs(log.enteredAt).format('HH:mm')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
