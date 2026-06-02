import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, Phone, Globe, UtensilsCrossed,
  ChevronLeft, Users, ArrowRight, Loader2, Clock,
} from 'lucide-react'
import { useEffect } from 'react'
import { useRestaurant } from '@/hooks/useRestaurants'
import { useTimeSlots } from '@/hooks/useTimeSlots'
import { useBlockedDates } from '@/hooks/useBlockedDates'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRestaurantContextStore } from '@/store/restaurantContextStore'
import type { MenuItem, Review } from '@/types'

// ----------------------------------------------------------------
// Sub-hooks públicos (carta y reseñas)
// ----------------------------------------------------------------
function usePublicMenu(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['menu_items', 'public', restaurantId],
    queryFn: async (): Promise<MenuItem[]> => {
      if (!restaurantId) return []
      const { data, error } = await supabase
        .from('menu_items').select('*')
        .eq('restaurant_id', restaurantId).eq('available', true)
        .order('category').order('sort_order').limit(12)
      if (error) throw new Error(error.message)
      return data as MenuItem[]
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  })
}

function usePublicReviews(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', 'public', restaurantId],
    queryFn: async (): Promise<Review[]> => {
      if (!restaurantId) return []
      const { data, error } = await supabase
        .from('reviews').select('*, profile:profiles(full_name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false }).limit(6)
      if (error) throw new Error(error.message)
      return data as Review[]
    },
    enabled: !!restaurantId,
  })
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function priceLabel(range: number) {
  const labels = ['', 'Económico', 'Moderado', 'Elaborado', 'Premium']
  return { symbol: '$'.repeat(range), text: labels[range] ?? '' }
}

