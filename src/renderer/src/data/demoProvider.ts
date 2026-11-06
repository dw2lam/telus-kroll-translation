import { type DoseForm, fillDose, forForm, parseSigCode, PHRASEBOOK } from './phrasebook'
import type { Candidate, Language, TranslationProvider, TranslationResult, VerifiedSig } from './types'

// A stand-in for the verified translation platform the team has yet to choose.
// It never composes a translation: it only picks one of the whole sentences in
// PHRASEBOOK, using a handful of keywords, so the demo can reach every state of
// the Translated Sig pop-up. Swap it for the real platform at this interface.

type Frequency = 'QD' | 'BID' | 'TID' | 'QID' | 'QHS' | 'QAM' | 'QPM' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'Q4-6H'
type Food = 'AC' | 'PC' | 'CF'

interface Reading {
  dose: string
  frequency: Frequency[]
  prn: boolean
  food: Food[]
  sleep: boolean
  directed: boolean
  /** Words the demo did not recognise, e.g. `dizziness`. */
  extras: string[]
}

const FEATURES: Record<string, Partial<Reading>> = {
  QD: { frequency: ['QD'] },
  BID: { frequency: ['BID'] },
  TID: { frequency: ['TID'] },
  QID: { frequency: ['QID'] },
  QHS: { frequency: ['QHS'] },
  QAM: { frequency: ['QAM'] },
  QPM: { frequency: ['QPM'] },
  Q4H: { frequency: ['Q4H'] },
  Q6H: { frequency: ['Q6H'] },
  Q8H: { frequency: ['Q8H'] },
  Q12H: { frequency: ['Q12H'] },
  'Q4-6H PRN': { frequency: ['Q4-6H'], prn: true },
  'QD CF': { frequency: ['QD'], food: ['CF'] },
  'BID CF': { frequency: ['BID'], food: ['CF'] },
  'QHS PRN': { frequency: ['QHS'], prn: true },
  'QD PRN': { frequency: ['QD'], prn: true },
  'QHS PRN SLP': { frequency: ['QHS'], prn: true, sleep: true },
  PRN: { prn: true },
  AC: { food: ['AC'] },
  PC: { food: ['PC'] },
  CF: { food: ['CF'] },
  UD: { directed: true },
}

// Most specific first: each match is cut out of the text before the next pattern runs.
const PHRASES: [RegExp, Partial<Reading>][] = [
  [/\b(q4-6h|every 4 to 6 hours|every 4-6 hours)\b/, { frequency: ['Q4-6H'] }],
  [/\b(q4h|every 4 hours)\b/, { frequency: ['Q4H'] }],
  [/\b(q6h|every 6 hours)\b/, { frequency: ['Q6H'] }],
  [/\b(q8h|every 8 hours)\b/, { frequency: ['Q8H'] }],
  [/\b(q12h|every 12 hours)\b/, { frequency: ['Q12H'] }],
  [/\b(qid|four times a day|four times daily|4 times a day)\b/, { frequency: ['QID'] }],
  [/\b(qam|every morning|each morning|in the morning)\b/, { frequency: ['QAM'] }],
  [/\b(qpm|every evening|each evening|in the evening)\b/, { frequency: ['QPM'] }],
  [/\b(bid|twice a day|twice daily|2 times a day|two times a day)\b/, { frequency: ['BID'] }],
  [/\b(tid|three times a day|three times daily|3 times a day)\b/, { frequency: ['TID'] }],
  [/\b(qd|od|daily|once a day|once daily|every day|each day)\b/, { frequency: ['QD'] }],
  [/\b(qhs|hs|at bedtime|bedtime|before bed|at night|nightly)\b/, { frequency: ['QHS'] }],
  [/\b(prn|as needed|if needed|when needed|as required)\b/, { prn: true }],
  [/\b(ac|before meals|before food)\b/, { food: ['AC'] }],
  [/\b(pc|after meals|after food)\b/, { food: ['PC'] }],
  [/\b(cf|with food|with meals)\b/, { food: ['CF'] }],
  [/\b(slp|for sleep|sleep)\b/, { sleep: true }],
  [/\b(ud|as directed|use as directed)\b/, { directed: true }],
]

const FILLER = new Set(['take', 'cap', 'caps', 'capsule', 'capsules', 'by', 'mouth', 'po', 'orally', 'a', 'the', 'one', 'of', 'and', 'to', 'use', 'for', 'x'])

function read(raw: string): Reading {
  let text = ' ' + raw.toLowerCase().replace(/[.,;]/g, ' ').replace(/\s+/g, ' ') + ' '
  const reading: Reading = { dose: '1', frequency: [], prn: false, food: [], sleep: false, directed: false, extras: [] }
  const dose = text.match(/\b(\d+(?:\.\d+)?)\s*(cap|caps|capsule|capsules)?\b/)
  if (dose) reading.dose = dose[1]
  for (const [pattern, feature] of PHRASES) {
    if (!pattern.test(text)) continue
    text = text.replace(pattern, ' ')
    if (feature.frequency) reading.frequency.push(...feature.frequency.filter((f) => !reading.frequency.includes(f)))
    if (feature.food) reading.food.push(...feature.food)
    if (feature.prn) reading.prn = true
    if (feature.sleep) reading.sleep = true
    if (feature.directed) reading.directed = true
  }
  reading.extras = text
    .split(' ')
    .filter((w) => w && !FILLER.has(w) && !/^\d+(\.\d+)?$/.test(w))
  return reading
}

