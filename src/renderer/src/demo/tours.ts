import { type Action, type FlowState, initialState, reducer } from '@/flow/state'

export interface TourContext {
  /** Where labels print: the 3D printer or the preview inside Kroll. */
  view: '3d' | 'inline'
}

/**
 * One step of a walkthrough. Every step can be reached from the tour's start by
 * replaying the earlier steps' `perform`, so jumping around never gets stuck.
 */
export interface TourStep {
  title: string
  body: string
  /** The Kroll control to ring. */
  highlight?: (s: FlowState) => string | undefined
  /** Label of the button that does this step for the presenter. */
  doLabel?: string
  /** What doing the step does to Kroll. A `click` presses a control that lives outside the flow state. */
  perform?: ((s: FlowState, ctx: TourContext) => Action[]) | { click: string }
  /** The presenter did it in Kroll themselves: move on. */
  done?: (s: FlowState) => boolean
  /** Only in the 3D print view. */
  only3d?: boolean
}

export interface Tour {
  id: string
  title: string
  summary: string
  setup: Action
  steps: TourStep[]
  next?: string
}

const printed = (s: FlowState): boolean => s.screen === 'print' || s.preview === 'printed'
const printOutput = (s: FlowState): string =>
  s.screen === 'print' ? '[data-testid=print-status]' : s.preview ? '[data-testid=label-preview]' : '[data-testid=translated-sig]'

