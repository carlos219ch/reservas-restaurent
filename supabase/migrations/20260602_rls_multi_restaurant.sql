-- ============================================================
-- Migración: políticas RLS multi-restaurante
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- IMPORTANTE: ejecutar DESPUÉS de 20260602_add_restaurants.sql
-- ============================================================

-- ============================================================
-- RESERVATIONS
-- ============================================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Clientes ven solo sus propias reservas
CREATE POLICY "reservations_client_read" ON reservations
  FOR SELECT USING (auth.uid() = user_id);

-- Admins ven reservas de su restaurante
CREATE POLICY "reservations_admin_read" ON reservations
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clientes crean sus propias reservas
CREATE POLICY "reservations_client_insert" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Clientes cancelan sus propias reservas (solo campo status)
CREATE POLICY "reservations_client_update" ON reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins actualizan reservas de su restaurante
CREATE POLICY "reservations_admin_update" ON reservations
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- TABLES
-- ============================================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Lectura pública (necesario para que los clientes vean el plano)
CREATE POLICY "tables_public_read" ON tables
  FOR SELECT USING (active = true);

-- Admins ven todas las mesas de su restaurante (incluso inactivas)
CREATE POLICY "tables_admin_read" ON tables
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins modifican mesas de su restaurante
CREATE POLICY "tables_admin_write" ON tables
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- ZONES
-- ============================================================
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones_public_read" ON zones
  FOR SELECT USING (true);

CREATE POLICY "zones_admin_write" ON zones
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- TIME_SLOTS
-- ============================================================
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_slots_public_read" ON time_slots
  FOR SELECT USING (active = true);

CREATE POLICY "time_slots_admin_read" ON time_slots
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "time_slots_admin_write" ON time_slots
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- MENU_ITEMS
-- ============================================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Lectura pública de ítems disponibles
CREATE POLICY "menu_items_public_read" ON menu_items
  FOR SELECT USING (available = true);

-- Admins ven y modifican todos los ítems de su restaurante
CREATE POLICY "menu_items_admin_all" ON menu_items
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- BLOCKED_DATES
-- ============================================================
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_dates_public_read" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "blocked_dates_admin_write" ON blocked_dates
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- WAITLIST
-- ============================================================
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_client_own" ON waitlist
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "waitlist_admin_read" ON waitlist
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Lectura pública de reseñas (para perfiles de restaurantes)
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (true);

-- Clientes crean y leen sus propias reseñas
CREATE POLICY "reviews_client_own" ON reviews
  FOR ALL USING (auth.uid() = user_id);

-- Admins leen reseñas de su restaurante
CREATE POLICY "reviews_admin_read" ON reviews
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- PROFILES (sin cambios drásticos — ya tiene RLS básico)
-- ============================================================
-- Cada usuario lee su propio perfil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_own_read'
  ) THEN
    CREATE POLICY "profiles_own_read" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;
