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
const TODAY = new Date()
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
  email: '',
  phone: '(437) 555-0142',
  birthdate: '',
  age: '74 years',
  gender: 'Female',
  height: '',
  weight: '',
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
export type PersonaId = 'leung'

const RX_DETAILS = { doctor: RX.doctor, brand: RX.brand, strength: RX.strength, generic: RX.generic, quantity: RX.quantity, refills: RX.refills }

export const PERSONAS: Record<PersonaId, Details> = {
  leung: { ...PATIENT, ...RX_DETAILS },
}

/** A photo on file for the patient (Kroll's photo slot). */
export const PHOTOS: Partial<Record<PersonaId, string>> = { leung: 'leung' }

/** `Last, First` as Kroll prints it. */
export const patientName = (d: Details): string => (d.firstName ? `${d.lastName}, ${d.firstName}` : d.lastName)

/**
 * RX.warnings in the patient's language, in the same order, for the under-panel, matching
 * the Figma labels (section C2). A language without an entry keeps its warnings in English.
 * Hindi is the team's wording. Chinese is the team's Simplified wording (Figma "Letter - 76"),
 * which still needs team verification.
 */
export const RX_WARNINGS: Partial<Record<LanguageCode, string[]>> = {
  hi: [
    'दवा खाली पेट लें—भोजन से एक घंटा पहले या भोजन के दो से तीन घंटे बाद, जब तक कि आपके डॉक्टर ने अन्यथा निर्देश न दिए हों।',
    'यदि इस दवा से आपके पेट में परेशानी होती है, तो इसे क्रैकर्स, ब्रेड या थोड़े से भोजन के साथ लें।',
    'इस दवा के कारण पेशाब या मल के रंग में बदलाव हो सकता है।',
    'इस दवा को भरपूर पानी के साथ लेना चाहिए।',
    'इस दवा को लेने के बाद कम से कम 10 मिनट तक न लेटें',
  ],
  'zh-Hans': [
    '除非医生另有指示，请空腹服药：饭前1小时或饭后2至3小时服用。',
    '如服药后胃部不适，可与饼干、面包或少量食物同服。',
    '本药可能使尿液或粪便变色。',
    '服药时请饮用足量的水。',
    '服药后至少10分钟内不要躺下。',
  ],
}

/** One-click setups for presenting each branch of the flow. */
export interface Scenario {
  id: string
  title: string
  detail: string
  language: LanguageCode
  sig: string
  persona?: PersonaId
}

export const SCENARIOS: Scenario[] = [
  { id: 'leung', title: 'Ms. Leung · 1C PO BID', detail: 'Basic demo: a sig code prints the English label and the Chinese under-panel', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung' },
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
const daysAgo = (n: number): string => krollDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n))

export const SEED_REQUESTS: TranslationRequest[] = [
  { id: 'TR-0039', language: 'Punjabi', sig: '(language)', rx: '1000047', logged: daysAgo(7), status: 'Pending' },
  { id: 'TR-0040', language: 'Hindi', sig: '1 CAP Q2D WITH MEALS', rx: '1000049', logged: daysAgo(4), status: 'In review' },
  { id: 'TR-0041', language: 'Tagalog', sig: '(language)', rx: '1000050', logged: daysAgo(2), status: 'Pending' },
]
