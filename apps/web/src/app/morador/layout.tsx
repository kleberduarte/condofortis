'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, CalendarDays, AlertTriangle, Users, PawPrint, Vote } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Header } from '@/components/layout/header'

const navItems = [
  { href: '/morador', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/morador/financeiro', label: 'Minhas Cobranças', icon: CreditCard },
  { href: '/morador/reservas', label: 'Reservas', icon: CalendarDays },
  { href: '/morador/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  { href: '/morador/visitantes', label: 'Visitantes', icon: Users },
  { href: '/morador/assembleias', label: 'Assembleias', icon: Vote },
  { href: '/morador/pets', label: 'Meus Pets', icon: PawPrint },
]

export default function MoradorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">CondoFortis</p>
              <p className="text-xs text-gray-400 mt-0.5">Portal do Morador</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'M'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name ?? 'Morador'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
