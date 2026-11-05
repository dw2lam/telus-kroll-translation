import type { LanguageCode } from './types'

/** The prescription on screen in every Figma frame. */
export const PATIENT = {
  lastName: 'Shah',
  firstName: 'Rohan',
  salutation: 'Ms.',
  address: '100 Main St',
  city: 'Vancouver',
  postal: 'M1M 1M1',
  email: 'rshah@email.com',
  phone: '(555) 555-5555',
  birthdate: '05/05/1980',
  age: '34 years',
  gender: 'Female',
  height: `5' 6"`,
  weight: '120',
}

export const RX = {
  number: '1000051',
  pharmacy: 'Kroll Pharmacy',
  pharmacyPhone: '416-383-1010',
  pharmacyAddress: '220 Duncan Mill Road, Toronto ON M3B 3J5',
  doctor: 'Dr. McGraw, Phil',
  date: '06-Oct-2014',
  expiry: '01-Jan-2015',
  quantity: '30',
  form: 'CAP',
  brand: 'Euro-Fer',
  strength: '300mg',
  generic: 'Ferrous Fumarate',
  din: '02237556',
  manufacturer: 'EUC',
  refills: '6',
  warnings: [
    'Take medication on an empty stomach-one hour before or two to three hours after a meal unless otherwise directed by your doctor.',
    'If this medication upsets your stomach, take it with crackers, bread or a small meal.',
    'May cause discoloration of the urine or feces.',
    'Medication should be taken with plenty of water.',
    'Do not lie down for at least 10 minutes after taking this medication.',
  ],
}

/**
 * RX.warnings in the patient's language, in the same order, for the under-panel, matching
 * the Figma labels (section C). A language without an entry keeps its warnings in English.
 * Hindi is the team's wording. Chinese is the team's Simplified wording (Figma "Letter - 76")
 * converted to Traditional; Arabic and Punjabi were drafted for the demo. All except Hindi
 * still need team verification.
 */
export const RX_WARNINGS: Partial<Record<LanguageCode, string[]>> = {
  hi: [
    'दवा खाली पेट लें—भोजन से एक घंटा पहले या भोजन के दो से तीन घंटे बाद, जब तक कि आपके डॉक्टर ने अन्यथा निर्देश न दिए हों।',
    'यदि इस दवा से आपके पेट में परेशानी होती है, तो इसे क्रैकर्स, ब्रेड या थोड़े से भोजन के साथ लें।',
    'इस दवा के कारण पेशाब या मल के रंग में बदलाव हो सकता है।',
    'इस दवा को भरपूर पानी के साथ लेना चाहिए।',
    'इस दवा को लेने के बाद कम से कम 10 मिनट तक न लेटें',
  ],
  'zh-Hant': [
    '除非醫生另有指示，請空腹服藥：飯前1小時或飯後2至3小時服用。',
    '如服藥後胃部不適，可與餅乾、麵包或少量食物同服。',
    '本藥可能使尿液或糞便變色。',
    '服藥時請飲用足量的水。',
    '服藥後至少10分鐘內不要躺下。',
  ],
  ar: [
    'تناول الدواء على معدة فارغة — قبل الأكل بساعة أو بعده بساعتين إلى ثلاث ساعات، ما لم يوجّهك طبيبك بخلاف ذلك.',
    'إذا سبّب لك هذا الدواء اضطرابًا في المعدة، فتناوله مع البسكويت أو الخبز أو وجبة خفيفة.',
    'قد يسبّب هذا الدواء تغيّرًا في لون البول أو البراز.',
    'يجب تناول هذا الدواء مع كمية وافرة من الماء.',
    'لا تستلقِ لمدة 10 دقائق على الأقل بعد تناول هذا الدواء.',
  ],
  pa: [
    'دوائی خالی پیٹ لؤ — کھانے توں اک گھنٹہ پہلاں یا کھانے توں دو توں تن گھنٹے بعد، جدوں تیک تہاڈے ڈاکٹر نے ہور ہدایت نہ دتی ہووے۔',
    'جے ایس دوائی نال تہاڈا پیٹ خراب ہووے، تے ایہنوں کریکر، ڈبل روٹی یا تھوڑے جہے کھانے نال لؤ۔',
    'ایس دوائی نال پیشاب یا پاخانے دا رنگ بدل سکدا اے۔',
    'ایہ دوائی بہتے پانی نال لینی چاہیدی اے۔',
    'ایہ دوائی لین توں بعد گھٹ توں گھٹ 10 منٹ تیک نہ لیٹو۔',
  ],
}

/** One-click setups for presenting each branch of the flow. */
export interface Scenario {
  id: string
  title: string
  detail: string
  language: LanguageCode
  sig: string
}

export const SCENARIOS: Scenario[] = [
  { id: 'exact-code', title: 'Hindi · QD', detail: 'Exact match (B3 → B4 → B5)', language: 'hi', sig: 'QD' },
  { id: 'closest', title: 'Hindi · free-text sig', detail: 'Closest → top 5 → phrasing guide → can’t translate (B6 → B10)', language: 'hi', sig: '1 CAP QHS PRN DIZZINESS' },
  { id: 'exact-text', title: 'Hindi · free text, exact', detail: 'Free text that matches a verified sig exactly', language: 'hi', sig: 'take 2 capsules by mouth twice daily' },
  { id: 'tagalog', title: 'Tagalog · QD', detail: 'Captured, not yet translatable (B3t → B4t)', language: 'tl', sig: 'QD' },
  { id: 'arabic', title: 'Arabic · QD', detail: 'Right-to-left under-panel (label 12)', language: 'ar', sig: 'QD' },
  { id: 'chinese', title: 'Chinese (Traditional) · QD', detail: 'Traditional script label (label 17)', language: 'zh-Hant', sig: 'QD' },
  { id: 'punjabi', title: 'Punjabi (Shahmukhi) · QD', detail: 'Dual-script case (label 16)', language: 'pa', sig: 'QD' },
]
