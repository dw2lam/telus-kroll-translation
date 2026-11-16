import type { Language, LanguageCode } from './types'

// Kroll's Language list, in its order (Figma B1). Kroll records any of them, but the demo
// only translates Hindi and Chinese (Simplified). Chinese label strings come from the
// Figma C3 labels; Hindi's come from the earlier C2 designs, and its `expiry` word is the
// team's draft. All are illustrative, not verified. Values stay in English (see Panel2):
// drug, patient and prescriber names and Rx numbers can't be translated under DPRA s. 156(3).
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'fr', name: 'French', rtl: false },
  { code: 'ar', name: 'Arabic', rtl: true },
  {
    code: 'zh-Hans',
    name: 'Chinese (Simplified)',
    rtl: false,
    label: {
      pointer: '请翻至背面查看药物说明译文',
      peel: '撕开',
      header: '用药说明',
      tag: 'SIMPLIFIED · 简体',
      expiry: '有效期',
    },
  },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', rtl: false },
  {
    code: 'hi',
    name: 'Hindi',
    rtl: false,
    label: {
      pointer: 'निर्देशों के लिए पीछे देखें',
      peel: 'छीलें',
      header: 'निर्देश',
      tag: 'INSTRUCTIONS · हिन्दी',
      expiry: 'समाप्ति तिथि',
    },
  },
  { code: 'fa', name: 'Persian (Farsi)', rtl: true },
  { code: 'pa', name: 'Punjabi', rtl: true },
  { code: 'es', name: 'Spanish', rtl: false },
  { code: 'tl', name: 'Tagalog', rtl: false },
  { code: 'ur', name: 'Urdu', rtl: true },
]

export function languageByCode(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

/** English needs no translation; every other language needs verified strings. */
export const hasTranslation = (language: Language): boolean => language.label !== undefined
