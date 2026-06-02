-- ============================================================
-- Migración: plataforma multi-restaurante
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Crear tabla restaurants (sin políticas que dependan de otras tablas aún)
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  cuisine_type    text,
  address         text,
  city            text NOT NULL DEFAULT 'Buenos Aires',
  zone            text,
  phone           text,
  email           text,
  website         text,
  cover_image_url text,
  logo_url        text,
  price_range     smallint DEFAULT 2 CHECK (price_range BETWEEN 1 AND 4),
  avg_rating      numeric(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  total_reviews   integer DEFAULT 0,
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer restaurantes activos
CREATE POLICY "restaurants_public_read" ON restaurants
  FOR SELECT USING (active = true);

-- Inserción abierta (el trigger de Supabase maneja el ownership)
CREATE POLICY "restaurants_service_insert" ON restaurants
  FOR INSERT WITH CHECK (true);


-- 2. Agregar restaurant_id a profiles PRIMERO
--    (otras políticas lo necesitan)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;


-- 3. Ahora sí: política de update que referencia profiles.restaurant_id
-- ============================================================
CREATE POLICY "restaurants_admin_update" ON restaurants
  FOR UPDATE USING (
    id IN (
      SELECT restaurant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- 4. Agregar restaurant_id al resto de tablas
-- ============================================================
ALTER TABLE tables        ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE zones         ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE time_slots    ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE menu_items    ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE reservations  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE waitlist      ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE reviews       ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL;


-- 5. Crear restaurante por defecto para datos existentes
-- ============================================================
INSERT INTO restaurants (
  name,
  description,
  cuisine_type,
  address,
  city,
  zone,
  price_range,
  active
)
VALUES (
  'Mesa Fácil Restaurante',
  'Primer restaurante de la plataforma. Cocina mediterránea en el corazón de Buenos Aires.',
  'Mediterránea',
  'Av. Corrientes 1234',
  'Buenos Aires',
  'San Telmo',
  3,
  true
);


-- 6. Backfill: asignar restaurant_id a todos los registros existentes
-- ============================================================
DO $$
DECLARE
  default_id uuid;
BEGIN
  SELECT id INTO default_id FROM restaurants ORDER BY created_at LIMIT 1;

  UPDATE tables        SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE zones         SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE time_slots    SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE menu_items    SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE blocked_dates SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE reservations  SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE waitlist      SET restaurant_id = default_id WHERE restaurant_id IS NULL;
  UPDATE reviews       SET restaurant_id = default_id WHERE restaurant_id IS NULL;

  -- Vincular admins existentes con el restaurante por defecto
  UPDATE profiles SET restaurant_id = default_id WHERE role = 'admin' AND restaurant_id IS NULL;
END $$;


-- 7. Índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_city        ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_zone        ON restaurants(zone);
CREATE INDEX IF NOT EXISTS idx_restaurants_active      ON restaurants(active);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant       ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant      ON reviews(restaurant_id);
