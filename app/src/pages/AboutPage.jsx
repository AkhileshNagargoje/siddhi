import { Link } from 'react-router-dom'

/* The page a judge opens for ninety seconds with thirty tabs already open.
   It has to earn the next thirty seconds, so the problem comes first and the
   product second — and every number on it is sourced, because two of them are
   the load-bearing claims of the whole project. */

const NUMBERS = [
  {
    value: '31%',
    label: 'of patient encounters at the 2013 and 2015 Melas received antibiotics — recorded by a surveillance system, and never acted on',
    href: 'https://publichealth.jmir.org/2023/1/e45121',
    cite: 'JMIR Public Health & Surveillance, 2023',
  },
  {
    value: '2,000+',
    label: 'visits logged on tablets across 30+ clinics on the first day — proof that health workers will enter the data',
    href: 'https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/',
    cite: 'Harvard Mittal South Asia Institute',
  },
  {
    value: '7 hours',
    label: 'median time from first case to alert, measured across a thousand simulated festivals — at 8 cases, against 33 before a cluster is obvious unaided',
    href: null,
    cite: 'worker/eval/harness.mjs',
  },
]

const DOES = [
  ['Records a patient in about ten seconds', 'Tap-based, works with no network, syncs when it can. If this is slow, doctors abandon it and everything downstream goes dark.'],
  ['Pools every clinic into one live picture', 'The aggregate that has never existed at these events. Three cases here and four there only become fourteen somewhere.'],
  ['Detects a cluster and shows its arithmetic', 'Observed, expected, how many standard deviations. No black box — officials act on numbers they can argue with.'],
  ['Turns the alert into a job someone must close', 'Assigned to a named crew, acknowledged and resolved with a note. This is the part everyone else leaves out.'],
  ['Corroborates with a second, independent signal', 'Pharmacy rehydration sales lead clinic cases, because people self-medicate before they consult.'],
  ['Carries the finding home with the patient', 'A printed QR that a village clinic reads with no network and no app.'],
]

export default function AboutPage() {
  return (
    <div className="about">
      <header className="about-head">
        <h1>Siddhi</h1>
        <p>Outbreak early warning for mass gatherings.</p>
      </header>

      <section className="about-problem">
        <p>Fourteen people in one sector fall ill from the same water tap.</p>
        <p>They go to four different clinics. Each doctor sees three or four cases — a normal day.</p>
        <p><b>Nobody sees fourteen, because nobody is adding them up.</b></p>
      </section>

      <p className="about-lede">
        By the time the outbreak is obvious it is day four, there are hundreds of cases,
        and pilgrims have carried it home to dozens of districts. The data needed to
        prevent it was collected. It never reached a decision-maker in time.
      </p>

      <section className="about-nums">
        {NUMBERS.map(n => (
          <div key={n.value} className="about-num">
            <b>{n.value}</b>
            <span>{n.label}</span>
            {n.href
              ? <a href={n.href} target="_blank" rel="noreferrer">{n.cite} ↗</a>
              : <em>{n.cite}</em>}
          </div>
        ))}
      </section>

      <section className="about-block">
        <h2>What it does</h2>
        <ol className="about-does">
          {DOES.map(([t, d]) => (
            <li key={t}><b>{t}</b><span>{d}</span></li>
          ))}
        </ol>
      </section>

      <section className="about-block">
        <h2>What we deliberately did not build</h2>
        <ul className="about-nots">
          <li><b>No app for pilgrims.</b> Elderly, rural, transient visitors will not install software for a three-day trip. They get a printed card and a poster.</li>
          <li><b>No machine learning in detection.</b> Twelve sectors and six syndromes is seventy-two series with no labelled outbreak history. There is nothing for a model to learn that arithmetic does not already give you — and an alert nobody can question is an alert nobody uses.</li>
          <li><b>No public map of infected areas.</b> At a festival where a crowd crush has killed people, moving a dense crowd is more dangerous than the pathogen. Areas are shown with instructions, never with case counts, and an officer approves the wording.</li>
          <li><b>Nothing that blocks a doctor.</b> The antibiotic prompt is a question with two buttons. Their judgement always wins.</li>
        </ul>
      </section>

      <section className="about-block">
        <h2>Known limits</h2>
        <p className="about-limits">
          Detection uses raw counts, so a genuine crowd surge on a bathing day would
          raise alerts across every sector — normalising by crowd size is the first
          thing we would fix. The baseline is three days of history, which is short,
          and a Poisson floor rather than the sample deviation does most of the work
          in it. The demonstration data is synthetic, generated through the same API a
          real tablet writes to.
        </p>
      </section>

      <section className="about-block">
        <h2>Built with</h2>
        <p className="about-stack">
          React and plain CSS · Supabase for Postgres and live updates · a Cloudflare
          Worker running detection every five minutes · no UI framework, no charting
          library, no ML.
        </p>
      </section>

      <nav className="about-links">
        <Link className="btn btn-accent" to="/dashboard">Open the control room</Link>
        <Link className="btn btn-quiet" to="/replay">Watch an outbreak caught</Link>
        <a className="btn btn-quiet" href="https://github.com/AkhileshNagargoje/siddhi" target="_blank" rel="noreferrer">Read the code ↗</a>
      </nav>

      <footer className="about-foot">
        Built for a hackathon, on the premise that the 2015 project at this festival
        proved health workers will enter the data — and then only drew charts with it.
      </footer>
    </div>
  )
}
