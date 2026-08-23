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

/* What each kind of alert means for someone standing there, and what they can
   actually do about it. No case counts anywhere: a number invites comparison
   between sectors, and comparison is what starts a movement. Every entry ends
   in an action, because an instruction calms and a warning does not. */
const ISSUE = {
  gi: {
    label: 'Water being checked',
    hi: 'पानी की जाँच जारी है',
    mr: 'पाण्याची तपासणी सुरू आहे',
    doThis: 'Use the treated water points listed below. If anyone has loose motions, start ORS straight away.',
  },
  respiratory: {
    label: 'More coughs and colds than usual',
    hi: 'खाँसी-ज़ुकाम सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त खोकला-सर्दी',
    doThis: 'Cover your mouth when you cough, wash hands often, and keep a little distance from anyone coughing.',
  },
  heat: {
    label: 'Heat affecting people here',
    hi: 'गर्मी का असर',
    mr: 'उष्णतेचा त्रास',
    doThis: 'Drink water regularly even when not thirsty, rest in shade, and watch the elderly closely.',
  },
  fever: {
    label: 'More fever than usual',
    hi: 'बुखार सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त ताप',
    doThis: 'See a clinic if fever lasts more than a day, and keep drinking fluids.',
  },
  injury: {
    label: 'More injuries than usual',
    hi: 'चोटें सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त जखमा',
    doThis: 'Take care underfoot, especially near ghats and in crowds. Any clinic will dress a wound free.',
  },
  other: {
    label: 'Health teams are active here',
    hi: 'स्वास्थ्य दल सक्रिय',
    mr: 'आरोग्य पथक कार्यरत',
    doThis: 'Follow the general advice below and visit any clinic if you feel unwell.',
  },
}

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
        .select('sector, syndrome, advisory, advisory_at')
        .neq('status', 'resolved')
        .order('ts', { ascending: false })
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
      {mine.filter(a => a.advisory).length > 0 ? (
        mine.filter(a => a.advisory).map((a, i) => (
          <div key={i} className="pub-notice">
            <h2>Health advice for your area</h2>
            <p>{a.advisory}</p>
            <small>Issued by the festival health office{a.advisory_at ? ` · ${new Date(a.advisory_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}` : ''}</small>
          </div>
        ))
      ) : (
        advisories.length > 0 ? (
          <div className="pub-notice">
            <h2>Health teams are active in {advisories.length} {advisories.length === 1 ? 'area' : 'areas'}</h2>
            <p>
              Checks are under way as a precaution. Every area below shows what is being
              looked at and what you can do. All clinics are open as normal.
            </p>
          </div>
        ) : (
          <div className="pub-calm">
            <h2>No health advisory right now</h2>
            <p>Health teams are monitoring every area. The advice below is worth following anyway.</p>
          </div>
        )
      )}

      {/* Every sector is listed, not only the affected ones. A list of twelve
          with two marked reads as information; a list of two reads as a place
          to get away from — and moving a dense crowd is the real danger here. */}
      <section className="pub-block">
        <h3>Every area right now</h3>
        <div className="pub-areas">
          {FESTIVAL.sectors.map(s => {
            const hit = advisories.find(a => a.sector === s.id)
            const issue = hit ? (ISSUE[hit.syndrome] ?? ISSUE.other) : null
            return (
              <div key={s.id} className={issue ? 'pub-area is-flagged' : 'pub-area'}>
                <div className="pub-area-head">
                  <b>{s.name}</b>
                  <span className={issue ? 'pub-pill flagged' : 'pub-pill clear'}>
                    {issue ? 'take care' : 'all clear'}
                  </span>
                </div>
                {issue && (
                  <>
                    <span className="pub-issue">{issue.label}</span>
                    <span className="pub-lang">{issue.hi} · {issue.mr}</span>
                    <span className="pub-detail">{hit.advisory ?? issue.doThis}</span>
                    {s.waterPoints.length > 0 && hit.syndrome === 'gi' && (
                      <span className="pub-detail"><b>Treated water here:</b> {s.waterPoints.join(', ')}</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="pub-detail" style={{ marginTop: 'var(--s-3)' }}>
          Every area has a clinic. Care is free and no documents are needed — you do
          not need to travel to a different area to be seen.
        </p>
      </section>

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
