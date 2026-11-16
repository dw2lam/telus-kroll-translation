// PRD 2: the audit log, trace codes, print receipts and fingerprints, and PRD 1's report
// severity. Pure functions only; the flow reducer owns the state.
import { languageByCode } from './languages'
import type { LanguageCode } from './types'

/** One line of the translated under-panel, as the line picker and the audit log see it. */
export interface LabelLine {
  /** Stable within a print: `directions` or `chrome`. Warnings are English stickers (Figma C3), not label lines. */
  key: string
  kind: 'directions' | 'chrome'
  /** The standard English phrase, which is what the pharmacist reads in the line picker. */
  english: string
  /** What printed in the patient's language. */
  text: string
  /** The library phrase. Logged and sent to TELUS, never shown to the pharmacist. */
  phraseId: string
}

/** Language prefix the library files phrases under, e.g. `ZH`. */
export function libraryPrefix(language: LanguageCode): string {
  return language === 'zh-Hans' ? 'ZH' : language === 'zh-Hant' ? 'ZHT' : language.toUpperCase()
}

/** The phrase ID for a sig code's sentence, e.g. `ZH-DAILY-001`. */
export const directionsPhraseId = (code: string, language: LanguageCode): string => `${libraryPrefix(language)}-${code.trim().replace(/\s+/g, '-')}-001`

/**
 * Every translated line on a C3 label, in print order: the directions, then the headings
 * (the front's "turn to the back" line on labels with room for it, the under-panel header,
 * the expiry word and the peel tab). Names, drug, numbers and dates stay in English.
 */
export function labelLines(input: { language: LanguageCode; sigCode: string; text: string; gloss: string; pointer?: boolean }): LabelLine[] {
  const { language } = input
  const strings = languageByCode(language).label!
  const headings = [...(input.pointer === false ? [] : [strings.pointer]), strings.header, strings.expiry, strings.peel]
  return [
    { key: 'directions', kind: 'directions', english: input.gloss, text: input.text, phraseId: directionsPhraseId(input.sigCode, language) },
    {
      key: 'chrome',
      kind: 'chrome',
      english: `Headings and peel tab: ${input.pointer === false ? '' : '“Turn to the back for instructions”, '}“Instructions”, “Expiry”, “Peel”`,
      text: headings.join(' · '),
      phraseId: `${libraryPrefix(language)}-CHROME-001`,
    },
  ]
}

/** Which patient-facing script a language prints in, for the log. */
export const scriptOf = (language: LanguageCode): string =>
  ({ 'zh-Hans': 'Hans', 'zh-Hant': 'Hant', hi: 'Deva', ar: 'Arab', pa: 'Guru', ur: 'Arab', fa: 'Arab' })[language as string] ?? 'Latn'

export type MatchType = 'exact' | 'closest-confirmed' | 'selected-confirmed'

/** One translated print, as the pharmacy's Kroll keeps it (PRD 2). Never edited: corrections are new entries. */
export interface AuditEntry {
  trace: string
  rx: string
  fill: number
  /** ISO time. */
  printedAt: string
  user: string
  sigTyped: string
  englishSig: string
  match: MatchType | 'english-only'
  libraryVersion: string
  language: LanguageCode
  script: string
  /** Every under-panel line as printed. Empty for an English-only print. */
  lines: LabelLine[]
  /** Keys of lines that printed in English instead (flagged or paused). */
  linesInEnglish: string[]
  /** Reports filed against this print. Appended by new entries' `reports`, never by editing this one. */
  reports: string[]
  /** The entry this one corrects (a corrected or English-only reprint). */
  corrects?: string
  /** Patient on the label, for this pharmacy's eyes only (callback lists). Never in a receipt. */
  patient: string
  fingerprint: string
}

