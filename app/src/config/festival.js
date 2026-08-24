// Festival configuration — Atreya is config-driven (PROJECT.md rule 8).
// Edit this file to redeploy to a different mass gathering.

export const FESTIVAL = {
  name: 'Kumbh Mela — Nashik-Trimbakeshwar',
  sectors: [
    { id: 1,  name: 'Ramkund',        waterPoints: ['W-1', 'W-2'],  kitchens: ['K-1'] },
    { id: 2,  name: 'Tapovan',        waterPoints: ['W-3'],         kitchens: ['K-2'] },
    { id: 3,  name: 'Panchavati',     waterPoints: ['W-4', 'W-5'],  kitchens: [] },
    { id: 4,  name: 'Gangapur',       waterPoints: ['W-6'],         kitchens: ['K-3'] },
    { id: 5,  name: 'Sadhugram East', waterPoints: ['W-7', 'W-8'],  kitchens: ['K-4', 'K-5'] },
    { id: 6,  name: 'Sadhugram West', waterPoints: ['W-9'],         kitchens: ['K-6'] },
    { id: 7,  name: 'Trimbak Road',   waterPoints: ['W-10'],        kitchens: [] },
    { id: 8,  name: 'Kushavarta',     waterPoints: ['W-11', 'W-12'],kitchens: ['K-7'] },
    { id: 9,  name: 'Nilparvat',      waterPoints: ['W-13'],        kitchens: ['K-8'] },
    { id: 10, name: 'Anjaneri Camp',  waterPoints: ['W-14'],        kitchens: [] },
    { id: 11, name: 'Transit Camp 1', waterPoints: ['W-15', 'W-16'],kitchens: ['K-9'] },
    { id: 12, name: 'Transit Camp 2', waterPoints: ['W-17'],        kitchens: ['K-10'] },
  ],
}

// ~2 clinics per sector, mix of fixed and mobile.
export const CLINICS = [
  { id: 'C01', name: 'Ramkund PHC',          sector: 1,  type: 'fixed'  },
  { id: 'C02', name: 'Ramkund Mobile 1',     sector: 1,  type: 'mobile' },
  { id: 'C03', name: 'Tapovan Clinic',       sector: 2,  type: 'fixed'  },
  { id: 'C04', name: 'Panchavati PHC',       sector: 3,  type: 'fixed'  },
  { id: 'C05', name: 'Panchavati Mobile',    sector: 3,  type: 'mobile' },
  { id: 'C06', name: 'Gangapur Clinic',      sector: 4,  type: 'fixed'  },
  { id: 'C07', name: 'Sadhugram East PHC',   sector: 5,  type: 'fixed'  },
  { id: 'C08', name: 'Sadhugram East Mob.',  sector: 5,  type: 'mobile' },
  { id: 'C09', name: 'Sadhugram West PHC',   sector: 6,  type: 'fixed'  },
  { id: 'C10', name: 'Trimbak Road Clinic',  sector: 7,  type: 'fixed'  },
  { id: 'C11', name: 'Kushavarta PHC',       sector: 8,  type: 'fixed'  },
  { id: 'C12', name: 'Kushavarta Mobile',    sector: 8,  type: 'mobile' },
  { id: 'C13', name: 'Nilparvat Clinic',     sector: 9,  type: 'fixed'  },
  { id: 'C14', name: 'Anjaneri Camp Clinic', sector: 10, type: 'fixed'  },
  { id: 'C15', name: 'Transit 1 PHC',        sector: 11, type: 'fixed'  },
  { id: 'C16', name: 'Transit 1 Mobile',     sector: 11, type: 'mobile' },
  { id: 'C17', name: 'Transit 2 Clinic',     sector: 12, type: 'fixed'  },
]

// Demo users: PIN -> role + context. Hackathon-only auth (PROJECT.md: no real auth).
export const USERS = [
  { pin: '1111', role: 'worker',   name: 'Dr. Meena',    clinicId: 'C07' },
  { pin: '1112', role: 'worker',   name: 'Dr. Arjun',    clinicId: 'C01' },
  { pin: '3333', role: 'crew',     name: 'Sanitation Team 3', unit: 'SAN-3' },
  { pin: '3334', role: 'crew',     name: 'Mobile Medical 2',  unit: 'MED-2' },
  { pin: '4444', role: 'stall',    name: 'Sadhugram East stall', stallId: 'P07' },
  { pin: '4445', role: 'stall',    name: 'Ramkund medicine stall', stallId: 'P01' },
]

export const RESPONSE_UNITS = [
  { id: 'SAN-3', name: 'Sanitation Team 3' },
  { id: 'SAN-5', name: 'Sanitation Team 5' },
  { id: 'MED-2', name: 'Mobile Medical Unit 2' },
  { id: 'MED-4', name: 'Mobile Medical Unit 4' },
]

// Detection thresholds live in worker/src/index.js (WINDOW_H, Z_WATCH, Z_ACT,
// MIN_COUNT) — that is the only code that scores anything. A mirrored copy used
// to sit here looking authoritative while being wired to nothing, so editing it
// changed no behaviour. Change the worker.

/* Medicine stalls — the second signal's reporters. Mirrors STALLS in
   worker/src/index.js; one per clinic sector so a keeper's tally lands in the
   same sector the clinical count is measured in. */
export const STALLS = [
  { id: 'P01', name: 'Ramkund medicine stall',      sector: 1 },
  { id: 'P03', name: 'Tapovan medicine stall',      sector: 2 },
  { id: 'P04', name: 'Panchavati medicine stall',   sector: 3 },
  { id: 'P06', name: 'Gangapur medicine stall',     sector: 4 },
  { id: 'P07', name: 'Sadhugram East stall',        sector: 5 },
  { id: 'P09', name: 'Sadhugram West stall',        sector: 6 },
  { id: 'P10', name: 'Trimbak Road stall',          sector: 7 },
  { id: 'P11', name: 'Kushavarta stall',            sector: 8 },
  { id: 'P13', name: 'Nilparvat stall',             sector: 9 },
  { id: 'P14', name: 'Anjaneri Camp stall',         sector: 10 },
  { id: 'P15', name: 'Transit 1 stall',             sector: 11 },
  { id: 'P17', name: 'Transit 2 stall',             sector: 12 },
]

/* What a keeper can tally. Only rehydration products carry the diarrhoeal
   signal — paracetamol and cough syrup are sold for everything and would bury
   it in noise, which is why the engine counts exactly these three. */
export const STALL_ITEMS = [
  { id: 'ors',           en: 'ORS packets',   hi: 'ओआरएस',      mr: 'ओआरएस' },
  { id: 'zinc',          en: 'Zinc tablets',  hi: 'ज़िंक',        mr: 'झिंक' },
  { id: 'antidiarrheal', en: 'Anti-diarrhoeal', hi: 'दस्त की दवा', mr: 'जुलाबाची औषध' },
]