function StarRow({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i}
          className={`h-${size} w-${size} ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Widget de reserva con selector de horario
// ----------------------------------------------------------------
function ReservationWidget({ restaurantId }: { restaurantId: string }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [date,       setDate]       = useState('')
  const [timeSlotId, setTimeSlotId] = useState('')
  const [guests,     setGuests]     = useState(2)

  const { data: slots       = [] } = useTimeSlots(restaurantId)
  const { data: blockedData = [] } = useBlockedDates(restaurantId)
  const blockedDates = blockedData.map(b => b.date)

  const today = new Date().toISOString().split('T')[0]

  function isBlocked(d: string) { return blockedDates.includes(d) }

  function handleReserve() {
    if (!date || !timeSlotId) return
    const params = new URLSearchParams({ date, timeSlotId, guests: String(guests) })
    const path   = `/restaurante/${restaurantId}/reservar?${params}`
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`)
      return
    }
    navigate(path)
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 sticky top-20">
      <h2 className="font-semibold text-base">Hacer una reserva</h2>

      {/* Fecha */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Fecha</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => { setDate(e.target.value); setTimeSlotId('') }}
          className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background
                     focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {date && isBlocked(date) && (
          <p className="text-xs text-destructive mt-1">Esta fecha no está disponible.</p>
        )}
      </div>

      {/* Horarios */}
      {date && !isBlocked(date) && (
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-2 block">
            Horario
          </label>
          {slots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin horarios disponibles</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {slots.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setTimeSlotId(slot.id)}
                  className={[
                    'py-2 rounded-lg border text-xs font-medium transition-colors',
                    timeSlotId === slot.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted',
                  ].join(' ')}
                >
                  <Clock className="h-3 w-3 inline mr-1 opacity-60" />
                  {slot.slot_time.slice(0, 5)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Personas */}
      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">Personas</label>
        <div className="flex items-center gap-3 border rounded-xl px-3 py-2">
          <button onClick={() => setGuests(g => Math.max(1, g - 1))} type="button"
            className="h-6 w-6 rounded-full border flex items-center justify-center
                       hover:bg-muted transition-colors text-sm font-bold">−</button>
          <span className="flex-1 text-center text-sm font-medium flex items-center justify-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {guests} {guests === 1 ? 'persona' : 'personas'}
          </span>
          <button onClick={() => setGuests(g => Math.min(20, g + 1))} type="button"
            className="h-6 w-6 rounded-full border flex items-center justify-center
                       hover:bg-muted transition-colors text-sm font-bold">+</button>
        </div>
      </div>

      <button
        onClick={handleReserve}
        disabled={!date || !timeSlotId || isBlocked(date)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   bg-primary text-primary-foreground font-semibold text-sm
                   hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {isAuthenticated ? 'Reservar mesa' : 'Iniciar sesión para reservar'}
        <ArrowRight className="h-4 w-4" />
      </button>

      {!isAuthenticated && (
        <p className="text-xs text-center text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">Registrate gratis</Link>
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------
export default function RestaurantProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: restaurant, isLoading, error } = useRestaurant(id)
  const { data: menuItems = [] } = usePublicMenu(id)
  const { data: reviews   = [] } = usePublicReviews(id)
  const { setActiveRestaurant }  = useRestaurantContextStore()

  // Cuando el cliente visita este perfil, registramos el restaurante como activo
  // para que el chat IA lo use como contexto
  useEffect(() => {
    if (restaurant) setActiveRestaurant(restaurant.id, restaurant.name)
  }, [restaurant, setActiveRestaurant])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <UtensilsCrossed className="h-12 w-12 opacity-30" />
        <p className="font-medium">Restaurante no encontrado</p>
        <Link to="/" className="text-primary text-sm hover:underline">Volver al inicio</Link>
      </div>
    )
  }

  const price = priceLabel(restaurant.price_range)

  const menuByCategory = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#F7F8F6] dark:bg-background">

      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Volver">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <UtensilsCrossed className="h-4 w-4" />
            MesaFácil
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative h-56 sm:h-72 overflow-hidden bg-muted">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <UtensilsCrossed className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{restaurant.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-white/80">
            {restaurant.cuisine_type && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                {restaurant.cuisine_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {restaurant.zone ? `${restaurant.zone}, ` : ''}{restaurant.city}
            </span>
            <span className="font-medium" title={price.text}>{price.symbol} · {price.text}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Rating */}
          {restaurant.total_reviews > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-500">{restaurant.avg_rating.toFixed(1)}</p>
                <StarRow rating={restaurant.avg_rating} size={4} />
              </div>
              <div className="border-l pl-4">
                <p className="font-medium text-sm">
                  {restaurant.total_reviews} {restaurant.total_reviews === 1 ? 'reseña' : 'reseñas'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Valoración promedio de clientes verificados</p>
              </div>
            </div>
          )}

          {/* Descripción */}
          {restaurant.description && (
            <section>
              <h2 className="font-semibold text-base mb-2">Sobre el restaurante</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
            </section>
          )}

          {/* Carta */}
          {Object.keys(menuByCategory).length > 0 && (
            <section>
              <h2 className="font-semibold text-base mb-3">Carta</h2>
              <div className="space-y-4">
                {Object.entries(menuByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id}
                             className="flex items-start justify-between gap-3 p-3 rounded-xl border bg-card">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-primary">
                            ${item.price.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reseñas */}
          {reviews.length > 0 && (
            <section>
              <h2 className="font-semibold text-base mb-3">Reseñas recientes</h2>
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{review.profile?.full_name ?? 'Cliente'}</p>
                      <StarRow rating={review.rating} size={3} />
                    </div>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-4">

          {/* Widget de reserva con horarios reales */}
          <ReservationWidget restaurantId={restaurant.id} />

          {/* Datos de contacto */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-sm">Información</h2>
            {restaurant.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{restaurant.address}, {restaurant.city}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="hover:text-primary transition-colors">
                  {restaurant.phone}
                </a>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer"
                   className="hover:text-primary transition-colors truncate">
                  {restaurant.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
