import { useRef, useState, useCallback, useEffect } from 'react'
import { Move } from 'lucide-react'
import { useAllTables, useUpdateTablePosition } from '@/hooks/useSettings'
import type { Table } from '@/types'

// ── SVG coordinate system (must match reservation FloorPlan.tsx) ──
const VB_W  = 800
const VB_H  = 500
const ROOM  = { x: 20, y: 20, w: VB_W - 40, h: VB_H - 40 }
const INSET = 55

function mx(p: number) { return ROOM.x + INSET + (p / 100) * (ROOM.w - INSET * 2) }
function my(p: number) { return ROOM.y + INSET + (p / 100) * (ROOM.h - INSET * 2) }
function toPercX(svgX: number) {
  return Math.max(0, Math.min(100, (svgX - ROOM.x - INSET) / (ROOM.w - INSET * 2) * 100))
}
function toPercY(svgY: number) {
  return Math.max(0, Math.min(100, (svgY - ROOM.y - INSET) / (ROOM.h - INSET * 2) * 100))
}

const DIMS: Record<string, { hw: number; hh: number }> = {
  round:  { hw: 28, hh: 28 },
  square: { hw: 28, hh: 28 },
  rect:   { hw: 42, hh: 24 },
}

// ── Chairs (same as FloorPlan.tsx) ───────────────────────────────
function Chairs({ shape, capacity, hw, hh, fill }: {
  shape: string; capacity: number; hw: number; hh: number; fill: string
}) {
  const n = Math.min(capacity, 8)
  const CW = 9; const CH = 6; const GAP = 8

  if (shape === 'round') {
    const r = hw + GAP + CH / 2
    return <>
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        return <circle key={i} cx={Math.cos(angle) * r} cy={Math.sin(angle) * r} r={CW / 2 + 1} fill={fill} />
      })}
    </>
  }
  const top = Math.ceil(n / 2); const bot = Math.floor(n / 2)
  return <>
    {Array.from({ length: top }, (_, i) => {
      const x = -hw + (hw * 2 / (top + 1)) * (i + 1)
      return <rect key={`t${i}`} x={x - CW / 2} y={-hh - GAP - CH} width={CW} height={CH} rx={2} fill={fill} />
    })}
    {Array.from({ length: bot }, (_, i) => {
      const x = -hw + (hw * 2 / (bot + 1)) * (i + 1)
      return <rect key={`b${i}`} x={x - CW / 2} y={hh + GAP} width={CW} height={CH} rx={2} fill={fill} />
    })}
  </>
}

// ── Single draggable table ────────────────────────────────────────
function DraggableTable({ table, pos, isDragging, onMouseDown }: {
  table: Table
  pos: { x: number; y: number }
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent, id: string) => void
}) {
  const { hw, hh } = DIMS[table.shape] ?? DIMS.square
  const isRound    = table.shape === 'round'

  const tableFill   = isDragging ? 'hsl(var(--primary) / 0.15)' : '#f8fafc'
  const tableStroke = isDragging ? 'hsl(var(--primary))'        : '#94a3b8'
  const chairFill   = isDragging ? 'hsl(var(--primary) / 0.5)'  : '#94a3b8'
  const textColor   = isDragging ? 'hsl(var(--primary))'        : '#475569'
  const strokeW     = isDragging ? 2.5 : 1.5

  return (
    <g
      transform={`translate(${mx(pos.x)},${my(pos.y)})`}
      onMouseDown={e => onMouseDown(e, table.id)}
      style={{ cursor: 'grab', userSelect: 'none' }}
    >
      <Chairs shape={table.shape} capacity={table.capacity} hw={hw} hh={hh} fill={chairFill} />

      {isRound ? (
        <circle r={hw} fill={tableFill} stroke={tableStroke} strokeWidth={strokeW}
          style={{ filter: isDragging ? 'drop-shadow(0 4px 10px rgba(99,102,241,.4))' : 'none' }} />
      ) : (
        <rect x={-hw} y={-hh} width={hw * 2} height={hh * 2}
          rx={table.shape === 'rect' ? 6 : 8}
          fill={tableFill} stroke={tableStroke} strokeWidth={strokeW}
          style={{ filter: isDragging ? 'drop-shadow(0 4px 10px rgba(99,102,241,.4))' : 'none' }} />
      )}

      <text textAnchor="middle" dominantBaseline="middle"
        y={hh > 22 ? -5 : 0}
        fill={textColor} fontSize={11} fontWeight="700"
        style={{ pointerEvents: 'none' }}>
        T{table.number}
      </text>
      {hh > 18 && (
        <text textAnchor="middle" dominantBaseline="middle"
          y={hh > 22 ? 7 : 0}
          fill={textColor} fontSize={9} opacity={0.65}
          style={{ pointerEvents: 'none' }}>
          {table.capacity}p
        </text>
      )}

      {isDragging && (
        isRound
          ? <circle r={hw + 6} fill="none" stroke="hsl(var(--primary))"
              strokeWidth={1.5} strokeDasharray="4 3" opacity={0.55} />
          : <rect x={-hw - 6} y={-hh - 6} width={(hw + 6) * 2} height={(hh + 6) * 2}
              rx={table.shape === 'rect' ? 10 : 14}
              fill="none" stroke="hsl(var(--primary))"
              strokeWidth={1.5} strokeDasharray="4 3" opacity={0.55} />
      )}
    </g>
  )
}

