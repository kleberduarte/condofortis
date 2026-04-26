'use client'

import { useQuery } from '@tanstack/react-query'
import { Building2, Users, DollarSign, AlertCircle, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

dayjs.locale('pt-br')

type FinancialStats = {
  total: number
  paidCount: number
  paidAmount: number
  overdueCount: number
  pendingCount: number
  pendingAmount: number
}

type Invoice = {
  id: string
  reference: string
  amount: number
  paidAmount?: number
  status: string
}

type AccessLog = {
  id: string
  direction: string
  createdAt: string
}

type Occurrence = {
  id: string
  title: string
  status: string
  createdAt: string
  reporter: { name: string }
  unit?: { number: string } | null
}

type Reservation = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  space: { name: string }
  user: { name: string }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta', IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvida', CLOSED: 'Encerrada',
}

export default function DashboardPage() {
  const { condominiumId, condominiumName, isLoading: loadingCondo } = useCondominium()

  const { data: financial } = useQuery<FinancialStats>({
    queryKey: ['dashboard', 'financial-stats', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/financial/stats/${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['dashboard', 'units', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/units?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const { data: occurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['dashboard', 'occurrences', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/occurrences?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ['dashboard', 'reservations', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/reservations?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const { data: allInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['dashboard', 'all-invoices', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/financial/invoices?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 120_000,
  })

  const { data: accessLogs = [] } = useQuery<AccessLog[]>({
    queryKey: ['dashboard', 'access-logs', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/access/logs?condominiumId=${condominiumId}&limit=500`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const totalResidents = units.reduce((acc: number, u: any) => acc + (u.residents?.length ?? 0), 0)
  const openOccurrences = occurrences.filter((o) => o.status === 'OPEN' || o.status === 'IN_PROGRESS')
  const today = dayjs().format('YYYY-MM-DD')
  const todayReservations = reservations.filter((r) => dayjs(r.date).format('YYYY-MM-DD') === today)
  const recentOccurrences = occurrences.slice(0, 5)
  const upcomingReservations = reservations
    .filter((r) => dayjs(r.date).isSame(dayjs(), 'day') || dayjs(r.date).isAfter(dayjs()))
    .slice(0, 5)

  // ── Chart data ──────────────────────────────────────────
  const financialPieData = [
    { name: 'Pago', value: financial?.paidCount ?? 0, color: '#22c55e' },
    { name: 'Pendente', value: financial?.pendingCount ?? 0, color: '#facc15' },
    { name: 'Em atraso', value: financial?.overdueCount ?? 0, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  const monthlyTrend = (() => {
    const months: Record<string, { month: string; arrecadado: number; pendente: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const key = dayjs().subtract(i, 'month').format('YYYY-MM')
      months[key] = { month: dayjs().subtract(i, 'month').format('MMM/YY'), arrecadado: 0, pendente: 0 }
    }
    allInvoices.forEach((inv) => {
      if (months[inv.reference]) {
        if (inv.status === 'PAID') months[inv.reference].arrecadado += Number(inv.paidAmount ?? inv.amount)
        else if (inv.status === 'PENDING' || inv.status === 'OVERDUE')
          months[inv.reference].pendente += Number(inv.amount)
      }
    })
    return Object.values(months)
  })()

  const accessByDay = (() => {
    const days: Record<string, { dia: string; entradas: number; saidas: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const key = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      days[key] = { dia: dayjs().subtract(i, 'day').format('DD/MM'), entradas: 0, saidas: 0 }
    }
    accessLogs.forEach((log) => {
      const key = dayjs(log.createdAt).format('YYYY-MM-DD')
      if (days[key]) {
        if (log.direction === 'IN') days[key].entradas++
        else days[key].saidas++
      }
    })
    return Object.values(days)
  })()
  // ─────────────────────────────────────────────────────────

  const stats = [
    {
      label: 'Total de Unidades',
      value: loadingCondo ? '…' : String(units.length),
      icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/dashboard/moradores',
    },
    {
      label: 'Moradores Ativos',
      value: loadingCondo ? '…' : String(totalResidents),
      icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20',
      href: '/dashboard/moradores',
    },
    {
      label: 'Arrecadado no Mês',
      value: financial ? formatCurrency(Number(financial.paidAmount)) : '…',
      icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      href: '/dashboard/financeiro',
    },
    {
      label: 'Inadimplentes',
      value: financial ? String(financial.overdueCount) : '…',
      icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20',
      href: '/dashboard/financeiro',
    },
    {
      label: 'Reservas Hoje',
      value: loadingCondo ? '…' : String(todayReservations.length),
      icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20',
      href: '/dashboard/reservas',
    },
    {
      label: 'Ocorrências Abertas',
      value: loadingCondo ? '…' : String(openOccurrences.length),
      icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20',
      href: '/dashboard/ocorrencias',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {condominiumName ? `${condominiumName} — Visão geral` : 'Visão geral do condomínio'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow group"
          >
            <div className={`${stat.bg} p-3 rounded-lg`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" />
          </Link>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição financeira */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Distribuição de Cobranças</h2>
          {financialPieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={financialPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {financialPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} fatura${value !== 1 ? 's' : ''}`, name]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tendência financeira 6 meses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Arrecadação — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrend} barSize={14} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                  name === 'arrecadado' ? 'Arrecadado' : 'Pendente',
                ]}
              />
              <Legend iconType="circle" iconSize={8}
                formatter={(value) => value === 'arrecadado' ? 'Arrecadado' : 'Pendente'} />
              <Bar dataKey="arrecadado" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendente" fill="#facc15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Acessos últimos 7 dias */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Acessos — últimos 7 dias</h2>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={accessByDay}>
            <defs>
              <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number, name: string) => [value, name === 'entradas' ? 'Entradas' : 'Saídas']} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => v === 'entradas' ? 'Entradas' : 'Saídas'} />
            <Area type="monotone" dataKey="entradas" stroke="#3b82f6" fill="url(#gradEntradas)" strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="saidas" stroke="#f97316" fill="url(#gradSaidas)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Ocorrências */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Últimas Ocorrências</h2>
            <Link href="/dashboard/ocorrencias" className="text-sm text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {recentOccurrences.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma ocorrência recente</p>
          ) : (
            <ul className="space-y-3">
              {recentOccurrences.map((o) => (
                <li key={o.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[o.status] ?? STATUS_BADGE.OPEN}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{o.title}</p>
                    <p className="text-xs text-gray-500">
                      {o.reporter.name}{o.unit && ` · Apto ${o.unit.number}`} · {dayjs(o.createdAt).format('DD/MM HH:mm')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Próximas Reservas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Próximas Reservas</h2>
            <Link href="/dashboard/reservas" className="text-sm text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {upcomingReservations.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma reserva próxima</p>
          ) : (
            <ul className="space-y-3">
              {upcomingReservations.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 leading-none">
                      {dayjs(r.date).format('DD')}
                    </span>
                    <span className="text-[10px] text-purple-500 uppercase">
                      {dayjs(r.date).format('MMM')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.space.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.user.name} · {r.startTime}–{r.endTime}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
