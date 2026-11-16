import { describe, expect, it } from 'vitest'
import { callbackList, fingerprint, severityOf, verifyEntry } from '@/data/audit'
import { initialState, reducer, type FlowState } from '@/flow/state'

type A = Parameters<typeof reducer>[1]
const run = (state: FlowState, ...actions: A[]): FlowState => actions.reduce(reducer, state)
const fill = { ...initialState, screen: 'fill' as const }

/** Ms. Leung, 1C PO BID, confirmed and printed in Chinese. */
function printBid(state: FlowState = fill): FlowState {
  const s = run(state, { type: 'setSig', sig: '1C PO BID' }, { type: 'submitSig' })
  if (s.dialog?.kind !== 'exact') throw new Error(`expected exact, got ${s.dialog?.kind}`)
  return run(s, { type: 'confirm', candidate: s.dialog.candidate }, { type: 'print', englishOnly: false, view: 'inline' })
}

describe('PRD 2: audit log', () => {
  it('logs every print once, with a trace code, lines, and a receipt that carries no patient data', () => {
    const s = printBid()
    const entry = s.audit.at(-1)!
    expect(s.audit).toHaveLength(initialState.audit.length + 1)
    expect(entry.trace).toMatch(/^[2-9A-Z]{3}-[2-9A-Z]{3}$/)
    expect(entry.trace).not.toContain('1000051')
    // Figma C3: warnings are English stickers, so the label translates only the directions and its headings.
    expect(entry.lines.map((l) => l.key)).toEqual(['directions', 'chrome'])
    expect(entry.lines[0].phraseId).toBe('ZH-BID-001')
    expect(entry.fill).toBe(3)
    const receipt = s.receipts.at(-1)!
    expect(receipt).toMatchObject({ trace: entry.trace, status: 'sent', fingerprint: entry.fingerprint })
    expect(JSON.stringify(receipt)).not.toMatch(/Leung|1000051|1C PO BID/)
  })

  it('fingerprints the whole entry: any edit changes it, and verification catches it', () => {
    const s = printBid()
    const entry = s.audit.at(-1)!
    const receipt = s.receipts.at(-1)
    expect(verifyEntry(entry, receipt)).toBe(true)
    expect(fingerprint({ ...entry, sigTyped: '2C PO BID' })).not.toBe(entry.fingerprint)
    expect(verifyEntry({ ...entry, lines: entry.lines.slice(1) }, receipt)).toBe(false)
  })

  it('queues receipts offline and sends them when the connection returns', () => {
    const offline = printBid(run(fill, { type: 'setOnline', online: false }))
    expect(offline.receipts.at(-1)!.status).toBe('queued')
    expect(offline.job?.record).toMatchObject({ receipt: 'queued' })
    expect(run(offline, { type: 'setOnline', online: true }).receipts.at(-1)!.status).toBe('sent')
  })

  it('finds every print of a prescription by Rx number, including earlier fills', () => {
    const s = run(printBid(), { type: 'openRxHistory', rx: '1000051' })
    expect(s.audit.filter((e) => e.rx === s.rxHistory!.rx)).toHaveLength(3)
    const verified = run(s, { type: 'rxHistory', changes: { selected: 'P7C-9KD', view: 'entry' } }, { type: 'verifyEntry' })
    expect(verified.rxHistory!.verified).toBe(true)
  })
})

