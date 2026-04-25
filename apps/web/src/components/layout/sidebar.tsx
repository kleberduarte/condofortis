'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, Calendar,
  Shield, FileText, Vote, Building2, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

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
]

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
