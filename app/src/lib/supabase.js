import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Null client is allowed while Supabase isn't configured yet —
// screens render with empty data instead of crashing.
export const supabase = url && key ? createClient(url, key) : null

export function isConfigured() {
  return supabase !== null
}
