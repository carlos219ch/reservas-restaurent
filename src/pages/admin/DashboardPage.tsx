import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RefreshCw, CheckCircle2, XCircle, Clock3, Ban, UtensilsCrossed, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MetricsCards from '@/components/admin/MetricsCards'
import { useDashboardMetrics, useTodayReservations } from '@/hooks/useDashboard'
import { useUpdateReservation } from '@/hooks/useReservations'
import { useAuth } from '@/hooks/useAuth'
import { usePendingRestaurants, useRestaurants } from '@/hooks/useRestaurants'
import { Link } from 'react-router-dom'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Badge de estado
// ----------------------------------------------------------------
const STATUS_STYLES: Record<ReservationStatus, string> = {
  pendiente:  'bg-amber-100 text-amber-700',
  confirmada: 'bg-green-100 text-green-700',
  cancelada:  'bg-gray-100 text-gray-500',
  completada: 'bg-blue-100 text-blue-700',
  no_show:    'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  cancelada:  'Cancelada',
  completada: 'Completada',
  no_show:    'No show',
}

// ----------------------------------------------------------------
// Fila de reserva
// ----------------------------------------------------------------
interface ReservationRowProps {
  reservation: Reservation
  onUpdate: (id: string, status: ReservationStatus) => void
  updating: boolean
}

function ReservationRow({ reservation: r, onUpdate, updating }: ReservationRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b last:border-0">
      {/* Hora + mesa */}
      <div className="flex items-center gap-3 sm:w-32 shrink-0">
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums leading-none">
            {r.time_slot?.slot_time.slice(0, 5) ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Mesa #{r.table?.number}</p>
        </div>
      </div>

      {/* Info cliente */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {r.profile?.full_name ?? 'Cliente'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {r.guests} {r.guests === 1 ? 'persona' : 'personas'}
          {r.table?.zone ? ` · ${r.table.zone.name}` : ''}
          {r.occasion !== 'ninguna' ? ` · ${r.occasion}` : ''}
        </p>
        {r.notes && (
          <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{r.notes}"</p>
        )}
      </div>

      {/* Status + acciones */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
          {STATUS_LABELS[r.status]}
        </span>

        {r.status === 'pendiente' && (
          <>
            <button
              title="Confirmar"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'confirmada')}
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              title="Cancelar"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'cancelada')}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
            >
              <Ban className="h-4 w-4" />
            </button>
          </>
        )}

        {r.status === 'confirmada' && (
          <>
            <button
              title="Marcar completada"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'completada')}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
            >
              <Clock3 className="h-4 w-4" />
            </button>
            <button
              title="Marcar no show"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'no_show')}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Dashboard superadmin: resumen global de la plataforma
// ----------------------------------------------------------------
function SuperAdminDashboard() {
  const { data: allRestaurants = [], isLoading: loadingR } = useRestaurants()
  const { data: pending = [],        isLoading: loadingP } = usePendingRestaurants()
  const today = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })

  const stats = [
    { label: 'Restaurantes activos', value: allRestaurants.length, icon: UtensilsCrossed, color: 'text-primary bg-primary/10' },
    { label: 'Pendientes de aprobación', value: pending.length,    icon: ShieldCheck,     color: 'text-amber-600 bg-amber-100' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumen de la plataforma</h1>
        <p className="text-muted-foreground text-sm capitalize mt-1">{today}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-5 flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loadingR || loadingP ? '…' : s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {pending.length} restaurante{pending.length !== 1 ? 's' : ''} esperando aprobación
            </p>
          </div>
          <Link
            to="/admin/aprobaciones"
            className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline shrink-0"
          >
            Ver →
          </Link>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-base mb-3">Restaurantes activos</h2>
        {loadingR ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {allRestaurants.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.zone ? `${r.zone}, ` : ''}{r.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
export default function DashboardPage() {
  const { isSuperAdmin }  = useAuth()
  const metricsQuery    = useDashboardMetrics()
  const todayQuery      = useTodayReservations()
  const updateMutation  = useUpdateReservation()

  if (isSuperAdmin) return <SuperAdminDashboard />

  const today = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })

  function handleUpdate(id: string, status: ReservationStatus) {
    updateMutation.mutate({ id, status })
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm capitalize mt-1">{today}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            metricsQuery.refetch()
            todayQuery.refetch()
          }}
          disabled={metricsQuery.isFetching || todayQuery.isFetching}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${metricsQuery.isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Métricas */}
      {metricsQuery.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 h-28 animate-pulse bg-muted" />
          ))}
        </div>
      ) : metricsQuery.data ? (
        <MetricsCards metrics={metricsQuery.data} />
      ) : null}

      {/* Reservas de hoy */}
      <div>
        <h2 className="font-semibold text-base mb-4">Reservas de hoy</h2>

        {todayQuery.isLoading ? (
          <div className="rounded-xl border bg-card divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 animate-pulse">
                <div className="h-10 w-14 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : todayQuery.data?.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
            No hay reservas para hoy.
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-5">
            {todayQuery.data?.map(r => (
              <ReservationRow
                key={r.id}
                reservation={r}
                onUpdate={handleUpdate}
                updating={updateMutation.isPending && updateMutation.variables?.id === r.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
