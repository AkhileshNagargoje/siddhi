// Medical vocabulary — symptom chips, diagnoses, syndrome mapping, drugs.
// Translations drafted by Claude; Person A verifies against native speakers.

export const AGE_BANDS = ['0-5', '6-17', '18-39', '40-59', '60+']
export const SEXES = ['M', 'F', 'Other']
/* Severity is the softest field on the form: three bare words, and two
   clinicians will grade the same patient differently. It is deliberately kept
   OUT of the detection maths for that reason — alerting counts cases by
   syndrome, so an inconsistent severity call can neither raise a false alert
   nor hide a real one.

   It still drives what an officer sees, so a shared anchor is worth more than
   nothing. These lines are a plain-language prompt, NOT clinical criteria —
   real deployment needs syndrome-specific definitions signed off by a
   clinician (dehydration grade for diarrhoeal illness, and so on). The hint
   says what the grade means for the patient's next step, which is the part a
   surveillance system actually cares about. */
export const SEVERITIES = [
  { id: 'mild',     hint: 'treated and sent on' },
  { id: 'moderate', hint: 'needs observation or repeat visit' },
  { id: 'severe',   hint: 'referral, IV fluids, or cannot walk unaided' },
]

export const SYMPTOMS = [
  { id: 'fever',          en: 'Fever',           hi: 'बुखार',          mr: 'ताप' },
  { id: 'loose_motions',  en: 'Loose motions',   hi: 'दस्त',           mr: 'जुलाब' },
  { id: 'vomiting',       en: 'Vomiting',        hi: 'उल्टी',          mr: 'उलटी' },
  { id: 'cough',          en: 'Cough',           hi: 'खांसी',          mr: 'खोकला' },
  { id: 'breathless',     en: 'Breathlessness',  hi: 'सांस फूलना',     mr: 'धाप लागणे' },
  { id: 'injury',         en: 'Injury',          hi: 'चोट',            mr: 'जखम' },
  { id: 'dizziness',      en: 'Dizziness',       hi: 'चक्कर',          mr: 'चक्कर' },
  { id: 'rash',           en: 'Skin rash',       hi: 'चकत्ते',         mr: 'पुरळ' },
  { id: 'weakness',       en: 'Weakness',        hi: 'कमज़ोरी',        mr: 'अशक्तपणा' },
  { id: 'dehydration',    en: 'Dehydration',     hi: 'पानी की कमी',    mr: 'निर्जलीकरण' },
]

export const DIAGNOSES = [
  { id: 'age',        en: 'Acute gastroenteritis',    syndrome: 'gi' },
  { id: 'ari',        en: 'Respiratory infection',     syndrome: 'respiratory' },
  { id: 'heat',       en: 'Heat exhaustion',           syndrome: 'heat' },
  { id: 'injury',     en: 'Injury / trauma',           syndrome: 'injury' },
  { id: 'skin',       en: 'Skin infection',            syndrome: 'other' },
  { id: 'fuo',        en: 'Fever unknown origin',      syndrome: 'fever' },
  { id: 'htn',        en: 'High blood pressure',       syndrome: 'screening' },
  { id: 'dm',         en: 'High blood sugar',          syndrome: 'screening' },
  { id: 'other',      en: 'Other',                     syndrome: 'other' },
]

export const SYNDROME_LABELS = {
  gi: 'Acute diarrhoeal illness',
  respiratory: 'Respiratory illness',
  heat: 'Heat-related illness',
  fever: 'Undifferentiated fever',
  injury: 'Injury',
  other: 'Other',
}

export const DRUGS = [
  { id: 'ors',     name: 'ORS',            antibiotic: false },
  { id: 'zinc',    name: 'Zinc',           antibiotic: false },
  { id: 'pcm',     name: 'Paracetamol',    antibiotic: false },
  { id: 'orsyp',   name: 'Cough syrup',    antibiotic: false },
  { id: 'ondan',   name: 'Ondansetron',    antibiotic: false },
  { id: 'ibup',    name: 'Ibuprofen',      antibiotic: false },
  { id: 'azithro', name: 'Azithromycin',   antibiotic: true },
  { id: 'cipro',   name: 'Ciprofloxacin',  antibiotic: true },
  { id: 'amox',    name: 'Amoxicillin',    antibiotic: true },
  { id: 'doxy',    name: 'Doxycycline',    antibiotic: true },
  { id: 'metro',   name: 'Metronidazole',  antibiotic: true },
  { id: 'antacid', name: 'Antacid',        antibiotic: false },
]

// Tier 2: antibiotic stewardship rules. Drafted from WHO/ICMR general guidance;
// Person A verifies each row. usuallyNeeded=false triggers the nudge.
export const ANTIBIOTIC_RULES = {
  // ICMR: antimicrobial therapy is not typically indicated for acute watery
  // diarrhoea in adults — ORS first. The exceptions are named in the prompt so
  // a clinician treating dysentery or cholera isn't second-guessed wrongly.
  age:    { usuallyNeeded: false, note: 'Acute watery diarrhoea: ORS and zinc first — antibiotics are not routinely indicated. Exceptions: bloody stool, or suspected cholera.' },
  ari:    { usuallyNeeded: false, note: 'Most upper respiratory infections are viral. Antibiotics do not shorten them.' },
  heat:   { usuallyNeeded: false, note: 'Heat illness needs cooling and fluids, not antibiotics.' },
  injury: { usuallyNeeded: false, note: 'Clean minor wounds need dressing; antibiotics only if infected.' },
  skin:   { usuallyNeeded: true,  note: 'Bacterial skin infections often need antibiotics.' },
  fuo:    { usuallyNeeded: false, note: 'Investigate before empirical antibiotics unless severe.' },
  htn:    { usuallyNeeded: false, note: 'Not an infection.' },
  dm:     { usuallyNeeded: false, note: 'Not an infection.' },
  other:  { usuallyNeeded: true,  note: 'Unknown — no nudge.' },
}

/* Referral thresholds — verified against Indian national guidance, Aug 2026.
   BP 140/90 is the diagnostic and referral cut-off used by India's national
   guideline and the India Hypertension Control Initiative (WHO HEARTS package).
   160/100 is a different thing — the level at which a second reading is taken
   the same day — and using it here would have silently missed everyone between
   140/90 and 160/100, which is the bulk of undiagnosed hypertension.
   Random blood glucose ≥200 mg/dL is the standard community screening cut-off
   (NPCDCS / WHO), so that one stands. */
export const RISK_RULES = {
  bpSystolicHigh: 140,
  bpDiastolicHigh: 90,
  sugarHighMgDl: 200,
}
