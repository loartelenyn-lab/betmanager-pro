import { createClient } from '@supabase/supabase-js'

// Quitamos cualquier sufijo /rest/v1 por si acaso y dejamos la URL base limpia
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fuihlsnypzivymuksksr.supabase.co'
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '')

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bo9lZyD6UGK-2C_ZBPRwnQ_K02U6C9F'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)