// Medical vocabulary — symptom chips, diagnoses, syndrome mapping, drugs.
// Translations drafted by Claude; Person A verifies against native speakers.

export const AGE_BANDS = ['0-5', '6-17', '18-39', '40-59', '60+']
export const SEXES = ['M', 'F', 'Other']
export const SEVERITIES = ['mild', 'moderate', 'severe']

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

// Syndromes the detection engine tracks (screening excluded — not outbreak-relevant)
export const SYNDROMES = ['gi', 'respiratory', 'heat', 'fever', 'injury', 'other']

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
  age:    { usuallyNeeded: false, note: 'Most acute gastroenteritis is viral or self-limiting; ORS + zinc first.' },
  ari:    { usuallyNeeded: false, note: 'Most upper respiratory infections are viral.' },
  heat:   { usuallyNeeded: false, note: 'Heat illness needs cooling and fluids, not antibiotics.' },
  injury: { usuallyNeeded: false, note: 'Clean minor wounds need dressing; antibiotics only if infected.' },
  skin:   { usuallyNeeded: true,  note: 'Bacterial skin infections often need antibiotics.' },
  fuo:    { usuallyNeeded: false, note: 'Investigate before empirical antibiotics unless severe.' },
  htn:    { usuallyNeeded: false, note: 'Not an infection.' },
  dm:     { usuallyNeeded: false, note: 'Not an infection.' },
  other:  { usuallyNeeded: true,  note: 'Unknown — no nudge.' },
}

// Tier 2: risk flag thresholds for referrals
export const RISK_RULES = {
  bpSystolicHigh: 160,
  bpDiastolicHigh: 100,
  sugarHighMgDl: 200,
}
