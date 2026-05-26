// src/pages/client/HomePage.tsx
//
// Dashboard del cliente — paleta global via bg-primary / text-primary.
// Carrusel de destacados, widget próxima reserva, acciones rápidas.

import { Link } from 'react-router-dom'
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarPlus, ClipboardList, Clock, Users,
  MapPin, Star, Utensils, ChevronRight, CalendarCheck2, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyReservations } from '@/hooks/useReservations'
import type { Reservation } from '@/types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getNextReservation(reservations: Reservation[]): Reservation | null {
  const today = new Date().toISOString().split('T')[0]
  return (
    reservations
      .filter(r =>
        (r.status === 'pendiente' || r.status === 'confirmada') && r.date >= today,
      )
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date)
        return d !== 0 ? d : (a.time_slot?.slot_time ?? '').localeCompare(b.time_slot?.slot_time ?? '')
      })[0] ?? null
  )
}

function timeUntil(date: string, slotTime: string): string {
  const target = new Date(`${date}T${slotTime}`)
  const now    = new Date()
  const hours  = differenceInHours(target, now)
  const mins   = differenceInMinutes(target, now) % 60
  if (hours < 0)   return ''
  if (hours === 0) return mins > 0 ? `en ${mins} min` : 'ahora mismo'
  if (hours < 24)  return `en ${hours}h ${mins > 0 ? `${mins}m` : ''}`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'mañana'
  if (days < 7)   return `en ${days} días`
  return ''
}

// ----------------------------------------------------------------
// Datos del carrusel — platos / experiencias destacadas
// ----------------------------------------------------------------
const HIGHLIGHTS = [
  {
    id: 1,
    title:  'Chef\'s Table',
    sub:    'Degustación 7 pasos',
    img:    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80',
    badge:  'Exclusivo',
  },
  {
    id: 2,
    title:  'Corte del día',
    sub:    'Carne premium a la parrilla',
    img:    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    badge:  'Hoy',
  },
  {
    id: 3,
    title:  'Pasta artesanal',
    sub:    'Hecha al momento',
    img:    'https://images.unsplash.com/photo-1551183053-bf91798d7542?w=400&q=80',
    badge:  'Favorito',
  },
  {
    id: 4,
    title:  'Cava & Vinos',
    sub:    'Más de 80 etiquetas',
    img:    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80',
    badge:  'Maridaje',
  },
  {
    id: 5,
    title:  'Mesa Romántica',
    sub:    'Ideal para parejas',
    img:    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    badge:  'Popular',
  },
] as const

