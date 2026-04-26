'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp,
  Plus, Search, X, ChevronDown, Settings,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

dayjs.locale('pt-br')

type Invoice = {
  id: string
  reference: string
  dueDate: string
  amount: number
  paidAmount?: number
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  unit: { number: string; block?: { name: string } | null }
}

type FinancialStats = {
  total: number
  paidCount: number
  paidAmount: number
  overdueCount: number
  pendingCount: number
  pendingAmount: number
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', icon: Clock, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PAID: { label: 'Pago', icon: CheckCircle2, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  OVERDUE: { label: 'Vencido', icon: AlertCircle, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED: { label: 'Cancelado', icon: X, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function FinanceiroPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkReference, setBulkReference] = useState(dayjs().format('YYYY-MM'))
  const [bulkDueDate, setBulkDueDate] = useState(dayjs().date(10).format('YYYY-MM-DD'))

  const { data: condo } = useQuery<{ monthlyFee: number }>({
    queryKey: ['condominium-detail', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/condominiums/${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const monthlyFee = Number(condo?.monthlyFee ?? 0)

  const { data: stats } = useQuery<FinancialStats>({
    queryKey: ['financial', 'stats', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/financial/stats/${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 60_000,
  })

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['financial', 'invoices', condominiumId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ condominiumId })
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/financial/invoices?${params}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/financial/invoices/${id}/pay`),
    onSuccess: () => {
      toast.success('Pagamento registrado')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  })

  const generateBulk = useMutation({
    mutationFn: () =>
      api.post('/financial/invoices/bulk', {
        condominiumId,
        reference: bulkReference,
        dueDate: bulkDueDate,
      }),
    onSuccess: ({ data }: any) => {
      toast.success(`${data.generated} cobranças geradas`)
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setShowBulkModal(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao gerar cobranças'
      toast.error(msg)
    },
  })

  const filteredInvoices = search
    ? invoices.filter((inv) =>
        inv.unit.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.reference.includes(search),
      )
    : invoices

  // Chart data: group by reference
  const chartData = Object.entries(
    invoices.reduce<Record<string, { paid: number; overdue: number; pending: number }>>((acc, inv) => {
      if (!acc[inv.reference]) acc[inv.reference] = { paid: 0, overdue: 0, pending: 0 }
      if (inv.status === 'PAID') acc[inv.reference].paid += Number(inv.paidAmount ?? inv.amount)
      if (inv.status === 'OVERDUE') acc[inv.reference].overdue += Number(inv.amount)
      if (inv.status === 'PENDING') acc[inv.reference].pending += Number(inv.amount)
      return acc
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ref, values]) => ({
      name: ref,
      Pago: Math.round(values.paid),
      Vencido: Math.round(values.overdue),
      Pendente: Math.round(values.pending),
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-500 mt-1">Cobranças e inadimplência</p>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Gerar Cobranças
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Arrecadado', value: stats ? formatCurrency(Number(stats.paidAmount)) : '…', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'A Receber', value: stats ? formatCurrency(Number(stats.pendingAmount)) : '…', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Inadimplentes', value: stats ? String(stats.overdueCount) : '…', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Cobranças Pagas', value: stats ? String(stats.paidCount) : '…', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
            <div className={`${s.bg} p-3 rounded-lg flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Arrecadação por Mês</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Vencido" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
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
            placeholder="Buscar por unidade ou referência…"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="OVERDUE">Vencido</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma cobrança encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Unidade</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Referência</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Vencimento</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredInvoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status]
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                        {inv.unit.block ? `Bl. ${inv.unit.block.name} — ` : ''}Apto {inv.unit.number}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{inv.reference}</td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                        {dayjs(inv.dueDate).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number(inv.amount))}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', cfg.badge)}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                          <button
                            onClick={() => markPaid.mutate(inv.id)}
                            disabled={markPaid.isPending}
                            className="text-xs font-semibold text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
                          >
                            Registrar Pagto
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bulk modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gerar Cobranças em Lote</h3>
              <button onClick={() => setShowBulkModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {monthlyFee <= 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Taxa condominial não configurada.{' '}
                  <Link
                    href="/dashboard/configuracoes"
                    className="font-semibold underline"
                    onClick={() => setShowBulkModal(false)}
                  >
                    Configurar agora
                  </Link>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referência (Mês/Ano)</label>
                <input
                  type="month"
                  value={bulkReference}
                  onChange={(e) => setBulkReference(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500">
                {monthlyFee > 0
                  ? `Será gerada uma cobrança de ${formatCurrency(monthlyFee)} para cada unidade ativa.`
                  : 'Defina a taxa condominial nas configurações para habilitar a geração em lote.'}
              </p>
            </div>

            <button
              onClick={() => generateBulk.mutate()}
              disabled={generateBulk.isPending || monthlyFee <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {generateBulk.isPending ? 'Gerando…' : 'Gerar Cobranças'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
