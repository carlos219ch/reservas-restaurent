import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useRestaurants, useRestaurant } from '@/hooks/useRestaurants'
import { useReservationStore } from '@/store/reservationStore'
import { useRestaurantContextStore } from '@/store/restaurantContextStore'
import ReservationForm from '@/components/reservation/ReservationForm'

export default function ReservePage() {
  const { id: restaurantIdFromUrl }     = useParams<{ id?: string }>()
  const [searchParams]                  = useSearchParams()
  const { setDate, setTimeSlot, setGuests } = useReservationStore()

  // Precargar date/timeSlotId/guests si vienen del perfil del restaurante
  useEffect(() => {
    const date       = searchParams.get('date')
    const timeSlotId = searchParams.get('timeSlotId')
    const guests     = searchParams.get('guests')
    if (date)       setDate(date)
    if (timeSlotId) setTimeSlot(timeSlotId)
    if (guests)     setGuests(Number(guests))
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fallback: si no hay ID en la URL usamos el primer restaurante activo
  const { data: restaurants = [] }                = useRestaurants()
  const restaurantId = restaurantIdFromUrl ?? restaurants[0]?.id ?? null
  const { data: restaurant }                      = useRestaurant(restaurantId ?? undefined)
  const { setActiveRestaurant }                   = useRestaurantContextStore()

  useEffect(() => {
    if (restaurant) setActiveRestaurant(restaurant.id, restaurant.name)
  }, [restaurant, setActiveRestaurant])

  return (
    <div className="px-4 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Nueva reserva</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Elegí fecha, horario y mesa para tu visita.
        </p>
      </div>
      <ReservationForm restaurantId={restaurantId} />
    </div>
  )
}
