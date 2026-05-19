import { useState } from 'react'
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isBefore, isToday, isSameDay, getDay, startOfToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  value: string | null
  onChange: (date: string) => void
  blockedDates?: string[]
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

export default function DatePicker({ value, onChange, blockedDates = [] }: DatePickerProps) {
  const today = startOfToday()
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today))

  const selectedDate = value ? new Date(value + 'T00:00:00') : null
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })

  // Convierte domingo=0 a lunes=0 para alinear con WEEKDAYS
  const startPadding = (getDay(startOfMonth(viewMonth)) + 6) % 7

  const canGoPrev = !isBefore(subMonths(viewMonth, 1), startOfMonth(today))

  return (
    <div className="w-full select-none">
      {/* Cabecera del mes */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(day => {
          const dayStr    = format(day, 'yyyy-MM-dd')
          const isPast    = isBefore(day, today)
          const isBlocked = blockedDates.includes(dayStr)
          const isDisabled = isPast || isBlocked
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isTodayDay = isToday(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              title={isBlocked ? 'Fecha no disponible' : undefined}
              onClick={() => !isDisabled && onChange(dayStr)}
              disabled={isDisabled}
              className={[
                'aspect-square flex items-center justify-center text-sm rounded-lg transition-colors',
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted',
                isPast    ? 'text-muted-foreground/40' : '',
                isBlocked && !isSelected ? 'bg-destructive/10 text-destructive line-through' : '',
                isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-medium' : '',
                isTodayDay && !isSelected ? 'font-semibold text-primary' : '',
              ].join(' ')}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
