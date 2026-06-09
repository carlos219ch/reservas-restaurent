import { useState, useRef, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Search, MapPin, Star, UtensilsCrossed, ChevronRight, ChevronLeft,
  CalendarPlus, ClipboardList, Clock,
  Users, CalendarCheck2, Sparkles, Flame, Quote, BadgeCheck,
} from 'lucide-react'
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRestaurants, useRestaurantCuisines, usePopularRestaurantsToday, useNewRestaurants } from '@/hooks/useRestaurants'
import { useWeeklyMenuHighlights } from '@/hooks/useMenuItems'
import { useRecentPublicReviews } from '@/hooks/useReviews'
import { useMyReservations } from '@/hooks/useReservations'
import { useAuth } from '@/hooks/useAuth'
import { useRestaurantContextStore } from '@/store/restaurantContextStore'
import AppNavbar from '@/components/layout/AppNavbar'
import ChatFAB from '@/components/chat/ChatFAB'
import type { Restaurant, Reservation } from '@/types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function priceLabel(range: number) { return '$'.repeat(range) }
function ratingStars(rating: number) { return rating.toFixed(1) }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getNextReservation(reservations: Reservation[]): Reservation | null {
  const today = new Date().toISOString().split('T')[0]
  return reservations
    .filter(r => (r.status === 'pendiente' || r.status === 'confirmada') && r.date >= today)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date)
      return d !== 0 ? d : (a.time_slot?.slot_time ?? '').localeCompare(b.time_slot?.slot_time ?? '')
    })[0] ?? null
}

function timeUntil(date: string, slotTime: string): string {
  const target = new Date(`${date}T${slotTime}`)
  const hours  = differenceInHours(target, new Date())
  const mins   = differenceInMinutes(target, new Date()) % 60
  if (hours < 0)   return ''
  if (hours === 0) return mins > 0 ? `en ${mins} min` : 'ahora mismo'
  if (hours < 24)  return `en ${hours}h ${mins > 0 ? `${mins}m` : ''}`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'mañana' : days < 7 ? `en ${days} días` : ''
}

