import { useState, useRef, useEffect } from 'react'
import { Clock, LayoutGrid, MapPin, ImagePlus, Trash2, Map, CalendarOff, Store, Loader2 } from 'lucide-react'
import {
  useAllTimeSlots,  useToggleTimeSlot,  useCreateTimeSlot, useDeleteTimeSlot,
  useAllTables,     useToggleTable,     useCreateTable,    useDeleteTable,
  useAllZones,      useToggleZone,      useCreateZone,     useDeleteZone,
} from '@/hooks/useSettings'
import EditableFloorPlan from '@/components/admin/EditableFloorPlan'
import { useBlockedDates, useBlockDate, useUnblockDate } from '@/hooks/useBlockedDates'
import { useMyRestaurant, useUpdateRestaurant, useUploadRestaurantCover } from '@/hooks/useRestaurants'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TimeSlot, Table, Zone, TableShape } from '@/types'

const CUISINE_OPTIONS = [
  'Argentina', 'Italiana', 'Japonesa', 'Mediterránea', 'Mexicana',
  'Peruana', 'Española', 'Francesa', 'Americana', 'Asiática', 'Vegana', 'Otra',
]

// ----------------------------------------------------------------
// Toggle switch
// ----------------------------------------------------------------
interface ToggleProps {
  active: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}

