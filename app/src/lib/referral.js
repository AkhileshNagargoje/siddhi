import qr from 'qrcode-generator'
import { RISK_RULES } from '../config/medical'

/* The referral card is self-contained: the QR carries the referral itself, not a
   lookup key. A village health centre can read it with no network and no app —
   which is the whole point of a paper card for this population. The payload sits
   in the URL *fragment*, so it is never transmitted to any server, and it carries
   no name or identifier — only an age band, sex, the reading, and the origin. */

const RISK_LABEL = {
  bp: 'High blood pressure',
  sugar: 'High blood sugar',
  tb: 'TB symptoms — needs screening',
}

export function riskFlags({ diagnosis, symptoms = [], vitals = {} }) {
  const flags = []
  const sys = Number(vitals.sys) || 0
  const dia = Number(vitals.dia) || 0
  const sugar = Number(vitals.sugar) || 0

  if (diagnosis === 'htn' || sys >= RISK_RULES.bpSystolicHigh || dia >= RISK_RULES.bpDiastolicHigh) flags.push('bp')
  if (diagnosis === 'dm' || sugar >= RISK_RULES.sugarHighMgDl) flags.push('sugar')
  // Cough plus fever plus weakness is the standard prompt to screen for TB.
  if (symptoms.includes('cough') && symptoms.includes('fever') && symptoms.includes('weakness')) flags.push('tb')

  return flags
}

export function riskLabel(f) { return RISK_LABEL[f] ?? f }

export function makeToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
}

/* Compact keys keep the QR sparse enough to scan off a cheap print. */
export function encodeReferral(r) {
  const payload = { t: r.token, a: r.ageBand, s: r.sex, c: r.clinic, d: r.date, f: r.flags, v: r.vitals }
  const json = JSON.stringify(payload)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeReferral(frag) {
  try {
    const b64 = frag.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const p = JSON.parse(json)
    return { token: p.t, ageBand: p.a, sex: p.s, clinic: p.c, date: p.d, flags: p.f ?? [], vitals: p.v ?? {} }
  } catch { return null }
}

export function referralUrl(referral) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/r#${encodeReferral(referral)}`
}

/* Returns an SVG path string + module count so the caller can size it freely. */
export function qrPath(text) {
  const code = qr(0, 'M')
  code.addData(text)
  code.make()
  const n = code.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (code.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    }
  }
  return { d, n }
}
