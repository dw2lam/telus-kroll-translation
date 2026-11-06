import type { LanguageCode, VerifiedSig } from './types'

// Every sig code the demo knows. Non-English strings are only ever ones the team
// already wrote — the Figma flow (B8, B9), the label designs, and the seed
// sheets of the original engine — and all of them are illustrative. A code with
// no string for a language is still listed: the demo answers it with the
// phrasing guide, which is exactly what the real flow must do.
const TEAM_SENTENCES: VerifiedSig[] = [
  {
    code: 'QD',
    english: 'Take [N] capsule(s) by mouth once daily',
    translations: {
      hi: 'दिन में एक बार [N] कैप्सूल मुँह से लें',
      'zh-Hans': '每天 1 次，每次 [N] 粒胶囊',
    },
  },
  {
    code: 'BID',
    english: 'Take [N] capsule(s) by mouth twice daily',
    translations: {
      hi: 'दिन में दो बार [N] कैप्सूल मुँह से लें',
      'zh-Hans': '每日两次，每次[N]粒，口服',
    },
  },
  { code: 'TID', english: 'Take [N] capsule(s) by mouth three times daily', translations: { hi: 'दिन में तीन बार [N] कैप्सूल मुँह से लें' } },
  { code: 'QID', english: 'Take [N] capsule(s) by mouth four times daily', translations: { hi: 'दिन में चार बार [N] कैप्सूल मुँह से लें' } },
  {
    code: 'QHS',
    english: 'Take [N] capsule(s) by mouth at bedtime',
    translations: { hi: 'सोते समय [N] कैप्सूल मुँह से लें' },
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
    translations: { 'zh-Hans': '随餐服用，每日一次，每次[N]粒，口服' },
  },
  { code: 'BID CF', english: 'Take [N] capsule(s) by mouth twice daily with food', translations: {} },
  { code: 'UD', english: 'Use as directed', translations: { hi: 'निर्देशानुसार लें' } },
]

// Sentences drafted to cover the code list in the demo's languages. These are NOT team
// wording and nobody has verified them: the team must check every one. They stay separate
// so that's easy, the cheat sheet marks them, and only the exact code reaches them.
const DRAFTS: Record<string, Partial<Record<LanguageCode, string>>> = {
  TID: { 'zh-Hans': '每日三次，每次[N]粒，口服' },
  QID: { 'zh-Hans': '每日四次，每次[N]粒，口服' },
  QHS: { 'zh-Hans': '睡前服用，每次[N]粒，口服' },
  QAM: { hi: 'हर सुबह [N] कैप्सूल मुँह से लें', 'zh-Hans': '每日早上一次，每次[N]粒，口服' },
  QPM: { hi: 'हर शाम [N] कैप्सूल मुँह से लें', 'zh-Hans': '每日晚上一次，每次[N]粒，口服' },
  Q4H: { hi: 'हर 4 घंटे में [N] कैप्सूल मुँह से लें', 'zh-Hans': '每4小时一次，每次[N]粒，口服' },
  Q6H: { hi: 'हर 6 घंटे में [N] कैप्सूल मुँह से लें', 'zh-Hans': '每6小时一次，每次[N]粒，口服' },
  Q8H: { hi: 'हर 8 घंटे में [N] कैप्सूल मुँह से लें', 'zh-Hans': '每8小时一次，每次[N]粒，口服' },
  Q12H: { hi: 'हर 12 घंटे में [N] कैप्सूल मुँह से लें', 'zh-Hans': '每12小时一次，每次[N]粒，口服' },
  'QHS PRN': { 'zh-Hans': '需要时于睡前服用，每次[N]粒，口服' },
  'QD PRN': { 'zh-Hans': '需要时服用，每日一次，每次[N]粒，口服' },
  'QHS PRN SLP': { 'zh-Hans': '需要时于睡前服用以助眠，每次[N]粒，口服' },
  PRN: { 'zh-Hans': '需要时服用，每次[N]粒，口服' },
  'Q4-6H PRN': { hi: 'ज़रूरत पड़ने पर हर 4 से 6 घंटे में [N] कैप्सूल मुँह से लें', 'zh-Hans': '需要时每4至6小时服用一次，每次[N]粒，口服' },
  AC: { 'zh-Hans': '饭前服用，每次[N]粒，口服' },
  PC: { 'zh-Hans': '饭后服用，每次[N]粒，口服' },
  CF: { 'zh-Hans': '随餐服用，每次[N]粒，口服' },
  'QD CF': { hi: 'दिन में एक बार भोजन के साथ [N] कैप्सूल मुँह से लें' },
  'BID CF': { hi: 'दिन में दो बार भोजन के साथ [N] कैप्सूल मुँह से लें', 'zh-Hans': '随餐服用，每日两次，每次[N]粒，口服' },
  UD: { 'zh-Hans': '请按指示使用' },
}

export const PHRASEBOOK: VerifiedSig[] = TEAM_SENTENCES.map((sig) => ({ ...sig, drafts: DRAFTS[sig.code] }))

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

/** Other ways pharmacists write a code. `*1C` is the shorthand in the Figma frames: one capsule once a day. */
export const KROLL_ALIASES: Record<string, { code: string; dose?: string }> = {
  OD: { code: 'QD' },
  HS: { code: 'QHS' },
  '*1C': { code: 'QD', dose: '1' },
  '1C': { code: 'QD', dose: '1' },
  '*2C': { code: 'QD', dose: '2' },
}

export type DoseForm = 'capsule' | 'tablet'

/** Reads a sig as a code: `BID`, `2 BID`, `1T PO BID`, or written out, `2 CAP PO BID`. Null when it's free text. */
export function parseSigCode(input: string): { code: string; dose: string; form: DoseForm } | null {
  const text = input.trim().toUpperCase().replace(/\s+/g, ' ')
  const whole = KROLL_ALIASES[text]
  if (whole) return { code: whole.code, dose: whole.dose ?? '1', form: 'capsule' }
  const match = text.match(/^(?:(\d+(?:\.\d+)?)\s*(C|T|CAPS?|CAPSULES?|TABS?|TABLETS?)?\s+)?(?:PO\s+)?(.+)$/)
  if (!match) return null
  const code = KROLL_ALIASES[match[3]]?.code ?? match[3]
  if (!(code in KROLL_EXPANSIONS)) return null
  return { code, dose: match[1] ?? '1', form: match[2]?.startsWith('T') ? 'tablet' : 'capsule' }
}

/** The same sentence for a tablet: every sentence is written for capsules. The tablet words are drafts too. */
export function forForm(text: string, form: DoseForm): string {
  if (form === 'capsule') return text
  return text
    .replaceAll('capsule', 'tablet')
    .replaceAll('CAPSULE', 'TABLET')
    .replaceAll('कैप्सूल', 'गोली')
    .replaceAll('粒胶囊', '片')
    .replaceAll('粒', '片')
}

/** Fills `[N]` and resolves `(s)` / `(S)` plurals against the dose. */
export function fillDose(template: string, dose: string): string {
  const plural = dose === '1' ? '' : 's'
  return template.replaceAll('[N]', dose).replaceAll('(s)', plural).replaceAll('(S)', plural.toUpperCase())
}
