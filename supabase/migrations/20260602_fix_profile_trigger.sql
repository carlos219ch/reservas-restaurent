-- ============================================================
-- Fix: trigger de perfiles lee role y restaurant_id del metadata
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Reemplazar la función del trigger para que respete
-- role y restaurant_id pasados en raw_user_meta_data al momento del signUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, restaurant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente'),
    NULLIF(NEW.raw_user_meta_data->>'restaurant_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name     = EXCLUDED.full_name,
      role          = EXCLUDED.role,
      restaurant_id = EXCLUDED.restaurant_id;

  RETURN NEW;
END;
$$;

-- Política para que usuarios puedan actualizar su propio perfil
-- (necesario como fallback si el trigger ya corrió antes del upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_own_update'
  ) THEN
    CREATE POLICY "profiles_own_update" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
