import { useState, useRef } from 'react'
import { Clock, LayoutGrid, MapPin, ImagePlus, Trash2, Map, CalendarOff } from 'lucide-react'
import {
  useAllTimeSlots, useToggleTimeSlot,
  useAllTables,    useToggleTable,
  useAllZones,     useToggleZone,
} from '@/hooks/useSettings'
import {
  useFloorPlanImage, useUploadFloorPlan, useRemoveFloorPlan,
} from '@/hooks/useFloorPlanImage'
import { useBlockedDates, useBlockDate, useUnblockDate } from '@/hooks/useBlockedDates'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TimeSlot, Table, Zone } from '@/types'

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
  const toggle = useToggleTimeSlot()

  if (isLoading) return <SectionSkeleton rows={6} />

  return (
    <div className="divide-y rounded-xl border bg-card">
      {data.map((slot: TimeSlot) => (
        <div key={slot.id} className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium tabular-nums">
              {slot.slot_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {slot.active ? 'Activo' : 'Inactivo'}
            </span>
            <Toggle
              active={slot.active}
              disabled={toggle.isPending && toggle.variables?.id === slot.id}
              onChange={active => toggle.mutate({ id: slot.id, active })}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay horarios configurados.
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

function MesasSection() {
  const { data = [], isLoading } = useAllTables()
  const toggle = useToggleTable()

  if (isLoading) return <SectionSkeleton rows={8} />

  return (
    <div className="divide-y rounded-xl border bg-card">
      {data.map((table: Table) => (
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
            <span className="text-xs text-muted-foreground">
              {table.active ? 'Activa' : 'Inactiva'}
            </span>
            <Toggle
              active={table.active}
              disabled={toggle.isPending && toggle.variables?.id === table.id}
              onChange={active => toggle.mutate({ id: table.id, active })}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay mesas configuradas.
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Section: Zonas
// ----------------------------------------------------------------
function ZonasSection() {
  const { data = [], isLoading } = useAllZones()
  const toggle = useToggleZone()

  if (isLoading) return <SectionSkeleton rows={3} />

  return (
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
            <span className="text-xs text-muted-foreground">
              {zone.active ? 'Activa' : 'Inactiva'}
            </span>
            <Toggle
              active={zone.active}
              disabled={toggle.isPending && toggle.variables?.id === zone.id}
              onChange={active => toggle.mutate({ id: zone.id, active })}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay zonas configuradas.
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
  const fileRef                    = useRef<HTMLInputElement>(null)
  const [preview, setPreview]      = useState<string | null>(null)
  const [selected, setSelected]    = useState<File | null>(null)

  const { data: currentUrl, isLoading } = useFloorPlanImage()
  const uploadMutation  = useUploadFloorPlan()
  const removeMutation  = useRemoveFloorPlan()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelected(file)
    setPreview(URL.createObjectURL(file))
  }

  function handleUpload() {
    if (!selected) return
    uploadMutation.mutate(selected, {
      onSuccess: () => {
        setSelected(null)
        setPreview(null)
        if (fileRef.current) fileRef.current.value = ''
      },
    })
  }

  function handleRemove() {
    removeMutation.mutate(undefined, {
      onSuccess: () => {
        setSelected(null)
        setPreview(null)
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* Current floor plan */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Plano actual</span>
        </div>

        {isLoading ? (
          <div className="h-48 animate-pulse bg-muted/30" />
        ) : currentUrl ? (
          <div className="relative">
            <img
              src={currentUrl}
              alt="Plano del restaurante"
              className="w-full max-h-64 object-contain bg-muted/10 p-2"
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={removeMutation.isPending}
              onClick={handleRemove}
              className="absolute top-2 right-2 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {removeMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Map className="h-10 w-10 opacity-20" />
            <p className="text-sm">No hay plano cargado</p>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm font-medium">
          {currentUrl ? 'Reemplazar plano' : 'Subir plano'}
        </p>
        <p className="text-xs text-muted-foreground -mt-2">
          PNG, JPG o WEBP. Se mostrará como fondo en la selección de mesas al reservar.
        </p>

        {/* File input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {preview ? (
          <div className="space-y-3">
            <img
              src={preview}
              alt="Vista previa"
              className="w-full max-h-48 object-contain rounded-lg border bg-muted/10"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPreview(null); setSelected(null) }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={uploadMutation.isPending}
                onClick={handleUpload}
                className="flex-1 gap-1.5"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadMutation.isPending ? 'Subiendo…' : 'Confirmar subida'}
              </Button>
            </div>
            {uploadMutation.isError && (
              <p className="text-xs text-destructive">
                {uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Error al subir'}
              </p>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <ImagePlus className="h-4 w-4" />
            Seleccionar imagen
          </Button>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------
type Tab = 'horarios' | 'mesas' | 'zonas' | 'plano' | 'fechas'

const TABS: { id: Tab; label: string }[] = [
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
  const [tab, setTab] = useState<Tab>('horarios')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Activa o desactiva horarios, mesas y zonas del restaurante.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
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
      {tab === 'horarios' && <HorariosSection />}
      {tab === 'mesas'    && <MesasSection />}
      {tab === 'zonas'    && <ZonasSection />}
      {tab === 'plano'    && <PlanoSection />}
      {tab === 'fechas'   && <FechasSection />}
    </div>
  )
}
