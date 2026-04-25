'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LogOut, AlertTriangle, Home, Users, Clock3, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

const tabs = [
  { name: 'Início', href: '/portaria', icon: Home, exact: true },
  { name: 'Visitantes', href: '/portaria/visitantes', icon: Users, exact: false },
  { name: 'Acessos', href: '/portaria/acessos', icon: Clock3, exact: false },
]

export default function PortariaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [now, setNow] = useState(dayjs())
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [])

  function isTabActive(tab: (typeof tabs)[number]) {
    if (tab.exact) return pathname === tab.href
    return pathname.startsWith(tab.href)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          {/* Logo + nome */}
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-base font-bold text-gray-900 dark:text-white">CondoFortis</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Portaria</span>
            </div>
          </div>

          {/* Relógio */}
          <div className="flex flex-col items-center">
            <span className="text-xl md:text-2xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
              {now.format('HH:mm:ss')}
            </span>
            <span className="text-xs text-gray-400 capitalize hidden md:block">
              {now.format('dddd, DD [de] MMMM')}
            </span>
          </div>

          {/* Ações direita */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Botão ocorrência rápida */}
            <button
              onClick={() => router.push('/portaria/ocorrencias/nova')}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Ocorrência</span>
            </button>

            {/* Avatar + nome */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {user?.name ?? 'Porteiro'}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Tabs de navegação ── */}
        <nav className="flex border-t border-gray-100 dark:border-gray-800 md:px-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 md:flex-none md:px-6 py-3 text-sm font-semibold border-b-2 transition-colors min-h-[44px]',
                isTabActive(tab)
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300',
              )}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── Conteúdo ── */}
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  )
}
