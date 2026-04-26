'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, Calendar,
  Shield, FileText, Vote, Building2, Settings, ChevronDown, Check, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCondominium } from '@/hooks/use-condominium'
import { useQueryClient } from '@tanstack/react-query'

type NavItem = {
  name: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Moradores',
    href: '/dashboard/moradores',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: DollarSign,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Reservas',
    href: '/dashboard/reservas',
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Controle de Acesso',
    href: '/dashboard/controle-acesso',
    icon: Shield,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Ocorrências',
    href: '/dashboard/ocorrencias',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Assembleias',
    href: '/dashboard/assembleias',
    icon: Vote,
    roles: ['SUPER_ADMIN', 'ADMIN', 'SYNDIC'],
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    name: 'Super Admin',
    href: '/dashboard/super-admin',
    icon: Layers,
    roles: ['SUPER_ADMIN'],
  },
]

function CondominiumSwitcher() {
  const { condominiumId, condominiumName, condominiums, setCondominium } = useCondominium()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  if (condominiums.length <= 1) {
    return (
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Condomínio</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {condominiumName || 'Carregando…'}
        </p>
      </div>
    )
  }

  function handleSelect(id: string, name: string) {
    setCondominium(id, name)
    setOpen(false)
    queryClient.invalidateQueries()
  }

  return (
    <div ref={ref} className="relative border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="min-w-0 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Condomínio</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{condominiumName || '—'}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {condominiums.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id, c.name)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.city}, {c.state}</p>
              </div>
              {c.id === condominiumId && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)

  const visibleItems = navigation.filter(
    (item) => !user?.role || item.roles.includes(user.role),
  )

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">CondoFortis</span>
        </div>
      </div>

      <CondominiumSwitcher />

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>

    </aside>
  )
}
