import { describe, expect, it } from 'vitest'
import { provider } from '@/data/demoProvider'
import { languageByCode } from '@/data/languages'
import { PHRASEBOOK } from '@/data/phrasebook'

const hindi = languageByCode('hi')

describe('demo provider', () => {
  it('matches Kroll codes exactly, with implied or leading doses', () => {
    const qd = provider.translate('QD', hindi)
    expect(qd.kind).toBe('exact')
    if (qd.kind === 'exact') {
      expect(qd.candidate.sig.code).toBe('QD')
      expect(provider.render(qd.candidate.sig, hindi, qd.candidate.dose)).toBe('दिन में एक बार 1 कैप्सूल मुँह से लें')
    }
    expect(provider.translate('*1C', hindi).kind).toBe('exact')
    const bid = provider.translate('2 bid', hindi)
    expect(bid.kind === 'exact' && bid.candidate.dose).toBe('2')
  })

  it('reproduces the Figma free-text flow: closest QHS PRN at 88%, then the B8 top five', () => {
    const r = provider.translate('1 CAP QHS PRN DIZZINESS', hindi)
    expect(r.kind).toBe('closest')
    if (r.kind !== 'closest') return
    expect(r.candidate.sig.code).toBe('QHS PRN')
    expect(Math.round(r.candidate.confidence * 100)).toBe(88)
    expect(r.readAs).toBe('take 1 capsule at bedtime as needed for dizziness')
    expect(r.others.map((c) => c.sig.code)).toEqual(['QHS', 'QD PRN', 'QHS PRN SLP', 'PRN'])
  })

  it('reads "twice daily" as BID, not QD', () => {
    const r = provider.translate('take 2 capsules by mouth twice daily', hindi)
    expect(r.kind === 'exact' && r.candidate.sig.code).toBe('BID')
  })

  it('refuses what it cannot represent, and gates languages without verified sigs', () => {
    expect(provider.translate('zzz qqq', hindi).kind).toBe('cannotTranslate')
    expect(provider.translate('1 cap bid tid', hindi).kind).toBe('cannotTranslate')
    expect(provider.translate('*1C', languageByCode('tl')).kind).toBe('notYetTranslatable')
    expect(provider.translate('*1C', languageByCode('fr')).kind).toBe('notYetTranslatable')
    for (const code of ['ar', 'pa', 'zh-Hant'] as const) expect(provider.translate('QD', languageByCode(code)).kind).toBe('notYetTranslatable')
  })

  it('knows the wider Kroll code list, and sends untranslated codes to the phrasing guide', () => {
    expect(provider.translate('QID', hindi).kind).toBe('exact')
    expect(provider.translate('QAM', hindi).kind).toBe('exact')
    expect(provider.translate('BID', languageByCode('zh-Hans')).kind).toBe('exact')
    const r = provider.translate('take 1 capsule every 4 to 6 hours as needed', hindi)
    expect(r.kind).not.toBe('exact')
  })

  it('reads real codes written out in full, in every translated language', () => {
    for (const code of ['zh-Hans', 'hi'] as const) {
      const language = languageByCode(code)
      for (const sig of PHRASEBOOK) {
        const kind = provider.translate(sig.code, language).kind
        expect(`${code} ${sig.code} ${kind}`).toBe(`${code} ${sig.code} exact`)
      }
      const written = provider.translate('2 CAP PO TID', language)
      expect(written.kind === 'exact' && [written.candidate.sig.code, written.candidate.dose]).toEqual(['TID', '2'])
    }
    expect(provider.translate('OD', hindi).kind).toBe('exact')
    expect(provider.translate('1 CAP PO HS', hindi).kind).toBe('exact')
  })

  it('never offers an unverified draft for free text', () => {
    const chinese = languageByCode('zh-Hans')
    expect(provider.phrasingGuide(chinese).map((s) => s.code)).toEqual(['QD', 'BID', 'QD CF'])
    expect(provider.translate('take 1 capsule three times a day', chinese).kind).not.toBe('exact')
  })
})
