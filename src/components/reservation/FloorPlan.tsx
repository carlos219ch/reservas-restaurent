import { useState } from 'react'
import type { TableWithAvailability } from '@/types'

// ---------------------------------------------------------------
// SVG viewport & room geometry
// ---------------------------------------------------------------
const VB_W  = 800
const VB_H  = 500
const ROOM  = { x: 20, y: 20, w: VB_W - 40, h: VB_H - 40 }
const INSET = 55  // min px from room wall to table center

function mx(pos: number) {
  return ROOM.x + INSET + (pos / 100) * (ROOM.w - INSET * 2)
}
function my(pos: number) {
  return ROOM.y + INSET + (pos / 100) * (ROOM.h - INSET * 2)
}

// ---------------------------------------------------------------
// Table half-dimensions (cx,cy = 0,0)
// ---------------------------------------------------------------
const DIMS: Record<string, { hw: number; hh: number }> = {
  round:  { hw: 28, hh: 28 },
  square: { hw: 28, hh: 28 },
  rect:   { hw: 42, hh: 24 },
}

// ---------------------------------------------------------------
// Chair shapes (SVG, centered on 0,0)
// ---------------------------------------------------------------
function Chairs({
  shape, capacity, hw, hh, fill,
}: {
  shape: string; capacity: number
  hw: number; hh: number; fill: string
}) {
  const n   = Math.min(capacity, 8)
  const CW  = 9    // chair width
  const CH  = 6    // chair height
  const GAP = 8    // gap from table edge to chair near edge

  if (shape === 'round') {
    const r = hw + GAP + CH / 2
    return (
      <>
        {Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2
          const cx = Math.cos(angle) * r
          const cy = Math.sin(angle) * r
          return (
            <circle key={i} cx={cx} cy={cy} r={CW / 2 + 1} fill={fill} />
          )
        })}
      </>
    )
  }

  const top = Math.ceil(n / 2)
  const bot = Math.floor(n / 2)

  return (
    <>
      {Array.from({ length: top }, (_, i) => {
        const x = -hw + (hw * 2 / (top + 1)) * (i + 1)
        return (
          <rect
            key={`t${i}`}
            x={x - CW / 2} y={-hh - GAP - CH}
            width={CW} height={CH} rx={2} fill={fill}
          />
        )
      })}
      {Array.from({ length: bot }, (_, i) => {
        const x = -hw + (hw * 2 / (bot + 1)) * (i + 1)
        return (
          <rect
            key={`b${i}`}
            x={x - CW / 2} y={hh + GAP}
            width={CW} height={CH} rx={2} fill={fill}
          />
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------
// Single table
// ---------------------------------------------------------------
type Status = 'available' | 'occupied' | 'tooSmall' | 'selected'

function getStatus(
  avail: TableWithAvailability['availability'],
  capacity: number, guests: number, selected: boolean,
): Status {
  if (selected)            return 'selected'
  if (avail === 'ocupada') return 'occupied'
  if (capacity < guests)   return 'tooSmall'
  return 'available'
}

interface TableSVGProps {
  table:      TableWithAvailability
  selectedId: string | null
  guests:     number
  onSelect:   (id: string) => void
}

function TableSVG({ table, selectedId, guests, onSelect }: TableSVGProps) {
  const [hovered, setHovered] = useState(false)

  const status     = getStatus(table.availability, table.capacity, guests, selectedId === table.id)
  const selectable = status === 'available'
  const { hw, hh } = DIMS[table.shape] ?? DIMS.square
  const isRound    = table.shape === 'round'

  // Palette
  let tableFill   = '#f8fafc'
  let tableStroke = '#94a3b8'
  let chairFill   = '#94a3b8'
  let textColor   = '#475569'
  let opacity     = 1
  let strokeW     = 1.5

  if (status === 'selected') {
    tableFill   = 'hsl(var(--primary) / 0.12)'
    tableStroke = 'hsl(var(--primary))'
    chairFill   = 'hsl(var(--primary) / 0.45)'
    textColor   = 'hsl(var(--primary))'
    strokeW     = 2.5
  } else if (status === 'occupied') {
    tableFill   = '#fee2e2'
    tableStroke = '#f87171'
    chairFill   = '#fca5a5'
    textColor   = '#dc2626'
  } else if (status === 'tooSmall') {
    opacity = 0.4
  } else if (hovered) {
    tableFill   = '#f0fdf4'
    tableStroke = '#4ade80'
    chairFill   = '#86efac'
    textColor   = '#15803d'
  }

  const tooltip =
    status === 'occupied' ? `Mesa #${table.number} — Ocupada` :
    status === 'tooSmall' ? `Mesa #${table.number} — Capacidad máx. ${table.capacity} personas` :
    status === 'selected' ? `Mesa #${table.number} — Seleccionada ✓` :
    `Mesa #${table.number} · ${table.capacity} personas${table.zone ? ` · ${table.zone.name}` : ''}`

  return (
    <g
      transform={`translate(${mx(table.pos_x)},${my(table.pos_y)})`}
      onClick={selectable ? () => onSelect(table.id) : undefined}
      onMouseEnter={selectable ? () => setHovered(true) : undefined}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor:     selectable ? 'pointer' : status === 'occupied' ? 'not-allowed' : 'default',
        opacity,
        transition: 'opacity .15s',
      }}
    >
      <title>{tooltip}</title>

      {/* Chairs */}
      <Chairs shape={table.shape} capacity={table.capacity} hw={hw} hh={hh} fill={chairFill} />

      {/* Table body */}
      {isRound ? (
        <circle
          r={hw}
          fill={tableFill} stroke={tableStroke} strokeWidth={strokeW}
          style={{ filter: status === 'selected' ? 'drop-shadow(0 2px 6px rgba(99,102,241,.35))' : hovered ? 'drop-shadow(0 2px 6px rgba(74,222,128,.4))' : 'none' }}
        />
      ) : (
        <rect
          x={-hw} y={-hh} width={hw * 2} height={hh * 2}
          rx={table.shape === 'rect' ? 6 : 8}
          fill={tableFill} stroke={tableStroke} strokeWidth={strokeW}
          style={{ filter: status === 'selected' ? 'drop-shadow(0 2px 6px rgba(99,102,241,.35))' : hovered ? 'drop-shadow(0 2px 6px rgba(74,222,128,.4))' : 'none' }}
        />
      )}

      {/* Label */}
      <text
        textAnchor="middle" dominantBaseline="middle"
        y={hh > 22 ? -5 : 0}
        fill={textColor} fontSize={11} fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        T{table.number}
      </text>
      {hh > 18 && (
        <text
          textAnchor="middle" dominantBaseline="middle"
          y={hh > 22 ? 7 : 0}
          fill={textColor} fontSize={9} opacity={0.65}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {table.capacity}p
        </text>
      )}

      {/* Dashed ring when selected */}
      {status === 'selected' && (
        isRound ? (
          <circle r={hw + 6} fill="none"
            stroke="hsl(var(--primary))" strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.55}
          />
        ) : (
          <rect
            x={-hw - 6} y={-hh - 6}
            width={(hw + 6) * 2} height={(hh + 6) * 2}
            rx={table.shape === 'rect' ? 10 : 14}
            fill="none"
            stroke="hsl(var(--primary))" strokeWidth={1.5}
            strokeDasharray="4 3" opacity={0.55}
          />
        )
      )}
    </g>
  )
}

// ---------------------------------------------------------------
// FloorPlan
// ---------------------------------------------------------------
interface Props {
  tables:        TableWithAvailability[]
  selectedId:    string | null
  guests:        number
  onSelect:      (id: string) => void
  backgroundUrl?: string
}

export default function FloorPlan({ tables, selectedId, guests, onSelect, backgroundUrl }: Props) {
  return (
    <div className="space-y-3">
      {/* SVG scales to 100% width, no scroll */}
      <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: '#f1f5f9' }}
        >
          <defs>
            <clipPath id="room-clip">
              <rect x={ROOM.x} y={ROOM.y} width={ROOM.w} height={ROOM.h} rx={10} />
            </clipPath>
          </defs>

          {/* Room floor */}
          <rect
            x={ROOM.x} y={ROOM.y}
            width={ROOM.w} height={ROOM.h}
            rx={10} fill="white"
            stroke="#cbd5e1" strokeWidth={2.5}
          />

          {/* Background floor plan image */}
          {backgroundUrl && (
            <image
              href={backgroundUrl}
              x={ROOM.x} y={ROOM.y}
              width={ROOM.w} height={ROOM.h}
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#room-clip)"
              opacity={0.35}
            />
          )}

          {/* Inner wall line (only when no image) */}
          {!backgroundUrl && (
            <rect
              x={ROOM.x + 5} y={ROOM.y + 5}
              width={ROOM.w - 10} height={ROOM.h - 10}
              rx={7} fill="none"
              stroke="#e2e8f0" strokeWidth={1}
            />
          )}

          {tables.map(t => (
            <TableSVG
              key={t.id}
              table={t}
              selectedId={selectedId}
              guests={guests}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-white border border-slate-300 shrink-0" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-primary/10 border-2 border-primary shrink-0" />
          Seleccionada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-red-100 border border-red-400 shrink-0" />
          Ocupada
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-3 rounded-sm bg-white border border-slate-300 opacity-40 shrink-0" />
          Sin capacidad
        </div>
      </div>
    </div>
  )
}
