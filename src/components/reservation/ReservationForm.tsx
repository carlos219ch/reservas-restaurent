import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import DatePicker from './DatePicker'
import TimeSlotPicker from './TimeSlotPicker'
import FloorPlan from './FloorPlan'
import { useFloorPlanImage } from '@/hooks/useFloorPlanImage'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useAvailability } from '@/hooks/useAvailability'
import { useCreateReservation } from '@/hooks/useReservations'
import { useReservationStore } from '@/store/reservationStore'
import { useBlockedDates } from '@/hooks/useBlockedDates'
import type { SpecialOccasion } from '@/types'

// ----------------------------------------------------------------
// Constantes
// ----------------------------------------------------------------
const OCCASIONS: { value: SpecialOccasion; label: string }[] = [
  { value: 'ninguna',     label: 'Ninguna' },
  { value: 'cumpleanos',  label: 'Cumpleaños' },
  { value: 'aniversario', label: 'Aniversario' },
  { value: 'negocios',    label: 'Negocios' },
  { value: 'otro',        label: 'Otro' },
]

const STEPS = ['Fecha y hora', 'Mesa', 'Confirmar'] as const

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------
export default function ReservationForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [success, setSuccess] = useState(false)

  const {
    date, timeSlotId, guests, tableId, occasion, notes,
    setDate, setTimeSlot, setGuests, setTable, setOccasion, setNotes,
    reset,
  } = useReservationStore()

  const { data: slots = [], isLoading: slotsLoading } = useTimeSlots()
  const { tablesWithAvailability, isLoading: availLoading } = useAvailability(date, timeSlotId)
  const createReservation   = useCreateReservation()
  const { data: floorPlanUrl } = useFloorPlanImage()
  const { data: blockedDatesData = [] } = useBlockedDates()
  const blockedDateStrings = blockedDatesData.map(b => b.date)

  const selectedSlot = slots.find(s => s.id === timeSlotId)
  const selectedTable = tablesWithAvailability.find(t => t.id === tableId)

  const availableTables = tablesWithAvailability.filter(
    t => t.availability === 'disponible' && t.capacity >= guests
  )

  const step0Valid = !!date && !!timeSlotId && guests >= 1
  const step1Valid = !!tableId

  async function handleSubmit() {
    if (!date || !timeSlotId || !tableId) return
    await createReservation.mutateAsync({
      date,
      time_slot_id: timeSlotId,
      table_id: tableId,
      guests,
      occasion,
      notes: notes.trim() || undefined,
    })
    setSuccess(true)
    reset()
  }

  // ---- Pantalla de éxito ----
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-semibold">¡Reserva confirmada!</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Tu reserva ha sido registrada. Puedes consultarla en "Mis reservas".
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => navigate('/mis-reservas')}>
            Ver mis reservas
          </Button>
          <Button onClick={() => setSuccess(false)}>
            Nueva reserva
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className={[
              'flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0 transition-colors',
              i < step  ? 'bg-primary text-primary-foreground' : '',
              i === step ? 'border-2 border-primary text-primary' : '',
              i > step  ? 'border-2 border-border text-muted-foreground' : '',
            ].join(' ')}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={[
              'text-sm ml-2 hidden sm:block',
              i === step ? 'font-medium' : 'text-muted-foreground',
            ].join(' ')}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={['flex-1 h-px mx-3', i < step ? 'bg-primary' : 'bg-border'].join(' ')} />
            )}
          </div>
        ))}
      </div>

      {/* ---- Paso 0: Fecha, hora y comensales ---- */}
      {step === 0 && (
        <div className="space-y-5">
          <section>
            <h2 className="text-sm font-semibold mb-2">Fecha</h2>
            <div className="rounded-xl border bg-card p-4">
              <DatePicker value={date} onChange={setDate} blockedDates={blockedDateStrings} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-2">Horario</h2>
            <div className="rounded-xl border bg-card p-4">
              <TimeSlotPicker
                slots={slots}
                value={timeSlotId}
                onChange={setTimeSlot}
                loading={slotsLoading}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-2">Comensales</h2>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="h-9 w-9 rounded-full border flex items-center justify-center text-lg leading-none hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="text-2xl font-semibold w-8 text-center tabular-nums">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests(Math.min(20, guests + 1))}
                  className="h-9 w-9 rounded-full border flex items-center justify-center text-lg leading-none hover:bg-muted transition-colors"
                >
                  +
                </button>
                <span className="text-sm text-muted-foreground">
                  {guests === 1 ? 'persona' : 'personas'}
                </span>
              </div>
            </div>
          </section>

          <Button className="w-full" disabled={!step0Valid} onClick={() => setStep(1)}>
            Continuar <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ---- Paso 1: Elegir mesa ---- */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Resumen de selección */}
          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <span className="text-muted-foreground">Fecha: </span>
            <span className="font-medium capitalize">
              {date ? format(new Date(date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es }) : ''}
            </span>
            {' · '}
            <span className="text-muted-foreground">Hora: </span>
            <span className="font-medium">{selectedSlot?.slot_time.slice(0, 5)}</span>
            {' · '}
            <span className="font-medium">{guests} {guests === 1 ? 'persona' : 'personas'}</span>
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-3">Plano del restaurante</h2>
            {availLoading ? (
              <div className="rounded-xl border bg-muted/20 animate-pulse" style={{ height: '260px' }} />
            ) : (
              <>
                <FloorPlan
                  tables={tablesWithAvailability}
                  selectedId={tableId}
                  guests={guests}
                  onSelect={setTable}
                  backgroundUrl={floorPlanUrl ?? undefined}
                />
                {availableTables.length === 0 && (
                  <div className="rounded-xl border bg-card p-4 text-center space-y-2 mt-3">
                    <p className="text-sm font-medium">No hay mesas disponibles para {guests} {guests === 1 ? 'persona' : 'personas'}</p>
                    <Button variant="outline" size="sm" onClick={() => setStep(0)}>
                      Cambiar fecha u hora
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Atrás</Button>
            <Button className="flex-1" disabled={!step1Valid} onClick={() => setStep(2)}>
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ---- Paso 2: Confirmar ---- */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Resumen completo */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Resumen</h2>
            <dl className="space-y-2 text-sm">
              {[
                {
                  label: 'Fecha',
                  value: date
                    ? format(new Date(date + 'T00:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })
                    : '',
                },
                { label: 'Hora',       value: selectedSlot?.slot_time.slice(0, 5) ?? '' },
                { label: 'Comensales', value: String(guests) },
                {
                  label: 'Mesa',
                  value: selectedTable
                    ? `Mesa #${selectedTable.number} · ${selectedTable.capacity} personas${selectedTable.zone ? ` · ${selectedTable.zone.name}` : ''}`
                    : '',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium capitalize text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Ocasión */}
          <section>
            <p className="text-sm font-semibold mb-2">Ocasión especial <span className="font-normal text-muted-foreground">(opcional)</span></p>
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

          {createReservation.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {createReservation.error instanceof Error
                ? createReservation.error.message
                : 'Error al crear la reserva.'}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
            <Button
              className="flex-1"
              disabled={createReservation.isPending}
              onClick={handleSubmit}
            >
              {createReservation.isPending ? 'Confirmando…' : 'Confirmar reserva'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

