import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarPlus, Clock, Users, MapPin, AlertCircle, Pencil, QrCode, CalendarX2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyReservations, useCancelReservation } from '@/hooks/useReservations'
import EditReservationModal from '@/components/reservation/EditReservationModal'
import ReviewModal from '@/components/reservation/ReviewModal'
import QRModal from '@/components/reservation/QRModal'
import { useReviewForReservation } from '@/hooks/useReviews'
import { Star } from 'lucide-react'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Estilos por estado
// ----------------------------------------------------------------
const STATUS_BAR: Record<ReservationStatus, string> = {
  pendiente:  'bg-amber-400',
  confirmada: 'bg-green-500',
  cancelada:  'bg-gray-300 dark:bg-gray-600',
  completada: 'bg-blue-500',
  no_show:    'bg-red-400',
}

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pendiente:  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  confirmada: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  cancelada:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  completada: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  no_show:    'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente:  'Pendiente',
  confirmada: '✓ Confirmada',
  cancelada:  'Cancelada',
  completada: 'Completada',
  no_show:    'No asistió',
}

const OCCASION_LABELS: Record<string, string> = {
  cumpleanos: '🎂 Cumpleaños',
  aniversario: '💑 Aniversario',
  negocios:   '💼 Negocios',
  otro:       '✨ Ocasión especial',
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const ACTIVE_STATUSES: ReservationStatus[] = ['pendiente', 'confirmada']
const PAST_STATUSES:   ReservationStatus[] = ['completada', 'cancelada', 'no_show']

function formatDate(date: string) {
  return format(new Date(date + 'T00:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
}

function InfoChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground
                     bg-muted/60 px-2.5 py-1 rounded-full">
      {icon}
      {children}
    </span>
  )
}

// ----------------------------------------------------------------
// Tarjeta de reserva
// ----------------------------------------------------------------
interface ReservationCardProps {
  reservation: Reservation
  onCancel:    (id: string) => void
  cancelling:  boolean
}

function ReservationCard({ reservation, onCancel, cancelling }: ReservationCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showQR,     setShowQR]     = useState(false)
  const canCancel = ACTIVE_STATUSES.includes(reservation.status)
  const canEdit   = ACTIVE_STATUSES.includes(reservation.status)
  const canReview = reservation.status === 'completada'
  const { data: existingReview } = useReviewForReservation(reservation.id)
  const time = reservation.time_slot?.slot_time.slice(0, 5) ?? '—'

  return (
    <>
      {showEdit   && <EditReservationModal reservation={reservation} onClose={() => setShowEdit(false)} />}
      {showReview && <ReviewModal reservation={reservation} onClose={() => setShowReview(false)} />}
      {showQR     && <QRModal reservation={reservation} onClose={() => setShowQR(false)} />}

      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Barra de color por estado */}
        <div className={`h-1 w-full ${STATUS_BAR[reservation.status]}`} />

        <div className="p-5 space-y-4">
          {/* Header: restaurante + fecha + badge + QR */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {reservation.restaurant?.name && (
                <Link
                  to={`/restaurante/${reservation.restaurant_id}`}
                  className="text-xs font-semibold text-primary hover:underline block mb-1 truncate"
                >
                  {reservation.restaurant.name}
                </Link>
              )}
              <p className="font-bold text-base capitalize leading-tight">
                {formatDate(reservation.date)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canEdit && (
                <button
                  onClick={() => setShowQR(true)}
                  title="Ver QR de check-in"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <QrCode className="h-4 w-4" />
                </button>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[reservation.status]}`}>
                {STATUS_LABELS[reservation.status]}
              </span>
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            <InfoChip icon={<Clock className="h-3 w-3" />}>{time}</InfoChip>
            <InfoChip icon={<Users className="h-3 w-3" />}>
              {reservation.guests} {reservation.guests === 1 ? 'persona' : 'personas'}
            </InfoChip>
            <InfoChip icon={<MapPin className="h-3 w-3" />}>
              Mesa #{reservation.table?.number}
              {reservation.table?.zone ? ` · ${reservation.table.zone.name}` : ''}
            </InfoChip>
            {reservation.occasion && reservation.occasion !== 'ninguna' && (
              <InfoChip icon={null}>
                {OCCASION_LABELS[reservation.occasion] ?? reservation.occasion}
              </InfoChip>
            )}
          </div>

          {/* Notas */}
          {reservation.notes && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
              "{reservation.notes}"
            </p>
          )}

          {/* Reseña */}
          {canReview && (
            <div className="pt-1">
              {existingReview ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Tu reseña</span>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowReview(true)} className="gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Dejar reseña
                </Button>
              )}
            </div>
          )}

          {/* Acciones */}
          {(canEdit || canCancel) && !confirming && (
            <div className="flex gap-2 pt-1 border-t">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}
                  className="flex-1 gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Modificar
                </Button>
              )}
              {canCancel && (
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                  <CalendarX2 className="h-3.5 w-3.5" /> Cancelar
                </Button>
              )}
            </div>
          )}

          {/* Confirmación de cancelación */}
          {confirming && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>¿Confirmás la cancelación?</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => setConfirming(false)} disabled={cancelling}>
                  No, volver
                </Button>
                <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => onCancel(reservation.id)} disabled={cancelling}>
                  {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ----------------------------------------------------------------
// Skeleton
// ----------------------------------------------------------------
function ReservationSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-pulse">
      <div className="h-1 bg-muted" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="h-6 w-24 bg-muted rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-24 bg-muted rounded-full" />
          <div className="h-6 w-28 bg-muted rounded-full" />
        </div>
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
    <div className="max-w-2xl mx-auto">

      {/* Header con gradiente */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-600 px-4 pt-8 pb-6 mx-4 mt-4 rounded-2xl">
        <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-4 left-16 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Tus reservas</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">Mis reservas</h1>
          </div>
          <Button asChild size="sm"
            className="bg-white text-primary hover:bg-white/90 shadow-md gap-1.5 font-semibold shrink-0">
            <Link to="/reservar">
              <CalendarPlus className="h-4 w-4" />
              Nueva
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">

        {/* Tabs pill */}
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          {([
            ['proximas',  'Próximas',  proximas.length],
            ['historial', 'Historial', historial.length],
          ] as const).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center gap-2',
                tab === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <ReservationSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border bg-destructive/5 p-6 text-center space-y-2">
            <p className="font-medium text-destructive">Error al cargar las reservas</p>
            <p className="text-sm text-muted-foreground">Intentá recargar la página.</p>
          </div>
        ) : current.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
              <CalendarX2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">
              {tab === 'proximas' ? 'No tenés reservas activas' : 'Sin historial aún'}
            </p>
            <p className="text-sm text-muted-foreground">
              {tab === 'proximas'
                ? 'Hacé tu primera reserva en pocos pasos.'
                : 'Aquí aparecerán tus reservas pasadas.'}
            </p>
            {tab === 'proximas' && (
              <Button asChild size="sm" className="mt-1">
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
    </div>
  )
}