/** A short random code printed on each translated label. Not built from the Rx, so it can't identify a patient. */
export function traceCode(random: () => number = Math.random): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const pick = (): string => alphabet[Math.floor(random() * alphabet.length)]
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`
}

/** cyrb53: a fast 53-bit string hash. The demo's stand-in for SHA-256. */
function cyrb53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** Stable JSON: keys sorted, so the same entry always hashes the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * A short code computed from the whole entry, fixed at print time. Any edit changes it, and it
 * can't be reversed to reveal the contents. `reports` is left out: reports are appended later.
 */
export function fingerprint(entry: Omit<AuditEntry, 'fingerprint'> | AuditEntry): string {
  const { reports: _reports, ...rest } = entry as AuditEntry
  const { fingerprint: _fp, ...body } = rest
  return cyrb53(canonical(body)).toString(16).padStart(14, '0').slice(-12).toUpperCase()
}

export const sealEntry = (entry: Omit<AuditEntry, 'fingerprint'>): AuditEntry => ({ ...entry, fingerprint: fingerprint(entry) })

/** What Kroll sends TELUS for each translated print. No patient information and no typed text. */
export interface PrintReceipt {
  trace: string
  at: string
  storeId: string
  libraryVersion: string
  phraseIds: string[]
  language: LanguageCode
  outcome: AuditEntry['match']
  fingerprint: string
  status: 'sent' | 'queued'
}

export const STORE_ID = 'ON-KRL-0412'

export function receiptFor(entry: AuditEntry, online: boolean): PrintReceipt {
  return {
    trace: entry.trace,
    at: entry.printedAt,
    storeId: STORE_ID,
    libraryVersion: entry.libraryVersion,
    phraseIds: entry.lines.filter((l) => !entry.linesInEnglish.includes(l.key)).map((l) => l.phraseId),
    language: entry.language,
    outcome: entry.match,
    fingerprint: entry.fingerprint,
    status: online ? 'sent' : 'queued',
  }
}

/** In a dispute: TELUS recomputes the exported entry's fingerprint and compares it with the receipt. */
export const verifyEntry = (entry: AuditEntry, receipt: PrintReceipt | undefined): boolean => receipt !== undefined && fingerprint(entry) === receipt.fingerprint

// ---------------------------------------------------------------- PRD 1: reports

export type IssueType = 'meaning' | 'missing' | 'unreadable' | 'unclear' | 'formatting' | 'wrongPhrase'

export const ISSUE_TYPES: { id: IssueType; label: string; detail: string }[] = [
  { id: 'meaning', label: 'Changes the meaning', detail: 'Dose, timing, route or a warning says something different' },
  { id: 'missing', label: 'Missing information', detail: 'Something in the English is left out' },
  { id: 'unreadable', label: 'Characters or layout unreadable', detail: 'Broken characters, cut off, overlapping' },
  { id: 'unclear', label: 'Meaning right but unclear', detail: 'Awkward or hard to follow' },
  { id: 'formatting', label: 'Spacing or formatting only', detail: 'Still readable and correct' },
  { id: 'wrongPhrase', label: 'Wrong English phrase picked', detail: 'The pharmacy chose a sig that didn’t match the prescription' },
]

export type NoticedBy = 'pharmacist' | 'technician' | 'patient' | 'caregiver' | 'otherPharmacy'

export const NOTICED_BY: { id: NoticedBy; label: string }[] = [
  { id: 'pharmacist', label: 'Pharmacist' },
  { id: 'technician', label: 'Technician or bilingual staff' },
  { id: 'patient', label: 'Patient' },
  { id: 'caregiver', label: 'Caregiver or family' },
  { id: 'otherPharmacy', label: 'Another pharmacy' },
]

export type Taken = 'yes' | 'no' | 'unknown'

/** 1 could cause harm, 2 misleading, 3 cosmetic, null a pharmacy error (no change to the library). */
export type Severity = 1 | 2 | 3 | null

/**
 * Severity is computed, never chosen: changing the meaning or missing information is 1,
 * unreadable or unclear is 2, formatting only is 3. Picking the wrong English phrase is a
 * pharmacy error, logged as a usability signal. No report pauses a sentence by itself: only
 * TELUS does, once its translators confirm the problem.
 */
export function severityOf(type: IssueType): Severity {
  if (type === 'meaning' || type === 'missing') return 1
  if (type === 'unreadable' || type === 'unclear') return 2
  if (type === 'formatting') return 3
  return null
}

export const SEVERITY_TEXT: Record<1 | 2 | 3, { title: string; response: string }> = {
  1: {
    title: 'Severity 1 · Could cause harm',
    response: 'Both TELUS translators review it within 1 hour. A single report doesn’t pause the sentence for other pharmacies; if the translators confirm it, TELUS pauses it everywhere and fixes it within 48 hours.',
  },
  2: { title: 'Severity 2 · Misleading, not dangerous', response: 'Reviewed within 5 business days. Fixed in the next library update.' },
  3: { title: 'Severity 3 · Cosmetic', response: 'Batched into the next library update.' },
}

export type ReportStatus = 'received' | 'paused' | 'fixed' | 'noChange'

export interface TranslationReport {
  id: string
  trace: string
  rx: string
  /** The line the pharmacist picked, or the whole label, or not sure. */
  line: string
  lineEnglish: string
  phraseId: string | null
  type: IssueType
  noticedBy: NoticedBy
  taken: Taken | null
  severity: Severity
  beforePrint: boolean
  filedAt: string
  /** Status history, oldest first. */
  timeline: { status: ReportStatus; at: string }[]
  /** Filed at another pharmacy (simulated); only TELUS's pause reaches this one. */
  elsewhere?: boolean
}

/** The prescriptions at this pharmacy that printed a phrase: the callback list, built locally. */
export function callbackList(audit: AuditEntry[], phraseId: string): AuditEntry[] {
  return audit.filter((e) => e.lines.some((l) => l.phraseId === phraseId && !e.linesInEnglish.includes(l.key)))
}
