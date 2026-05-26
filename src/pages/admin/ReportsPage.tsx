// src/pages/admin/ReportsPage.tsx
//
// Dashboard analítico con gráficas de ocupación, estados, ocasiones,
// tasa de no-shows y horarios pico para el panel de administración.

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import {
  TrendingUp, Users, CheckCircle2, XCircle, CalendarDays,
} from 'lucide-react'
import {
  useReservationsByDay,
  useReservationsByStatus,
  useReservationsByOccasion,
  useNoShowRate,
  useTopHours,
  useReportKPIs,
} from '@/hooks/useReports'

// ----------------------------------------------------------------
// Selector de período
// ----------------------------------------------------------------
const PERIODS = [
  { label: '7 días',   days: 7   },
  { label: '30 días',  days: 30  },
  { label: '90 días',  days: 90  },
  { label: '6 meses',  days: 180 },
] as const

// ----------------------------------------------------------------
// Card KPI
// ----------------------------------------------------------------
interface KpiCardProps {
  label: string
  value: string | number
  sub?:  string
  icon:  React.ReactNode
  color: string
}

function KpiCard({ label, value, sub, icon, color }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Skeleton de gráfica
// ----------------------------------------------------------------
function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-lg bg-muted/30 animate-pulse"
      style={{ height }}
    />
  )
}

// ----------------------------------------------------------------
// Tooltip personalizado
// ----------------------------------------------------------------
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background shadow-md px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-medium tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
export default function ReportsPage() {
  const [days, setDays] = useState(30)

  const kpisQuery     = useReportKPIs(days)
  const dailyQuery    = useReservationsByDay(days)
  const statusQuery   = useReservationsByStatus(days)
  const occasionQuery = useReservationsByOccasion(days)
  const noShowQuery   = useNoShowRate(Math.ceil(days / 7))
  const hoursQuery    = useTopHours(days)

  const kpis = kpisQuery.data

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análisis de ocupación, tendencias y comportamiento de clientes.
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                days === p.days
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- KPIs ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 h-24 animate-pulse bg-muted/30" />
          ))
        ) : kpis ? (
          <>
            <KpiCard
              label="Reservas totales"
              value={kpis.totalReservations}
              sub={`últimos ${days} días`}
              icon={<CalendarDays className="h-4 w-4 text-blue-600" />}
              color="bg-blue-50"
            />
            <KpiCard
              label="Completadas"
              value={`${kpis.completedRate}%`}
              sub="del total activo"
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              color="bg-green-50"
            />
            <KpiCard
              label="Tasa no-show"
              value={`${kpis.noShowRate}%`}
              sub="reservas confirmadas"
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              color="bg-red-50"
            />
            <KpiCard
              label="Prom. comensales"
              value={kpis.avgGuestsPerTable}
              sub="personas por reserva"
              icon={<Users className="h-4 w-4 text-violet-600" />}
              color="bg-violet-50"
            />
          </>
        ) : null}
      </div>

      {/* ---- Fila 1: Reservas por día + Estados ---- */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Reservas por día */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">Reservas por día</h2>
            <p className="text-xs text-muted-foreground">
              Azul = reservas activas · Rojo = no-shows
            </p>
          </div>
          {dailyQuery.isLoading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyQuery.data} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor((dailyQuery.data?.length ?? 7) / 7)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="total"   name="Reservas" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="noShows" name="No-shows" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución por estado */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">Distribución por estado</h2>
            <p className="text-xs text-muted-foreground">Últimos {days} días</p>
          </div>
          {statusQuery.isLoading ? (
            <ChartSkeleton height={220} />
          ) : !statusQuery.data?.length ? (
            <div className="flex items-center justify-center h-52 text-xs text-muted-foreground">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusQuery.data}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
                  {statusQuery.data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: 'hsl(var(--foreground))' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- Fila 2: No-show rate + Horarios pico ---- */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Tasa de no-show por semana */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tasa de no-show semanal
            </h2>
            <p className="text-xs text-muted-foreground">% sobre reservas completadas/no-show</p>
          </div>
          {noShowQuery.isLoading ? (
            <ChartSkeleton height={200} />
          ) : !noShowQuery.data?.length ? (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
              Sin datos suficientes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={noShowQuery.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                  width={36}
                />
                <Tooltip
                  formatter={(v) => [`${v ?? 0}%`, 'No-show'] as [string, string]}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="No-show"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Horarios pico */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm">Horarios pico</h2>
            <p className="text-xs text-muted-foreground">Reservas por franja horaria</p>
          </div>
          {hoursQuery.isLoading ? (
            <ChartSkeleton height={200} />
          ) : !hoursQuery.data?.length ? (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hoursQuery.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="time"
                  type="category"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="count" name="Reservas" fill="#8b5cf6" radius={[0, 3, 3, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- Fila 3: Reservas por ocasión ---- */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">Reservas por ocasión</h2>
          <p className="text-xs text-muted-foreground">
            Excluyendo canceladas · últimos {days} días
          </p>
        </div>
        {occasionQuery.isLoading ? (
          <ChartSkeleton height={160} />
        ) : !occasionQuery.data?.length ? (
          <div className="flex items-center justify-center h-36 text-xs text-muted-foreground">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={occasionQuery.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="occasion"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="count" name="Reservas" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
