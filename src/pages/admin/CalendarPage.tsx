import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isSameDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock3, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarReservations } from '@/hooks/useCalendar'
import { useUpdateReservation } from '@/hooks/useReservations'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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
// Helpers
// ----------------------------------------------------------------
function getDotColor(count: number): string {
  if (count <= 3) return 'bg-green-500'
  if (count <= 6) return 'bg-amber-500'
  return 'bg-red-500'
}

function getCellHover(count: number): string {
  if (count === 0) return 'hover:bg-muted/40'
  if (count <= 3)  return 'hover:bg-green-50'
  if (count <= 6)  return 'hover:bg-amber-50'
  return 'hover:bg-red-50'
}

// ----------------------------------------------------------------
// ReservationRow
// ----------------------------------------------------------------
interface RowProps {
  r: Reservation
  onUpdate: (id: string, status: ReservationStatus) => void
  updating: boolean
}

function ReservationRow({ r, onUpdate, updating }: RowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b last:border-0">
      <div className="sm:w-24 shrink-0">
        <p className="text-sm font-bold tabular-nums leading-none">
          {r.time_slot?.slot_time.slice(0, 5) ?? '—'}
        </p>
        <p className="text-xs text-muted-foreground">Mesa #{r.table?.number}</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{r.profile?.full_name ?? 'Cliente'}</p>
        <p className="text-xs text-muted-foreground truncate">
          {r.guests} {r.guests === 1 ? 'persona' : 'personas'}
          {r.table?.zone ? ` · ${r.table.zone.name}` : ''}
          {r.occasion !== 'ninguna' ? ` · ${r.occasion}` : ''}
        </p>
        {r.notes && (
          <p className="text-xs text-muted-foreground italic truncate">"{r.notes}"</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
          {STATUS_LABELS[r.status]}
        </span>

        {r.status === 'pendiente' && (
          <>
            <button
              title="Confirmar"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'confirmada')}
              className="p-1 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              title="Cancelar"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'cancelada')}
              className="p-1 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
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
              className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
            >
              <Clock3 className="h-4 w-4" />
            </button>
            <button
              title="No show"
              disabled={updating}
              onClick={() => onUpdate(r.id, 'no_show')}
              className="p-1 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
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
// CalendarPage
// ----------------------------------------------------------------
export default function CalendarPage() {
  const [current, setCurrent]         = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year  = current.getFullYear()
  const month = current.getMonth()

  const { data: reservations = [], isLoading } = useCalendarReservations(year, month)
  const updateMutation = useUpdateReservation()

  const byDate = reservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    acc[r.date] = acc[r.date] ? [...acc[r.date], r] : [r]
    return acc
  }, {})

  const days        = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) })
  const startOffset = (getDay(startOfMonth(current)) + 6) % 7

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedItems   = selectedDateStr ? (byDate[selectedDateStr] ?? []) : []

  function handleDayClick(day: Date) {
    setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day)
  }

  function prevMonth() {
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  function nextMonth() {
    setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Calendario de reservas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize w-36 text-center">
            {format(current, 'MMMM yyyy', { locale: es })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 border-b border-r last:border-r-0 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`pad-${i}`} className="h-16 border-b border-r bg-muted/10" />
            ))}

            {days.map(day => {
              const dateStr    = format(day, 'yyyy-MM-dd')
              const count      = (byDate[dateStr] ?? []).length
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  className={[
                    'h-16 border-b border-r last:border-r-0 p-1.5 flex flex-col items-start gap-1 transition-colors text-left',
                    getCellHover(count),
                    isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary' : '',
                  ].join(' ')}
                >
                  <span className={[
                    'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full leading-none',
                    isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  ].join(' ')}>
                    {format(day, 'd')}
                  </span>

                  {count > 0 && (
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getDotColor(count)}`} />
                      <span className="text-[10px] text-muted-foreground leading-none">
                        {count} {count === 1 ? 'res.' : 'res.'}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedDate && (
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <span className="text-xs text-muted-foreground">
              {selectedItems.length} {selectedItems.length === 1 ? 'reserva' : 'reservas'}
            </span>
          </div>

          {selectedItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Sin reservas activas para este día.
            </p>
          ) : (
            <div className="px-5">
              {selectedItems.map(r => (
                <ReservationRow
                  key={r.id}
                  r={r}
                  onUpdate={(id, status) => updateMutation.mutate({ id, status })}
                  updating={updateMutation.isPending && updateMutation.variables?.id === r.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
