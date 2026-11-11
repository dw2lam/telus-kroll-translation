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
    title: 'Ms. Leung at the pharmacy',
    summary: 'The basic demo. Her language at intake, a sig code, a verified Chinese sentence, and the peel-back label it prints.',
    setup: { type: 'scenario', persona: 'leung', language: 'en', sig: '1C PO BID', screen: 'patient' },
    steps: [
      {
        title: 'Record her language at intake',
        body: 'Ms. Leung is 74 and can’t confidently read an English label. Her preferred language goes in the Language field on F3 Patient, the same field Kroll has today. That’s what turns translation on.',
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
        body: 'Ms. Leung peels the English panel back and reads her directions in Chinese, without needing family to interpret.',
        highlight: () => '[data-testid=btn-peel]',
        doLabel: 'Peel panel 1',
        perform: { click: '[data-testid=btn-peel]' },
        done: () => document.querySelector('[data-testid=btn-peel][data-peeled=true]') !== null,
        only3d: true,
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
