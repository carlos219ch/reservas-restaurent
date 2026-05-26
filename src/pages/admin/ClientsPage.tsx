// src/pages/admin/ClientsPage.tsx
// Listado de clientes con estadísticas y detalle expandible.

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, Search,
  Phone, AlertTriangle, Calendar, CheckCircle2, XCircle,
} from 'lucide-react'
import { useClients, useClientReservations, type ClientSummary } from '@/hooks/useClients'
import type { ReservationStatus } from '@/types'

// ----------------------------------------------------------------
// Status helpers
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
// Detalle del cliente (lazy, solo cuando está expandido)
// ----------------------------------------------------------------
function ClientDetail({ userId }: { userId: string }) {
  const { data: reservations = [], isLoading } = useClientReservations(userId)

  if (isLoading) {
    return (
      <div className="space-y-2 px-4 py-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-8 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!reservations.length) {
    return <p className="text-xs text-muted-foreground px-4 py-3">Sin reservas registradas.</p>
  }

  return (
    <div className="divide-y border-t">
      {reservations.map(r => (
        <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
          <span className="text-muted-foreground capitalize">
            {format(parseISO(r.date), "d 'de' MMM yyyy", { locale: es })}
            {' · '}
            {r.time_slot?.slot_time.slice(0, 5)}
            {r.table ? ` · Mesa #${r.table.number}` : ''}
          </span>
          <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status]}`}>
            {STATUS_LABELS[r.status]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Fila de cliente
// ----------------------------------------------------------------
function ClientRow({ summary: s }: { summary: ClientSummary }) {
  const [expanded, setExpanded] = useState(false)

  const initials = s.profile.full_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="border-b last:border-0">
      <button
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{s.profile.full_name}</p>
          {s.profile.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{s.profile.phone}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{s.totalReservations} reservas</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>{s.completedCount}</span>
          </div>
          {s.noShowCount > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="h-3 w-3" />
              <span>{s.noShowCount}</span>
            </div>
          )}
          {s.noShowRate > 30 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{s.noShowRate}% no-show</span>
            </div>
          )}
          {s.lastVisit && (
            <span className="text-muted-foreground/70 capitalize">
              {format(parseISO(s.lastVisit), "d MMM", { locale: es })}
            </span>
          )}
        </div>

        {/* Chevron */}
        <div className="text-muted-foreground shrink-0 ml-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Panel expandido */}
      {expanded && (
        <div className="bg-muted/20">
          {/* Alergias y preferencias */}
          {(s.profile.allergies?.length || s.profile.preferences) && (
            <div className="px-4 pt-3 pb-2 space-y-1.5 text-xs border-b">
              {s.profile.allergies?.length ? (
                <p className="text-red-600">
                  ⚠️ Alergias: {s.profile.allergies.join(', ')}
                </p>
              ) : null}
              {s.profile.preferences && (
                <p className="text-muted-foreground italic">
                  Preferencias: {s.profile.preferences}
                </p>
              )}
            </div>
          )}
          {/* Historial */}
          <ClientDetail userId={s.profile.id} />
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
type SortKey = 'name' | 'total' | 'noshow' | 'last'

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(a => !a)
    else { setSortBy(key); setSortAsc(key === 'name') }
  }

  const SortBtn = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKey)}
      className={`text-xs font-medium transition-colors ${
        sortBy === sortKey ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label} {sortBy === sortKey ? (sortAsc ? '↑' : '↓') : ''}
    </button>
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let list = term
      ? clients.filter(c =>
          c.profile.full_name.toLowerCase().includes(term) ||
          (c.profile.phone ?? '').includes(term),
        )
      : clients

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name')   cmp = a.profile.full_name.localeCompare(b.profile.full_name)
      if (sortBy === 'total')  cmp = a.totalReservations - b.totalReservations
      if (sortBy === 'noshow') cmp = a.noShowRate - b.noShowRate
      if (sortBy === 'last')   cmp = (a.lastVisit ?? '').localeCompare(b.lastVisit ?? '')
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [clients, search, sortBy, sortAsc])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Historial y estadísticas por cliente.
        </p>
      </div>

      {/* Búsqueda + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <SortBtn label="Nombre"   sortKey="name"   />
          <SortBtn label="Reservas" sortKey="total"  />
          <SortBtn label="No-show"  sortKey="noshow" />
          <SortBtn label="Última"   sortKey="last"   />
        </div>
      </div>

      {/* Resumen */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length === 1 ? '1 cliente' : `${filtered.length} clientes`}
        </p>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-3 w-20 bg-muted rounded hidden sm:block" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          {search ? 'Sin resultados para esa búsqueda.' : 'No hay clientes aún.'}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {filtered.map(s => (
            <ClientRow key={s.profile.id} summary={s} />
          ))}
        </div>
      )}
    </div>
  )
}
