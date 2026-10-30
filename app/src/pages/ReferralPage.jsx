import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decodeReferral, riskLabel } from '../lib/referral'

/* What the home-district clinician sees after scanning the card.
   Reads entirely from the URL fragment — works with no network and no login. */
export default function ReferralPage() {
  const [ref, setRef] = useState(undefined)

  useEffect(() => {
    const frag = window.location.hash.replace(/^#/, '')
    setRef(frag ? decodeReferral(frag) : null)
  }, [])

  if (ref === undefined) return null

  if (!ref) {
    return (
      <div className="login">
        <div className="login-card">
          <h2>Referral not readable</h2>
          <p>This link is incomplete. Scan the QR code on the card again.</p>
          <Link className="btn btn-wide" to="/">Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="scan">
      <div className="scan-card">
        <span className="badge badge-warning">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path d="M8 2.2L14.4 13.4H1.6z" fill="none" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8 6v3.2M8 11.2v.6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          follow-up needed
        </span>

        <h2>Referral {ref.token}</h2>
        <p className="scan-sub">Recorded during the mass gathering. No account needed to read this.</p>

        <ul className="scan-flags">
          {ref.flags.map(f => <li key={f}>{riskLabel(f)}</li>)}
        </ul>

        <dl className="card-facts">
          <div><dt>Patient</dt><dd>{ref.ageBand} · {ref.sex}</dd></div>
          <div><dt>Seen at</dt><dd>{ref.clinic}</dd></div>
          <div><dt>Date</dt><dd>{ref.date}</dd></div>
          {ref.vitals?.bp && <div><dt>BP recorded</dt><dd>{ref.vitals.bp} mmHg</dd></div>}
          {ref.vitals?.sugar && <div><dt>Blood sugar</dt><dd>{ref.vitals.sugar} mg/dL</dd></div>}
        </dl>

        <p className="scan-foot">
          Siddhi carries a finding from a mass gathering back to the person's own
          health system, instead of it being lost when they travel home.
        </p>
      </div>
    </div>
  )
}
