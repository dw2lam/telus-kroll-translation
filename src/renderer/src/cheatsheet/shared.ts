import { provider } from '@/data/demoProvider'
import { languageByCode } from '@/data/languages'
import { fillDose, KROLL_EXPANSIONS, PHRASEBOOK } from '@/data/phrasebook'
import type { LanguageCode, TranslationResult, VerifiedSig } from '@/data/types'

/** The demo patient's language; free-text examples run in it. */
export const DEMO_LANGUAGE: LanguageCode = 'zh-Hans'
/** Launch languages, in the order the sheet shows them. */
export const LAUNCH: LanguageCode[] = ['zh-Hans', 'hi']

export type Outcome = TranslationResult['kind'] | 'paused'
export type Tone = 'ok' | 'near' | 'guide' | 'stop'

/** Each Translated Sig pop-up, in the order a pharmacist can meet them. */
export const OUTCOMES: { kind: Outcome; label: string; frame: string; tone: Tone; meaning: string; via?: string }[] = [
  { kind: 'exact', label: 'Exact match', frame: 'B4', tone: 'ok', meaning: 'A verified sentence for the sig. Confirm the English and print both labels.' },
  { kind: 'closest', label: 'Closest match', frame: 'B7', tone: 'near', meaning: 'Free text close to a verified sentence. Use it only if it says the same thing.' },
  { kind: 'candidates', label: 'Top 5', frame: 'B8', tone: 'near', meaning: 'Other verified sentences, ranked by fit.', via: 'Closest → Not this one' },
  { kind: 'noVerified', label: 'Phrasing guide', frame: 'B9', tone: 'guide', meaning: 'Codes that do translate, to reword the sig.', via: 'Top 5 → None of these' },
  { kind: 'cannotTranslate', label: 'Can’t translate', frame: 'B10', tone: 'stop', meaning: 'Nothing verified fits. English label, and a translation request is logged.' },
  { kind: 'notYetTranslatable', label: 'Not yet translatable', frame: 'B4t', tone: 'stop', meaning: 'The patient’s language has no verified sentences yet.' },
  { kind: 'paused', label: 'Paused', frame: 'E6', tone: 'stop', meaning: 'A severity 1 report paused the sentence. English until TELUS ships the fix.', via: 'Simulate → Another pharmacy reports a problem, then 1C PO BID' },
]

export const outcome = (kind: Outcome) => OUTCOMES.find((o) => o.kind === kind)!

/** Codes grouped by what they mean, so lists scan by intent rather than alphabet. */
export const GROUPS: { title: string; codes: string[] }[] = [
  { title: 'Times a day', codes: ['DAILY', 'BID', 'TID', 'QID'] },
  { title: 'Time of day', codes: ['QAM', 'QPM', 'QHS'] },
  { title: 'Every few hours', codes: ['Q4H', 'Q6H', 'Q8H', 'Q12H', 'Q4-6H PRN'] },
  { title: 'As needed', codes: ['PRN', 'DAILY PRN', 'QHS PRN', 'QHS PRN SLP'] },
  { title: 'With meals', codes: ['AC', 'PC', 'CF', 'DAILY CF', 'BID CF'] },
]

/** Every code in its group, with whatever isn't grouped above under Other. */
export function groupedCodes(): { title: string; sigs: VerifiedSig[] }[] {
  const byCode = new Map(PHRASEBOOK.map((s) => [s.code, s]))
  const grouped = new Set(GROUPS.flatMap((g) => g.codes))
  const all = [...GROUPS, { title: 'Other', codes: PHRASEBOOK.map((s) => s.code).filter((c) => !grouped.has(c)) }]
  return all.map((g) => ({ title: g.title, sigs: g.codes.map((c) => byCode.get(c)).filter((s): s is VerifiedSig => !!s) }))
}

export const sentence = (sig: VerifiedSig, language: LanguageCode, dose = '1', form: 'capsule' | 'tablet' = 'capsule'): string =>
  provider.render(sig, languageByCode(language), dose, form) ?? '—'
export const english = (sig: VerifiedSig): string => fillDose(KROLL_EXPANSIONS[sig.code] ?? sig.english.toUpperCase(), '1')
export const isDraft = (sig: VerifiedSig, language: LanguageCode): boolean => !sig.translations[language] && !!sig.drafts?.[language]
export const sigByCode = (code: string): VerifiedSig | undefined => PHRASEBOOK.find((s) => s.code === code)
