import { supabase } from './supabase'

const PAGE = 1000 // Supabase caps a single response at 1000 rows.

/* Page through encounters in a time window, newest first. */
export async function fetchEncounters(sinceIso, untilIso) {
  const out = []
  for (let from = 0; from < 20000; from += PAGE) {
    let q = supabase
      .from('encounters')
      .select('id, ts, clinic_id, sector, syndrome, severity, age_band')
      .gte('ts', sinceIso)
      .order('ts', { ascending: false })
      .range(from, from + PAGE - 1)
    if (untilIso) q = q.lte('ts', untilIso)
    const { data, error } = await q
    if (error || !data?.length) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}
