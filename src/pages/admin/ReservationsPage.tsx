import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, X, CheckCircle2, XCircle, Clock3, Ban, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminReservations, useUpdateReservation } from '@/hooks/useReservations'
import ReservationDetailDrawer from '@/components/admin/ReservationDetailDrawer'
import { exportReservationsToCSV } from '@/lib/exportCSV'
import type { Reservation, ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: ReservationStatus | 'todas'; label: string }[] = [
  { value: 'todas',      label: 'Todos los estados' },
  { value: 'pendiente',  label: 'Pendiente'         },
  { value: 'confirmada', label: 'Confirmada'        },
  { value: 'completada', label: 'Completada'        },
  { value: 'no_show',    label: 'No show'           },
  { value: 'cancelada',  label: 'Cancelada'         },
]

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
// ReservationRow
// ----------------------------------------------------------------
interface RowProps {
  r: Reservation
  onUpdate: (id: string, status: ReservationStatus) => void
  updating: boolean
}

function ReservationRow({ r, onUpdate, updating }: RowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b last:border-0">
      {/* Fecha + hora */}
      <div className="sm:w-28 shrink-0">
        <p className="text-sm font-semibold tabular-nums">
          {format(parseISO(r.date), 'd MMM yyyy', { locale: es })}
        </p>
        <p className="text-xs text-muted-foreground">
          {r.time_slot?.slot_time.slice(0, 5) ?? '—'} · Mesa #{r.table?.number}
        </p>
      </div>

      {/* Cliente */}
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

      {/* Estado + acciones */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
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
              title="No show"
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
// ReservationsPage
// ----------------------------------------------------------------
export default function ReservationsPage() {
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState<ReservationStatus | 'todas'>('todas')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState<Reservation | null>(null)

  const { data: all = [], isLoading } = useAdminReservations({ status, dateFrom, dateTo })
  const updateMutation = useUpdateReservation()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter(r =>
      r.profile?.full_name?.toLowerCase().includes(term) ?? false
    )
  }, [all, search])

  const total     = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const items     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, status, dateFrom, dateTo])

  const hasFilters = search || status !== 'todas' || dateFrom || dateTo

  function clearFilters() {
    setSearch('')
    setStatus('todas')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <>
    {selected && (
      <ReservationDetailDrawer
        reservation={selected}
        onClose={() => setSelected(null)}
      />
    )}
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Historial completo con filtros y acciones rápidas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          disabled={filtered.length === 0}
          onClick={() => {
            const ts = format(new Date(), 'yyyyMMdd-HHmm')
            exportReservationsToCSV(filtered, `reservas-${ts}.csv`)
          }}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as ReservationStatus | 'todas')}
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {/* Date to */}
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 h-9">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 animate-pulse">
              <div className="space-y-1.5 w-24 shrink-0">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
              <div className="h-5 w-20 bg-muted rounded-full self-center" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          {hasFilters ? 'Ninguna reserva coincide con los filtros.' : 'No hay reservas aún.'}
        </div>
      ) : (
        <>
          {/* Summary */}
          <p className="text-xs text-muted-foreground">
            {total === 1 ? '1 reserva' : `${total} reservas`}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </p>

          {/* List */}
          <div className="rounded-xl border bg-card px-5">
            {items.map(r => (
              <div
                key={r.id}
                className="cursor-pointer hover:bg-muted/30 -mx-5 px-5 rounded-lg transition-colors"
                onClick={(e) => {
                  // No abrir el drawer si hicieron click en un botón de acción
                  if ((e.target as HTMLElement).closest('button')) return
                  setSelected(r)
                }}
              >
                <ReservationRow
                  r={r}
                  onUpdate={(id, s) => updateMutation.mutate({ id, status: s })}
                  updating={updateMutation.isPending && updateMutation.variables?.id === r.id}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  )
}