function Toggle({ active, disabled, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active ? 'bg-primary' : 'bg-muted-foreground/30',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          active ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

// ----------------------------------------------------------------
// Section: Horarios
// ----------------------------------------------------------------
function HorariosSection() {
  const { data = [], isLoading } = useAllTimeSlots()
  const toggle  = useToggleTimeSlot()
  const create  = useCreateTimeSlot()
  const destroy = useDeleteTimeSlot()
  const [newTime, setNewTime] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTime) return
    create.mutate(newTime, { onSuccess: () => setNewTime('') })
  }

  if (isLoading) return <SectionSkeleton rows={6} />

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-xl border bg-card">
        {data.map((slot: TimeSlot) => (
          <div key={slot.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium tabular-nums">{slot.slot_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{slot.active ? 'Activo' : 'Inactivo'}</span>
              <Toggle
                active={slot.active}
                disabled={toggle.isPending && toggle.variables?.id === slot.id}
                onChange={active => toggle.mutate({ id: slot.id, active })}
              />
              <button
                onClick={() => destroy.mutate(slot.id)}
                disabled={destroy.isPending && destroy.variables === slot.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Eliminar horario"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay horarios. Agregá el primero abajo.
          </p>
        )}
      </div>

      {/* Agregar horario */}
      <form onSubmit={handleAdd} className="flex gap-2 items-center">
        <input
          type="time"
          value={newTime}
          onChange={e => setNewTime(e.target.value)}
          required
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border-input"
        />
        <Button type="submit" size="sm" disabled={create.isPending || !newTime} className="gap-1.5 shrink-0">
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '+'}
          Agregar
        </Button>
      </form>
      {create.isError && (
        <p className="text-xs text-destructive">
          {create.error instanceof Error ? create.error.message : 'Error al crear'}
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Section: Mesas
// ----------------------------------------------------------------
const SHAPE_LABELS: Record<string, string> = {
  round:  'Redonda',
  square: 'Cuadrada',
  rect:   'Rectangular',
}

const SHAPE_OPTIONS: TableShape[] = ['round', 'square', 'rect']

function MesasSection() {
  const { data: tables = [], isLoading } = useAllTables()
  const { data: zones  = [] }            = useAllZones()
  const toggle  = useToggleTable()
  const create  = useCreateTable()
  const destroy = useDeleteTable()

  const [num,      setNum]      = useState('')
  const [capacity, setCapacity] = useState('2')
  const [shape,    setShape]    = useState<TableShape>('square')
  const [zoneId,   setZoneId]   = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!num || !capacity) return
    create.mutate(
      { number: Number(num), capacity: Number(capacity), shape, zone_id: zoneId || null },
      { onSuccess: () => { setNum(''); setCapacity('2'); setShape('square'); setZoneId('') } }
    )
  }

  if (isLoading) return <SectionSkeleton rows={8} />

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-xl border bg-card">
        {tables.map((table: Table) => (
          <div key={table.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Mesa #{table.number}</p>
                <p className="text-xs text-muted-foreground">
                  {table.capacity} personas · {SHAPE_LABELS[table.shape] ?? table.shape}
                  {table.zone ? ` · ${table.zone.name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{table.active ? 'Activa' : 'Inactiva'}</span>
              <Toggle
                active={table.active}
                disabled={toggle.isPending && toggle.variables?.id === table.id}
                onChange={active => toggle.mutate({ id: table.id, active })}
              />
              <button
                onClick={() => destroy.mutate(table.id)}
                disabled={destroy.isPending && destroy.variables === table.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Eliminar mesa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {tables.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay mesas. Agregá la primera abajo.
          </p>
        )}
      </div>

      {/* Agregar mesa */}
      <form onSubmit={handleAdd} className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">Agregar mesa</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">N° de mesa</label>
            <input type="number" min="1" value={num} onChange={e => setNum(e.target.value)} required
              className={fieldCls} placeholder="1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Capacidad</label>
            <input type="number" min="1" max="30" value={capacity} onChange={e => setCapacity(e.target.value)} required
              className={fieldCls} placeholder="4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Forma</label>
            <select value={shape} onChange={e => setShape(e.target.value as TableShape)} className={fieldCls}>
              {SHAPE_OPTIONS.map(s => <option key={s} value={s}>{SHAPE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Zona (opcional)</label>
            <select value={zoneId} onChange={e => setZoneId(e.target.value)} className={fieldCls}>
              <option value="">Sin zona</option>
              {zones.map((z: Zone) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={create.isPending || !num} className="gap-1.5">
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '+'}
          Agregar mesa
        </Button>
        {create.isError && (
          <p className="text-xs text-destructive">
            {create.error instanceof Error ? create.error.message : 'Error al crear'}
          </p>
        )}
      </form>
    </div>
  )
}

const fieldCls = 'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border-input mt-1'

// ----------------------------------------------------------------
// Section: Zonas
// ----------------------------------------------------------------
function ZonasSection() {
  const { data = [], isLoading } = useAllZones()
  const toggle  = useToggleZone()
  const create  = useCreateZone()
  const destroy = useDeleteZone()
  const [zoneName, setZoneName] = useState('')
  const [zoneDesc, setZoneDesc] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!zoneName.trim()) return
    create.mutate(
      { name: zoneName.trim(), description: zoneDesc.trim() || undefined },
      { onSuccess: () => { setZoneName(''); setZoneDesc('') } }
    )
  }

  if (isLoading) return <SectionSkeleton rows={3} />

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-xl border bg-card">
        {data.map((zone: Zone) => (
          <div key={zone.id} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{zone.name}</p>
                {zone.description && (
                  <p className="text-xs text-muted-foreground">{zone.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{zone.active ? 'Activa' : 'Inactiva'}</span>
              <Toggle
                active={zone.active}
                disabled={toggle.isPending && toggle.variables?.id === zone.id}
                onChange={active => toggle.mutate({ id: zone.id, active })}
              />
              <button
                onClick={() => destroy.mutate(zone.id)}
                disabled={destroy.isPending && destroy.variables === zone.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Eliminar zona"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay zonas. Agregá la primera abajo.
          </p>
        )}
      </div>

      {/* Agregar zona */}
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Nombre de la zona</label>
          <input
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            placeholder="Salón principal, Terraza…"
            required
            className={fieldCls}
          />
        </div>
        <Button type="submit" size="sm" disabled={create.isPending || !zoneName.trim()} className="gap-1.5 shrink-0 mb-0.5">
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '+'}
          Agregar
        </Button>
      </form>
      {create.isError && (
        <p className="text-xs text-destructive">
          {create.error instanceof Error ? create.error.message : 'Error al crear'}
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Section: Fechas bloqueadas
// ----------------------------------------------------------------
function FechasSection() {
  const [date, setDate]     = useState('')
  const [reason, setReason] = useState('')

  const { data = [], isLoading } = useBlockedDates()
  const blockMutation   = useBlockDate()
  const unblockMutation = useUnblockDate()

  const today = new Date().toISOString().slice(0, 10)

  function handleBlock() {
    if (!date) return
    blockMutation.mutate({ date, reason: reason.trim() || undefined }, {
      onSuccess: () => { setDate(''); setReason('') },
    })
  }

  return (
    <div className="space-y-5">
      {/* Formulario para agregar */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm font-medium">Bloquear fecha</p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="flex-1 min-w-40 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            size="sm"
            disabled={!date || blockMutation.isPending}
            onClick={handleBlock}
            className="gap-2"
          >
            <CalendarOff className="h-4 w-4" />
            {blockMutation.isPending ? 'Bloqueando…' : 'Bloquear'}
          </Button>
        </div>
        {blockMutation.isError && (
          <p className="text-xs text-destructive">
            {blockMutation.error instanceof Error ? blockMutation.error.message : 'Error al bloquear'}
          </p>
        )}
      </div>

      {/* Lista de fechas bloqueadas */}
      <div className="divide-y rounded-xl border bg-card">
        {isLoading ? (
          <SectionSkeleton rows={3} />
        ) : data.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay fechas bloqueadas.
          </p>
        ) : (
          data.map(entry => (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <CalendarOff className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium capitalize">
                    {format(parseISO(entry.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground">{entry.reason}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={unblockMutation.isPending && unblockMutation.variables === entry.id}
                onClick={() => unblockMutation.mutate(entry.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Skeleton
// ----------------------------------------------------------------
function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="h-5 w-9 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Section: Plano
// ----------------------------------------------------------------
function PlanoSection() {
  const { data: zones = [], isLoading } = useAllZones()
  const [activeZone, setActiveZone] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (zones.length && activeZone === undefined) {
      setActiveZone(zones[0]?.id ?? '__none__')
    }
  }, [zones, activeZone])

  const tabs = [
    ...zones.map(z => ({ id: z.id, label: z.name })),
    { id: '__none__', label: 'Sin zona' },
  ]

  const zoneIdForPlan: string | null | undefined = activeZone === '__none__' ? null : activeZone

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center gap-2">
        <Map className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Plano del restaurante</span>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse bg-muted/30" />
      ) : (
        <div className="p-4 space-y-4">
          {/* Zone tabs */}
          {tabs.length > 1 && (
            <div className="flex gap-1.5 p-1 bg-muted rounded-xl overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveZone(tab.id)}
                  className={[
                    'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
                    activeZone === tab.id
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <EditableFloorPlan zoneId={zoneIdForPlan} />
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Section: Perfil del restaurante
// ----------------------------------------------------------------
function PerfilSection() {
  const { restaurantId }            = useAuth()
  const { data: restaurant, isLoading } = useMyRestaurant(restaurantId)
  const updateMutation  = useUpdateRestaurant()
  const coverMutation   = useUploadRestaurantCover()
  const fileRef         = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile,    setCoverFile]    = useState<File | null>(null)
  const [saved,        setSaved]        = useState(false)

  const [form, setForm] = useState({
    name:         '',
    description:  '',
    cuisine_type: '',
    address:      '',
    city:         '',
    zone:         '',
    phone:        '',
    email:        '',
    website:      '',
    price_range:  2,
  })

  // Sincronizar form con datos cargados
  const [synced, setSynced] = useState(false)
  if (restaurant && !synced) {
    setForm({
      name:         restaurant.name         ?? '',
      description:  restaurant.description  ?? '',
      cuisine_type: restaurant.cuisine_type ?? '',
      address:      restaurant.address      ?? '',
      city:         restaurant.city         ?? '',
      zone:         restaurant.zone         ?? '',
      phone:        restaurant.phone        ?? '',
      email:        restaurant.email        ?? '',
      website:      restaurant.website      ?? '',
      price_range:  restaurant.price_range  ?? 2,
    })
    setSynced(true)
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!restaurantId) return

    await updateMutation.mutateAsync({
      id:           restaurantId,
      name:         form.name.trim(),
      description:  form.description.trim() || null,
      cuisine_type: form.cuisine_type || null,
      address:      form.address.trim()      || null,
      city:         form.city.trim(),
      zone:         form.zone.trim()         || null,
      phone:        form.phone.trim()        || null,
      email:        form.email.trim()        || null,
      website:      form.website.trim()      || null,
      price_range:  form.price_range as 1 | 2 | 3 | 4,
    })

    if (coverFile) {
      await coverMutation.mutateAsync({ file: coverFile, restaurantId })
      setCoverFile(null)
      setCoverPreview(null)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) return <SectionSkeleton rows={5} />

  const isPending = updateMutation.isPending || coverMutation.isPending

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">

      {/* Foto de portada */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Foto de portada</h3>

        {/* Preview actual o nueva */}
        <div className="relative h-40 rounded-lg overflow-hidden bg-muted">
          {coverPreview ? (
            <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : restaurant?.cover_image_url ? (
            <img src={restaurant.cover_image_url} alt="Portada actual" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
            <ImagePlus className="h-4 w-4" />
            {coverPreview ? 'Cambiar imagen' : 'Subir foto'}
          </Button>
          {coverPreview && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setCoverPreview(null); setCoverFile(null) }}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Datos del restaurante */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Información general</h3>

        <Field label="Nombre *">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className={inputCls} required />
        </Field>

        <Field label="Descripción">
          <textarea value={form.description} rows={3}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className={`${inputCls} resize-none`} />
        </Field>

        <Field label="Tipo de cocina">
          <select value={form.cuisine_type} onChange={e => setForm(p => ({ ...p, cuisine_type: e.target.value }))}
            className={inputCls}>
            <option value="">Sin especificar</option>
            {CUISINE_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ciudad *">
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className={inputCls} required />
          </Field>
          <Field label="Barrio / Zona">
            <input value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
              placeholder="Palermo…" className={inputCls} />
          </Field>
        </div>

        <Field label="Dirección">
          <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            placeholder="Av. Corrientes 1234" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+54 11…" className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={inputCls} />
          </Field>
        </div>

        <Field label="Sitio web">
          <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
            placeholder="https://…" className={inputCls} />
        </Field>

        <Field label="Rango de precios">
          <div className="flex gap-2">
            {([1, 2, 3, 4] as const).map(n => (
              <button key={n} type="button"
                onClick={() => setForm(p => ({ ...p, price_range: n }))}
                className={[
                  'flex-1 py-2 rounded-lg border text-sm font-bold transition-colors',
                  form.price_range === n ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                ].join(' ')}>
                {'$'.repeat(n)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
        {(updateMutation.isError || coverMutation.isError) && (
          <span className="text-sm text-destructive">Error al guardar</span>
        )}
      </div>
    </form>
  )
}

const inputCls = 'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring border-input'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// ----------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------
type Tab = 'perfil' | 'horarios' | 'mesas' | 'zonas' | 'plano' | 'fechas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil',   label: 'Perfil'   },
  { id: 'horarios', label: 'Horarios' },
  { id: 'mesas',    label: 'Mesas'    },
  { id: 'zonas',    label: 'Zonas'    },
  { id: 'plano',    label: 'Plano'    },
  { id: 'fechas',   label: 'Fechas'   },
]

// ----------------------------------------------------------------
// SettingsPage
// ----------------------------------------------------------------
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('perfil')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configurá el perfil, horarios, mesas y zonas del restaurante.
        </p>
      </div>

      {/* Tab bar — scroll horizontal en mobile */}
      <div
        className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit max-w-full overflow-x-auto"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'perfil'   && <PerfilSection />}
      {tab === 'horarios' && <HorariosSection />}
      {tab === 'mesas'    && <MesasSection />}
      {tab === 'zonas'    && <ZonasSection />}
      {tab === 'plano'    && <PlanoSection />}
      {tab === 'fechas'   && <FechasSection />}
    </div>
  )
}
