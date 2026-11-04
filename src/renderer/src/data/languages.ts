import type { Language, LanguageCode } from './types'

// Kroll's Language list, in its order (Figma B1). Label strings come from the
// "C · Labels — printed output" designs and are illustrative, not verified.
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'fr', name: 'French', rtl: false },
  {
    code: 'ar',
    name: 'Arabic',
    rtl: true,
    label: {
      pointer: 'اقلب الملصق لقراءة التعليمات',
      peel: 'اسحب',
      header: 'التعليمات',
      tag: 'INSTRUCTIONS · العربية',
      footer: ['اسم الدواء مكتوب بالحروف اللاتينية  ·  Drug name stays in Latin script (WHO INN)'],
    },
  },
  {
    code: 'zh-Hant',
    name: 'Chinese (Traditional)',
    rtl: false,
    label: {
      pointer: '請翻到背面查看用藥說明',
      peel: '撕開',
      header: '用藥說明',
      tag: 'TRADITIONAL · 繁體',
      footer: ['Drug name stays in Latin script (WHO INN)'],
    },
  },
  {
    code: 'hi',
    name: 'Hindi',
    rtl: false,
    label: {
      pointer: 'निर्देशों के लिए पीछे देखें',
      peel: 'छीलें',
      header: 'निर्देश',
      tag: 'INSTRUCTIONS · हिन्दी',
      footer: [
        'दवा का नाम अंग्रेज़ी में है  ·  Drug name stays in Latin script (WHO INN)',
        'अनुवाद: सत्यापित वाक्यांश बैंक  ·  Translated from a human-verified phrase bank, not machine translation. Auxiliary warnings remain English in v1.',
      ],
    },
  },
  {
    code: 'pa',
    name: 'Punjabi',
    rtl: true,
    label: {
      pointer: 'ہدایتاں لئی پچھے ویکھو',
      peel: 'کھچو',
      header: 'ہدایتاں',
      tag: 'INSTRUCTIONS · PUNJABI (SHAHMUKHI)',
      footer: ['Drug name stays in Latin script (WHO INN)'],
    },
  },
  { code: 'es', name: 'Spanish', rtl: false },
  { code: 'tl', name: 'Tagalog', rtl: false },
  { code: 'ur', name: 'Urdu', rtl: true },
]

export function languageByCode(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

/** English needs no translation; every other language needs verified strings. */
export const hasTranslation = (language: Language): boolean => language.label !== undefined
