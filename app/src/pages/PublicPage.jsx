import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL } from '../config/festival'
import { AGE_MIX } from '../config/medical'
import { AGE_GROUPS, PRECAUTIONS, DISEASE_INFO } from '../config/precautions'

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
    short: 'water',
    hi: 'यहाँ पानी की जाँच हो रही है',
    mr: 'इथे पाण्याची तपासणी सुरू आहे',
    do: 'Drink only from the treated water points below. If anyone has loose motions, start ORS now — free at every clinic.',
  },
  respiratory: {
    label: 'More coughs and colds than usual',
    short: 'coughs, colds',
    hi: 'खाँसी-ज़ुकाम सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त खोकला-सर्दी',
    do: 'Cover your mouth when you cough and wash your hands often.',
  },
  heat: {
    label: 'Heat is affecting people here',
    short: 'heat',
    hi: 'यहाँ गर्मी का असर है',
    mr: 'इथे उष्णतेचा त्रास होत आहे',
    do: 'Drink water before you feel thirsty, rest in shade, and check on the elderly with you.',
  },
  fever: {
    label: 'More fever than usual',
    short: 'fever',
    hi: 'बुखार सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त ताप',
    do: 'Keep drinking fluids. See a clinic if fever lasts more than a day.',
  },
  injury: {
    label: 'More injuries than usual',
    short: 'injuries',
    hi: 'चोटें सामान्य से अधिक',
    mr: 'नेहमीपेक्षा जास्त जखमा',
    do: 'Take care underfoot near the ghats and in crowds. Any clinic will dress a wound free.',
  },
  other: {
    label: 'Health teams are active here',
    short: 'other illness',
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

/* How careful to be here. Three steps, taken straight from the tier the
   detector already assigned — 'act' means a crew was sent, 'watch' means it is
   only being observed — so this is not a new judgement we invented for the
   public, it is the same one the health official sees.
 *
 * THIS FILE PREVIOUSLY REFUSED TO SHOW A SCALE
 *
 * The reasoning was that a ramp invites comparison and comparison moves
 * crowds. That was right about the risk and wrong about the alternative: two
 * states cannot tell a single watch-tier cough cluster apart from an act-tier
 * water outbreak, so a pilgrim reading "take care" had no way to know whether
 * to wash their hands or to keep a child away from the water. Blunt advice is
 * ignored advice.
 *
 * What keeps it safe is everything around it: still no case counts, the areas
 * stay in fixed order rather than being ranked worst-first, every level ends
 * in an instruction, and the board says plainly that moving is not the answer
 * because every area has its own free clinic.
 */
const LEVELS = {
  high: {
    rank: 2,
    en: 'Take extra care', hi: 'विशेष सावधानी', mr: 'विशेष काळजी',
    note: { en: 'A health team has been sent here',
            hi: 'यहाँ स्वास्थ्य दल भेजा गया है',
            mr: 'इथे आरोग्य पथक पाठवले आहे' },
  },
  care: {
    rank: 1,
    en: 'Take care', hi: 'सावधानी रखें', mr: 'काळजी घ्या',
    note: { en: 'Being watched — follow the advice below',
            hi: 'निगरानी में — नीचे दी सलाह मानें',
            mr: 'निरीक्षणात — खालील सल्ला पाळा' },
  },
  ok: {
    rank: 0,
    en: 'All clear', hi: 'सब ठीक', mr: 'सर्व ठीक',
    note: { en: 'Nothing unusual reported',
            hi: 'कुछ असामान्य नहीं',
            mr: 'असामान्य काही नाही' },
  },
}

/* act outranks watch outranks nothing. One act-tier illness sets the level for
   the whole area — a person cannot half-avoid contaminated water. */
function levelOf(rows) {
  if (!rows.length) return 'ok'
  return rows.some(r => r.tier === 'act') ? 'high' : 'care'
}

const STORE_KEY = 'siddhi_my_sector'

/* Three tabs, because a pilgrim standing in a crowd has exactly three
   questions: what is happening where I am, is anywhere else affected, and what
   should I be doing anyway. Everything this page knows fits in those. */
const TABS = [
  { id: 'here',  en: 'My area',   hi: 'मेरा क्षेत्र', mr: 'माझा भाग' },
  { id: 'areas', en: 'All areas', hi: 'सभी क्षेत्र',  mr: 'सर्व भाग' },
  { id: 'well',  en: 'Stay well', hi: 'सुरक्षित रहें', mr: 'सुरक्षित राहा' },
]

export default function PublicPage() {
  const [alerts, setAlerts] = useState([])
  const [ages, setAges] = useState(null)
  const [tab, setTab] = useState(null)   // null until we know if a sector is set
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
        .select('sector, syndrome, advisory, tier, status, ts')
        .neq('status', 'resolved')
      if (alive && data) setAlerts(data)
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const sec = FESTIVAL.sectors.find(s => String(s.id) === sector)

  /* An area can have two things wrong at once, and the old code showed
     whichever row the database happened to return first. Sort so the tier that
     demands action leads, and keep the rest — a pilgrim with a coughing child
     is not helped by us hiding the cough because the water is worse. */
  const hits = useMemo(() => {
    if (!sec) return []
    return alerts
      .filter(a => a.sector === sec.id)
      .sort((x, y) => (y.tier === 'act') - (x.tier === 'act'))
  }, [alerts, sec])

  const hit = hits[0] ?? null
  const issue = hit ? (ISSUE[hit.syndrome] ?? ISSUE.other) : null

  /* Said plainly, without a clock: "since yesterday" is what a person needs to
     judge whether this is new. An exact time would be false precision — the
     alert fires on a six-hour window, not on a moment. */
  const since = useMemo(() => {
    if (!hit?.ts) return null
    const h = (Date.now() - new Date(hit.ts).getTime()) / 3600_000
    if (h < 6) return { en: 'Noticed in the last few hours', hi: 'पिछले कुछ घंटों में', mr: 'गेल्या काही तासांत' }
    if (h < 24) return { en: 'Noticed since earlier today', hi: 'आज ही से', mr: 'आजपासूनच' }
    if (h < 48) return { en: 'Being watched since yesterday', hi: 'कल से निगरानी में', mr: 'कालपासून निरीक्षणात' }
    return { en: 'Being watched for a few days', hi: 'कुछ दिनों से निगरानी में', mr: 'काही दिवसांपासून निरीक्षणात' }
  }, [hit?.ts])

  /* Whether anyone has actually gone. A flag with nobody responding to it reads
     as abandonment; "a team is already there" is the difference between a
     warning and reassurance, and we know it for free from the alert's status. */
  const responding = hits.some(a => a.status && a.status !== 'open')

  const level = levelOf(hits)
  const lv = LEVELS[level]

  /* Who is actually falling ill here.
     Only runs when this sector is flagged, and pulls one column for one
     sector — a few dozen rows — because this page has to stay light enough to
     open on a cheap phone in a crowd. */
  useEffect(() => {
    if (!isConfigured() || !hit) { setAges(null); return }
    let alive = true
    const since = new Date(Date.now() - 12 * 3600_000).toISOString()
    supabase
      .from('encounters')
      .select('age_band')
      .eq('sector', hit.sector)
      .eq('syndrome', hit.syndrome)
      .gte('ts', since)
      .limit(1000)
      .then(r => { if (alive && r.data) setAges(r.data) })
    return () => { alive = false }
  }, [hit?.sector, hit?.syndrome])   // eslint-disable-line react-hooks/exhaustive-deps


  /* Which vulnerable group, if any, is over-represented among these cases.
     Share-based, not count-based: 18-39 is the biggest band at any festival by
     base rate, so "most cases" would point there almost every time and tell a
     parent nothing. A group is named only when its share of THIS sector's
     cases clearly exceeds its share everywhere else, and only when enough
     cases back it — otherwise three unlucky children would summon a notice. */
  const target = useMemo(() => {
    if (!hit || !ages || ages.length < 12) return null
    const byGroup = PRECAUTIONS[hit.syndrome]
    if (!byGroup) return null

    let best = null
    for (const [key, group] of Object.entries(AGE_GROUPS)) {
      const advice = byGroup[key]
      if (!advice) continue
      const n = ages.filter(r => group.bands.includes(r.age_band)).length
      const expected = group.bands.reduce((t, b) => t + (AGE_MIX[b] ?? 0), 0)
      const share = n / ages.length
      const ratio = expected ? share / expected : 0
      if (n >= 5 && ratio >= 1.5 && (!best || ratio > best.ratio)) {
        best = { key, group, advice, ratio }
      }
    }
    return best
  }, [hit, ages])

  /* Deliberately NOT sorted by level. Ranking the areas worst-first turns the
     board into a leaderboard, and a leaderboard is an instruction to move.
     Fixed order also means a returning reader finds their own area in the same
     place every time, which matters more on a phone in a crowd. */
  const board = useMemo(() => FESTIVAL.sectors.map(z => {
    const rows = alerts.filter(a => a.sector === z.id)
    /* Name the ILLNESS, not the suspected cause. The tile used to read
       "water", which is what we are checking, not what people have — a reader
       learned nothing about what to look for in the person beside them. */
    const names = rows.map(x => DISEASE_INFO[x.syndrome] ?? DISEASE_INFO.other)
    return { z, lvl: levelOf(rows), names }
  }), [alerts])

  const tally = useMemo(() => {
    const t = { high: 0, care: 0, ok: 0 }
    for (const b of board) t[b.lvl]++
    return t
  }, [board])

  function choose(id) {
    setSector(String(id))
    try { localStorage.setItem(STORE_KEY, String(id)) } catch { /* private mode */ }
  }


  /* Land on the board when we do not know where they are, on their own area
     when we do. Resolved once, then the reader's own choice is respected. */
  const view = tab ?? (sec ? 'here' : 'areas')

  function pickZone(id) {
    choose(id)
    setTab('here')          // choosing an area IS asking about it
  }

  return (
    <div className="pub">
      <header className="pub-head">
        <Link to="/"><b>Siddhi</b></Link>
        <span>{sec ? sec.name : 'Health information'}</span>
      </header>

      {/* Sticky so the reader can switch without scrolling back up. */}
      <nav className="pub-tabs" role="tablist" aria-label="Sections">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            className={view === t.id ? 'pub-tab on' : 'pub-tab'}
            onClick={() => setTab(t.id)}
          >
            <b>{t.en}</b>
            <small>{t.hi}</small>
          </button>
        ))}
      </nav>

      {/* ---------------- MY AREA ---------------- */}
      {view === 'here' && (
        <section role="tabpanel">
          {!sec ? (
            <p className="pub-ask">
              We do not know which area you are in yet.
              <button className="pub-inline" onClick={() => setTab('areas')}>Choose your area</button>
            </p>
          ) : (
            <>
              <div className={`pub-hero ${level}`}>
                <span className="pub-hero-status">{lv.en} · {lv.hi} · {lv.mr}</span>
                <h1>{sec.name}</h1>
                {issue ? (
                  <>
                    <p className="pub-hero-issue">{issue.label}</p>
                    <p className="pub-hero-lang">{issue.hi}<br />{issue.mr}</p>
                    {since && <p className="pub-hero-since">{since.en} · {since.hi} · {since.mr}</p>}
                    <p className="pub-hero-do">{hit.advisory ?? issue.do}</p>
                    {hits.length > 1 && (
                      <p className="pub-hero-also">
                        Also being watched here:{' '}
                        {hits.slice(1).map(h => (DISEASE_INFO[h.syndrome] ?? DISEASE_INFO.other).name.en).join(' · ')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="pub-hero-issue">Nothing unusual reported in your area.</p>
                    <p className="pub-hero-lang">आपके क्षेत्र में कुछ असामान्य नहीं<br />तुमच्या भागात काही असामान्य नाही</p>
                  </>
                )}
              </div>

              {/* Someone is on it. Only rendered when the alert has actually
                  moved past 'open' — never as a standing reassurance. */}
              {responding && (
                <p className="pub-responding">
                  <b>A health team is already checking this area.</b>
                  <span className="pub-lang">स्वास्थ्य दल जाँच कर रहा है · आरोग्य पथक तपासणी करत आहे</span>
                </p>
              )}

              {/* WHAT THE ILLNESS ACTUALLY IS.
                  "More stomach illness here" is only actionable if you can
                  recognise it starting in the person beside you. Every active
                  illness gets its own card, not just the worst one, and each
                  ends in how it spreads — because advice you understand the
                  reason for is advice you keep following after the first day. */}
              {hits.length > 0 && (
                <section className="pub-what" aria-labelledby="pub-what-h">
                  <h2 id="pub-what-h" className="pub-h">What to watch for</h2>
                  <p className="pub-board-sub">किन लक्षणों पर ध्यान दें · कोणती लक्षणे पाहावीत</p>

                  {hits.map(h => {
                    const d = DISEASE_INFO[h.syndrome] ?? DISEASE_INFO.other
                    return (
                      <article key={h.syndrome} className="pub-dis">
                        <h3>
                          {d.name.en}
                          <span className="pub-lang">{d.name.hi} · {d.name.mr}</span>
                        </h3>
                        <ul className="pub-target-steps">
                          {d.looks.map(x => (
                            <li key={x.en}>
                              <b>{x.en}</b>
                              <span className="pub-lang">{x.hi} · {x.mr}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="pub-dis-spread">
                          <b>{d.spreads.en}</b>
                          <span className="pub-lang">{d.spreads.hi}</span>
                          <span className="pub-lang">{d.spreads.mr}</span>
                        </p>
                      </article>
                    )
                  })}
                </section>
              )}

              {/* Who this is really about — absent when no group stands out,
                  rather than inventing a target. */}
              {target && (
                <section className="pub-target" aria-labelledby="pub-target-h">
                  <span className="pub-target-who">
                    {target.group.en} · {target.group.hi} · {target.group.mr}
                  </span>
                  <h2 id="pub-target-h">{target.advice.lead.en}</h2>
                  <p className="pub-hero-lang">{target.advice.lead.hi}<br />{target.advice.lead.mr}</p>

                  <ul className="pub-target-steps">
                    {target.advice.steps.map(x => (
                      <li key={x.en}>
                        <b>{x.en}</b>
                        <span className="pub-lang">{x.hi} · {x.mr}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="pub-target-now">
                    <b>{target.advice.now.en}</b>
                    <span className="pub-lang">{target.advice.now.hi}</span>
                    <span className="pub-lang">{target.advice.now.mr}</span>
                  </p>
                </section>
              )}

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

              <button className="pub-inline pub-change-area" onClick={() => setTab('areas')}>
                Not in {sec.name}? Change area
              </button>
            </>
          )}
        </section>
      )}

      {/* ---------------- ALL AREAS ---------------- */}
      {view === 'areas' && (
        <section role="tabpanel">
          <h2 className="pub-h">Areas map</h2>
          <p className="pub-board-sub">क्षेत्रों का नक्शा · भागांचा नकाशा</p>

          {/* The whole festival in one line, so a reader knows within a second
              whether this is a quiet day or a busy one — before they start
              hunting for their own area in the grid. */}
          <ul className="pub-tally">
            {['high', 'care', 'ok'].map(k => (
              tally[k] > 0 && (
                <li key={k} className={`pub-tally-${k}`}>
                  <b>{tally[k]}</b>
                  <span>{tally[k] === 1 ? 'area' : 'areas'} · {LEVELS[k].en}</span>
                </li>
              )
            ))}
          </ul>

          {/* The dashboard's sector map has a "fewer -> more cases" ramp under
              it. The same legend here would be a case-count scale in disguise,
              so this one is a scale of CARE, and reads in the direction a
              pilgrim needs: what do I do, not how bad is it. */}
          <ul className="pub-legend" aria-hidden="true">
            {['ok', 'care', 'high'].map(k => (
              <li key={k}>
                <i className={`pub-swatch ${k}`} />
                <span>{LEVELS[k].en}</span>
              </li>
            ))}
          </ul>

          <div className="pub-zones">
            {board.map(({ z, lvl, names }) => {
              const on = sec?.id === z.id
              const L = LEVELS[lvl]
              return (
                <button
                  key={z.id}
                  className={`pub-zone ${lvl}${on ? ' is-here' : ''}`}
                  aria-pressed={on}
                  onClick={() => pickZone(z.id)}
                >
                  {/* The area number is what is painted on the poles and
                      printed on the poster, so it is how a lost person matches
                      the screen to where they are standing. */}
                  <span className="pub-zone-id">{z.id}</span>
                  {on && <span className="pub-zone-you">You are here</span>}
                  <b>{z.name}</b>
                  {/* Colour is never the only carrier: the level is written out,
                      and the tile's left bar thickens with it. */}
                  <i>{L.en}</i>
                  {names.length > 0 && (
                    <em>
                      {names.map(d => d.name.en).join(' · ')}
                      <span className="pub-zone-lang">
                        {names.map(d => d.name.hi).join(' · ')}
                      </span>
                    </em>
                  )}
                </button>
              )
            })}
          </div>

          {/* Placed directly under the grid, because this is the sentence that
              stops the board being read as "go somewhere else". */}
          <p className="pub-detail pub-nomove">
            <b>A marked area is not a reason to move.</b> Every area has its own
            free clinic, and the advice for each one is on its own page. Take the
            precautions where you are.
            <span className="pub-lang">
              चिह्नित क्षेत्र छोड़ने की ज़रूरत नहीं — हर क्षेत्र में मुफ़्त क्लिनिक है
            </span>
            <span className="pub-lang">
              चिन्हांकित भाग सोडण्याची गरज नाही — प्रत्येक भागात मोफत दवाखाना आहे
            </span>
          </p>
        </section>
      )}

      {/* ---------------- STAY WELL ---------------- */}
      {view === 'well' && (
        <section role="tabpanel">
          <h2 className="pub-h">Every day, everywhere</h2>
          <ul className="pub-target-steps pub-always">
            {ALWAYS.map(a => (
              <li key={a.en}>
                <b>{a.en}</b>
                <span className="pub-lang">{a.hi} · {a.mr}</span>
              </li>
            ))}
          </ul>

          <h2 className="pub-h">See a doctor if</h2>
          <ul className="pub-target-steps pub-danger">
            {SEE_A_DOCTOR.map(x => <li key={x}><b>{x}</b></li>)}
          </ul>

          <p className="pub-detail">
            Every clinic is free and asks for no documents. Going early is
            always better than waiting.
          </p>
        </section>
      )}

      <footer className="pub-foot">Nothing here is recorded. No account needed.</footer>
    </div>
  )
}
