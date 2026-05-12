// src/config/env.ts
// Punto único de acceso a variables de entorno
// Nunca uses import.meta.env directamente en los componentes
 
const requiredEnvVars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const
 
// Validación en tiempo de arranque
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${key}`)
  }
})
 
export const ENV = {
  supabase: {
    url: requiredEnvVars.VITE_SUPABASE_URL,
    anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY,
  },
} as const