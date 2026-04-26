'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { useCondominium } from '@/hooks/use-condominium'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'SECURITY', label: '🔒 Segurança', description: 'Pessoa suspeita, tentativa de invasão, etc.' },
  { value: 'MAINTENANCE', label: '🔧 Manutenção', description: 'Equipamento quebrado, vazamento, etc.' },
  { value: 'NOISE', label: '🔊 Barulho', description: 'Perturbação do sossego' },
  { value: 'VANDALISM', label: '💥 Vandalismo', description: 'Danos ao patrimônio do condomínio' },
  { value: 'VEHICLE', label: '🚗 Veículo', description: 'Estacionamento irregular, bloqueio de vaga' },
  { value: 'OTHER', label: '📋 Outro', description: 'Qualquer outra situação' },
]

const schema = z.object({
  title: z.string().min(5, 'Descreva brevemente (mín. 5 caracteres)'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().min(10, 'Descreva com mais detalhes (mín. 10 caracteres)'),
  location: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})

type FormData = z.infer<typeof schema>

const PRIORITY_CONFIG = {
  LOW: { label: 'Baixa', class: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  MEDIUM: { label: 'Média', class: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  HIGH: { label: 'Alta', class: 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
  URGENT: { label: 'Urgente', class: 'border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400' },
}

export default function NovaOcorrenciaPage() {
  const router = useRouter()
  const { condominiumId } = useCondominium()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM', category: '' },
  })

  const selectedCategory = watch('category')
  const selectedPriority = watch('priority')

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const categoryLabel = CATEGORIES.find((c) => c.value === data.category)?.label ?? data.category
      const priorityLabel = PRIORITY_CONFIG[data.priority as keyof typeof PRIORITY_CONFIG]?.label ?? data.priority
      const descriptionFull = [
        `[${categoryLabel}] [Prioridade: ${priorityLabel}]`,
        data.location ? `Local: ${data.location}` : null,
        data.description,
      ].filter(Boolean).join('\n')
      return api.post('/occurrences', {
        condominiumId,
        title: data.title,
        description: descriptionFull,
      })
    },
    onSuccess: () => {
      toast.success('Ocorrência registrada — síndico notificado')
      router.push('/portaria')
    },
    onError: () => toast.error('Erro ao registrar ocorrência'),
  })

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nova Ocorrência</h1>
            <p className="text-xs text-gray-500">O síndico será notificado imediatamente</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
        {/* Categoria */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Categoria *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setValue('category', cat.value)}
                className={cn(
                  'flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 transition-colors text-left',
                  selectedCategory === cat.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{cat.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{cat.description}</span>
              </button>
            ))}
          </div>
          {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
        </div>

        {/* Prioridade */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Prioridade *</h2>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue('priority', p)}
                className={cn(
                  'py-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                  selectedPriority === p
                    ? PRIORITY_CONFIG[p].class + ' ring-2 ring-offset-1 ring-blue-500'
                    : PRIORITY_CONFIG[p].class + ' opacity-60',
                )}
              >
                {PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Título + Detalhes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Detalhes</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título *
            </label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
              placeholder="Resumo breve da ocorrência"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Local (opcional)
            </label>
            <input
              {...register('location')}
              type="text"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[44px]"
              placeholder="Ex: Garagem B2, Corredor 3º andar…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição completa *
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              placeholder="Descreva o que aconteceu com o máximo de detalhes possível…"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 rounded-2xl text-base min-h-[52px] transition-colors disabled:opacity-50 shadow-lg shadow-red-200 dark:shadow-none"
        >
          <Send className="w-5 h-5" />
          {createMutation.isPending ? 'Enviando…' : 'Registrar e Notificar Síndico'}
        </button>
      </form>
    </div>
  )
}
