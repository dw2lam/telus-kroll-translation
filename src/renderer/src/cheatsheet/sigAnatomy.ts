import { fillDose, forForm, KROLL_ALIASES, KROLL_EXPANSIONS } from '@/data/phrasebook'

/**
 * What each piece of a sig code stands for, for teaching. The Latin is the standard origin of the
 * pharmacy abbreviation; CF and SLP are pharmacy shorthand with no Latin behind them.
 */
export type Role = 'dose' | 'form' | 'route' | 'when' | 'condition' | 'shorthand' | 'unknown'

export interface Part {
  code: string
  latin?: string
  means: string
  role: Role
}

export const PARTS: Record<string, Part> = {
  DAILY: { code: 'DAILY', means: 'once a day', role: 'when' },
  BID: { code: 'BID', latin: 'bis in die', means: 'twice a day', role: 'when' },
  TID: { code: 'TID', latin: 'ter in die', means: 'three times a day', role: 'when' },
  QID: { code: 'QID', latin: 'quater in die', means: 'four times a day', role: 'when' },
  QAM: { code: 'QAM', latin: 'quaque ante meridiem', means: 'every morning', role: 'when' },
  QPM: { code: 'QPM', latin: 'quaque post meridiem', means: 'every evening', role: 'when' },
  QHS: { code: 'QHS', latin: 'quaque hora somni', means: 'at bedtime', role: 'when' },
  HS: { code: 'HS', latin: 'hora somni', means: 'at bedtime', role: 'when' },
  PRN: { code: 'PRN', latin: 'pro re nata', means: 'as needed', role: 'condition' },
  AC: { code: 'AC', latin: 'ante cibum', means: 'before meals', role: 'condition' },
  PC: { code: 'PC', latin: 'post cibum', means: 'after meals', role: 'condition' },
  CF: { code: 'CF', means: 'with food', role: 'condition' },
  SLP: { code: 'SLP', means: 'for sleep', role: 'condition' },
  UD: { code: 'UD', latin: 'ut dictum', means: 'as directed', role: 'when' },
  PO: { code: 'PO', latin: 'per os', means: 'by mouth', role: 'route' },
}

/** The small pieces the bigger codes are built from. */
export const ROOTS: Part[] = [
  { code: 'Q', latin: 'quaque', means: 'every', role: 'when' },
  { code: 'D', latin: 'die', means: 'day', role: 'when' },
  { code: 'H', latin: 'hora', means: 'hour', role: 'when' },
  { code: 'AM', latin: 'ante meridiem', means: 'morning', role: 'when' },
  { code: 'PM', latin: 'post meridiem', means: 'evening', role: 'when' },
  { code: 'HS', latin: 'hora somni', means: 'hour of sleep', role: 'when' },
]

export const ROLE_LABEL: Record<Role, string> = {
  dose: 'How many',
  form: 'What',
  route: 'How',
  when: 'When',
  condition: 'Only if / with',
  shorthand: 'Shorthand',
  unknown: 'Not a code',
}

/** `Q6H` → every 6 hours, `Q4-6H` → every 4 to 6 hours. */
const EVERY_HOURS = /^Q(\d+)(?:-(\d+))?H$/

/**
 * On ISMP Canada's Do Not Use list (2006, reaffirmed 2018): QD has been misread as QID, OD as
 * "right eye". The list says to use "daily", so the demo has no QD or OD code.
 */
export const DO_NOT_USE: Record<string, string> = {
  QD: 'on ISMP Canada’s Do Not Use list (misread as QID). Type DAILY.',
  OD: 'on ISMP Canada’s Do Not Use list (misread as “right eye”). Type DAILY.',
}

export function lookupPart(token: string): Part | null {
  if (PARTS[token]) return PARTS[token]
  const hours = token.match(EVERY_HOURS)
  if (hours) {
    const span = hours[2] ? `${hours[1]} to ${hours[2]}` : hours[1]
    return { code: token, latin: `quaque ${span.replace(' to ', '–')} horis`, means: `every ${span} hours`, role: 'when' }
  }
  return null
}

export interface Token {
  text: string
  role: Role
  means: string
  latin?: string
}

