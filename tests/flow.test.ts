import { describe, expect, it } from 'vitest'
import { stateAt, tourById } from '@/demo/tours'
import { detailsOf, initialState, krollSigText, reducer, type FlowState } from '@/flow/state'

const run = (state: FlowState, ...actions: Parameters<typeof reducer>[1][]): FlowState => actions.reduce(reducer, state)

describe('fill flow', () => {
  it('expands Kroll codes for the English label and keeps free text as typed', () => {
    expect(krollSigText('*1C')).toBe('TAKE 1 CAPSULE ONCE A DAY')
    expect(krollSigText('2 BID')).toBe('TAKE 2 CAPSULES TWICE A DAY')
    expect(krollSigText('2 CAP PO BID')).toBe('TAKE 2 CAPSULES TWICE A DAY')
    expect(krollSigText('1 cap qhs prn dizziness')).toBe('1 CAP QHS PRN DIZZINESS')
    expect(krollSigText('1C PO BID')).toBe('TAKE 1 CAPSULE TWICE A DAY')
    expect(krollSigText('1T PO BID')).toBe('TAKE 1 TABLET TWICE A DAY')
  })

  it('prints what was edited on screen, and the reset puts it back', () => {
    const edited = run({ ...initialState, screen: 'fill' }, { type: 'edit', changes: { lastName: 'Chen', doctor: 'Dr. Lee' } }, { type: 'print', englishOnly: true, view: 'inline' })
    expect(edited.job?.details.lastName).toBe('Chen')
    expect(edited.job?.details.doctor).toBe('Dr. Lee')
    expect(Object.keys(edited.edits)).toHaveLength(2)
    expect(detailsOf(run(edited, { type: 'resetEdits' })).lastName).toBe('Shah')
    // Typing a field back to its original value isn't an edit.
    expect(run(edited, { type: 'edit', changes: { lastName: 'Shah' } }).edits).toEqual({ doctor: 'Dr. Lee' })
  })

  it('keeps edits while stepping through a walkthrough, and drops them for another patient', () => {
    const edited = run(initialState, { type: 'edit', changes: { firstName: 'Mei' } })
    expect(run(edited, { type: 'load', state: { ...initialState, screen: 'fill' } }).edits).toEqual({ firstName: 'Mei' })
    expect(run(edited, { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: 'BID' }).edits).toEqual({})
  })

  it('walks Mrs. Leung from intake to a translated label', () => {
    const tour = tourById('leung')!
    const end = stateAt(tour, 5, { view: '3d' })
    expect(detailsOf(end).lastName).toBe('Leung')
    expect(detailsOf(end).age).toBe('78 years')
    expect(end.language).toBe('zh-Hans')
    expect(end.job?.englishSig).toBe('TAKE 1 CAPSULE TWICE A DAY')
    expect(end.job?.translation?.text).toBe('每日两次，每次1粒，口服')
  })

  it('swaps the dose form when the sig is for tablets', () => {
    const s = run({ ...initialState, screen: 'fill', language: 'zh-Hans', sigInput: '1T PO BID' }, { type: 'submitSig' })
    const printed = run(s, { type: 'confirm', candidate: (s.dialog as { candidate: never }).candidate }, { type: 'print', englishOnly: false, view: '3d' })
    expect(printed.job?.form).toBe('tablet')
    expect(printed.job?.translation?.text).toBe('每日两次，每次1片，口服')
    expect(printed.job?.translation?.gloss).toBe('TAKE 1 TABLET BY MOUTH TWICE DAILY')
  })

  it('exact match → confirm → prints both panels', () => {
    const s = run({ ...initialState, screen: 'fill' }, { type: 'submitSig' })
    expect(s.dialog?.kind).toBe('exact')
    const confirmed = run(s, { type: 'confirm', candidate: (s.dialog as { candidate: never }).candidate })
    expect(confirmed.confirmed?.text).toBe('दिन में एक बार 1 कैप्सूल मुँह से लें')
    const printed = run(confirmed, { type: 'print', englishOnly: false, view: '3d' })
    expect(printed.screen).toBe('print')
    expect(printed.job?.englishSig).toBe('TAKE 1 CAPSULE ONCE A DAY')
    expect(printed.job?.translation?.gloss).toBe('TAKE 1 CAPSULE BY MOUTH ONCE DAILY')
  })

  it('closest → not this one → none of these → none fit → English only', () => {
    let s = run({ ...initialState, screen: 'fill', sigInput: '1 CAP QHS PRN DIZZINESS' }, { type: 'submitSig' })
    expect(s.dialog?.kind).toBe('closest')
    s = run(s, { type: 'notThisOne' })
    expect(s.dialog?.kind === 'candidates' && s.dialog.candidates.length).toBe(5)
    s = run(s, { type: 'noneOfThese' }, { type: 'noneOfTheseFit' })
    expect(s.dialog?.kind).toBe('cannotTranslate')
    s = run(s, { type: 'print', englishOnly: true, view: '3d' })
    expect(s.job?.translation).toBeNull()
    expect(s.job?.englishSig).toBe('1 CAP QHS PRN DIZZINESS')
  })

  it('English patients skip the pop-up', () => {
    const s = run({ ...initialState, screen: 'fill', language: 'en' }, { type: 'submitSig' })
    expect(s.dialog).toBeNull()
  })
})

describe('labels inside Kroll', () => {
  it('prints into the in-Kroll preview when the 3D view is off', () => {
    const s = run({ ...initialState, screen: 'fill', language: 'tl' }, { type: 'submitSig' }, { type: 'print', englishOnly: true, view: 'inline' })
    expect(s.screen).toBe('fill')
    expect(s.preview).toBe('printed')
    expect(s.job?.translation).toBeNull()
  })

  it('previews on request, with the translation once one is confirmed, and can hand off to 3D', () => {
    let s = run({ ...initialState, screen: 'fill' }, { type: 'previewLabels' })
    expect(s.preview).toBe('requested')
    expect(s.job?.translation).toBeNull()
    s = run(s, { type: 'closePreview' }, { type: 'submitSig' })
    s = run(s, { type: 'confirm', candidate: (s.dialog as { candidate: never }).candidate }, { type: 'previewLabels' })
    expect(s.job?.translation?.language).toBe('hi')
    s = run(s, { type: 'show3d' })
    expect(s.screen).toBe('print')
    expect(s.preview).toBeNull()
  })
})