export const TOURS: Tour[] = [
  {
    id: 'leung',
    title: 'Mrs. Leung at the pharmacy',
    summary: 'A 78-year-old Mandarin reader: language at intake, sig code, verified translation, peel-back label.',
    setup: { type: 'scenario', persona: 'leung', language: 'en', sig: '1C PO BID', screen: 'patient' },
    next: 'not-yet',
    steps: [
      {
        title: 'Record her language at intake',
        body: 'Mrs. Leung is 78 and reads Mandarin. Her preferred language goes in the Language field on F3 Patient, the same field Kroll has today. That’s what turns translation on.',
        highlight: () => '[data-testid=language-field]',
        doLabel: 'Set Chinese (Simplified)',
        perform: () => [{ type: 'setLanguage', language: 'zh-Hans' }],
        done: (s) => s.language === 'zh-Hans',
      },
      {
        title: 'Open the prescription',
        body: 'F12 Fill Rx is where the pharmacist enters the directions, the same as for any patient.',
        highlight: () => '[data-testid=btn-patient-ok]',
        doLabel: 'Click OK',
        perform: () => [{ type: 'go', screen: 'fill' }],
        done: (s) => s.screen === 'fill',
      },
      {
        title: 'Enter the sig code',
        body: '1C PO BID is one capsule by mouth, twice a day. It expands to the English label as usual, and Enter now also pulls up its verified Chinese sentence.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'exact',
      },
      {
        title: 'A pre-verified translation',
        body: 'Nothing is translated on the fly. In the product, AI drafts each sentence, two professional translators review it independently, and every approval is logged. The pharmacist only confirms.',
        highlight: () => '[data-testid=btn-print-translation]',
        doLabel: 'Print with translation',
        perform: (s, ctx) =>
          s.dialog?.kind === 'exact'
            ? [{ type: 'confirm', candidate: s.dialog.candidate }, { type: 'print', englishOnly: false, view: ctx.view }]
            : [],
        done: (s) => s.confirmed !== null,
      },
      {
        title: 'Two labels print',
        body: 'The standard English label stays intact, with the translated directions and warnings on a peel-back panel underneath. No new hardware.',
        highlight: printOutput,
      },
      {
        title: 'Peel to read it',
        body: 'Mrs. Leung peels the English panel back and reads her directions in Chinese, without needing anyone to interpret.',
        highlight: () => '[data-testid=btn-peel]',
        doLabel: 'Peel panel 1',
        perform: { click: '[data-testid=btn-peel]' },
        done: () => document.querySelector('[data-testid=btn-peel][data-peeled=true]') !== null,
        only3d: true,
      },
    ],
  },
  {
    id: 'not-yet',
    title: 'No translation: English label',
    summary: 'A Tagalog patient. The language is recorded, but there are no verified sentences yet.',
    setup: { type: 'scenario', language: 'tl', sig: 'QD' },
    next: 'exact',
    steps: [
      {
        title: 'Enter the sig',
        body: 'Kroll can record any language. Translations appear only once verified sentences exist for it. Tagalog has none yet.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'notYetTranslatable',
      },
      {
        title: 'Not yet translatable',
        body: 'Kroll tells the pharmacist the language is recorded but can’t be translated yet, and prints English as it does today.',
        highlight: () => '[data-testid=btn-print-english]',
        doLabel: 'Print English label',
        perform: (_s, ctx) => [{ type: 'print', englishOnly: true, view: ctx.view }],
        done: printed,
      },
      {
        title: 'English label',
        body: 'If no verified translation exists, the English label prints, exactly as it does today.',
        highlight: printOutput,
      },
    ],
  },
  {
    id: 'exact',
    title: 'The core flow',
    summary: 'A Hindi patient, sig code QD, an exact match, and a two-panel label on the vial.',
    setup: { type: 'reset' },
    next: 'free-text',
    steps: [
      {
        title: 'Kroll already knows the language',
        body: 'Rohan’s preferred language, Hindi, is recorded on F3 Patient, the same as today. That field is what turns translation on.',
        highlight: () => '[data-testid=language-field]',
      },
      {
        title: 'Open the prescription',
        body: 'F12 Fill Rx is where the pharmacist types the directions, the “sig”.',
        highlight: () => '[data-testid=btn-patient-ok]',
        doLabel: 'Click OK',
        perform: () => [{ type: 'go', screen: 'fill' }],
        done: (s) => s.screen === 'fill',
      },
      {
        title: 'Enter the sig',
        body: 'The sig code QD expands to English as usual. Pressing Enter now also looks up a verified Hindi sentence for it.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'exact',
      },
      {
        title: 'Confirm the translation',
        body: 'An exact match shows the English and the Hindi side by side. The pharmacist confirms it. Nobody has to read or type Hindi.',
        highlight: () => '[data-testid=btn-print-translation]',
        doLabel: 'Print with translation',
        perform: (s, ctx) =>
          s.dialog?.kind === 'exact'
            ? [{ type: 'confirm', candidate: s.dialog.candidate }, { type: 'print', englishOnly: false, view: ctx.view }]
            : [],
        done: (s) => s.confirmed !== null,
      },
      {
        title: 'Two labels print',
        body: 'Panel 1 is today’s English label. Panel 2 prints underneath it in Hindi, so the vial looks the same as always.',
        highlight: printOutput,
      },
      {
        title: 'Peel to reveal the Hindi',
        body: 'The patient peels the English panel back to read the directions in their own language.',
        highlight: () => '[data-testid=btn-peel]',
        doLabel: 'Peel panel 1',
        perform: { click: '[data-testid=btn-peel]' },
        done: () => document.querySelector('[data-testid=btn-peel][data-peeled=true]') !== null,
        only3d: true,
      },
    ],
  },
  {
    id: 'free-text',
    title: 'No exact match',
    summary: 'A free-text sig with no verified sentence. Kroll refuses to guess and prints English only.',
    setup: { type: 'scenario', language: 'hi', sig: '1 CAP QHS PRN DIZZINESS' },
    steps: [
      {
        title: 'Enter a free-text sig',
        body: 'Not every sig is a code. There is no verified Hindi sentence for “1 CAP QHS PRN DIZZINESS”.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'closest',
      },
      {
        title: 'Closest match, never a guess',
        body: 'Kroll never writes new wording. It shows the nearest verified sentence and how it read the sig. This one drops “for dizziness”, so it isn’t safe to use.',
        highlight: () => '[data-testid=btn-not-this-one]',
        doLabel: 'Not this one',
        perform: () => [{ type: 'notThisOne' }],
        done: (s) => s.dialog?.kind === 'candidates',
      },
      {
        title: 'Top 5',
        body: 'Other verified sentences, ranked by fit. The pharmacist picks one only if it says the same thing. None of these do.',
        highlight: () => '[data-testid=btn-none-of-these]',
        doLabel: 'None of these',
        perform: () => [{ type: 'noneOfThese' }],
        done: (s) => s.dialog?.kind === 'guide',
      },
      {
        title: 'Phrasing guide',
        body: 'Phrasings that do have verified translations. The pharmacist can reword the sig to one of them when that is clinically right.',
        highlight: () => '[data-testid=btn-none-fit]',
        doLabel: 'None of these fit',
        perform: () => [{ type: 'noneOfTheseFit' }],
        done: (s) => s.dialog?.kind === 'cannotTranslate',
      },
      {
        title: 'Can’t translate',
        body: 'When nothing verified fits, Kroll says so plainly. A wrong translation is worse than none.',
        highlight: () => '[data-testid=btn-print-english]',
        doLabel: 'Print English label',
        perform: (_s, ctx) => [{ type: 'print', englishOnly: true, view: ctx.view }],
        done: printed,
      },
      {
        title: 'English label only',
        body: 'Just today’s English label. There’s no under-panel, because nothing verified was confirmed.',
        highlight: printOutput,
      },
    ],
  },
]

export const tourById = (id: string): Tour | undefined => TOURS.find((t) => t.id === id)

/** The steps shown for this print view. */
export const stepsFor = (tour: Tour, ctx: TourContext): TourStep[] => tour.steps.filter((s) => !s.only3d || ctx.view === '3d')

/** Kroll's state at the start of step `index`: the tour's setup plus every earlier step done. */
export function stateAt(tour: Tour, index: number, ctx: TourContext): FlowState {
  let state = reducer(initialState, tour.setup)
  for (const step of stepsFor(tour, ctx).slice(0, index)) {
    if (typeof step.perform !== 'function') continue
    for (const action of step.perform(state, ctx)) state = reducer(state, action)
  }
  return state
}
