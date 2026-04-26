'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Users, Plus, X, CheckCircle2, XCircle, Pencil, Layers,
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

type Tenant = {
  id: string
  name: string
  slug: string
  cnpj?: string
  plan: string
  isActive: boolean
  createdAt: string
  _count: { users: number; condominiums: number }
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const PLANS = ['starter', 'pro', 'enterprise']

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function SuperAdminPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', cnpj: '', plan: 'starter' })

  if (user?.role !== 'SUPER_ADMIN') {
    router.replace('/dashboard')
    return null
  }

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants-admin'],
    queryFn: async () => {
      const { data } = await api.get('/tenants')
      return data
    },
    staleTime: 30_000,
  })

  const createTenant = useMutation({
    mutationFn: () => api.post('/tenants', { ...form, cnpj: form.cnpj || undefined }),
    onSuccess: () => {
      toast.success('Tenant criado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['tenants-admin'] })
      setShowCreate(false)
      setForm({ name: '', slug: '', cnpj: '', plan: 'starter' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar tenant'),
  })

  const updateTenant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/tenants/${id}`, data),
    onSuccess: () => {
      toast.success('Tenant atualizado')
      queryClient.invalidateQueries({ queryKey: ['tenants-admin'] })
      setEditing(null)
    },
    onError: () => toast.error('Erro ao atualizar tenant'),
  })

  const totalUsers = tenants.reduce((s, t) => s + t._count.users, 0)
  const totalCondos = tenants.reduce((s, t) => s + t._count.condominiums, 0)
  const activeTenants = tenants.filter((t) => t.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
          <p className="text-gray-500 mt-1">Gerenciamento de tenants da plataforma</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tenants', value: tenants.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Ativos', value: activeTenants, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Usuários totais', value: totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Condomínios', value: totalCondos, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`${s.bg} p-3 rounded-lg`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tenants table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Tenant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Plano</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Usuários</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Condominios</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Criado em</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.slug}{t.cnpj ? ` · ${t.cnpj}` : ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[t.plan] ?? PLAN_COLORS.starter}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-gray-700 dark:text-gray-300">{t._count.users}</td>
                  <td className="px-5 py-4 text-center text-gray-700 dark:text-gray-300">{t._count.condominiums}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{dayjs(t.createdAt).format('DD/MM/YYYY')}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => updateTenant.mutate({ id: t.id, data: { isActive: !t.isActive } })}
                      className="inline-flex items-center gap-1 text-xs font-medium"
                    >
                      {t.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Novo Tenant</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="Ex: Construtora ABC"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="ex: construtora-abc"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plano</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={() => createTenant.mutate()}
              disabled={!form.name || !form.slug || createTenant.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {createTenant.isPending ? 'Criando…' : 'Criar Tenant'}
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Tenant</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500">{editing.name}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plano</label>
              <div className="flex gap-2">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setEditing((e) => e ? { ...e, plan: p } : e)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      editing.plan === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => updateTenant.mutate({ id: editing.id, data: { plan: editing.plan } })}
              disabled={updateTenant.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {updateTenant.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
