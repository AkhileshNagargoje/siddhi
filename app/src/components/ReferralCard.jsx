import { qrPath, referralUrl, riskLabel } from '../lib/referral'
import { FESTIVAL } from '../config/festival'

/* The printed card a flagged pilgrim carries home. Deliberately low-tech on the
   patient's side: paper and a QR, nothing to install. */
export function ReferralCard({ referral, onClose }) {
  const url = referralUrl(referral)
  const { d, n } = qrPath(url)

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet-inner" onClick={e => e.stopPropagation()}>
        <div className="card" id="referral-card">
          <div className="card-head">
            <div>
              <b>Follow-up referral</b>
              <small>{FESTIVAL.name}</small>
            </div>
            <span className="card-token">{referral.token}</span>
          </div>

          <div className="card-body">
            <svg className="card-qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img"
                 aria-label="referral QR code" data-url={url}>
              <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
              <path d={d} fill="#000" />
            </svg>

            <dl className="card-facts">
              <div><dt>Patient</dt><dd>{referral.ageBand} · {referral.sex}</dd></div>
              <div><dt>Seen at</dt><dd>{referral.clinic}</dd></div>
              <div><dt>Date</dt><dd>{referral.date}</dd></div>
              {referral.vitals?.bp && <div><dt>BP</dt><dd>{referral.vitals.bp} mmHg</dd></div>}
              {referral.vitals?.sugar && <div><dt>Blood sugar</dt><dd>{referral.vitals.sugar} mg/dL</dd></div>}
            </dl>
          </div>

          <ul className="card-flags">
            {referral.flags.map(f => <li key={f}>{riskLabel(f)}</li>)}
          </ul>

          <p className="card-note">
            Show this card at your nearest health centre.
            <span>अपने नज़दीकी स्वास्थ्य केंद्र पर यह कार्ड दिखाएँ।</span>
          </p>
        </div>

        <div className="sheet-acts">
          <button className="btn btn-quiet" onClick={onClose}>Done</button>
          <button className="btn btn-accent" onClick={() => window.print()}>Print card</button>
        </div>
      </div>
    </div>
  )
}