export interface Decoded {
  tokens: Token[]
  /** The Kroll code the sig resolves to, or null when Kroll would treat it as free text. */
  code: string | null
  dose: string
  form: 'capsule' | 'tablet'
  /** The English line Kroll prints, when it's a code. */
  english: string | null
}

const FORMS: [RegExp, 'capsule' | 'tablet'][] = [
  [/^(C|CAPS?|CAPSULES?)$/, 'capsule'],
  [/^(T|TABS?|TABLETS?)$/, 'tablet'],
]

/**
 * Breaks a sig into its pieces, left to right, for the decoder: dose, form, route, then the code.
 * Mirrors `parseSigCode`, so whatever it calls a code is what Kroll expands.
 */
export function decodeSig(input: string): Decoded {
  const text = input.trim().toUpperCase().replace(/\s+/g, ' ')
  const empty: Decoded = { tokens: [], code: null, dose: '1', form: 'capsule', english: null }
  if (!text) return empty

  const alias = KROLL_ALIASES[text]
  if (alias && alias.dose) {
    const english = fillDose(KROLL_EXPANSIONS[alias.code], alias.dose)
    return {
      tokens: [{ text, role: 'shorthand', means: `${alias.dose} capsule${alias.dose === '1' ? '' : 's'}, ${PARTS[alias.code].means}` }],
      code: alias.code,
      dose: alias.dose,
      form: 'capsule',
      english,
    }
  }

  const tokens: Token[] = []
  let dose = '1'
  let form: 'capsule' | 'tablet' = 'capsule'
  const words = text.split(' ')
  let i = 0

  // Dose, optionally glued to its form: `2`, `2T`, `2 TAB`.
  const lead = words[0]?.match(/^(\d+(?:\.\d+)?)([A-Z]*)$/)
  if (lead && words.length > 1) {
    dose = lead[1]
    tokens.push({ text: lead[1], role: 'dose', means: `${dose} at a time` })
    const glued = lead[2]
    const formWord = glued || (FORMS.some(([re]) => re.test(words[1] ?? '')) ? words[1] : '')
    if (glued) i = 1
    else i = formWord ? 2 : 1
    const found = FORMS.find(([re]) => re.test(formWord))
    if (formWord && found) {
      form = found[1]
      tokens.push({ text: formWord, role: 'form', means: form })
    } else if (glued) {
      tokens.push({ text: glued, role: 'unknown', means: 'not a dose form (T or C)' })
    }
  }
  if (words[i] === 'PO') {
    tokens.push({ text: 'PO', role: 'route', means: PARTS.PO.means, latin: PARTS.PO.latin })
    i++
  }

  const rest = words.slice(i)
  for (const word of rest) {
    const part = lookupPart(word)
    if (DO_NOT_USE[word]) tokens.push({ text: word, role: 'unknown', means: DO_NOT_USE[word] })
    else tokens.push(part ? { text: word, role: part.role, means: part.means, latin: part.latin } : { text: word, role: 'unknown', means: 'not a Kroll code' })
  }

  const joined = rest.join(' ')
  const code = KROLL_ALIASES[joined]?.code ?? joined
  const isCode = code in KROLL_EXPANSIONS && !tokens.some((t) => t.role === 'unknown')
  return {
    tokens,
    code: isCode ? code : null,
    dose,
    form,
    english: isCode ? fillDose(forForm(KROLL_EXPANSIONS[code], form), dose) : null,
  }
}

/** The plain meaning of a whole code, e.g. `QHS PRN SLP` → `at bedtime as needed for sleep`. */
export function meaningOf(code: string): string {
  const expansion = KROLL_EXPANSIONS[code]
  if (!expansion) return ''
  return expansion.replace(/^TAKE \[N\] CAPSULE\(S\) /, '').toLowerCase()
}

/** The Latin behind a whole code, piece by piece: `QHS PRN` → `quaque hora somni · pro re nata`. */
export function latinOf(code: string): string {
  return code
    .split(' ')
    .map((w) => lookupPart(w)?.latin)
    .filter(Boolean)
    .join(' · ')
}
