import type { VerifiedSig } from './types'

// Every sig code the demo knows. Non-English strings are only ever ones the team
// already wrote — the Figma flow (B8, B9), the label designs, and the seed
// sheets of the original engine — and all of them are illustrative. A code with
// no string for a language is still listed: the demo answers it with the
// phrasing guide, which is exactly what the real flow must do.
export const PHRASEBOOK: VerifiedSig[] = [
  {
    code: 'QD',
    english: 'Take [N] capsule(s) by mouth once daily',
    translations: {
      hi: 'दिन में एक बार [N] कैप्सूल मुँह से लें',
      ar: 'تناول [N] كبسولة عن طريق الفم مرة واحدة يومياً',
      'zh-Hant': '每天 1 次，每次 [N] 粒膠囊',
      pa: 'دن وچ اک وار (1) اک کیپسول ([N]) لؤ',
    },
    // Label 12 spells "one capsule" out in Arabic; Punjabi (label 16) only exists for one capsule.
    byDose: { ar: { '1': 'تناول كبسولة واحدة (1) مرة واحدة (1) يومياً' } },
    verifiedDoses: { pa: ['1'] },
  },
  {
    code: 'BID',
    english: 'Take [N] capsule(s) by mouth twice daily',
    translations: {
      hi: 'दिन में दो बार [N] कैप्सूल मुँह से लें',
      ar: 'تناول [N] كبسولة عن طريق الفم مرتين يومياً',
      'zh-Hant': '每日兩次，每次[N]粒，口服',
    },
  },
  { code: 'TID', english: 'Take [N] capsule(s) by mouth three times daily', translations: { hi: 'दिन में तीन बार [N] कैप्सूल मुँह से लें' } },
  { code: 'QID', english: 'Take [N] capsule(s) by mouth four times daily', translations: { hi: 'दिन में चार बार [N] कैप्सूल मुँह से लें' } },
  {
    code: 'QHS',
    english: 'Take [N] capsule(s) by mouth at bedtime',
    translations: { hi: 'सोते समय [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم عند النوم' },
  },
  { code: 'QAM', english: 'Take [N] capsule(s) by mouth every morning', translations: {} },
  { code: 'QPM', english: 'Take [N] capsule(s) by mouth every evening', translations: {} },
  { code: 'Q4H', english: 'Take [N] capsule(s) by mouth every 4 hours', translations: {} },
  { code: 'Q6H', english: 'Take [N] capsule(s) by mouth every 6 hours', translations: {} },
  { code: 'Q8H', english: 'Take [N] capsule(s) by mouth every 8 hours', translations: {} },
  { code: 'Q12H', english: 'Take [N] capsule(s) by mouth every 12 hours', translations: {} },
  {
    code: 'QHS PRN',
    english: 'Take [N] capsule(s) by mouth at bedtime as needed',
    translations: { hi: 'ज़रूरत पड़ने पर सोते समय [N] कैप्सूल मुँह से लें' },
  },
  {
    code: 'QD PRN',
    english: 'Take [N] capsule(s) by mouth once daily as needed',
    translations: { hi: 'ज़रूरत पड़ने पर दिन में एक बार [N] कैप्सूल मुँह से लें' },
  },
  {
    code: 'QHS PRN SLP',
    english: 'Take [N] capsule(s) by mouth at bedtime as needed for sleep',
    translations: { hi: 'नींद के लिए ज़रूरत पड़ने पर सोते समय [N] कैप्सूल मुँह से लें' },
  },
  { code: 'PRN', english: 'Take [N] capsule(s) by mouth as needed', translations: { hi: 'ज़रूरत पड़ने पर [N] कैप्सूल मुँह से लें' } },
  { code: 'Q4-6H PRN', english: 'Take [N] capsule(s) by mouth every 4 to 6 hours as needed', translations: {} },
  { code: 'AC', english: 'Take [N] capsule(s) by mouth before meals', translations: { hi: 'भोजन से पहले [N] कैप्सूल मुँह से लें' } },
  { code: 'PC', english: 'Take [N] capsule(s) by mouth after meals', translations: { hi: 'भोजन के बाद [N] कैप्सूल मुँह से लें' } },
  { code: 'CF', english: 'Take [N] capsule(s) by mouth with food', translations: { hi: 'भोजन के साथ [N] कैप्सूल मुँह से लें' } },
  {
    code: 'QD CF',
    english: 'Take [N] capsule(s) by mouth once daily with food',
    translations: { 'zh-Hant': '隨餐服用，每日一次，每次[N]粒，口服' },
  },
  { code: 'BID CF', english: 'Take [N] capsule(s) by mouth twice daily with food', translations: {} },
  { code: 'UD', english: 'Use as directed', translations: { hi: 'निर्देशानुसार लें', ar: 'استخدم حسب التوجيهات' } },
]

/** How Kroll's own Sig Codes table expands a code onto the English label. */
export const KROLL_EXPANSIONS: Record<string, string> = {
  QD: 'TAKE [N] CAPSULE(S) ONCE A DAY',
  BID: 'TAKE [N] CAPSULE(S) TWICE A DAY',
  TID: 'TAKE [N] CAPSULE(S) THREE TIMES A DAY',
  QID: 'TAKE [N] CAPSULE(S) FOUR TIMES A DAY',
  QHS: 'TAKE [N] CAPSULE(S) AT BEDTIME',
  QAM: 'TAKE [N] CAPSULE(S) EVERY MORNING',
  QPM: 'TAKE [N] CAPSULE(S) EVERY EVENING',
  Q4H: 'TAKE [N] CAPSULE(S) EVERY 4 HOURS',
  Q6H: 'TAKE [N] CAPSULE(S) EVERY 6 HOURS',
  Q8H: 'TAKE [N] CAPSULE(S) EVERY 8 HOURS',
  Q12H: 'TAKE [N] CAPSULE(S) EVERY 12 HOURS',
  'QHS PRN': 'TAKE [N] CAPSULE(S) AT BEDTIME AS NEEDED',
  'QD PRN': 'TAKE [N] CAPSULE(S) ONCE A DAY AS NEEDED',
  'QHS PRN SLP': 'TAKE [N] CAPSULE(S) AT BEDTIME AS NEEDED FOR SLEEP',
  PRN: 'TAKE [N] CAPSULE(S) AS NEEDED',
  'Q4-6H PRN': 'TAKE [N] CAPSULE(S) EVERY 4 TO 6 HOURS AS NEEDED',
  AC: 'TAKE [N] CAPSULE(S) BEFORE MEALS',
  PC: 'TAKE [N] CAPSULE(S) AFTER MEALS',
  CF: 'TAKE [N] CAPSULE(S) WITH FOOD',
  'QD CF': 'TAKE [N] CAPSULE(S) ONCE A DAY WITH FOOD',
  'BID CF': 'TAKE [N] CAPSULE(S) TWICE A DAY WITH FOOD',
  UD: 'USE AS DIRECTED',
}

/** Kroll shorthand codes that carry their own dose (`*1C` = one capsule once a day). */
export const KROLL_ALIASES: Record<string, { code: string; dose: string }> = {
  '*1C': { code: 'QD', dose: '1' },
  '1C': { code: 'QD', dose: '1' },
  '*2C': { code: 'QD', dose: '2' },
}

/** Fills `[N]` and resolves `(s)` / `(S)` plurals against the dose. */
export function fillDose(template: string, dose: string): string {
  const plural = dose === '1' ? '' : 's'
  return template.replaceAll('[N]', dose).replaceAll('(s)', plural).replaceAll('(S)', plural.toUpperCase())
}
