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

export type PersonaId = 'rohan' | 'leung'

const RX_DETAILS = { doctor: RX.doctor, brand: RX.brand, strength: RX.strength, generic: RX.generic, quantity: RX.quantity, refills: RX.refills }

/** Mrs. Leung is the persona from the journey map: 78, reads Mandarin. Her first name isn't in the research, so it's blank. */
export const PERSONAS: Record<PersonaId, Details> = {
  rohan: { ...PATIENT, ...RX_DETAILS },
  leung: {
    ...PATIENT,
    ...RX_DETAILS,
    lastName: 'Leung',
    firstName: '',
    salutation: 'Mrs.',
    city: 'Toronto',
    age: '78 years',
    gender: 'Female',
    email: '',
    birthdate: '',
    height: '',
    weight: '',
  },
}

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
  { id: 'leung', title: 'Mrs. Leung · 1C PO BID', detail: 'Chinese (Simplified), the presentation scenario', language: 'zh-Hans', sig: '1C PO BID', persona: 'leung' },
  { id: 'exact-code', title: 'Hindi · QD', detail: 'Exact match (B3 → B4 → B5)', language: 'hi', sig: 'QD' },
  { id: 'closest', title: 'Hindi · free-text sig', detail: 'Closest → top 5 → phrasing guide → can’t translate (B6 → B10)', language: 'hi', sig: '1 CAP QHS PRN DIZZINESS' },
  { id: 'exact-text', title: 'Hindi · free text, exact', detail: 'Free text that matches a verified sig exactly', language: 'hi', sig: 'take 2 capsules by mouth twice daily' },
  { id: 'tagalog', title: 'Tagalog · QD', detail: 'Captured, not yet translatable (B3t → B4t)', language: 'tl', sig: 'QD' },
  { id: 'chinese', title: 'Chinese (Simplified) · QD', detail: 'Simplified script label', language: 'zh-Hans', sig: 'QD' },
]
