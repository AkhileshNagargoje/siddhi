import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL } from '../config/festival'

/* What a pilgrim sees. Reached by scanning a printed poster in their sector —
 * no app, no login, nothing to install.
 *
 * THE DESIGN CONSTRAINT THAT SHAPES EVERYTHING HERE
 *
 * This page is read by people standing in a dense crowd. Telling them a sector
 * is infected moves that crowd, and crowd movement is what kills at mass
 * gatherings — the 2025 Maha Kumbh had a fatal crush. Panic also fills clinics
 * with the worried well exactly when capacity is needed for the sick.
 *
 * So this page never displays a raw alert, never names a sector as dangerous,
 * never shows a case count, and never ranks sectors against each other. It
 * shows advice that is useful whether or not anything is wrong, plus whatever
 * an officer has deliberately chosen to publish, in the officer's own words.
 *
 * Framing is positive throughout: where safe water IS, not where it is not.
 * "Use the treated water points" moves nobody; "avoid sector 5" empties a
 * sector into its neighbours.
 */

const ALWAYS = [
  {
    en: 'Drink only treated or sealed water',
    hi: 'केवल शुद्ध या सीलबंद पानी पिएँ',
    mr: 'फक्त शुद्ध किंवा सीलबंद पाणीच प्या',
    detail: 'Treated water points are marked in blue. Bottled water should have an unbroken seal.',
  },
  {
    en: 'Wash hands before eating',
    hi: 'खाने से पहले हाथ धोएँ',
    mr: 'जेवण्यापूर्वी हात धुवा',
    detail: 'Soap points are next to every community kitchen.',
  },
  {
    en: 'Loose motions? Start ORS immediately',
    hi: 'दस्त हों तो तुरंत ओआरएस लें',
    mr: 'जुलाब झाल्यास लगेच ओआरएस घ्या',
    detail: 'ORS is free at every clinic and medical stall. Start it before you feel weak — not after.',
  },
  {
    en: 'Look after the elderly in your group',
    hi: 'अपने साथ के बुज़ुर्गों का ध्यान रखें',
    mr: 'सोबतच्या ज्येष्ठांची काळजी घ्या',
    detail: 'Older pilgrims dehydrate faster and often say nothing until it is serious.',
  },
]

const SEE_A_DOCTOR = [
  'Loose motions more than four or five times',
  'Vomiting that will not stop',
  'Very little urine, or dizziness on standing',
  'Any of the above in a child or an elderly person',
]

export default function PublicPage() {
  const [advisories, setAdvisories] = useState([])
  const [sector, setSector] = useState('')

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    async function load() {
      // Only rows an officer has actually published. A missing advisory column
      // (before the migration runs) simply yields nothing, which is the safe
      // failure direction for a public page.
      const { data } = await supabase
        .from('alerts')
        .select('sector, advisory, advisory_at')
        .not('advisory', 'is', null)
        .neq('status', 'resolved')
        .order('advisory_at', { ascending: false })
      if (alive && data) setAdvisories(data)
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const sec = FESTIVAL.sectors.find(s => String(s.id) === sector)
  const mine = sector ? advisories.filter(a => String(a.sector) === sector) : advisories

  return (
    <div className="pub">
      <header className="pub-head">
        <b>Siddhi</b>
        <span>{FESTIVAL.name} · health information</span>
      </header>

      {/* An officer's words, or nothing. Never a raw alert. */}
      {mine.length > 0 ? (
        mine.map((a, i) => (
          <div key={i} className="pub-notice">
            <h2>Health advice for your area</h2>
            <p>{a.advisory}</p>
            <small>Issued by the festival health office{a.advisory_at ? ` · ${new Date(a.advisory_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}` : ''}</small>
          </div>
        ))
      ) : (
        <div className="pub-calm">
          <h2>No health advisory right now</h2>
          <p>Health teams are monitoring every sector. The advice below is worth following anyway.</p>
        </div>
      )}

      <section className="pub-block">
        <h3>Stay well</h3>
        <ul className="pub-list">
          {ALWAYS.map(item => (
            <li key={item.en}>
              <b>{item.en}</b>
              <span className="pub-lang">{item.hi} · {item.mr}</span>
              <span className="pub-detail">{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="pub-block">
        <h3>Where you are</h3>
        <select value={sector} onChange={e => setSector(e.target.value)} aria-label="Choose your sector">
          <option value="">Choose your sector…</option>
          {FESTIVAL.sectors.map(s => (
            <option key={s.id} value={String(s.id)}>Sector {s.id} — {s.name}</option>
          ))}
        </select>
        {sec && (
          <div className="pub-sector">
            <p><b>Treated water points:</b> {sec.waterPoints.length ? sec.waterPoints.join(', ') : 'ask any volunteer'}</p>
            <p><b>Community kitchens:</b> {sec.kitchens.length ? sec.kitchens.join(', ') : 'none in this sector'}</p>
            <p className="pub-detail">
              Every sector has a clinic with free ORS and a doctor. Ask any volunteer
              in a marked vest and they will walk you there.
            </p>
          </div>
        )}
      </section>

      <section className="pub-block pub-urgent">
        <h3>See a doctor if</h3>
        <ul>
          {SEE_A_DOCTOR.map(x => <li key={x}>{x}</li>)}
        </ul>
        <p className="pub-detail">Care at every festival clinic is free. You do not need any document.</p>
      </section>

      <footer className="pub-foot">
        Nothing you do on this page is recorded, and no account is needed.
      </footer>
    </div>
  )
}
