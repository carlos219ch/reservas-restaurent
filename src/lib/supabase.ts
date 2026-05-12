// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { ENV } from '@/config/env'
 
export const supabase = createClient(ENV.supabase.url, ENV.supabase.anonKey)