-- ============================================================
-- Migración: trigger para mantener avg_rating y total_reviews
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_restaurant_id uuid;
BEGIN
  -- Determinar qué restaurante actualizar (INSERT/UPDATE usa NEW, DELETE usa OLD)
  target_restaurant_id := COALESCE(NEW.restaurant_id, OLD.restaurant_id);

  IF target_restaurant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE restaurants
  SET
    avg_rating    = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE restaurant_id = target_restaurant_id
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE restaurant_id = target_restaurant_id
    )
  WHERE id = target_restaurant_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Ejecutar tras INSERT, UPDATE o DELETE en reviews
DROP TRIGGER IF EXISTS trigger_update_restaurant_rating ON reviews;

CREATE TRIGGER trigger_update_restaurant_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_rating();