// ----------------------------------------------------------------
// Widget: próxima reserva — fondo bg-primary
// ----------------------------------------------------------------
function NextReservationWidget({ reservation: r }: { reservation: Reservation }) {
  const time       = r.time_slot?.slot_time.slice(0, 5) ?? ''
  const until      = timeUntil(r.date, r.time_slot?.slot_time ?? '00:00')
  const isConfirmed = r.status === 'confirmada'

  return (
    <Link
      to="/mis-reservas"
      className="block rounded-2xl overflow-hidden relative
                 bg-primary p-5 text-primary-foreground
                 shadow-lg shadow-primary/30
                 hover:shadow-xl hover:shadow-primary/40
                 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Decoración */}
      <div className="absolute -top-8  -right-8  h-32 w-32 rounded-full bg-white/5  pointer-events-none" />
      <div className="absolute -bottom-6 right-14  h-20 w-20 rounded-full bg-white/5  pointer-events-none" />
      <div className="absolute top-1/2  -left-6    h-16 w-16 rounded-full bg-amber-400/10 pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarCheck2 className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Tu próxima reserva
            </p>
          </div>

          <p className="text-2xl font-bold leading-tight capitalize">
            {format(parseISO(r.date), "EEEE d 'de' MMMM", { locale: es })}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm opacity-80">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-300" />{time}
            </span>
            {r.table && (
              <span className="flex items-center gap-1">
                <Utensils className="h-3.5 w-3.5 text-amber-300" />
                Mesa #{r.table.number}
                {r.table.zone?.name ? ` · ${r.table.zone.name}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              {r.guests} {r.guests === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className={[
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
            isConfirmed
              ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30'
              : 'bg-white/10 opacity-90 ring-1 ring-white/20',
          ].join(' ')}>
            {isConfirmed ? '✓ Confirmada' : '⏳ Pendiente'}
          </span>
          {until && (
            <p className="text-xs text-amber-300/70 mt-1.5">{until}</p>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-1 mt-4 text-xs opacity-40">
        <span>Ver detalle</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

// ----------------------------------------------------------------
// Carrusel de destacados
// ----------------------------------------------------------------
function Highlights() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Para esta noche
        </h2>
        <Link
          to="/reservar"
          className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
        >
          Reservar <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Scroll horizontal sin scrollbar */}
      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {HIGHLIGHTS.map(item => (
          <Link
            to="/reservar"
            key={item.id}
            className="group shrink-0 w-40 rounded-2xl overflow-hidden relative
                       shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
          >
            <div className="h-48 relative">
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover
                           group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Overlay degradado */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Badge */}
              <div className="absolute top-2.5 left-2.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                                 bg-primary text-primary-foreground">
                  {item.badge}
                </span>
              </div>

              {/* Texto */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-xs font-semibold leading-tight">{item.title}</p>
                <p className="text-white/65 text-[10px] mt-0.5 leading-tight">{item.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ----------------------------------------------------------------
// Skeleton
// ----------------------------------------------------------------
function CardSkeleton() {
  return <div className="rounded-2xl border bg-card h-32 animate-pulse" />
}

// ----------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------
export default function HomePage() {
  const { profile }                            = useAuth()
  const { data: reservations = [], isLoading } = useMyReservations()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'bienvenido'
  const nextRes   = isLoading ? null : getNextReservation(reservations)

  return (
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-background">

      {/* ── Hero ─────────────────────────────────────── */}
      <div className="relative h-64 sm:h-72 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80"
          alt="Restaurante"
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Overlay usa el color primario con opacity para cohesión */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/50 to-primary/10" />
        <div className="absolute bottom-0 left-0 right-0 h-20
                        bg-gradient-to-t from-[#F7F8F6] dark:from-background to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 pb-10">
          <p className="text-primary-foreground/60 text-sm font-medium tracking-wide">
            {getGreeting()} 👋
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">
            Hola, {firstName}
          </h1>
          <p className="text-amber-300/90 text-base sm:text-lg italic font-serif mt-1.5">
            ¿Qué se te antoja hoy?
          </p>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────── */}
      <div className="px-4 pb-10 max-w-2xl mx-auto space-y-7 -mt-1">

        {/* Widget próxima reserva */}
        {isLoading ? (
          <div className="rounded-2xl h-36 animate-pulse bg-primary/10" />
        ) : nextRes ? (
          <NextReservationWidget reservation={nextRes} />
        ) : null}

        {/* ── Acciones rápidas ── */}
        <section>
          <h2 className="text-[11px] font-semibold text-muted-foreground
                         uppercase tracking-widest mb-3 px-0.5">
            Acciones rápidas
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">

              {/* Nueva reserva */}
              <Link
                to="/reservar"
                className="group rounded-2xl border bg-card p-5 space-y-3
                           shadow-sm hover:shadow-md hover:shadow-black/8
                           hover:-translate-y-1 transition-all duration-200"
              >
                <div className="h-11 w-11 rounded-xl
                                bg-primary/10 dark:bg-amber-950/30
                                flex items-center justify-center
                                group-hover:bg-primary/15 dark:group-hover:bg-amber-950/50
                                group-hover:scale-110 transition-all duration-200">
                  <CalendarPlus className="h-5 w-5 text-primary dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Nueva reserva</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Elegí fecha, hora y mesa
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary dark:text-amber-400 font-medium">
                  <span>Reservar ahora</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              {/* Mis reservas — acento dorado */}
              <Link
                to="/mis-reservas"
                className="group rounded-2xl border bg-card p-5 space-y-3
                           shadow-sm hover:shadow-md hover:shadow-black/8
                           hover:-translate-y-1 transition-all duration-200"
              >
                <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/30
                                flex items-center justify-center
                                group-hover:bg-amber-100 dark:group-hover:bg-amber-950/50
                                group-hover:scale-110 transition-all duration-200">
                  <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Mis reservas</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Consultá, modificá o cancelá
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <span>Ver historial</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* ── Carrusel de destacados ── */}
        <Highlights />

        {/* ── Tarjeta del restaurante ── */}
        <section className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="relative h-32 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"
              alt="Interior del restaurante"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-bold text-lg text-white leading-tight">
                Mesa Fácil Restaurante
              </p>
              <div className="flex items-center gap-1 text-amber-300/80 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-[11px]">Buenos Aires, Argentina</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x">
            {[
              { icon: Clock, label: 'Horario',    value: '12:00 – 23:30' },
              { icon: Star,  label: 'Valoración', value: '4.8 ★' },
              { icon: Users, label: 'Capacidad',  value: '80 personas' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center py-4 px-2 text-center">
                <Icon className="h-4 w-4 text-primary mb-1.5" />
                <p className="text-xs font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tip IA — solo si no hay próxima reserva */}
        {!isLoading && !nextRes && (
          <div className="rounded-2xl border border-primary/20
                          bg-primary/5 p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary
                            flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                Probá el Asistente IA
              </p>
              <p className="text-xs text-primary/60 mt-0.5 leading-relaxed">
                Tocá el botón azul en la esquina — decile qué necesitás y la IA te reserva en segundos.
              </p>
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}
