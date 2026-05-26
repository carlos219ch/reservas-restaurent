-- =============================================================
-- Migración 001 — Tabla de reseñas
-- Ejecutar en Supabase SQL Editor o via: supabase db push
-- =============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID        NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id)           ON DELETE CASCADE,
  rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Una sola reseña por reserva
CREATE UNIQUE INDEX IF NOT EXISTS reviews_reservation_id_key
  ON public.reviews(reservation_id);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer reseñas
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT TO authenticated USING (true);

-- Solo el propietario puede insertar su reseña
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- El propietario puede actualizar/eliminar su reseña
CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
