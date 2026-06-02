import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RestaurantContextStore {
  activeRestaurantId:   string | null
  activeRestaurantName: string | null
  setActiveRestaurant:  (id: string, name: string) => void
  clearActiveRestaurant: () => void
}

export const useRestaurantContextStore = create<RestaurantContextStore>()(
  persist(
    set => ({
      activeRestaurantId:   null,
      activeRestaurantName: null,
      setActiveRestaurant:  (id, name) => set({ activeRestaurantId: id, activeRestaurantName: name }),
      clearActiveRestaurant: ()        => set({ activeRestaurantId: null, activeRestaurantName: null }),
    }),
    { name: 'mesa-facil-restaurant-context' },
  ),
)
