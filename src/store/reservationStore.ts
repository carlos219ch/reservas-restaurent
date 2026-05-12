import { create } from 'zustand'
import type { SpecialOccasion } from '@/types'

interface ReservationDraft {
  date: string | null
  timeSlotId: string | null
  guests: number
  tableId: string | null
  occasion: SpecialOccasion
  notes: string
}

interface ReservationStore extends ReservationDraft {
  setDate: (date: string | null) => void
  setTimeSlot: (id: string | null) => void
  setGuests: (count: number) => void
  setTable: (id: string | null) => void
  setOccasion: (occasion: SpecialOccasion) => void
  setNotes: (notes: string) => void
  reset: () => void
}

const initialDraft: ReservationDraft = {
  date: null,
  timeSlotId: null,
  guests: 2,
  tableId: null,
  occasion: 'ninguna',
  notes: '',
}

export const useReservationStore = create<ReservationStore>(set => ({
  ...initialDraft,
  // Al cambiar fecha, se limpian slot y mesa porque la disponibilidad cambia
  setDate: date => set({ date, timeSlotId: null, tableId: null }),
  setTimeSlot: timeSlotId => set({ timeSlotId, tableId: null }),
  setGuests: guests => set({ guests, tableId: null }),
  setTable: tableId => set({ tableId }),
  setOccasion: occasion => set({ occasion }),
  setNotes: notes => set({ notes }),
  reset: () => set(initialDraft),
}))
