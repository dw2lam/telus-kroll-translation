import { describe, expect, it } from 'vitest'
import { provider } from '@/data/demoProvider'
import { languageByCode } from '@/data/languages'

const hindi = languageByCode('hi')

describe('demo provider', () => {
  it('matches Kroll codes exactly, with implied or leading doses', () => {
    const star = provider.translate('*1C', hindi)
    expect(star.kind).toBe('exact')
    if (star.kind === 'exact') {
      expect(star.candidate.sig.code).toBe('QD')
      expect(provider.render(star.candidate.sig, hindi, star.candidate.dose)).toBe('दिन में एक बार 1 कैप्सूल मुँह से लें')
    }
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
  })

  it('uses the dose-specific sentence when one exists, and refuses doses that were never verified', () => {
    const arabic = languageByCode('ar')
    const one = provider.translate('*1C', arabic)
    expect(one.kind === 'exact' && provider.render(one.candidate.sig, arabic, '1')).toContain('كبسولة واحدة')
    const two = provider.translate('2 QD', arabic)
    expect(two.kind === 'exact' && provider.render(two.candidate.sig, arabic, '2')).toContain('\u20682\u2069')
    expect(provider.translate('2 QD', languageByCode('pa')).kind).toBe('noVerified')
  })

  it('knows the wider Kroll code list, and sends untranslated codes to the phrasing guide', () => {
    expect(provider.translate('QID', hindi).kind).toBe('exact')
    expect(provider.translate('QAM', hindi).kind).toBe('noVerified')
    expect(provider.translate('BID', languageByCode('zh-Hant')).kind).toBe('exact')
    const r = provider.translate('take 1 capsule every 4 to 6 hours as needed', hindi)
    expect(r.kind).not.toBe('exact')
  })
})
