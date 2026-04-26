'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, X, QrCode, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { useResidentUnit } from '@/hooks/use-resident-unit'
import { toast } from 'sonner'
import { VisitorQrCodePanel } from '@/components/visitor-qrcode-panel'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Visitor = {
  id: string
  name: string
  document?: string
  plate?: string
  qrCode?: string
  status: string
  expectedAt?: string
  enteredAt?: string
  leftAt?: string
  unit: { number: string; block?: { name: string } }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EXPECTED: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  ENTERED: { label: 'No condomínio', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  LEFT: { label: 'Saiu', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  DENIED: { label: 'Acesso negado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
}

export default function MoradorVisitantesPage() {
  const { condominiumId } = useCondominium()
  const { unitId } = useResidentUnit()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', document: '', plate: '', expectedAt: '' })
  const [qrVisible, setQrVisible] = useState<string | null>(null)

  const { data: visitors = [], isLoading } = useQuery<Visitor[]>({
    queryKey: ['my-visitors', condominiumId],
    queryFn: async () => {
      const { data } = await api.get('/visitors', { params: { condominiumId } })
      return data
    },
    enabled: !!condominiumId,
  })

  const createVisitor = useMutation({
    mutationFn: () =>
      api.post('/visitors', {
        condominiumId,
        unitId,
        name: form.name,
        document: form.document || undefined,
        plate: form.plate || undefined,
        expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : undefined,
      }),
    onSuccess: (res) => {
      toast.success('Visitante cadastrado! O QR Code foi gerado.')
      queryClient.invalidateQueries({ queryKey: ['my-visitors'] })
      setShowModal(false)
      setForm({ name: '', document: '', plate: '', expectedAt: '' })
      const created = res.data as { id?: string; qrCode?: string }
      if (created?.id && created?.qrCode) setQrVisible(created.id)
    },
    onError: () => toast.error('Erro ao cadastrar visitante'),
  })

  const active = visitors.filter((v) => ['EXPECTED', 'ENTERED'].includes(v.status))
  const history = visitors.filter((v) => !active.includes(v))

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visitantes</h1>
          <p className="text-gray-500 mt-1">Pré-cadastre visitantes e gere QR Codes de acesso</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Cadastrar Visitante
        </button>
      </div>

      {active.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Ativos</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {active.map((v) => {
              const cfg = STATUS_CONFIG[v.status]
              return (
                <div key={v.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg flex-shrink-0">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{v.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {v.document && <span>{v.document}</span>}
                          {v.plate && <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{v.plate}</span>}
                          {v.expectedAt && <span>Previsto: {dayjs(v.expectedAt).format('DD/MM HH:mm')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {v.qrCode && (
                        <button
                          onClick={() => setQrVisible(qrVisible === v.id ? null : v.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Ver QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {qrVisible === v.id && v.qrCode && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <VisitorQrCodePanel value={v.qrCode} size={192} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Histórico</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.slice(0, 10).map((v) => {
              const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.LEFT
              return (
                <div key={v.id} className="px-5 py-3 opacity-70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{v.name}</p>
                      <p className="text-xs text-gray-500">
                        {v.enteredAt ? `Entrou: ${dayjs(v.enteredAt).format('DD/MM HH:mm')}` : ''}
                        {v.leftAt ? ` · Saiu: ${dayjs(v.leftAt).format('HH:mm')}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {v.qrCode && (
                        <button
                          type="button"
                          onClick={() => setQrVisible(qrVisible === v.id ? null : v.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Ver QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {qrVisible === v.id && v.qrCode && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl opacity-100">
                      <VisitorQrCodePanel value={v.qrCode} size={192} caption="QR do cadastro (referência)" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {active.length === 0 && history.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum visitante cadastrado</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
            Cadastrar primeiro visitante
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cadastrar Visitante</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do visitante"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF / Documento</label>
                  <input
                    type="text"
                    value={form.document}
                    onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Placa (veículo)</label>
                  <input
                    type="text"
                    value={form.plate}
                    onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC1234"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Previsão de chegada</label>
                <input
                  type="datetime-local"
                  value={form.expectedAt}
                  onChange={(e) => setForm((f) => ({ ...f, expectedAt: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={() => createVisitor.mutate()}
              disabled={!form.name || !unitId || createVisitor.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {createVisitor.isPending ? 'Cadastrando…' : 'Gerar QR Code de Acesso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
