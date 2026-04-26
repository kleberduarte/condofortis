'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, X, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Space = { id: string; name: string; capacity?: number; amount: number; description?: string }
type Reservation = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  amount: number
  notes?: string
  space: { name: string }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', COMPLETED: 'Concluída',
}

export default function MoradorReservasPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ spaceId: '', date: '', startTime: '09:00', endTime: '12:00', notes: '' })

  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ['spaces', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/condominiums/${condominiumId}/spaces`)
      return data
    },
    enabled: !!condominiumId,
  })

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const { data } = await api.get('/reservations/mine')
      return data
    },
  })

  const createReservation = useMutation({
    mutationFn: () =>
      api.post('/reservations', {
        spaceId: form.spaceId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Reserva solicitada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
      setShowModal(false)
      setForm({ spaceId: '', date: '', startTime: '09:00', endTime: '12:00', notes: '' })
    },
    onError: () => toast.error('Erro ao criar reserva. Verifique a disponibilidade.'),
  })

  const cancelReservation = useMutation({
    mutationFn: (id: string) => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      toast.success('Reserva cancelada')
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
    },
    onError: () => toast.error('Erro ao cancelar reserva'),
  })

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const upcoming = reservations.filter((r) => ['PENDING', 'CONFIRMED'].includes(r.status) && !dayjs(r.date).isBefore(dayjs(), 'day'))
  const past = reservations.filter((r) => !upcoming.includes(r))

  const isFormValid = form.spaceId && form.date && form.startTime && form.endTime

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservas</h1>
          <p className="text-gray-500 mt-1">Agende espaços comuns do condomínio</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Reserva
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Próximas</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {upcoming.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{r.space.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {dayjs(r.date).format('DD/MM/YYYY')}
                      <span className="text-gray-300">·</span>
                      <Clock className="w-3 h-3" /> {r.startTime}–{r.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => cancelReservation.mutate(r.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Histórico</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {past.slice(0, 10).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 opacity-70">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{r.space.name}</p>
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

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Você não tem nenhuma reserva ainda</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
            Fazer primeira reserva
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Reserva</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Espaço *</label>
                <select
                  value={form.spaceId}
                  onChange={(e) => setForm((f) => ({ ...f, spaceId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="">Selecione um espaço</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{Number(s.amount) > 0 ? ` — ${fmt(Number(s.amount))}` : ' — Grátis'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => createReservation.mutate()}
              disabled={!isFormValid || createReservation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {createReservation.isPending ? 'Solicitando…' : 'Solicitar Reserva'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
