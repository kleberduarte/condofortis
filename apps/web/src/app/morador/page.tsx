'use client'

import { useQuery } from '@tanstack/react-query'
import { CreditCard, CalendarDays, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useCondominium } from '@/hooks/use-condominium'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)
dayjs.locale('pt-br')

type Invoice = { id: string; reference: string; dueDate: string; amount: number; status: string }
type Reservation = { id: string; date: string; startTime: string; endTime: string; status: string; space: { name: string } }
type Occurrence = { id: string; title: string; status: string; createdAt: string }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  OPEN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', OVERDUE: 'Em atraso', PAID: 'Paga', CANCELLED: 'Cancelada',
  CONFIRMED: 'Confirmada', COMPLETED: 'Concluída',
  OPEN: 'Aberta', IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvida', CLOSED: 'Encerrada',
}

export default function MoradorHomePage() {
  const { condominiumId } = useCondominium()
  const user = useAuthStore((s) => s.user)

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['my-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/financial/invoices', { params: { condominiumId } })
      return data
    },
    enabled: !!condominiumId,
  })

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const { data } = await api.get('/reservations/mine')
      return data
    },
  })

  const { data: occurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['my-occurrences'],
    queryFn: async () => {
      const { data } = await api.get('/occurrences', { params: { condominiumId } })
      return data
    },
    enabled: !!condominiumId,
  })

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length
  const upcomingReservations = reservations
    .filter((r) => ['PENDING', 'CONFIRMED'].includes(r.status) && dayjs(r.date).isAfter(dayjs().subtract(1, 'day')))
    .slice(0, 3)
  const openOccurrences = occurrences.filter((o) => ['OPEN', 'IN_PROGRESS'].includes(o.status)).slice(0, 3)

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const totalPending = pendingInvoices.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Olá, {user?.name?.split(' ')[0] ?? 'Morador'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Confira o resumo da sua unidade</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/morador/financeiro" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
              <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            {overdueCount > 0 && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                {overdueCount} em atraso
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(totalPending)}</p>
          <p className="text-sm text-gray-500 mt-0.5">{pendingInvoices.length} cobranças em aberto</p>
        </Link>

        <Link href="/morador/reservas" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg w-fit mb-3">
            <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingReservations.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">reservas próximas</p>
        </Link>

        <Link href="/morador/ocorrencias" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg w-fit mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{openOccurrences.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">ocorrências abertas</p>
        </Link>
      </div>

      {/* Recent invoices */}
      {pendingInvoices.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" /> Cobranças Pendentes
            </h2>
            <Link href="/morador/financeiro" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {pendingInvoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Taxa {inv.reference}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Vence {dayjs(inv.dueDate).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(Number(inv.amount))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming reservations */}
      {upcomingReservations.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" /> Próximas Reservas
            </h2>
            <Link href="/morador/reservas" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {upcomingReservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.space.name}</p>
                  <p className="text-xs text-gray-500">{dayjs(r.date).format('DD/MM/YYYY')} · {r.startTime}–{r.endTime}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open occurrences */}
      {openOccurrences.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Ocorrências em Aberto
            </h2>
            <Link href="/morador/ocorrencias" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-2">
            {openOccurrences.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{o.title}</p>
                  <p className="text-xs text-gray-500">{dayjs(o.createdAt).format('DD/MM/YYYY')}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingInvoices.length === 0 && upcomingReservations.length === 0 && openOccurrences.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Tudo em dia! Não há pendências no momento.</p>
        </div>
      )}
    </div>
  )
}
