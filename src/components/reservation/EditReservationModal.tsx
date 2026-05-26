// src/components/reservation/EditReservationModal.tsx
//
// Modal para modificar una reserva activa (pendiente o confirmada).
// El cliente puede cambiar fecha, horario, comensales, ocasión y notas.
// La mesa se mantiene; si no está disponible en el nuevo horario se
// muestra un error sin cancelar la reserva original.

import { useState, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DatePicker from './DatePicker'
import TimeSlotPicker from './TimeSlotPicker'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useBlockedDates } from '@/hooks/useBlockedDates'
import { useEditReservation } from '@/hooks/useReservations'
import type { Reservation, SpecialOccasion } from '@/types'

// ----------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------
const OCCASIONS: { value: SpecialOccasion; label: string }[] = [
  { value: 'ninguna',     label: 'Ninguna'     },
  { value: 'cumpleanos',  label: 'Cumpleaños'  },
  { value: 'aniversario', label: 'Aniversario' },
  { value: 'negocios',    label: 'Negocios'    },
  { value: 'otro',        label: 'Otro'        },
]

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------
interface Props {
  reservation: Reservation
  onClose:     () => void
}

// ----------------------------------------------------------------
// Componente
// ----------------------------------------------------------------
export default function EditReservationModal({ reservation, onClose }: Props) {
  const [date,       setDate]       = useState(reservation.date)
  const [timeSlotId, setTimeSlotId] = useState(reservation.time_slot_id)
  const [guests,     setGuests]     = useState(reservation.guests)
  const [occasion,   setOccasion]   = useState<SpecialOccasion>(reservation.occasion)
  const [notes,      setNotes]      = useState(reservation.notes ?? '')

  const { data: slots = [], isLoading: slotsLoading } = useTimeSlots()
  const { data: blockedDatesData = [] }               = useBlockedDates()
  const blockedDateStrings = blockedDatesData.map(b => b.date)
  const editMutation       = useEditReservation()

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Detectar si hay cambios reales
  const isDirty =
    date !== reservation.date ||
    timeSlotId !== reservation.time_slot_id ||
    guests !== reservation.guests ||
    occasion !== reservation.occasion ||
    (notes.trim() || '') !== (reservation.notes ?? '')

  async function handleSave() {
    await editMutation.mutateAsync({
      id:           reservation.id,
      table_id:     reservation.table_id,
      date,
      time_slot_id: timeSlotId,
      guests,
      occasion,
      notes:        notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-background shadow-xl overflow-hidden flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base">Modificar reserva</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">

          {/* Fecha */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Fecha</h3>
            <div className="rounded-xl border bg-card p-4">
              <DatePicker
                value={date}
                onChange={setDate}
                blockedDates={blockedDateStrings}
              />
            </div>
          </section>

          {/* Horario */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Horario</h3>
            <div className="rounded-xl border bg-card p-4">
              <TimeSlotPicker
                slots={slots}
                value={timeSlotId}
                onChange={setTimeSlotId}
                loading={slotsLoading}
              />
            </div>
          </section>

          {/* Comensales */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Comensales</h3>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setGuests(g => Math.max(1, g - 1))}
                  className="h-9 w-9 rounded-full border flex items-center justify-center text-xl leading-none hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="text-2xl font-semibold w-8 text-center tabular-nums">
                  {guests}
                </span>
                <button
                  type="button"
                  onClick={() => setGuests(g => Math.min(20, g + 1))}
                  className="h-9 w-9 rounded-full border flex items-center justify-center text-xl leading-none hover:bg-muted transition-colors"
                >
                  +
                </button>
                <span className="text-sm text-muted-foreground">
                  {guests === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>
          </section>

          {/* Ocasión */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Ocasión especial</h3>
            <div className="grid grid-cols-3 gap-2">
              {OCCASIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOccasion(value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-sm transition-colors',
                    occasion === value
                      ? 'border-primary bg-primary text-primary-foreground font-medium'
                      : 'border-border hover:bg-muted',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Notas */}
          <section>
            <label className="text-sm font-semibold block mb-2">
              Notas <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Alergias, peticiones especiales…"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </section>

          {/* Aviso de mesa */}
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-4 py-3">
            Se mantendrá la misma mesa{reservation.table ? ` (#${reservation.table.number})` : ''}.
            Si no está libre en el nuevo horario, recibirás un aviso para elegir otro.
          </p>

          {/* Error */}
          {editMutation.isError && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {editMutation.error instanceof Error
                ? editMutation.error.message
                : 'Error al modificar la reserva.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={editMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!isDirty || editMutation.isPending}
            onClick={handleSave}
          >
            {editMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}
