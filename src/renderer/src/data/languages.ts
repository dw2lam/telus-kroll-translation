import type { Language, LanguageCode } from './types'

// Kroll's Language list, in its order (Figma B1). Kroll records any of them, but the demo
// only translates Hindi and Chinese (Simplified). Label strings come from the
// "C2 · Labels — full translation" designs and are illustrative, not verified. The
// `dispensing` wording is a draft in every language, Hindi included: the team still
// has to verify it. Values stay in English (see Panel2): drug, patient and prescriber
// names and Rx numbers can't be translated under DPRA s. 156(3).
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'fr', name: 'French', rtl: false },
  { code: 'ar', name: 'Arabic', rtl: true },
  {
    code: 'zh-Hans',
    name: 'Chinese (Simplified)',
    rtl: false,
    label: {
      pointer: '请翻到背面查看用药说明',
      peel: '撕开',
      header: '用药说明',
      tag: 'SIMPLIFIED · 简体',
      footer: ['The medicine name is in English'],
      dispensing: {
        quantity: '数量：{} 粒',
        refills: '续配：{} 次',
        date: '日期：{}',
        expiry: '有效期至：{}',
        prescriber: '医生：{}',
      },
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
      footer: ['दवा का नाम अंग्रेज़ी में है  ·  The medicine name is in English'],
      dispensing: {
        quantity: 'मात्रा: {} कैप्सूल',
        refills: 'रिफ़िल: {}',
        date: 'तिथि: {}',
        expiry: 'समाप्ति तिथि: {}',
        prescriber: 'डॉक्टर: {}',
      },
    },
  },
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