// ----------------------------------------------------------------
// Widget próxima reserva
// ----------------------------------------------------------------
function NextReservationWidget({ reservation: r }: { reservation: Reservation }) {
  const time        = r.time_slot?.slot_time.slice(0, 5) ?? ''
  const until       = timeUntil(r.date, r.time_slot?.slot_time ?? '00:00')
  const isConfirmed = r.status === 'confirmada'

  return (
    <Link to="/mis-reservas"
      className="block rounded-2xl overflow-hidden relative bg-primary p-5 text-primary-foreground
                 shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-6 right-14 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarCheck2 className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Tu próxima reserva</p>
          </div>
          {r.restaurant?.name && (
            <p className="text-xs text-amber-300/70 mb-1">{r.restaurant.name}</p>
          )}
          <p className="text-2xl font-bold leading-tight capitalize">
            {format(parseISO(r.date), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm opacity-80">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-300" />{time}</span>
            {r.table && (
              <span className="flex items-center gap-1">
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-300" />
                Mesa #{r.table.number}{r.table.zone?.name ? ` · ${r.table.zone.name}` : ''}
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
            isConfirmed ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-white/10 ring-1 ring-white/20',
          ].join(' ')}>
            {isConfirmed ? '✓ Confirmada' : '⏳ Pendiente'}
          </span>
          {until && <p className="text-xs text-amber-300/70 mt-1.5">{until}</p>}
        </div>
      </div>
      <div className="relative flex items-center gap-1 mt-4 text-xs opacity-40">
        <span>Ver detalle</span><ChevronRight className="h-3 w-3" />
      </div>
    </Link>
  )
}

// ----------------------------------------------------------------
// Card de restaurante
// ----------------------------------------------------------------
function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link to={`/restaurante/${r.id}`}
      className="group flex flex-col rounded-2xl border bg-card overflow-hidden
                 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
      <div className="relative h-44 overflow-hidden bg-muted">
        {r.cover_image_url ? (
          <img src={r.cover_image_url} alt={r.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <UtensilsCrossed className="h-10 w-10 text-primary/30" />
          </div>
        )}
        {r.cuisine_type && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1
                           rounded-full bg-white/90 dark:bg-black/70 shadow-sm">
            {r.cuisine_type}
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-1">{r.name}</h3>
          <span className="shrink-0 text-sm text-muted-foreground">{priceLabel(r.price_range)}</span>
        </div>
        {r.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {r.zone ? `${r.zone}, ` : ''}{r.city}
          </span>
          {r.total_reviews > 0 ? (
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="h-3 w-3 fill-amber-500" />
              {ratingStars(r.avg_rating)}
              <span className="font-normal text-muted-foreground">({r.total_reviews})</span>
            </span>
          ) : (
            <span className="italic opacity-60">Sin reseñas aún</span>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          <span>Ver restaurante</span>
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Wrapper con fades dinámicos izquierda/derecha
// ----------------------------------------------------------------
function CarouselTrack({ scrollRef, children }: {
  scrollRef: React.RefObject<HTMLDivElement>
  children: React.ReactNode
}) {
  const [showLeft,  setShowLeft]  = useState(false)
  const [showRight, setShowRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setShowLeft(el.scrollLeft > 4)
      setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [scrollRef])

  return (
    <div className="relative -mx-4">
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-4 pb-3"
           style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
        {children}
      </div>
      <div className={`absolute top-0 left-0 h-full w-12 pointer-events-none transition-opacity duration-300
                       bg-gradient-to-r from-[#F0F2F5] dark:from-background to-transparent
                       ${showLeft ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute top-0 right-0 h-full w-12 pointer-events-none transition-opacity duration-300
                       bg-gradient-to-l from-[#F0F2F5] dark:from-background to-transparent
                       ${showRight ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  )
}

// ----------------------------------------------------------------
// Helper: botones de navegación para carruseles
// ----------------------------------------------------------------
function CarouselNav({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div className="flex gap-1">
      <button onClick={onLeft}
        className="h-7 w-7 rounded-full border bg-card flex items-center justify-center
                   text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={onRight}
        className="h-7 w-7 rounded-full border bg-card flex items-center justify-center
                   text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ----------------------------------------------------------------
// Carrusel: Los más populares hoy
// ----------------------------------------------------------------
function PopularTodayCarousel() {
  const { data = [], isLoading } = usePopularRestaurantsToday()
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })

  if (isLoading || data.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold">Los más populares hoy</h2>
        </div>
        <CarouselNav onLeft={() => scroll('left')} onRight={() => scroll('right')} />
      </div>
      <CarouselTrack scrollRef={ref}>
          {data.map(r => (
            <Link key={r.id} to={`/restaurante/${r.id}`}
              className="group shrink-0 w-56 rounded-2xl border bg-card overflow-hidden
                         shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="relative h-32 bg-muted overflow-hidden">
                {r.cover_image_url ? (
                  <img src={r.cover_image_url} alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <UtensilsCrossed className="h-8 w-8 text-primary/30" />
                  </div>
                )}
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold
                                 px-2 py-0.5 rounded-full bg-orange-500 text-white shadow">
                  <Flame className="h-3 w-3" />
                  {r.reservations_today} hoy
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {r.zone ? `${r.zone}, ` : ''}{r.city}
                </p>
                {r.total_reviews > 0 && (
                  <p className="text-xs text-amber-500 font-semibold mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500" />
                    {r.avg_rating.toFixed(1)}
                  </p>
                )}
              </div>
            </Link>
          ))}
      </CarouselTrack>
    </section>
  )
}

// ----------------------------------------------------------------
// Carrusel: Platos de la semana
// ----------------------------------------------------------------
function WeeklyDishesCarousel() {
  const { data = [], isLoading } = useWeeklyMenuHighlights()
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' })

  if (isLoading || data.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Platos de la semana</h2>
        </div>
        <CarouselNav onLeft={() => scroll('left')} onRight={() => scroll('right')} />
      </div>
      <CarouselTrack scrollRef={ref}>
          {data.map(item => (
            <Link key={item.id}
              to={item.restaurant ? `/restaurante/${item.restaurant.id}` : '#'}
              className="group shrink-0 w-52 rounded-2xl border bg-card overflow-hidden
                         shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="relative h-28 bg-muted overflow-hidden">
                {item.restaurant?.cover_image_url ? (
                  <img src={item.restaurant.cover_image_url} alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <UtensilsCrossed className="h-7 w-7 text-primary/30" />
                  </div>
                )}
                <span className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5
                                 rounded-full bg-primary text-primary-foreground shadow-md">
                  ${item.price.toLocaleString()}
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.restaurant?.name && (
                  <p className="text-[11px] text-primary mt-1.5 font-medium truncate">
                    {item.restaurant.name}
                  </p>
                )}
              </div>
            </Link>
          ))}
      </CarouselTrack>
    </section>
  )
}

// ----------------------------------------------------------------
// Carrusel: Nuevos en MesaFácil
// ----------------------------------------------------------------
function NewRestaurantsCarousel() {
  const { data = [], isLoading } = useNewRestaurants()
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })

  if (isLoading || data.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Nuevos en MesaFácil</h2>
        </div>
        <CarouselNav onLeft={() => scroll('left')} onRight={() => scroll('right')} />
      </div>
      <CarouselTrack scrollRef={ref}>
          {data.map(r => (
            <Link key={r.id} to={`/restaurante/${r.id}`}
              className="group shrink-0 w-56 rounded-2xl border bg-card overflow-hidden
                         shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="relative h-32 bg-muted overflow-hidden">
                {r.cover_image_url ? (
                  <img src={r.cover_image_url} alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <UtensilsCrossed className="h-8 w-8 text-primary/30" />
                  </div>
                )}
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold
                                 px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
                  <BadgeCheck className="h-3 w-3" />
                  Nuevo
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {r.zone ? `${r.zone}, ` : ''}{r.city}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                  {r.cuisine_type}
                </p>
              </div>
            </Link>
          ))}
      </CarouselTrack>
    </section>
  )
}

// ----------------------------------------------------------------
// Carrusel: Reseñas recientes
// ----------------------------------------------------------------
function ReviewsCarousel() {
  const { data = [], isLoading } = useRecentPublicReviews()
  const ref = useRef<HTMLDivElement>(null)
  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })

  if (isLoading || data.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Quote className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Lo que dicen nuestros clientes</h2>
        </div>
        <CarouselNav onLeft={() => scroll('left')} onRight={() => scroll('right')} />
      </div>
      <CarouselTrack scrollRef={ref}>
          {data.map((review, i) => {
            const palettes = [
              'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 dark:from-blue-950/40 dark:to-indigo-950/30 dark:border-blue-800/40',
              'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200 dark:from-amber-950/40 dark:to-orange-950/30 dark:border-amber-800/40',
              'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200 dark:from-emerald-950/40 dark:to-teal-950/30 dark:border-emerald-800/40',
              'bg-gradient-to-br from-violet-50 to-purple-100 border-violet-200 dark:from-violet-950/40 dark:to-purple-950/30 dark:border-violet-800/40',
            ]
            return (
              <Link key={review.id}
                to={review.restaurant_id ? `/restaurante/${review.restaurant_id}` : '#'}
                className={`group shrink-0 w-64 rounded-2xl border p-4 flex flex-col gap-2
                           shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200
                           ${palettes[i % palettes.length]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j}
                        className={`h-3.5 w-3.5 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {format(parseISO(review.created_at), "d MMM", { locale: es })}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-3 leading-relaxed flex-1">
                  "{review.comment}"
                </p>
                <div className="pt-1 border-t border-black/10 dark:border-white/10">
                  <p className="text-xs font-medium truncate">
                    {review.profile?.full_name?.split(' ')[0] ?? 'Cliente'}
                  </p>
                </div>
              </Link>
            )
          })}
      </CarouselTrack>
    </section>
  )
}

// ----------------------------------------------------------------
// Página principal — Discovery + home personalizado
// ----------------------------------------------------------------
export default function DiscoveryPage() {
  const { isAuthenticated, isAdmin, profile, loading: authLoading } = useAuth()
  const [search,   setSearch]   = useState('')
  const [cuisine,  setCuisine]  = useState('')
  const [inputVal, setInputVal] = useState('')
  const filterRef = useRef<HTMLDivElement>(null)
  const scrollFilter = (dir: 'left' | 'right') =>
    filterRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })

  const { data: cuisines      = [] } = useRestaurantCuisines()
  const { data: restaurants   = [], isLoading: restsLoading } = useRestaurants({
    search:       search  || undefined,
    cuisine_type: cuisine || undefined,
  })
  const { data: reservations  = [], isLoading: resLoading } = useMyReservations()
  const { activeRestaurantId, activeRestaurantName }        = useRestaurantContextStore()
  const firstName  = profile?.full_name?.split(' ')[0] ?? ''
  const nextRes    = (!resLoading && isAuthenticated) ? getNextReservation(reservations) : null

  // URL destino del botón "Nueva reserva":
  // si el usuario visitó un restaurante recientemente → ir directo a reservar ahí
  // si no → quedarse en discovery para que elija uno
  const reserveTarget = activeRestaurantId
    ? `/restaurante/${activeRestaurantId}/reservar`
    : '#explorar'

  // Admin → va directo al panel
  if (!authLoading && isAdmin) return <Navigate to="/admin" replace />

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(inputVal.trim())
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background">

      <AppNavbar />

      {/* ── Header unificado (fondo primario único) ── */}
      <div className={`relative overflow-hidden bg-primary`}>
        {/* Imagen de fondo compartida */}
        <div className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-white/5 pointer-events-none" />

        {/* Saludo + próxima reserva — solo logueados */}
        {isAuthenticated && (
          <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-4 space-y-4">
            <div>
              <p className="text-primary-foreground/60 text-sm">{getGreeting()}</p>
              <h1 className="text-3xl font-bold text-white mt-0.5">Hola, {firstName} 👋</h1>
            </div>
            {resLoading ? (
              <div className="rounded-2xl h-28 animate-pulse bg-white/10" />
            ) : nextRes ? (
              <NextReservationWidget reservation={nextRes} />
            ) : null}
          </div>
        )}

        {/* Action cards — solo logueados */}
        {isAuthenticated && (
          <div className="relative max-w-5xl mx-auto px-4 pt-2 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <Link
                to={reserveTarget}
                onClick={e => {
                  if (!activeRestaurantId) {
                    e.preventDefault()
                    document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="group relative overflow-hidden rounded-2xl bg-white/15 border border-white/20
                           backdrop-blur-sm p-4 sm:p-5 text-white
                           hover:bg-white/25 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute -top-5 -right-5 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
                <CalendarPlus className="h-6 w-6 sm:h-7 sm:w-7 mb-3 relative" />
                <p className="font-bold text-sm sm:text-base leading-tight relative">Nueva reserva</p>
                <p className="text-[11px] sm:text-xs text-white/60 mt-0.5 relative line-clamp-1">
                  {activeRestaurantName ? `en ${activeRestaurantName}` : 'Explorá restaurantes'}
                </p>
              </Link>
              <Link to="/mis-reservas"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500
                           p-4 sm:p-5 text-white shadow-md shadow-amber-500/30
                           hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute -top-5 -right-5 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
                <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 mb-3 relative" />
                <p className="font-bold text-sm sm:text-base leading-tight relative">Mis reservas</p>
                <p className="text-[11px] sm:text-xs text-white/60 mt-0.5 relative">Ver historial</p>
              </Link>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600
                              p-4 sm:p-5 text-white shadow-md shadow-violet-500/30">
                <div className="absolute -top-5 -right-5 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 mb-3 relative" />
                <p className="font-bold text-sm sm:text-base leading-tight relative">Asistente IA</p>
                <p className="text-[11px] sm:text-xs text-white/60 mt-0.5 relative">Tocá el botón ✦</p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de búsqueda */}
        <section id="explorar" className={`relative px-4 ${isAuthenticated ? 'pt-4 pb-12' : 'pt-16 pb-20'}`}>
          <div className="relative max-w-2xl mx-auto text-center">
            {!isAuthenticated && (
              <>
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                  Encontrá tu próxima experiencia gastronómica
                </h1>
                <p className="mt-4 text-primary-foreground/70 text-lg">
                  Explorá restaurantes, consultá disponibilidad y reservá en segundos.
                </p>
              </>
            )}
            {isAuthenticated && (
              <h2 className="text-2xl font-bold text-white">Explorar restaurantes</h2>
            )}
            <form onSubmit={handleSearch} className="mt-7 flex gap-2 shadow-xl rounded-2xl overflow-hidden">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="Restaurante, cocina, zona…"
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-background text-sm focus:outline-none"
                />
              </div>
              <button type="submit"
                className="px-6 py-4 bg-white text-primary font-semibold text-sm
                           hover:bg-primary hover:text-primary-foreground transition-colors shrink-0">
                Buscar
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* ── Contenido ── */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Carruseles — solo cuando no hay búsqueda activa */}
        {!search && !cuisine && (
          <>
            <PopularTodayCarousel />
            <NewRestaurantsCarousel />
            <WeeklyDishesCarousel />
          </>
        )}

        {/* Filtros de cocina */}
        {cuisines.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <CarouselNav onLeft={() => scrollFilter('left')} onRight={() => scrollFilter('right')} />
            <div className="relative flex-1 -mr-4 overflow-hidden">
              <div ref={filterRef} className="flex gap-2 overflow-x-auto pr-4 pb-1"
                   style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                <button onClick={() => setCuisine('')}
                  className={`shrink-0 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors
                    ${!cuisine ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                  Todos
                </button>
                {cuisines.map(c => (
                  <button key={c} onClick={() => setCuisine(cuisine === c ? '' : c)}
                    className={`shrink-0 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors
                      ${cuisine === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                    {c}
                  </button>
                ))}
                <div className="w-4 shrink-0" />
              </div>
              <div className="absolute top-0 right-0 h-full w-10 pointer-events-none
                              bg-gradient-to-l from-[#F0F2F5] dark:from-background to-transparent" />
            </div>
          </div>
        )}

        {(search || cuisine) && (
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <span>
              {restsLoading ? 'Buscando…' : `${restaurants.length} resultado${restaurants.length !== 1 ? 's' : ''}`}
              {search ? ` para "${search}"` : ''}{cuisine ? ` · ${cuisine}` : ''}
            </span>
            <button onClick={() => { setSearch(''); setInputVal(''); setCuisine('') }}
              className="text-primary hover:underline">
              Limpiar filtros
            </button>
          </div>
        )}

        {restsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No encontramos restaurantes</p>
            <p className="text-sm mt-1">Probá con otros términos de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map(r => <RestaurantCard key={r.id} r={r} />)}
          </div>
        )}

        {/* Reseñas — franja con fondo tintado */}
        {!search && !cuisine && (
          <div className="mt-12 pt-8 border-t">
            <ReviewsCarousel />
          </div>
        )}

        {/* CTA para restaurantes */}
        {!isAdmin && (
          <div className="mt-10 relative overflow-hidden rounded-2xl
                          bg-gradient-to-br from-primary to-blue-600 p-8
                          flex flex-col items-center gap-3 shadow-lg shadow-primary/20">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-8 left-10 h-28 w-28 rounded-full bg-white/5 pointer-events-none" />
            <UtensilsCrossed className="relative h-10 w-10 text-white/80" />
            <h2 className="relative text-xl font-bold text-center text-white">¿Tenés un restaurante?</h2>
            <p className="relative text-white/70 text-sm text-center max-w-sm">
              Sumá tu local a MesaFácil y comenzá a recibir reservas online hoy mismo.
            </p>
            <Link to="/unirse"
              className="relative mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                         bg-white text-primary font-semibold text-sm
                         hover:bg-white/90 transition-colors shadow-md">
              Registrar mi restaurante
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t mt-10 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MesaFácil — Plataforma de reservas gastronómicas
      </footer>

      {/* FAB de IA solo para usuarios logueados */}
      {isAuthenticated && <ChatFAB />}
    </div>
  )
}
