import type { LanguageCode } from './types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number): string => String(n).padStart(2, '0')

/** Kroll's date format, `11-Nov-2026`. */
export const krollDate = (d: Date): string => `${pad(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`

/** Kroll's date and time, `11-Nov-2026 14:32`. */
export const krollDateTime = (d: Date): string => `${krollDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Kroll's short date on Fill Rx, `11/11/26` (day/month/year). */
export const krollShortDate = (d: Date): string => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`

/** The demo fills today, so the label and the translation record agree. The Rx expires a year later. */
export const TODAY = new Date()
const EXPIRY = new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate())

/** The prescription on screen in every Figma frame. */
/**
 * Ms. Mei Leung, the team's primary persona (Figma "Primary user persona 1"): 74, retired, lives in
 * Markham, speaks Cantonese with limited English and reads Simplified Chinese. The phone number is
 * fictional (555-01xx is reserved for fiction).
 */
export const PATIENT = {
  lastName: 'Leung',
  firstName: 'Mei',
  salutation: 'Ms.',
  address: '3255 Hwy 7',
  city: 'Markham',
  postal: 'L3R 3P9',
  email: 'mei.leung@email.com',
  phone: '(437) 555-0142',
  phoneLabel: 'Home',
  birthdate: '03/14/1952',
  age: '74 years',
  gender: 'Female',
  height: `5' 1"`,
  weight: '115',
  familyDoctor: 'Dr. McGraw, Phil',
  phn: '0000-000-142-ML',
  plan: 'ODB',
  allergies: 'No known drug allergies',
  conditions: 'Iron deficiency anemia',
}

