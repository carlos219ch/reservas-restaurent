import { useState } from 'react'
import { format, addDays, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Bell, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWaitlist, useNotifyWaitlist, useRemoveWaitlist } from '@/hooks/useWaitlist'
import type { WaitlistEntry } from '@/types'

// ----------------------------------------------------------------
// WaitlistCard
// ----------------------------------------------------------------
interface CardProps {
  entry: WaitlistEntry
  onNotify: (id: string) => void
  onRemove: (id: string) => void
  notifying: boolean
  removing:  boolean
}

function WaitlistCard({ entry: e, onNotify, onRemove, notifying, removing }: CardProps) {
  const since = formatDistanceToNow(parseISO(e.created_at), { locale: es, addSuffix: true })

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b last:border-0 ${e.notified ? 'opacity-60' : ''}`}>
      {/* Hora preferida */}
      <div className="flex items-center gap-2 sm:w-28 shrink-0">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium tabular-nums">
            {e.time_slot ? e.time_slot.slot_time.slice(0, 5) : 'Sin hora'}
          </p>
          <p className="text-xs text-muted-foreground">{since}</p>
        </div>
      </div>

      {/* Info cliente */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{e.profile?.full_name ?? 'Cliente'}</p>
        <p className="text-xs text-muted-foreground">
          {e.guests} {e.guests === 1 ? 'persona' : 'personas'}
          {e.profile?.phone ? ` · ${e.profile.phone}` : ''}
        </p>
      </div>

      {/* Estado + acciones */}
      <div className="flex items-center gap-2 shrink-0">
        {e.notified ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Notificado
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Esperando
          </span>
        )}

        {!e.notified && (
          <button
            title="Marcar como notificado"
            disabled={notifying}
            onClick={() => onNotify(e.id)}
            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
        )}

        <button
          title="Eliminar de la lista"
          disabled={removing}
          onClick={() => onRemove(e.id)}
          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// WaitlistPage
// ----------------------------------------------------------------
export default function WaitlistPage() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const { data: entries = [], isLoading } = useWaitlist(date)
  const notifyMutation = useNotifyWaitlist()
  const removeMutation = useRemoveWaitlist()

  const pending   = entries.filter(e => !e.notified)
  const notified  = entries.filter(e =>  e.notified)

  const displayDate = format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es })

  function shiftDay(delta: number) {
    setDate(d => format(addDays(parseISO(d), delta), 'yyyy-MM-dd'))
  }

  function renderList(items: WaitlistEntry[]) {
    return items.map(e => (
      <WaitlistCard
        key={e.id}
        entry={e}
        onNotify={id => notifyMutation.mutate(id)}
        onRemove={id => removeMutation.mutate(id)}
        notifying={notifyMutation.isPending && notifyMutation.variables === e.id}
        removing={removeMutation.isPending  && removeMutation.variables  === e.id}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de espera</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{displayDate}</p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            className="h-8 text-xs"
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 animate-pulse">
              <div className="w-28 space-y-1.5 shrink-0">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          No hay nadie en lista de espera para este día.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendientes */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">
                Pendientes
                <span className="ml-2 text-xs font-normal text-muted-foreground">({pending.length})</span>
              </h2>
              <div className="rounded-xl border bg-card px-5">
                {renderList(pending)}
              </div>
            </div>
          )}

          {/* Notificados */}
          {notified.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">
                Notificados
                <span className="ml-2 text-xs font-normal text-muted-foreground">({notified.length})</span>
              </h2>
              <div className="rounded-xl border bg-card px-5">
                {renderList(notified)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
