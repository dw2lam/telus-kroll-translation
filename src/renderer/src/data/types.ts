export type LanguageCode = 'en' | 'fr' | 'ar' | 'zh-Hant' | 'hi' | 'pa' | 'es' | 'tl' | 'ur'

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
  /** Doses a translation is verified for, when the sentence spells the dose out (Punjabi). */
  verifiedDoses?: Partial<Record<LanguageCode, string[]>>
  /** A separately verified sentence for one exact dose, e.g. Arabic "one capsule" in words. */
  byDose?: Partial<Record<LanguageCode, Record<string, string>>>
}

export interface Candidate {
  sig: VerifiedSig
  dose: string
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
  render(sig: VerifiedSig, language: Language, dose: string): string | null
}
