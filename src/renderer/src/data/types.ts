import type { DoseForm } from './phrasebook'

export type LanguageCode = 'en' | 'fr' | 'ar' | 'zh-Hans' | 'zh-Hant' | 'hi' | 'pa' | 'es' | 'tl' | 'ur' | 'fa'

/** Label chrome in the patient's language, taken from the Figma label designs. */
export interface LabelStrings {
  /** Panel 1 pointer strip: "look at the back for instructions". */
  pointer: string
  /** Word on the peel tab. */
  peel: string
  /** Panel 2 header. */
  header: string
  /** Panel 2 header tag, e.g. `INSTRUCTIONS · हिन्दी`. */
  tag: string
  /** Panel 2 footer lines (patient language · English gloss). */
  footer: string[]
  /** Panel 2 dispensing line. `{}` marks where the English value goes. */
  dispensing: {
    quantity: string
    refills: string
    date: string
    expiry: string
    prescriber: string
  }
}

export interface Language {
  code: LanguageCode
  /** As Kroll's Language list shows it. */
  name: string
  rtl: boolean
  /** Present only when the platform holds verified sig translations for the language. */
  label?: LabelStrings
}

/** One verified instruction: a whole English sentence with a `[N]` dose slot and its reviewed translations. */
export interface VerifiedSig {
  /** The Kroll sig code it is filed under, e.g. `QHS PRN`. */
  code: string
  english: string
  translations: Partial<Record<LanguageCode, string>>
  /** Unverified sentences drafted to fill the code list. Only an exact code reaches these; free text never does. */
  drafts?: Partial<Record<LanguageCode, string>>
}

export interface Candidate {
  sig: VerifiedSig
  dose: string
  /** Capsule unless the sig said otherwise (`1T PO BID`). */
  form?: DoseForm
  /** 0–1. */
  confidence: number
}

/** What the Translated Sig pop-up shows first (PRD states 1, 2, 3 and 5, plus the language gate). */
export type TranslationResult =
  | { kind: 'exact'; candidate: Candidate }
  | { kind: 'closest'; candidate: Candidate; readAs: string; others: Candidate[] }
  | { kind: 'candidates'; candidates: Candidate[] }
  | { kind: 'cannotTranslate'; reason: string }
  | { kind: 'notYetTranslatable' }
  /** A known Kroll code with no verified sentence in this language: straight to the phrasing guide. */
  | { kind: 'noVerified' }

/** The seam a real, verified translation platform plugs into. */
export interface TranslationProvider {
  readonly name: string
  translate(sig: string, language: Language): TranslationResult
  /** Every verified instruction for the language — the phrasing guide (state 4). */
  phrasingGuide(language: Language): VerifiedSig[]
  /** The verified sentence with the dose filled in, or null when it is not verified for that dose. */
  render(sig: VerifiedSig, language: Language, dose: string, form?: DoseForm): string | null
}