/** How far a verified sig is from what was typed. 0 means it says exactly the same thing. */
function distance(reading: Reading, sig: VerifiedSig): number {
  const f = FEATURES[sig.code] ?? {}
  const sigFreq = f.frequency?.[0]
  const inFreq = reading.frequency[0]
  let d = 0
  if (inFreq && sigFreq && inFreq !== sigFreq) d += 2
  else if (inFreq && !sigFreq) d += 2.5
  else if (!inFreq && sigFreq) d += 2
  if (reading.prn !== Boolean(f.prn)) d += 1
  if (reading.sleep !== Boolean(f.sleep)) d += 2.5
  if (reading.directed !== Boolean(f.directed)) d += 4
  const sigFood = f.food?.[0]
  if (reading.food[0] !== sigFood) d += reading.food[0] && sigFood ? 2 : 1.5
  return d
}

function humanise(reading: Reading): string {
  const parts = [`take ${reading.dose} capsule${reading.dose === '1' ? '' : 's'}`]
  const freq: Record<Frequency, string> = {
    QD: 'once daily',
    BID: 'twice daily',
    TID: 'three times daily',
    QID: 'four times daily',
    QHS: 'at bedtime',
    QAM: 'every morning',
    QPM: 'every evening',
    Q4H: 'every 4 hours',
    Q6H: 'every 6 hours',
    Q8H: 'every 8 hours',
    Q12H: 'every 12 hours',
    'Q4-6H': 'every 4 to 6 hours',
  }
  if (reading.frequency[0]) parts.push(freq[reading.frequency[0]])
  if (reading.prn) parts.push('as needed')
  const food: Record<Food, string> = { AC: 'before meals', PC: 'after meals', CF: 'with food' }
  if (reading.food[0]) parts.push(food[reading.food[0]])
  if (reading.extras.length) parts.push('for ' + reading.extras.join(' '))
  return parts.join(' ')
}

export class DemoProvider implements TranslationProvider {
  readonly name = 'Demo phrase bank (illustrative)'

  phrasingGuide(language: Language): VerifiedSig[] {
    return PHRASEBOOK.filter((s) => s.translations[language.code] !== undefined)
  }

  render(sig: VerifiedSig, language: Language, dose: string, form: DoseForm = 'capsule'): string | null {
    const template = sig.translations[language.code] ?? sig.drafts?.[language.code]
    if (template === undefined) return null
    // Keep the ASCII dose upright inside right-to-left text.
    return fillDose(forForm(template, form), language.rtl ? `⁨${dose}⁩` : dose)
  }

  translate(raw: string, language: Language): TranslationResult {
    if (!language.label) return { kind: 'notYetTranslatable' }
    const guide = this.phrasingGuide(language)
    // A Kroll sig code, optionally with a dose ("2 BID", "2 CAP PO BID").
    const coded = parseSigCode(raw)
    const byCode = coded && PHRASEBOOK.find((s) => s.code === coded.code)
    if (coded && byCode) {
      if (this.render(byCode, language, coded.dose, coded.form) !== null) return { kind: 'exact', candidate: { sig: byCode, dose: coded.dose, form: coded.form, confidence: 1 } }
      // A real Kroll code, but nothing verified for this language (or this dose).
      return { kind: 'noVerified' }
    }

    const reading = read(raw)
    const recognised = reading.frequency.length + reading.food.length + Number(reading.prn) + Number(reading.directed) + Number(reading.sleep)
    if (recognised === 0) {
      return { kind: 'cannotTranslate', reason: `No verified ${language.name} sig code represents “${raw.trim()}”.` }
    }
    if (reading.frequency.length > 1) {
      return { kind: 'cannotTranslate', reason: `It gives more than one frequency, and no verified ${language.name} sig code combines them.` }
    }

    const ranked: Candidate[] = guide
      .filter((s) => this.render(s, language, reading.dose) !== null)
      .map((sig) => {
        const d = distance(reading, sig)
        return { sig, dose: reading.dose, confidence: Math.max(0.2, 1 - 0.12 * reading.extras.length - 0.1 * d), d }
      })
      .sort((a, b) => a.d - b.d || b.confidence - a.confidence)
      .map(({ sig, dose, confidence }) => ({ sig, dose, confidence: Math.round(confidence * 100) / 100 }))
    const best = ranked[0]
    if (!best) return { kind: 'cannotTranslate', reason: `No verified ${language.name} sig code is close to it.` }

    const bestDistance = distance(reading, best.sig)
    if (bestDistance === 0 && reading.extras.length === 0) return { kind: 'exact', candidate: best }
    if (bestDistance === 0) return { kind: 'closest', candidate: best, readAs: humanise(reading), others: ranked.slice(1, 5) }
    if (bestDistance <= 3) return { kind: 'candidates', candidates: ranked.slice(0, 5) }
    return { kind: 'cannotTranslate', reason: `No verified ${language.name} sig code is close to “${raw.trim()}”.` }
  }
}

export const provider: TranslationProvider = new DemoProvider()
