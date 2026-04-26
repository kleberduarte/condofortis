'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, X, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type CommonSpace = {
  id: string
  name: string
  description?: string
  capacity?: number
  amount: number
}

type Reservation = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  notes?: string
  amount: number
  space: { name: string }
  user: { name: string; email: string }
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', icon: Clock, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  CONFIRMED: { label: 'Confirmada', icon: CheckCircle2, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  CANCELLED: { label: 'Cancelada', icon: XCircle, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  COMPLETED: { label: 'Concluída', icon: CheckCircle2, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
}

const reservationSchema = z.object({
  spaceId: z.string().min(1, 'Selecione um espaço'),
  date: z.string().min(1, 'Data obrigatória'),
  startTime: z.string().min(1, 'Hora início obrigatória'),
  endTime: z.string().min(1, 'Hora fim obrigatória'),
  notes: z.string().optional(),
})

type ReservationForm = z.infer<typeof reservationSchema>

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function ReservasPage() {
  const { condominiumId } = useCondominium()
  const queryClient = useQueryClient()
  const [showNewModal, setShowNewModal] = useState(false)
  const [dateFilter, setDateFilter] = useState('')

  const { data: spaces = [] } = useQuery<CommonSpace[]>({
    queryKey: ['spaces', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/condominiums/${condominiumId}/spaces`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 300_000,
  })

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations', condominiumId],
    queryFn: async () => {
      const { data } = await api.get(`/reservations?condominiumId=${condominiumId}`)
      return data
    },
    enabled: !!condominiumId,
    staleTime: 30_000,
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { date: dayjs().format('YYYY-MM-DD'), startTime: '09:00', endTime: '11:00' },
  })

  const selectedSpaceId = watch('spaceId')
  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId)

  const createReservation = useMutation({
    mutationFn: (data: ReservationForm) => api.post('/reservations', data),
    onSuccess: () => {
      toast.success('Reserva criada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setShowNewModal(false)
      reset()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar reserva'),
  })

  const cancelReservation = useMutation({
    mutationFn: (id: string) => api.delete(`/reservations/${id}`),
    onSuccess: () => {
      toast.success('Reserva cancelada')
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
    onError: () => toast.error('Erro ao cancelar reserva'),
  })

  const filteredReservations = dateFilter
    ? reservations.filter((r) => dayjs(r.date).format('YYYY-MM-DD') === dateFilter)
    : reservations

  const todayCount = reservations.filter((r) => dayjs(r.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).length
  const confirmedCount = reservations.filter((r) => r.status === 'CONFIRMED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservas</h1>
          <p className="text-gray-500 mt-1">Espaços comuns e agendamentos</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Reserva
        </button>
      </div>

      {/* Spaces quick view */}
      {spaces.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {spaces.map((space) => (
            <div key={space.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{space.name}</p>
              <div className="flex items-center justify-between mt-1">
                {space.capacity && <p className="text-xs text-gray-500">{space.capacity} pessoas</p>}
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {Number(space.amount) > 0 ? formatCurrency(Number(space.amount)) : 'Grátis'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hoje</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirmadas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{confirmedCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{reservations.length}</p>
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtro
          </button>
        )}
      </div>

      {/* Reservations list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma reserva encontrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredReservations.map((r) => {
              const cfg = STATUS_CONFIG[r.status]
              const StatusIcon = cfg.icon
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-purple-700 dark:text-purple-300 leading-none">
                      {dayjs(r.date).format('DD')}
                    </span>
                    <span className="text-[10px] text-purple-500 uppercase leading-none mt-0.5">
                      {dayjs(r.date).format('MMM')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{r.space.name}</p>
                    <p className="text-sm text-gray-500">
                      {r.user.name} · {r.startTime}–{r.endTime}
                      {Number(r.amount) > 0 && ` · ${formatCurrency(Number(r.amount))}`}
                    </p>
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                  </div>

                  <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0', cfg.badge)}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>

                  {r.status === 'CONFIRMED' && (
                    <button
                      onClick={() => cancelReservation.mutate(r.id)}
                      disabled={cancelReservation.isPending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 flex-shrink-0 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* New reservation modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nova Reserva</h3>
              <button onClick={() => { setShowNewModal(false); reset() }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createReservation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Espaço *</label>
                <select
                  {...register('spaceId')}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="">Selecione um espaço</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.spaceId && <p className="text-red-500 text-xs mt-1">{errors.spaceId.message}</p>}
              </div>

              {selectedSpace && Number(selectedSpace.amount) > 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  Taxa: {formatCurrency(Number(selectedSpace.amount))}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                <input
                  {...register('date')}
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início *</label>
                  <input
                    {...register('startTime')}
                    type="time"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim *</label>
                  <input
                    {...register('endTime')}
                    type="time"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <input
                  {...register('notes')}
                  type="text"
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={createReservation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {createReservation.isPending ? 'Criando…' : 'Criar Reserva'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
