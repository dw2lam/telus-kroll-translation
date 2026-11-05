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

// Sentences drafted to cover the code list in the demo's languages. These are NOT team
// wording and nobody has verified them: the team must check every one. They stay separate
// so that's easy, the cheat sheet marks them, and only the exact code reaches them.
const DRAFTS: Record<string, Partial<Record<LanguageCode, string>>> = {
  BID: { pa: 'دن وچ دو وار [N] کیپسول لؤ' },
  TID: { ar: 'تناول [N] كبسولة عن طريق الفم ثلاث مرات يومياً', 'zh-Hant': '每日三次，每次[N]粒，口服', pa: 'دن وچ تن وار [N] کیپسول لؤ' },
  QID: { ar: 'تناول [N] كبسولة عن طريق الفم أربع مرات يومياً', 'zh-Hant': '每日四次，每次[N]粒，口服', pa: 'دن وچ چار وار [N] کیپسول لؤ' },
  QHS: { 'zh-Hant': '睡前服用，每次[N]粒，口服', pa: 'سون ویلے [N] کیپسول لؤ' },
  QAM: { hi: 'हर सुबह [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل صباح', 'zh-Hant': '每日早上一次，每次[N]粒，口服', pa: 'ہر سویرے [N] کیپسول لؤ' },
  QPM: { hi: 'हर शाम [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل مساء', 'zh-Hant': '每日晚上一次，每次[N]粒，口服', pa: 'ہر شام [N] کیپسول لؤ' },
  Q4H: { hi: 'हर 4 घंटे में [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل 4 ساعات', 'zh-Hant': '每4小時一次，每次[N]粒，口服', pa: 'ہر 4 گھنٹے بعد [N] کیپسول لؤ' },
  Q6H: { hi: 'हर 6 घंटे में [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل 6 ساعات', 'zh-Hant': '每6小時一次，每次[N]粒，口服', pa: 'ہر 6 گھنٹے بعد [N] کیپسول لؤ' },
  Q8H: { hi: 'हर 8 घंटे में [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل 8 ساعات', 'zh-Hant': '每8小時一次，每次[N]粒，口服', pa: 'ہر 8 گھنٹے بعد [N] کیپسول لؤ' },
  Q12H: { hi: 'हर 12 घंटे में [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل 12 ساعة', 'zh-Hant': '每12小時一次，每次[N]粒，口服', pa: 'ہر 12 گھنٹے بعد [N] کیپسول لؤ' },
  'QHS PRN': { ar: 'تناول [N] كبسولة عن طريق الفم عند النوم عند الحاجة', 'zh-Hant': '需要時於睡前服用，每次[N]粒，口服', pa: 'لوڑ پین تے سون ویلے [N] کیپسول لؤ' },
  'QD PRN': { ar: 'تناول [N] كبسولة عن طريق الفم مرة واحدة يومياً عند الحاجة', 'zh-Hant': '需要時服用，每日一次，每次[N]粒，口服', pa: 'لوڑ پین تے دن وچ اک وار [N] کیپسول لؤ' },
  'QHS PRN SLP': { ar: 'تناول [N] كبسولة عن طريق الفم عند النوم عند الحاجة للمساعدة على النوم', 'zh-Hant': '需要時於睡前服用以助眠，每次[N]粒，口服', pa: 'نیندر لئی لوڑ پین تے سون ویلے [N] کیپسول لؤ' },
  PRN: { ar: 'تناول [N] كبسولة عن طريق الفم عند الحاجة', 'zh-Hant': '需要時服用，每次[N]粒，口服', pa: 'لوڑ پین تے [N] کیپسول لؤ' },
  'Q4-6H PRN': { hi: 'ज़रूरत पड़ने पर हर 4 से 6 घंटे में [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم كل 4 إلى 6 ساعات عند الحاجة', 'zh-Hant': '需要時每4至6小時服用一次，每次[N]粒，口服', pa: 'لوڑ پین تے ہر 4 توں 6 گھنٹے بعد [N] کیپسول لؤ' },
  AC: { ar: 'تناول [N] كبسولة عن طريق الفم قبل الوجبات', 'zh-Hant': '飯前服用，每次[N]粒，口服', pa: 'کھانے توں پہلاں [N] کیپسول لؤ' },
  PC: { ar: 'تناول [N] كبسولة عن طريق الفم بعد الوجبات', 'zh-Hant': '飯後服用，每次[N]粒，口服', pa: 'کھانے توں بعد [N] کیپسول لؤ' },
  CF: { ar: 'تناول [N] كبسولة عن طريق الفم مع الطعام', 'zh-Hant': '隨餐服用，每次[N]粒，口服', pa: 'کھانے نال [N] کیپسول لؤ' },
  'QD CF': { hi: 'दिन में एक बार भोजन के साथ [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم مرة واحدة يومياً مع الطعام', pa: 'دن وچ اک وار کھانے نال [N] کیپسول لؤ' },
  'BID CF': { hi: 'दिन में दो बार भोजन के साथ [N] कैप्सूल मुँह से लें', ar: 'تناول [N] كبسولة عن طريق الفم مرتين يومياً مع الطعام', 'zh-Hant': '隨餐服用，每日兩次，每次[N]粒，口服', pa: 'دن وچ دو وار کھانے نال [N] کیپسول لؤ' },
  UD: { 'zh-Hant': '請按指示使用', pa: 'ہدایت مطابق ورتو' },
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

/** Reads a sig as a code: `BID`, `2 BID`, or written out, `2 CAP PO BID`. Null when it's free text. */
export function parseSigCode(input: string): { code: string; dose: string } | null {
  const text = input.trim().toUpperCase().replace(/\s+/g, ' ')
  const whole = KROLL_ALIASES[text]
  if (whole) return { code: whole.code, dose: whole.dose ?? '1' }
  const match = text.match(/^(?:(\d+(?:\.\d+)?)\s+)?(?:(?:CAPS?|CAPSULES?)\s+)?(?:PO\s+)?(.+)$/)
  if (!match) return null
  const code = KROLL_ALIASES[match[2]]?.code ?? match[2]
  return code in KROLL_EXPANSIONS ? { code, dose: match[1] ?? '1' } : null
}

/** Fills `[N]` and resolves `(s)` / `(S)` plurals against the dose. */
export function fillDose(template: string, dose: string): string {
  const plural = dose === '1' ? '' : 's'
  return template.replaceAll('[N]', dose).replaceAll('(s)', plural).replaceAll('(S)', plural.toUpperCase())
}
