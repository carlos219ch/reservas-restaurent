import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Search, MapPin, Star, UtensilsCrossed, ChevronRight,
  CalendarPlus, ClipboardList, Clock,
  Users, CalendarCheck2, Sparkles,
} from 'lucide-react'
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRestaurants, useRestaurantCuisines } from '@/hooks/useRestaurants'
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
// Página principal — Discovery + home personalizado
// ----------------------------------------------------------------
export default function DiscoveryPage() {
  const { isAuthenticated, isAdmin, profile, loading: authLoading } = useAuth()
  const [search,   setSearch]   = useState('')
  const [cuisine,  setCuisine]  = useState('')
  const [inputVal, setInputVal] = useState('')

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
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-background">

      <AppNavbar />

      {/* ── Sección personalizada (solo logueados) ── */}
      {isAuthenticated && (
        <section className="max-w-5xl mx-auto px-4 pt-10 pb-4 space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">{getGreeting()} 👋</p>
            <h1 className="text-3xl font-bold mt-1">Hola, {firstName}</h1>
          </div>

          {/* Próxima reserva */}
          {resLoading ? (
            <div className="rounded-2xl h-32 animate-pulse bg-primary/10" />
          ) : nextRes ? (
            <NextReservationWidget reservation={nextRes} />
          ) : null}

          {/* Acciones rápidas */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to={reserveTarget}
              onClick={e => {
                // Si no hay restaurante activo, hacer scroll a la sección de explorar
                if (!activeRestaurantId) {
                  e.preventDefault()
                  document.getElementById('explorar')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="group rounded-2xl border bg-card p-4 flex items-center gap-3
                         shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center
                              group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-200 shrink-0">
                <CalendarPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Nueva reserva</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {activeRestaurantName ? `en ${activeRestaurantName}` : 'Explorá restaurantes abajo'}
                </p>
              </div>
            </Link>
            <Link to="/mis-reservas"
              className="group rounded-2xl border bg-card p-4 flex items-center gap-3
                         shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center
                              group-hover:bg-amber-100 group-hover:scale-110 transition-all duration-200 shrink-0">
                <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Mis reservas</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ver historial</p>
              </div>
            </Link>
          </div>

          {!resLoading && !nextRes && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Probá el Asistente IA</p>
                <p className="text-xs text-primary/60 mt-0.5 leading-relaxed">
                  Tocá el botón azul — decile qué necesitás y la IA te reserva en segundos.
                </p>
              </div>
            </div>
          )}

          <div className="border-t pt-2" />
        </section>
      )}

      {/* ── Hero de búsqueda ── */}
      <section id="explorar" className={`relative overflow-hidden bg-primary px-4
        ${isAuthenticated ? 'pt-8 pb-12' : 'pt-16 pb-20'}`}>
        <div className="absolute inset-0 opacity-20"
             style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-background text-sm
                           focus:outline-none"
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

      {/* ── Contenido ── */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Filtros de cocina */}
        {cuisines.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6"
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

        {/* CTA para restaurantes */}
        {!isAdmin && (
          <div className="mt-16 rounded-2xl border bg-card p-8 flex flex-col items-center gap-3">
            <UtensilsCrossed className="h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold text-center">¿Tenés un restaurante?</h2>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              Sumá tu local a MesaFácil y comenzá a recibir reservas online hoy mismo.
            </p>
            <Link to="/unirse"
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                         bg-primary text-primary-foreground font-semibold text-sm
                         hover:opacity-90 transition-opacity">
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
