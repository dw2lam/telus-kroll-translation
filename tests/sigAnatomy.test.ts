import { describe, expect, it } from 'vitest'
import { decodeSig, latinOf, meaningOf } from '@/cheatsheet/sigAnatomy'
import { KROLL_EXPANSIONS, parseSigCode } from '@/data/phrasebook'

describe('sig decoder', () => {
  it('breaks a full sig into dose, form, route and timing', () => {
    const d = decodeSig('2T PO BID')
    expect(d.tokens.map((t) => [t.text, t.role])).toEqual([['2', 'dose'], ['T', 'form'], ['PO', 'route'], ['BID', 'when']])
    expect(d.english).toBe('TAKE 2 TABLETS TWICE A DAY')
  })

  it('reads written-out forms and aliases', () => {
    expect(decodeSig('2 CAP PO BID').english).toBe('TAKE 2 CAPSULES TWICE A DAY')
    expect(decodeSig('HS').code).toBe('QHS')
    expect(decodeSig('*1C').english).toBe('TAKE 1 CAPSULE ONCE A DAY')
  })

  it('splits stacked codes and every-N-hours', () => {
    expect(decodeSig('QHS PRN SLP').tokens.map((t) => t.means)).toEqual(['at bedtime', 'as needed', 'for sleep'])
    expect(decodeSig('Q4-6H PRN').tokens[0].means).toBe('every 4 to 6 hours')
  })

  it('has no QD or OD, which are on ISMP Canada’s Do Not Use list', () => {
    for (const banned of ['QD', 'OD', '1 QD', '2 CAP PO OD']) expect(decodeSig(banned).code, banned).toBeNull()
    expect(decodeSig('QD').tokens[0].means).toMatch(/Do Not Use list/)
  })

  it('calls free text free text', () => {
    const d = decodeSig('1 CAP DAILY FOR ANEMIA')
    expect(d.code).toBeNull()
    expect(d.tokens.filter((t) => t.role === 'unknown').map((t) => t.text)).toEqual(['FOR', 'ANEMIA'])
  })

  it('agrees with what Kroll parses as a code', () => {
    for (const sig of ['BID', '2 BID', '1T PO BID', '2 CAP PO BID', 'QD', 'OD', 'HS', '1C', 'QHS PRN SLP', '1 CAP DAILY FOR ANEMIA', 'zzz']) {
      expect(decodeSig(sig).code, sig).toBe(parseSigCode(sig)?.code ?? null)
    }
  })

  it('has a meaning and Latin for every code', () => {
    for (const code of Object.keys(KROLL_EXPANSIONS)) {
      expect(meaningOf(code), code).not.toBe('')
      if (!['CF', 'DAILY', 'DAILY PRN', 'DAILY CF'].includes(code)) expect(latinOf(code), code).not.toBe('')
    }
  })
})
