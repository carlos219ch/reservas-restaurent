import { CalendarCheck, UserX, LayoutGrid, Clock, Users } from 'lucide-react'
import type { DashboardMetrics } from '@/types'

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

interface CardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  highlight?: boolean
}

function MetricCard({ label, value, sub, icon, highlight }: CardProps) {
  return (
    <div className={[
      'rounded-xl border p-5 space-y-3',
      highlight ? 'bg-primary text-primary-foreground border-primary' : 'bg-card',
    ].join(' ')}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && (
          <p className={`text-xs mt-1 ${highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        label="Reservas hoy"
        value={metrics.totalToday}
        sub={`${metrics.confirmedToday} confirmadas`}
        icon={<CalendarCheck className="h-4 w-4" />}
        highlight
      />
      <MetricCard
        label="Ocupación"
        value={`${metrics.occupancyRate}%`}
        sub="del aforo total"
        icon={<LayoutGrid className="h-4 w-4" />}
      />
      <MetricCard
        label="No shows"
        value={metrics.noShowsToday}
        sub="no se presentaron"
        icon={<UserX className="h-4 w-4" />}
      />
      <MetricCard
        label="En lista de espera"
        value={metrics.waitlistCount}
        sub="esperando lugar"
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        label="Hora pico"
        value={metrics.peakHour}
        sub="más reservas"
        icon={<Clock className="h-4 w-4" />}
      />
    </div>
  )
}
