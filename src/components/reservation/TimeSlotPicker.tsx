import type { TimeSlot } from '@/types'

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  value: string | null
  onChange: (id: string) => void
  loading?: boolean
}

// "13:00:00" → "13:00"
function formatTime(slotTime: string): string {
  return slotTime.slice(0, 5)
}

export default function TimeSlotPicker({ slots, value, onChange, loading }: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!slots.length) {
    return <p className="text-sm text-muted-foreground">No hay horarios disponibles.</p>
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map(slot => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onChange(slot.id)}
          className={[
            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            value === slot.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border hover:bg-muted',
          ].join(' ')}
        >
          {formatTime(slot.slot_time)}
        </button>
      ))}
    </div>
  )
}
