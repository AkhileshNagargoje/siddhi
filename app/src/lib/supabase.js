import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Null client is allowed while Supabase isn't configured yet —
// screens render with empty data instead of crashing.
export const supabase = url && key ? createClient(url, key) : null

export function isConfigured() {
  return supabase !== null
}

/* Resolve alerts, stamping alerts.resolved_at when that column exists.
 *
 * resolved_at is what anchors the engine's re-fire cooldown (db/resolved-at.sql).
 * But the app must never depend on a migration having been run by hand in the
 * Supabase SQL editor — shipping code that only works after a manual step is how
 * a demo dies. PostgREST answers an unknown column with PGRST204, so we retry
 * once without it and carry on with the older task-anchored behaviour.
 *
 * `apply` receives the patch and returns the awaited query.
 */
export async function resolveAlerts(apply, extra = {}) {
  const stamped = { status: 'resolved', resolved_at: new Date().toISOString(), ...extra }
  const first = await apply(stamped)
  if (!first.error) return first

  const missingColumn =
    first.error.code === 'PGRST204' || /resolved_at/.test(first.error.message ?? '')
  if (!missingColumn) return first

  const { resolved_at, ...withoutStamp } = stamped
  return apply(withoutStamp)
}
