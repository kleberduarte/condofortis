'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, LogIn, LogOut, Search, QrCode, Fingerprint, Tag, User, Clock3 } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

dayjs.locale('pt-br')

type AccessLogRaw = {
  id: string
  accessType: 'MANUAL' | 'QRCODE' | 'FACIAL' | 'BIOMETRIC' | 'TAG'
  direction: 'IN' | 'OUT'
  description?: string
  createdAt: string
  user?: { id: string; name: string; role: string } | null
}

const ACCESS_TYPE_CONFIG = {
  MANUAL: { label: 'Manual', icon: User, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300' },
  QRCODE: { label: 'QR Code', icon: QrCode, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' },
  FACIAL: { label: 'Facial', icon: Fingerprint, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300' },
  BIOMETRIC: { label: 'Biométrico', icon: Fingerprint, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300' },
  TAG: { label: 'Tag/Card', icon: Tag, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' },
}

export default function ControleAcessoPage() {
  const { condominiumId } = useCondominium()
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(dayjs().format('YYYY-MM-DD'))

  const { data: rawLogs = [], isLoading } = useQuery<AccessLogRaw[]>({
    queryKey: ['access-logs', condominiumId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' })
      if (condominiumId) params.set('condominiumId', condominiumId)
      const { data } = await api.get(`/access/logs?${params}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const { data: visitors = [] } = useQuery<any[]>({
    queryKey: ['visitors-access', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/visitors?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const logs = rawLogs.map((raw) => ({
    ...raw,
    personName: raw.user?.name ?? raw.description ?? 'Desconhecido',
  }))

  const filteredByDate = dateFilter
    ? logs.filter((l) => dayjs(l.createdAt).format('YYYY-MM-DD') === dateFilter)
    : logs

  const filtered = search
    ? filteredByDate.filter((l) => l.personName.toLowerCase().includes(search.toLowerCase()))
    : filteredByDate

  const inCount = filteredByDate.filter((l) => l.direction === 'IN').length
  const outCount = filteredByDate.filter((l) => l.direction === 'OUT').length
  const visitorsInside = visitors.filter((v) => v.status === 'ENTERED').length

  // Hourly chart data
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const hour = String(h).padStart(2, '0')
    const entries = filteredByDate.filter((l) => dayjs(l.createdAt).format('HH') === hour)
    return {
      hour: `${hour}h`,
      Entradas: entries.filter((l) => l.direction === 'IN').length,
      Saídas: entries.filter((l) => l.direction === 'OUT').length,
    }
  }).filter((d) => d.Entradas > 0 || d.Saídas > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Controle de Acesso</h1>
        <p className="text-gray-500 mt-1">Log de acessos e visitantes no condomínio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg"><Shield className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Total Hoje</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredByDate.length}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg"><LogIn className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{inCount}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg"><LogOut className="w-5 h-5 text-indigo-600" /></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Saídas</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{outCount}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg"><User className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Visitantes Dentro</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{visitorsInside}</p></div>
        </div>
      </div>

      {/* Chart */}
      {hourlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Movimentação por Hora — {dayjs(dateFilter).format('DD/MM/YYYY')}
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="Entradas" stroke="#10b981" fill="url(#colorIn)" strokeWidth={2} />
              <Area type="monotone" dataKey="Saídas" stroke="#6366f1" fill="url(#colorOut)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Clock3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum acesso encontrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((log) => {
              const typeCfg = ACCESS_TYPE_CONFIG[log.accessType] ?? ACCESS_TYPE_CONFIG.MANUAL
              const TypeIcon = typeCfg.icon
              return (
                <li key={log.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    log.direction === 'IN' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30',
                  )}>
                    {log.direction === 'IN'
                      ? <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />
                      : <LogOut className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{log.personName}</p>
                    <p className="text-xs text-gray-500">{dayjs(log.createdAt).format('DD/MM HH:mm:ss')}</p>
                  </div>

                  <span className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0', typeCfg.color)}>
                    <TypeIcon className="w-3 h-3" />
                    {typeCfg.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
