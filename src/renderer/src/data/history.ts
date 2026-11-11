// The pharmacy's history before the demo starts: earlier fills in the audit log, with their
// print receipts, so the Rx history, the phone-call lookup and callback lists have something real.
import type { PrintJob } from '@/flow/state'
import { type AuditEntry, labelLines, type PrintReceipt, receiptFor, scriptOf, sealEntry } from './audit'
import { daysAgo, krollDate, PERSONAS, type PersonaId, PHARMACIST, TODAY } from './demo'
import { languageByCode } from './languages'
import { fillDose, forForm, KROLL_EXPANSIONS, PHRASEBOOK } from './phrasebook'
import type { LanguageCode } from './types'

interface Seed {
  trace: string
  persona: PersonaId
  rx: string
  fill: number
  daysAgo: number
  sig: string
  code: string
  language: LanguageCode
  translated: boolean
  version: string
}

// Fixed trace codes for the seeded prints, so a presenter can read them out.
const SEEDS: Seed[] = [
  { trace: 'H4M-2QX', persona: 'leung', rx: '1000051', fill: 1, daysAgo: 56, sig: '1C PO BID', code: 'BID', language: 'zh-Hans', translated: true, version: 'v2026.10' },
  { trace: 'P7C-9KD', persona: 'leung', rx: '1000051', fill: 2, daysAgo: 28, sig: '1C PO BID', code: 'BID', language: 'zh-Hans', translated: true, version: 'v2026.11' },
  { trace: 'W3R-6TB', persona: 'leung', rx: '1000048', fill: 1, daysAgo: 9, sig: 'QD CF', code: 'QD CF', language: 'zh-Hans', translated: true, version: 'v2026.11' },
  { trace: 'F8N-4JA', persona: 'farahani', rx: '1000052', fill: 1, daysAgo: 30, sig: 'QD', code: 'QD', language: 'fa', translated: false, version: 'v2026.11' },
]

function isoDaysAgo(n: number, hour: number): string {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n, hour, 12)
  return d.toISOString()
}

function build(seed: Seed, i: number): { job: PrintJob; entry: AuditEntry } {
  const details = PERSONAS[seed.persona]
  const sig = PHRASEBOOK.find((s) => s.code === seed.code)!
  const date = daysAgo(seed.daysAgo)
  const filled = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - seed.daysAgo)
  const expiry = krollDate(new Date(filled.getFullYear() + 1, filled.getMonth(), filled.getDate()))
  const lang = languageByCode(seed.language)
  const text = seed.translated ? (sig.translations[seed.language] ?? '') : ''
  const translation = seed.translated
    ? { language: seed.language, text: fillDose(text, '1'), gloss: fillDose(forForm(sig.english, 'capsule'), '1').toUpperCase(), sigCode: seed.code }
    : null
  const job: PrintJob = {
    id: -1 - i,
    rx: seed.rx,
    fill: seed.fill,
    details,
    form: 'capsule',
    englishSig: fillDose(KROLL_EXPANSIONS[seed.code], '1'),
    date,
    expiry,
    translation,
    trace: seed.trace,
    libraryVersion: seed.version,
    englishLines: [],
    record: null,
  }
  const lines =
    translation && lang.label
      ? labelLines({ language: seed.language, sigCode: seed.code, text: translation.text, gloss: translation.gloss, details, form: 'capsule', date, expiry })
      : []
  const entry = sealEntry({
    trace: seed.trace,
    rx: seed.rx,
    fill: seed.fill,
    printedAt: isoDaysAgo(seed.daysAgo, 10 + i),
    user: PHARMACIST,
    sigTyped: seed.sig,
    englishSig: job.englishSig,
    match: seed.translated ? 'exact' : 'english-only',
    libraryVersion: seed.version,
    language: seed.language,
    script: scriptOf(seed.language),
    lines,
    linesInEnglish: [],
    reports: [],
    patient: `${details.lastName}${details.firstName ? `, ${details.firstName}` : ''}`,
  })
  return { job, entry }
}

const built = SEEDS.map(build)

export const SEED_AUDIT: AuditEntry[] = built.map((b) => b.entry)
export const SEED_JOBS: Record<string, PrintJob> = Object.fromEntries(built.map((b) => [b.job.trace, b.job]))
export const SEED_RECEIPTS: PrintReceipt[] = built.filter((b) => b.job.translation).map((b) => receiptFor(b.entry, true))
