
// ============================================================
// src/types/index.ts — Modelos del sistema de reservas
// ============================================================

// ------------------------------------------------------------
// Enums (deben coincidir con los tipos de Supabase)
// ------------------------------------------------------------
export type UserRole          = 'cliente' | 'admin'
export type ReservationStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'no_show'
export type SpecialOccasion   = 'ninguna' | 'cumpleanos' | 'aniversario' | 'negocios' | 'otro'
export type TableShape        = 'round' | 'square' | 'rect'

// ------------------------------------------------------------
// Entidades base
// ------------------------------------------------------------
export interface Profile {
  id:          string
  full_name:   string
  phone:       string | null
  role:        UserRole
  allergies:   string[] | null
  preferences: string | null
  created_at:  string
}

export interface Zone {
  id:          string
  name:        string
  description: string | null
  active:      boolean
}

export interface Table {
  id:       string
  zone_id:  string | null
  number:   number
  capacity: number
  shape:    TableShape
  pos_x:    number
  pos_y:    number
  active:   boolean
  zone?:    Zone
}

export interface TimeSlot {
  id:        string
  slot_time: string
  active:    boolean
}

export interface Reservation {
  id:                 string
  user_id:            string | null
  table_id:           string
  date:               string
  time_slot_id:       string
  guests:             number
  status:             ReservationStatus
  occasion:           SpecialOccasion
  notes:              string | null
  no_show_risk:       number | null
  admin_notes:        string | null
  confirmation_token: string
  confirmed_at:       string | null
  cancelled_at:       string | null
  created_at:         string
  updated_at:         string
  table?:             Table
  time_slot?:         TimeSlot
  profile?:           Profile
}

export interface WaitlistEntry {
  id:           string
  user_id:      string
  date:         string
  time_slot_id: string | null
  guests:       number
  notified:     boolean
  created_at:   string
  profile?:     Profile
  time_slot?:   TimeSlot
}

// ------------------------------------------------------------
// DTOs
// ------------------------------------------------------------
export interface CreateReservationDTO {
  table_id:     string
  date:         string
  time_slot_id: string
  guests:       number
  occasion:     SpecialOccasion
  notes?:       string
}

export interface UpdateReservationDTO {
  status?:       ReservationStatus
  admin_notes?:  string
  no_show_risk?: number
}

// ------------------------------------------------------------
// Plano de mesas
// ------------------------------------------------------------
export type TableAvailability = 'disponible' | 'ocupada' | 'seleccionada' | 'inactiva'

export interface TableWithAvailability extends Table {
  availability: TableAvailability
}

// ------------------------------------------------------------
// Chat con IA
// ------------------------------------------------------------
export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id:        string
  role:      ChatRole
  content:   string
  timestamp: Date
}

export interface ReservationIntent {
  date:      string | null
  time:      string | null
  guests:    number | null
  occasion:  SpecialOccasion | null
  notes:     string | null
  confirmed: boolean
}

// ------------------------------------------------------------
// Fechas bloqueadas
// ------------------------------------------------------------
export interface BlockedDate {
  id:         string
  date:       string
  reason:     string | null
  created_at: string
}

// ------------------------------------------------------------
// Reseñas
// ------------------------------------------------------------
export interface Review {
  id:             string
  reservation_id: string
  user_id:        string
  rating:         number    // 1–5
  comment:        string | null
  created_at:     string
  profile?:       Profile
  reservation?:   Reservation
}

export interface CreateReviewDTO {
  reservation_id: string
  rating:         number
  comment?:       string
}

// ------------------------------------------------------------
// Métricas del admin
// ------------------------------------------------------------
export interface DashboardMetrics {
  totalToday:     number
  confirmedToday: number
  noShowsToday:   number
  occupancyRate:  number
  waitlistCount:  number
  peakHour:       string
}
