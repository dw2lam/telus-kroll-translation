import type { Language, LanguageCode } from './types'

// Kroll's Language list, in its order (Figma B1). Label strings come from the
// "C2 · Labels — full translation" designs and are illustrative, not verified. The
// `dispensing` wording is a draft in every language, Hindi included: the team still
// has to verify it. Values stay in English (see Panel2): drug, patient and prescriber
// names and Rx numbers can't be translated under DPRA s. 156(3).
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
      footer: ['اسم الدواء مكتوب بالحروف اللاتينية  ·  The medicine name is in English'],
      dispensing: {
        quantity: 'الكمية: {} كبسولة',
        refills: 'إعادة الصرف: {}',
        date: 'التاريخ: {}',
        expiry: 'تاريخ الانتهاء: {}',
        prescriber: 'الطبيب: {}',
      },
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
      footer: ['The medicine name is in English'],
      dispensing: {
        quantity: '數量：{} 粒',
        refills: '續配：{} 次',
        date: '日期：{}',
        expiry: '有效期至：{}',
        prescriber: '醫生：{}',
      },
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
  {
    code: 'pa',
    name: 'Punjabi',
    rtl: true,
    label: {
      pointer: 'ہدایتاں لئی پچھے ویکھو',
      peel: 'کھچو',
      header: 'ہدایتاں',
      tag: 'INSTRUCTIONS · SHAHMUKHI',
      footer: ['The medicine name is in English'],
      dispensing: {
        quantity: 'مقدار: {} کیپسول',
        refills: 'ریفل: {}',
        date: 'تاریخ: {}',
        expiry: 'میعاد ختم: {}',
        prescriber: 'ڈاکٹر: {}',
      },
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