// ── Main component ────────────────────────────────────────────────
interface Props { zoneId?: string | null }

export default function EditableFloorPlan({ zoneId }: Props) {
  const { data: allTables = [], isLoading } = useAllTables()
  const tables = zoneId === null
    ? allTables.filter(t => !t.zone_id)
    : zoneId
      ? allTables.filter(t => t.zone_id === zoneId)
      : allTables
  const updatePos = useUpdateTablePosition()
  const svgRef    = useRef<SVGSVGElement>(null)

  // Local positions for smooth drag (keyed by table id)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragging,  setDragging]  = useState<{ id: string; offX: number; offY: number } | null>(null)
  const [saving,    setSaving]    = useState<string | null>(null)

  // Sync positions when tables load
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev }
      for (const t of tables) {
        if (!next[t.id]) next[t.id] = { x: t.pos_x, y: t.pos_y }
      }
      return next
    })
  }, [tables])

  // Convert client coords → SVG percentage
  const toSvgPerc = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current
    if (!el) return null
    const rect   = el.getBoundingClientRect()
    const scaleX = VB_W / rect.width
    const scaleY = VB_H / rect.height
    return {
      x: toPercX((clientX - rect.left) * scaleX),
      y: toPercY((clientY - rect.top)  * scaleY),
    }
  }, [])

  function handleTableMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const p = toSvgPerc(e.clientX, e.clientY)
    if (!p) return
    const cur = positions[id] ?? { x: 0, y: 0 }
    setDragging({ id, offX: p.x - cur.x, offY: p.y - cur.y })
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const p = toSvgPerc(e.clientX, e.clientY)
    if (!p) return
    setPositions(prev => ({
      ...prev,
      [dragging.id]: {
        x: Math.max(0, Math.min(100, p.x - dragging.offX)),
        y: Math.max(0, Math.min(100, p.y - dragging.offY)),
      },
    }))
  }

  function handleSvgMouseUp() {
    if (!dragging) return
    const pos = positions[dragging.id]
    if (pos) {
      setSaving(dragging.id)
      updatePos.mutate(
        { id: dragging.id, pos_x: pos.x, pos_y: pos.y },
        { onSettled: () => setSaving(null) }
      )
    }
    setDragging(null)
  }

  if (isLoading) {
    return <div className="rounded-xl border h-64 animate-pulse bg-muted/30" />
  }

  if (!tables.length) {
    return (
      <div className="rounded-xl border h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Move className="h-8 w-8 opacity-20" />
        <p className="text-sm">Primero agregá mesas en la pestaña Mesas</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Move className="h-3.5 w-3.5" />
          Arrastrá las mesas para posicionarlas
        </p>
        {saving && (
          <p className="text-xs text-primary animate-pulse">Guardando…</p>
        )}
      </div>

      <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: '#f1f5f9', cursor: dragging ? 'grabbing' : 'default' }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          {/* Room */}
          <rect x={ROOM.x} y={ROOM.y} width={ROOM.w} height={ROOM.h}
            rx={10} fill="white" stroke="#cbd5e1" strokeWidth={2.5} />
          <rect x={ROOM.x + 5} y={ROOM.y + 5} width={ROOM.w - 10} height={ROOM.h - 10}
            rx={7} fill="none" stroke="#e2e8f0" strokeWidth={1} />

          {tables.map(t => (
            <DraggableTable
              key={t.id}
              table={t}
              pos={positions[t.id] ?? { x: t.pos_x, y: t.pos_y }}
              isDragging={dragging?.id === t.id}
              onMouseDown={handleTableMouseDown}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
