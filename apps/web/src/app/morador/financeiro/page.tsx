'use client'

import { useQuery } from '@tanstack/react-query'
import { CreditCard, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { DownloadInvoiceButton } from '@/components/invoice-pdf'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Invoice = {
  id: string
  reference: string
  dueDate: string
  amount: number
  paidAmount?: number
  paidAt?: string
  status: string
  barcode?: string
  pixCode?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  OVERDUE: { label: 'Em atraso', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <XCircle className="w-3.5 h-3.5" /> },
}

export default function MoradorFinanceiroPage() {
  const { condominiumId } = useCondominium()

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['my-invoices', condominiumId],
    queryFn: async () => {
      const { data } = await api.get('/financial/invoices', { params: { condominiumId } })
      return data
    },
    enabled: !!condominiumId,
  })

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const totalPending = invoices.filter((i) => ['PENDING', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.paidAmount ?? i.amount), 0)

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Cobranças</h1>
        <p className="text-gray-500 mt-1">Histórico de taxas condominiais</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Em aberto</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(totalPending)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Pago (ano)</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalPaid)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma cobrança encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {invoices.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING
              return (
                <div key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">Taxa {inv.reference}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {inv.status === 'PAID' && inv.paidAt
                          ? `Pago em ${dayjs(inv.paidAt).format('DD/MM/YYYY')}`
                          : `Vence ${dayjs(inv.dueDate).format('DD/MM/YYYY')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <DownloadInvoiceButton invoice={inv} />
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{fmt(Number(inv.amount))}</p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
