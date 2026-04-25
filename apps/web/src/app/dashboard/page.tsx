import { Building2, Users, DollarSign, AlertCircle, TrendingUp, Calendar } from 'lucide-react'

const stats = [
  { label: 'Total de Unidades', value: '120', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Moradores Ativos', value: '284', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Arrecadação do Mês', value: 'R$ 48.200', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Inadimplentes', value: '7', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Reservas Hoje', value: '3', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Ocorrências Abertas', value: '5', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do condomínio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center gap-4">
            <div className={`${stat.bg} p-3 rounded-lg`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Últimas Ocorrências</h2>
          <p className="text-gray-400 text-sm">Nenhuma ocorrência recente</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Próximas Reservas</h2>
          <p className="text-gray-400 text-sm">Nenhuma reserva para hoje</p>
        </div>
      </div>
    </div>
  )
}