export const RX = {
  number: '1000051',
  pharmacy: 'Kroll Pharmacy',
  pharmacyPhone: '416-383-1010',
  pharmacyAddress: '220 Duncan Mill Road, Toronto ON M3B 3J5',
  doctor: 'Dr. McGraw, Phil',
  date: krollDate(TODAY),
  /** Kroll's short form of `date`, for Fill Rx. */
  firstFill: krollShortDate(TODAY),
  expiry: krollDate(EXPIRY),
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

/** Everything the presenter can edit on screen. These flow through to the printed labels. */
export interface Details {
  lastName: string
  firstName: string
  salutation: string
  address: string
  city: string
  postal: string
  email: string
  phone: string
  /** The phone row's description, e.g. `Home` or `Daughter (Sara)`. */
  phoneLabel: string
  familyDoctor: string
  /** Health card number: a clearly fake demo value. */
  phn: string
  /** Drug plan, e.g. ODB (Ontario Drug Benefit, 65+). */
  plan: string
  allergies: string
  conditions: string
  birthdate: string
  age: string
  gender: string
  height: string
  weight: string
  doctor: string
  brand: string
  strength: string
  generic: string
  quantity: string
  refills: string
}

/** Patients the demo can load. Edge-case scenarios can add more. */
export type PersonaId = 'leung' | 'farahani'

const RX_DETAILS = { doctor: RX.doctor, brand: RX.brand, strength: RX.strength, generic: RX.generic, quantity: RX.quantity, refills: RX.refills }

/**
 * Mrs. Parvin Farahani is the mother of Sara Farahani, the team's secondary persona ("the family
 * interpreter", Figma "Secondary user persona 1"). She reads Persian, which isn't translatable at
 * rollout. The persona doesn't give her details, so her name, age and address are demo values.
 * Sara is her contact. Phone numbers are fictional (555-01xx) and health card numbers are obviously fake.
 */
export const PERSONAS: Record<PersonaId, Details> = {
  leung: { ...PATIENT, ...RX_DETAILS },
  farahani: {
    ...PATIENT,
    ...RX_DETAILS,
    lastName: 'Farahani',
    firstName: 'Parvin',
    salutation: 'Mrs.',
    address: '46 Mill St',
    city: 'Richmond Hill',
    postal: 'L4C 4B7',
    email: 'parvin.farahani@email.com',
    phone: '(437) 555-0177',
    phoneLabel: 'Daughter (Sara)',
    birthdate: '06/21/1957',
    age: '69 years',
    height: `5' 3"`,
    weight: '142',
    phn: '0000-000-177-PF',
    allergies: 'Penicillin',
  },
}

/** Each patient's prescription on screen. */
export const PERSONA_RX: Record<PersonaId, string> = { leung: '1000051', farahani: '1000052' }


/** `Last, First` as Kroll prints it. */
export const patientName = (d: Details): string => (d.firstName ? `${d.lastName}, ${d.firstName}` : d.lastName)

/**
 * The presenter's list. Each scenario can be set up (Fill Rx loaded, the presenter drives) or,
 * when it has a walkthrough, guided step by step. The basic demo comes first; edge cases follow.
 */
export interface Scenario {
  id: string
  title: string
  detail: string
  language: LanguageCode
  sig: string
  persona?: PersonaId
  /** The walkthrough that guides this scenario, if it has one. */
  tour?: string
  /** Listed under Edge cases. */
  edge?: boolean
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'leung',
    title: 'Basic: sig code → labels',
    detail: 'Ms. Leung · 1C PO BID. Her language at intake, a verified Chinese sentence, and the peel-back label.',
    language: 'zh-Hans',
    sig: '1C PO BID',
    persona: 'leung',
    tour: 'leung',
  },
  { id: 'rollout', title: 'Language not supported yet', detail: 'Mrs. Farahani · Persian. English label, and the need is logged.', language: 'fa', sig: 'DAILY', persona: 'farahani', tour: 'rollout', edge: true },
  { id: 'no-match', title: 'No verified sentence fits', detail: 'Free text “1 CAP DAILY FOR ANEMIA”. Closest, top 5, guide, English only.', language: 'zh-Hans', sig: '1 CAP DAILY FOR ANEMIA', persona: 'leung', tour: 'no-match', edge: true },
  { id: 'tech-preview', title: 'Technician flags a line before printing', detail: 'Report from the preview; that line prints in English.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'tech-preview', edge: true },
  { id: 'directions-flagged', title: 'Dosing directions flagged', detail: 'Severity 1 report submitted, English-only label.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'directions-flagged', edge: true },
  { id: 'phone-call', title: 'Family calls days later', detail: 'Find Rx 1000048 by number, report, reprint, AIMS.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'phone-call', edge: true },
  { id: 'network-pause', title: 'TELUS pauses a sentence', detail: 'After confirming a report: notice, callback list, English until fixed.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'network-pause', edge: true },
  { id: 'fix-ships', title: 'TELUS ships the fix', detail: 'New library version, report Fixed, translating again.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'fix-ships', edge: true },
  { id: 'wrong-phrase', title: 'Wrong English phrase picked', detail: 'A pharmacy error: logged, nothing paused.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'wrong-phrase', edge: true },
  { id: 'offline-dispute', title: 'Offline, then a dispute', detail: 'Receipt queues, then the entry is verified.', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung', tour: 'offline-dispute', edge: true },
]

/** The pharmacist signed in to Kroll. Translation records name them as the one who confirmed the English. */
export const PHARMACIST = 'RPh J. Lee'

/** The verified library's release the demo pretends to read from. */
export const LIBRARY_VERSION = 'v2026.11'

/** A sig or language need logged from an English-only print, for the translation library team. */
export interface TranslationRequest {
  id: string
  language: string
  /** The sig as entered, or `(language)` when the whole language is missing. */
  sig: string
  rx: string
  logged: string
  status: 'Pending' | 'In review' | 'Verified'
}

/** Requests already in the queue when the demo starts (illustrative). */
export const daysAgo = (n: number): string => krollDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n))

/** A request for a whole language (none of its sigs are verified yet), in the queue's Sig column. */
export const WHOLE_LANGUAGE = 'Whole language (no sigs yet)'

export const SEED_REQUESTS: TranslationRequest[] = [
  { id: 'TR-0039', language: 'Punjabi', sig: WHOLE_LANGUAGE, rx: '1000047', logged: daysAgo(7), status: 'Pending' },
  { id: 'TR-0040', language: 'Hindi', sig: '1 CAP Q2D WITH MEALS', rx: '1000049', logged: daysAgo(4), status: 'In review' },
  { id: 'TR-0041', language: 'Urdu', sig: WHOLE_LANGUAGE, rx: '1000050', logged: daysAgo(2), status: 'Pending' },
]
