import type { LanguageCode } from './types'

/** The prescription on screen in every Figma frame. */
export const PATIENT = {
  lastName: 'Shah',
  firstName: 'Rohan',
  salutation: 'Ms.',
  address: '100 Main St',
  city: 'Vancouver',
  postal: 'M1M 1M1',
  email: 'rshah@email.com',
  phone: '(555) 555-5555',
  birthdate: '05/05/1980',
  age: '34 years',
  gender: 'Female',
  height: `5' 6"`,
  weight: '120',
}

export const RX = {
  number: '1000051',
  pharmacy: 'Kroll Pharmacy',
  pharmacyPhone: '416-383-1010',
  pharmacyAddress: '220 Duncan Mill Road, Toronto ON M3B 3J5',
  doctor: 'Dr. McGraw, Phil',
  date: '06-Oct-2014',
  expiry: '01-Jan-2015',
  quantity: '30',
  form: 'CAP',
  brand: 'Euro-Fer',
  strength: '300mg',
  generic: 'Ferrous Fumarate',
  din: '02237556',
  manufacturer: 'EUC',
  refills: '6',
  warnings: [
    'Take medication on an empty stomach-one hour before or two to three hours after a meal unless otherwise directed by your doctor.',
    'If this medication upsets your stomach, take it with crackers, bread or a small meal.',
    'May cause discoloration of the urine or feces.',
    'Medication should be taken with plenty of water.',
    'Do not lie down for at least 10 minutes after taking this medication.',
  ],
}

/** One-click setups for presenting each branch of the flow. */
export interface Scenario {
  id: string
  title: string
  detail: string
  language: LanguageCode
  sig: string
}

export const SCENARIOS: Scenario[] = [
  { id: 'exact-code', title: 'Hindi · Kroll code *1C', detail: 'Exact match (B3 → B4 → B5)', language: 'hi', sig: '*1C' },
  { id: 'closest', title: 'Hindi · free-text sig', detail: 'Closest → top 5 → phrasing guide → can’t translate (B6 → B10)', language: 'hi', sig: '1 CAP QHS PRN DIZZINESS' },
  { id: 'exact-text', title: 'Hindi · free text, exact', detail: 'Free text that matches a verified sig exactly', language: 'hi', sig: 'take 2 capsules by mouth twice daily' },
  { id: 'tagalog', title: 'Tagalog · *1C', detail: 'Captured, not yet translatable (B3t → B4t)', language: 'tl', sig: '*1C' },
  { id: 'arabic', title: 'Arabic · *1C', detail: 'Right-to-left under-panel (label 12)', language: 'ar', sig: '*1C' },
  { id: 'chinese', title: 'Chinese (Traditional) · *1C', detail: 'Traditional script label (label 17)', language: 'zh-Hant', sig: '*1C' },
  { id: 'punjabi', title: 'Punjabi (Shahmukhi) · *1C', detail: 'Dual-script case (label 16)', language: 'pa', sig: '*1C' },
]
