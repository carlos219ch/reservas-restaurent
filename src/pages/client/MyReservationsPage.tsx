import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarPlus, Clock, Users, MapPin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyReservations, useCancelReservation } from '@/hooks/useReservations'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Badge de estado
// ----------------------------------------------------------------
const STATUS_STYLES: Record<ReservationStatus, string> = {
  pendiente:   'bg-amber-100 text-amber-700',
  confirmada:  'bg-green-100 text-green-700',
  cancelada:   'bg-gray-100 text-gray-500',
  completada:  'bg-blue-100 text-blue-700',
  no_show:     'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  cancelada:  'Cancelada',
  completada: 'Completada',
  no_show:    'No asistió',
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const ACTIVE_STATUSES: ReservationStatus[] = ['pendiente', 'confirmada']
const PAST_STATUSES:   ReservationStatus[] = ['completada', 'cancelada', 'no_show']

function formatDate(date: string) {
  return format(new Date(date + 'T00:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
}

// ----------------------------------------------------------------
// Componente de tarjeta
// ----------------------------------------------------------------
interface ReservationCardProps {
  reservation: Reservation
  onCancel: (id: string) => void
  cancelling: boolean
}

function ReservationCard({ reservation, onCancel, cancelling }: ReservationCardProps) {
  const [confirming, setConfirming] = useState(false)
  const canCancel = ACTIVE_STATUSES.includes(reservation.status)

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Encabezado: fecha + badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize text-sm">
            {formatDate(reservation.date)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
            <Clock className="h-3.5 w-3.5" />
            <span>{reservation.time_slot?.slot_time.slice(0, 5) ?? '—'}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{reservation.guests} {reservation.guests === 1 ? 'persona' : 'personas'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            Mesa #{reservation.table?.number}
            {reservation.table?.zone ? ` · ${reservation.table.zone.name}` : ''}
          </span>
        </div>
      </div>

      {reservation.occasion !== 'ninguna' && (
        <p className="text-xs text-muted-foreground">
          Ocasión: <span className="capitalize">{reservation.occasion}</span>
        </p>
      )}

      {reservation.notes && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          "{reservation.notes}"
        </p>
      )}

      {/* Acción de cancelación */}
      {canCancel && (
        <div className="border-t pt-3">
          {!confirming ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
            >
              Cancelar reserva
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>¿Confirmas la cancelación?</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirming(false)}
                  disabled={cancelling}
                >
                  No, volver
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => onCancel(reservation.id)}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Skeleton de carga
// ----------------------------------------------------------------
function ReservationSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-3 w-28 bg-muted rounded" />
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
export default function MyReservationsPage() {
  const { data: reservations = [], isLoading, isError } = useMyReservations()
  const cancelReservation = useCancelReservation()
  const [tab, setTab] = useState<'proximas' | 'historial'>('proximas')

  const proximas  = reservations.filter(r => ACTIVE_STATUSES.includes(r.status))
  const historial = reservations.filter(r => PAST_STATUSES.includes(r.status))
  const current   = tab === 'proximas' ? proximas : historial

  function handleCancel(id: string) {
    cancelReservation.mutate(id)
  }

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis reservas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consulta y gestiona tus reservas.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/reservar">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Nueva
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {([['proximas', 'Próximas', proximas.length], ['historial', 'Historial', historial.length]] as const).map(
          ([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                tab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
              {count > 0 && (
                <span className={[
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                  tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted',
                ].join(' ')}>
                  {count}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <ReservationSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-destructive/5 p-6 text-center space-y-2">
          <p className="font-medium text-destructive">Error al cargar las reservas</p>
          <p className="text-sm text-muted-foreground">Intenta recargar la página.</p>
        </div>
      ) : current.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center space-y-3">
          <p className="font-medium">
            {tab === 'proximas' ? 'No tienes reservas activas' : 'Sin historial aún'}
          </p>
          <p className="text-sm text-muted-foreground">
            {tab === 'proximas'
              ? 'Haz tu primera reserva en pocos pasos.'
              : 'Aquí aparecerán tus reservas pasadas.'}
          </p>
          {tab === 'proximas' && (
            <Button asChild size="sm" className="mt-2">
              <Link to="/reservar">Reservar ahora</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {current.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onCancel={handleCancel}
              cancelling={cancelReservation.isPending && cancelReservation.variables === r.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
