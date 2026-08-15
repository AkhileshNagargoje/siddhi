// Festival configuration — Drishti is config-driven (PROJECT.md rule 8).
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
  { pin: '2222', role: 'official', name: 'Mr. Patil' },
  { pin: '3333', role: 'crew',     name: 'Sanitation Team 3', unit: 'SAN-3' },
  { pin: '3334', role: 'crew',     name: 'Mobile Medical 2',  unit: 'MED-2' },
]

export const RESPONSE_UNITS = [
  { id: 'SAN-3', name: 'Sanitation Team 3' },
  { id: 'SAN-5', name: 'Sanitation Team 5' },
  { id: 'MED-2', name: 'Mobile Medical Unit 2' },
  { id: 'MED-4', name: 'Mobile Medical Unit 4' },
]

// Detection thresholds (PROJECT.md: exact spec)
export const DETECTION = {
  windowHours: 6,
  baselineHours: 72,
  zThreshold: 3,
  zActThreshold: 4,
  minCount: 8,
  intervalMinutes: 5,
}
