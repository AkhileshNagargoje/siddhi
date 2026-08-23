import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL } from '../config/festival'

/* What a pilgrim sees. Reached by scanning a printed poster — no app, no login.
 *
 * BUILT FOR A PHONE HELD IN A CROWD, NOT A PAGE TO READ
 *
 * The reader is standing up, in sun, possibly with one hand free, and wants one
 * answer: am I alright here, and what should I do? So the first screen is their
 * area and nothing else. Everything else is folded away behind taps.
 *
 * Each poster carries its own sector in the QR — /public?s=5 — so most people
 * never choose anything. The picker only appears if we do not know.
 *
 * SAFETY, WHICH LIVES IN THE PRESENTATION RATHER THAN IN OMISSION
 *
 * Affected areas ARE shown; withholding them would be useless to someone trying
 * to take precautions. But no case counts and no severity scores anywhere: a
 * number invites comparison between areas, and comparison moves a crowd. Every
 * status ends in an instruction, because an instruction calms and a warning
 * does not — and the page repeats that every area has a free clinic, so nobody
 * concludes they must travel to be seen.
 */

const ISSUE = {
  gi: {
    label: 'Water is being checked here',
    hi: 'यहाँ पानी की जाँच हो रही है',
    mr: 'इथे पाण्याची तपासणी सुरू आहे',
    do: 'Drink only from the treated water points below. If anyone has loose motions, start ORS now — free at every clinic.',
  },
  respiratory: {
    label: 'More coughs and colds than usual',
    hi: 'खाँसी-ज़ुकाम सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त खोकला-सर्दी',
    do: 'Cover your mouth when you cough and wash your hands often.',
  },
  heat: {
    label: 'Heat is affecting people here',
    hi: 'यहाँ गर्मी का असर है',
    mr: 'इथे उष्णतेचा त्रास होत आहे',
    do: 'Drink water before you feel thirsty, rest in shade, and check on the elderly with you.',
  },
  fever: {
    label: 'More fever than usual',
    hi: 'बुखार सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त ताप',
    do: 'Keep drinking fluids. See a clinic if fever lasts more than a day.',
  },
  injury: {
    label: 'More injuries than usual',
    hi: 'चोटें सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त जखमा',
    do: 'Take care underfoot near the ghats and in crowds. Any clinic will dress a wound free.',
  },
  other: {
    label: 'Health teams are active here',
    hi: 'स्वास्थ्य दल सक्रिय हैं',
    mr: 'आरोग्य पथक कार्यरत आहे',
    do: 'Follow the usual advice and visit any clinic if you feel unwell.',
  },
}

const ALWAYS = [
  { en: 'Treated or sealed water only', hi: 'केवल शुद्ध या सीलबंद पानी', mr: 'फक्त शुद्ध किंवा सीलबंद पाणी' },
  { en: 'Wash hands before eating', hi: 'खाने से पहले हाथ धोएँ', mr: 'जेवण्यापूर्वी हात धुवा' },
  { en: 'Loose motions? Start ORS at once', hi: 'दस्त हों तो तुरंत ओआरएस', mr: 'जुलाब झाल्यास लगेच ओआरएस' },
  { en: 'Watch the elderly with you', hi: 'बुज़ुर्गों का ध्यान रखें', mr: 'ज्येष्ठांची काळजी घ्या' },
]

const SEE_A_DOCTOR = [
  'Loose motions four or five times',
  'Vomiting that will not stop',
  'Very little urine, or dizzy standing up',
  'Any of these in a child or an elderly person',
]

const STORE_KEY = 'siddhi_my_sector'

export default function PublicPage() {
  const [alerts, setAlerts] = useState([])
  // The poster's QR carries its own sector, so most readers never pick one.
  const [sector, setSector] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('s')
    return fromUrl || localStorage.getItem(STORE_KEY) || ''
  })

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    async function load() {
      const { data } = await supabase
        .from('alerts')
        .select('sector, syndrome, advisory')
        .neq('status', 'resolved')
      if (alive && data) setAlerts(data)
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  function choose(id) {
    setSector(String(id))
    try { localStorage.setItem(STORE_KEY, String(id)) } catch { /* private mode */ }
  }

  const sec = FESTIVAL.sectors.find(s => String(s.id) === sector)
  const hit = sec ? alerts.find(a => a.sector === sec.id) : null
  const issue = hit ? (ISSUE[hit.syndrome] ?? ISSUE.other) : null

  /* First run, no sector known: one screen, one job, big targets. */
  if (!sec) {
    return (
      <div className="pub">
        <header className="pub-head"><b>Siddhi</b><span>Health information</span></header>
        <h2 className="pub-ask">Which area are you in?</h2>
        <div className="pub-pick">
          {FESTIVAL.sectors.map(s => (
            <button key={s.id} onClick={() => choose(s.id)}>{s.name}</button>
          ))}
        </div>
        <p className="pub-detail">The poster you scanned usually sets this for you.</p>
      </div>
    )
  }

  return (
    <div className="pub">
      <header className="pub-head">
        <b>Siddhi</b>
        <button className="pub-change" onClick={() => choose('')}>{sec.name} ▾</button>
      </header>

      {/* The whole answer, above the fold. */}
      <div className={issue ? 'pub-hero care' : 'pub-hero clear'}>
        <span className="pub-hero-status">{issue ? 'Take care here' : 'All clear here'}</span>
        <h1>{sec.name}</h1>
        {issue ? (
          <>
            <p className="pub-hero-issue">{issue.label}</p>
            <p className="pub-hero-lang">{issue.hi}<br />{issue.mr}</p>
            <p className="pub-hero-do">{hit.advisory ?? issue.do}</p>
          </>
        ) : (
          <>
            <p className="pub-hero-issue">Nothing unusual reported in your area.</p>
            <p className="pub-hero-lang">आपके क्षेत्र में कुछ असामान्य नहीं<br />तुमच्या भागात काही असामान्य नाही</p>
          </>
        )}
      </div>

      {/* Two things people need in a hurry. */}
      <div className="pub-quick">
        <div>
          <span>Treated water here</span>
          <b>{sec.waterPoints.length ? sec.waterPoints.join(', ') : 'Ask any volunteer'}</b>
        </div>
        <div>
          <span>Nearest clinic</span>
          <b>In this area · free · no documents</b>
        </div>
      </div>

      {/* Everything else folded away. Native details — no JS, works offline. */}
      <details className="pub-fold">
        <summary>When to see a doctor</summary>
        <ul>{SEE_A_DOCTOR.map(x => <li key={x}>{x}</li>)}</ul>
      </details>

      <details className="pub-fold">
        <summary>Staying well</summary>
        <ul>
          {ALWAYS.map(a => (
            <li key={a.en}>
              <b>{a.en}</b>
              <span className="pub-lang">{a.hi} · {a.mr}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="pub-fold">
        <summary>Other areas</summary>
        <div className="pub-others">
          {FESTIVAL.sectors.filter(s => s.id !== sec.id).map(s => {
            const h = alerts.find(a => a.sector === s.id)
            return (
              <button key={s.id} className="pub-other" onClick={() => choose(s.id)}>
                <span>{s.name}</span>
                <i className={h ? 'flagged' : 'clear'}>{h ? 'take care' : 'all clear'}</i>
              </button>
            )
          })}
        </div>
        <p className="pub-detail">
          Every area has its own clinic. There is no need to travel to another area to be seen.
        </p>
      </details>

      <footer className="pub-foot">Nothing here is recorded. No account needed.</footer>
    </div>
  )
}