describe('PRD 1: reporting', () => {
  it('computes severity from the issue type', () => {
    expect(severityOf('meaning')).toBe(1)
    expect(severityOf('missing')).toBe(1)
    expect(severityOf('unreadable')).toBe(2)
    expect(severityOf('unclear')).toBe(2)
    expect(severityOf('formatting')).toBe(3)
    expect(severityOf('wrongPhrase')).toBeNull()
  })

  it('before printing: flagged headings print in English, the directions stay translated', () => {
    const s = run(fill, { type: 'setSig', sig: '1C PO BID' }, { type: 'submitSig' })
    const previewed = run(s, { type: 'confirm', candidate: (s.dialog as { candidate: never }).candidate }, { type: 'previewLabels' }, { type: 'startReport', origin: 'preview' })
    const done = run(
      previewed,
      { type: 'report', changes: { line: 'chrome', type: 'unclear', noticedBy: 'technician' } },
      { type: 'submitReport' },
    )
    expect(done.reports.at(-1)).toMatchObject({ severity: 2, beforePrint: true })
    expect(done.paused).toEqual([])
    const printed = run(done, { type: 'printFlagged', englishOnly: false, view: 'inline' })
    expect(printed.job?.translation).not.toBeNull()
    expect(printed.job?.englishLines).toEqual(['chrome'])
    expect(printed.audit.at(-1)!.linesInEnglish).toEqual(['chrome'])
  })

  it('before printing: flagged dosing directions mean no translated label at all', () => {
    const s = run(fill, { type: 'setSig', sig: '1C PO BID' }, { type: 'submitSig' })
    const done = run(
      s,
      { type: 'confirm', candidate: (s.dialog as { candidate: never }).candidate },
      { type: 'previewLabels' },
      { type: 'startReport', origin: 'preview' },
      { type: 'report', changes: { line: 'directions', type: 'meaning', noticedBy: 'technician' } },
      { type: 'submitReport' },
      { type: 'printFlagged', englishOnly: false, view: 'inline' },
    )
    expect(done.job?.translation).toBeNull()
  })

  it('a phone call days later: a severity 1 report is submitted, pauses nothing, and the reprint is a new entry', () => {
    const s = run(
      fill,
      { type: 'startReport', origin: 'lookup' },
      { type: 'report', changes: { rx: '1000048', trace: 'W3R-6TB' } },
      { type: 'reportStep', step: 'line' },
      { type: 'report', changes: { line: 'directions', type: 'missing', noticedBy: 'caregiver', taken: 'yes' } },
      { type: 'submitReport' },
    )
    expect(s.reports.at(-1)).toMatchObject({ severity: 1, taken: 'yes', phraseId: 'ZH-DAILY-CF-001' })
    expect(s.reports.at(-1)!.timeline.map((t) => t.status)).toEqual(['received'])
    // Team review 2026-11-16: one report never pauses a sentence for every pharmacy; TELUS confirms first.
    expect(s.paused).toEqual([])
    expect(s.notice).toBeNull()
    expect(s.report?.step).toBe('done')
    expect(callbackList(s.audit, 'ZH-DAILY-CF-001').map((e) => e.trace)).toEqual(['W3R-6TB'])
    const reprinted = run(s, { type: 'reprint', trace: 'W3R-6TB', englishOnly: true, view: 'inline' })
    const entry = reprinted.audit.at(-1)!
    expect(entry.corrects).toBe('W3R-6TB')
    expect(reprinted.job?.translation).toBeNull()
    expect(reprinted.audit.find((e) => e.trace === 'W3R-6TB')!.linesInEnglish).toEqual([])
  })

  it('a paused headings phrase prints in English automatically on every later label', () => {
    const paused = { ...fill, paused: ['ZH-CHROME-001'] }
    expect(printBid(paused).job?.englishLines).toEqual(['chrome'])
  })

  it('wrong English phrase picked is a pharmacy error and pauses nothing', () => {
    const s = run(
      fill,
      { type: 'startReport', origin: 'history', trace: 'P7C-9KD' },
      { type: 'report', changes: { line: 'directions', type: 'wrongPhrase', noticedBy: 'pharmacist', taken: 'no' } },
      { type: 'submitReport' },
    )
    expect(s.reports.at(-1)!.severity).toBeNull()
    expect(s.reports.at(-1)!.timeline.map((t) => t.status)).toEqual(['received', 'noChange'])
    expect(s.paused).toEqual([])
  })

  it('TELUS pauses a sentence it confirmed: it falls back to English here until the fix ships', () => {
    const s = run(fill, { type: 'simulateExternalReport' })
    expect(s.notice).toMatchObject({ kind: 'paused', elsewhere: true })
    const again = run(s, { type: 'closeNotice' }, { type: 'setSig', sig: '1C PO BID' }, { type: 'submitSig' })
    expect(again.dialog?.kind).toBe('paused')
    const fixed = run(again, { type: 'closeDialog' }, { type: 'simulateFix' })
    expect(fixed.libraryVersion).toBe('v2026.12')
    expect(fixed.reports.at(-1)!.timeline.at(-1)!.status).toBe('fixed')
    expect(run(fixed, { type: 'closeNotice' }, { type: 'submitSig' }).dialog?.kind).toBe('exact')
  })
})

describe('Figma C3 labels: vial sizes', () => {
  it('suggests a vial from the quantity and form, and the pharmacist can pick another', async () => {
    const { suggestVial, vialById } = await import('@/labels/vials')
    expect(suggestVial('30', 'capsule')).toBe('16')
    expect(suggestVial('30', 'tablet')).toBe('13')
    expect(suggestVial('90', 'capsule')).toBe('40')
    expect(suggestVial('', 'capsule')).toBe('16')
    expect(vialById('20')).toMatchObject({ width: 504, height: 288, pointer: true })
    expect(vialById('6')).toMatchObject({ width: 288, height: 180, pointer: false })
    const s = printBid()
    expect(s.job?.vial).toBe('16')
    const picked = run(fill, { type: 'setVial', vial: '30' }, { type: 'setSig', sig: '1C PO BID' }, { type: 'previewLabels' })
    expect(picked.job?.vial).toBe('30')
    expect(run(picked, { type: 'setVial', vial: '6' }).job?.vial).toBe('6')
  })

  it('lists the front "turn to the back" line as a heading only on labels with room for it', async () => {
    const { labelLines } = await import('@/data/audit')
    const base = { language: 'zh-Hans' as const, sigCode: 'BID', text: '每日两次', gloss: 'TAKE 1 CAPSULE BY MOUTH TWICE DAILY' }
    expect(labelLines({ ...base, pointer: true })[1].text).toContain('请翻至背面')
    expect(labelLines({ ...base, pointer: false })[1].text).not.toContain('请翻至背面')
  })
})
