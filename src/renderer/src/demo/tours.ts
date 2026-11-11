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
  /** What the last step leaves Kroll showing. Defaults to printed labels. */
  endsWith?: (s: FlowState) => boolean
}

const printed = (s: FlowState): boolean => s.screen === 'print' || s.preview === 'printed'
const printOutput = (s: FlowState): string =>
  s.screen === 'print' ? '[data-testid=print-status]' : s.preview ? '[data-testid=label-preview]' : '[data-testid=translated-sig]'

export const TOURS: Tour[] = [
  {
    id: 'leung',
    title: 'Basic: sig code → labels',
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

  // ------------------------------------------------------------------ Edge cases
  {
    id: 'rollout',
    title: 'Language not supported yet',
    summary: 'Mrs. Farahani reads Persian, which has no verified sentences at rollout. English label, and the need is logged.',
    setup: { type: 'scenario', persona: 'farahani', language: 'fa', sig: 'QD', screen: 'patient' },
    endsWith: (s) => s.showRequests,
    steps: [
      {
        title: 'Persian is on file',
        body: 'Her daughter Sara usually translates labels for her. Kroll can record Persian today, but the library has no verified Persian sentences yet.',
        highlight: () => '[data-testid=language-field]',
        doLabel: 'Click OK',
        perform: () => [{ type: 'go', screen: 'fill' }],
        done: (s) => s.screen === 'fill',
      },
      {
        title: 'Enter the sig',
        body: 'QD is an everyday code, but there is nothing verified to print in Persian.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'notYetTranslatable',
      },
      {
        title: 'English label, need logged',
        body: 'Kroll never improvises a translation. It prints English as today and logs that this patient needs Persian, so the library team knows where demand is.',
        highlight: () => '[data-testid=request-translation]',
        doLabel: 'Print English label',
        perform: (_s, ctx) => [{ type: 'print', englishOnly: true, view: ctx.view }],
        done: printed,
      },
      {
        title: 'The request queue',
        body: 'Utilities → Translation requests lists every language and sig pharmacies asked for. The most requested get verified first.',
        highlight: () => '[data-testid=dialog-requests]',
        doLabel: 'Open requests',
        perform: () => [{ type: 'go', screen: 'fill' }, { type: 'openRequests' }],
        done: (s) => s.showRequests,
      },
    ],
  },
  {
    id: 'no-match',
    title: 'No verified sentence fits',
    summary: 'A free-text sig. Closest match, top 5, phrasing guide, then English only with a translation request.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1 CAP QD FOR ANEMIA' },
    steps: [
      {
        title: 'Enter a free-text sig',
        body: 'Not every sig is a code. There is no verified Chinese sentence for “1 CAP QD FOR ANEMIA”.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'closest',
      },
      {
        title: 'Closest match, never a guess',
        body: 'Kroll shows the nearest verified sentence and how it read the sig. This one drops “for anemia”, so it isn’t the same instruction.',
        highlight: () => '[data-testid=btn-not-this-one]',
        doLabel: 'Not this one',
        perform: () => [{ type: 'notThisOne' }],
        done: (s) => s.dialog?.kind === 'candidates',
      },
      {
        title: 'Top 5',
        body: 'Other verified sentences ranked by fit. None of them say the same thing.',
        highlight: () => '[data-testid=btn-none-of-these]',
        doLabel: 'None of these',
        perform: () => [{ type: 'noneOfThese' }],
        done: (s) => s.dialog?.kind === 'guide',
      },
      {
        title: 'Phrasing guide',
        body: 'Codes that do translate. The pharmacist rewords only when that’s clinically right; here it isn’t.',
        highlight: () => '[data-testid=btn-none-fit]',
        doLabel: 'None of these fit',
        perform: () => [{ type: 'noneOfTheseFit' }],
        done: (s) => s.dialog?.kind === 'cannotTranslate',
      },
      {
        title: 'English only, translation requested',
        body: 'A wrong translation is worse than none. The English label prints and the sig goes to the library team.',
        highlight: () => '[data-testid=btn-print-english]',
        doLabel: 'Print English label',
        perform: (_s, ctx) => [{ type: 'print', englishOnly: true, view: ctx.view }],
        done: printed,
      },
    ],
  },
  {
    id: 'tech-preview',
    title: 'Technician flags a line before printing',
    summary: 'A bilingual technician spots an unclear warning in the preview. That line prints in English; the rest stays translated.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    steps: [
      {
        title: 'Match the sig',
        body: '1C PO BID matches a verified Chinese sentence exactly.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'exact',
      },
      {
        title: 'Preview before printing',
        body: 'Most staff can’t read the script, but a bilingual technician can. The preview is the earliest place to catch a problem.',
        highlight: () => '[data-testid=btn-preview-first]',
        doLabel: 'Preview labels',
        perform: (s) => (s.dialog?.kind === 'exact' ? [{ type: 'confirm', candidate: s.dialog.candidate }, { type: 'previewLabels' }] : []),
        done: (s) => s.preview === 'requested',
      },
      {
        title: 'Report from the preview',
        body: 'In this example, the technician thinks warning 2 reads awkwardly.',
        highlight: () => '[data-testid=btn-preview-report]',
        doLabel: 'Report a translation issue',
        perform: (s) => [{ type: 'startReport', origin: 'preview', trace: s.job?.trace }],
        done: (s) => s.report?.step === 'line',
      },
      {
        title: 'Pick the line by its English',
        body: 'Each line shows the standard English next to the translation, so anyone can point at it. No phrase IDs.',
        highlight: () => '[data-testid=line-warning-2]',
        doLabel: 'Pick warning 2',
        perform: () => [{ type: 'report', changes: { line: 'warning-2' } }, { type: 'reportStep', step: 'form' }],
        done: (s) => s.report?.step === 'form',
      },
      {
        title: 'Say what’s wrong',
        body: 'Meaning right but unclear. Kroll sets the severity itself: 2, reviewed within 5 business days. Nothing is paused.',
        highlight: () => '[data-testid=issue-unclear]',
        doLabel: 'Submit report',
        perform: () => [{ type: 'report', changes: { type: 'unclear', noticedBy: 'technician' } }, { type: 'submitReport' }],
        done: (s) => s.report?.step === 'done',
      },
      {
        title: 'Print with that line in English',
        body: 'The flagged warning prints in English with a “could not be translated” note. Everything else stays in Chinese.',
        highlight: () => '[data-testid=btn-print-flagged]',
        doLabel: 'Print',
        perform: (_s, ctx) => [{ type: 'printFlagged', englishOnly: false, view: ctx.view }],
        done: printed,
      },
    ],
  },
  {
    id: 'directions-flagged',
    title: 'Dosing directions flagged before printing',
    summary: 'If the directions themselves are wrong, no translated label prints. Severity 1 pauses the sentence for every pharmacy.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    steps: [
      {
        title: 'Preview before printing',
        body: 'Match the sig and open the preview.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Match and preview',
        perform: (s) => {
          const after = reducer(s, { type: 'submitSig' })
          return after.dialog?.kind === 'exact' ? [{ type: 'submitSig' }, { type: 'confirm', candidate: after.dialog.candidate }, { type: 'previewLabels' }] : []
        },
        done: (s) => s.preview === 'requested',
      },
      {
        title: 'Flag the directions',
        body: 'In this example, the technician reads the directions as saying something different from the English. That changes the meaning.',
        highlight: () => '[data-testid=btn-preview-report]',
        doLabel: 'Report the directions',
        perform: (s) => [
          { type: 'startReport', origin: 'preview', trace: s.job?.trace },
          { type: 'report', changes: { line: 'directions', type: 'meaning', noticedBy: 'technician' } },
          { type: 'reportStep', step: 'form' },
        ],
        done: (s) => s.report?.step === 'form',
      },
      {
        title: 'Severity 1: paused everywhere',
        body: 'Changing the meaning is severity 1. The sentence is paused for every Kroll pharmacy within the hour and both translators re-review it.',
        highlight: () => '[data-testid=btn-report-submit]',
        doLabel: 'Submit report',
        perform: () => [{ type: 'submitReport' }],
        done: (s) => s.report?.step === 'done',
      },
      {
        title: 'This pharmacy’s callback list',
        body: 'Kroll lists every prescription here that printed this sentence, from its own log. TELUS never sees the list.',
        highlight: () => '[data-testid=callback-list]',
        doLabel: 'OK',
        perform: () => [{ type: 'closeNotice' }],
        done: (s) => s.notice === null,
      },
      {
        title: 'English only',
        body: 'Directions translate fully or not at all. Mixed English and translated directions are a documented hazard, so this prints English only.',
        highlight: () => '[data-testid=btn-print-english-only]',
        doLabel: 'Print English only',
        perform: (_s, ctx) => [{ type: 'printFlagged', englishOnly: true, view: ctx.view }],
        done: printed,
      },
    ],
  },
  {
    id: 'phone-call',
    title: 'Family calls days later',
    summary: 'Ms. Leung’s family reads the Rx number over the phone. Find the label, report it, reprint, and follow up.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    steps: [
      {
        title: 'Report without the label',
        body: 'Most reports come later, from patients. Utilities → Report a translation issue starts from the Rx number on the label.',
        highlight: () => '[data-testid=menu-utilities]',
        doLabel: 'Report a translation issue',
        perform: () => [{ type: 'startReport', origin: 'lookup' }],
        done: (s) => s.report?.step === 'lookup',
      },
      {
        title: 'Find it by Rx number',
        body: 'The family reads Rx 1000048. Kroll shows every translated print of it with the date, language and library version.',
        highlight: () => '[data-testid=report-rx]',
        doLabel: 'Find 1000048 and pick it',
        perform: () => [{ type: 'report', changes: { rx: '1000048', trace: 'W3R-6TB' } }, { type: 'reportStep', step: 'line' }],
        done: (s) => s.report?.step === 'line',
      },
      {
        title: 'The line they read out',
        body: 'In this example, the family says warning 1 is missing part of what the English says. They read out the line; the pharmacist picks it by its English.',
        highlight: () => '[data-testid=line-warning-1]',
        doLabel: 'Pick warning 1',
        perform: () => [{ type: 'report', changes: { line: 'warning-1' } }, { type: 'reportStep', step: 'form' }],
        done: (s) => s.report?.step === 'form',
      },
      {
        title: 'Missing information, already taken',
        body: 'Missing information is severity 1. She has been taking it, which matters for what happens next.',
        highlight: () => '[data-testid=report-severity]',
        doLabel: 'Submit report',
        perform: () => [{ type: 'report', changes: { type: 'missing', noticedBy: 'caregiver', taken: 'yes' } }, { type: 'submitReport' }],
        done: (s) => s.report?.step === 'done',
      },
      {
        title: 'Paused, with a callback list',
        body: 'The warning is paused for every pharmacy. Here, Kroll lists Ms. Leung’s other prints that carried it.',
        highlight: () => '[data-testid=callback-list]',
        doLabel: 'OK',
        perform: () => [{ type: 'closeNotice' }],
        done: (s) => s.notice === null,
      },
      {
        title: 'Call her, and report the incident',
        body: 'Because she took it, Kroll prompts a call to the patient and reminds the pharmacy of its AIMS duty. Kroll doesn’t file it.',
        highlight: () => '[data-testid=report-aims]',
        doLabel: 'Corrected reprint',
        perform: (_s, ctx) => [{ type: 'reprint', trace: 'W3R-6TB', englishOnly: false, view: ctx.view }],
        done: printed,
      },
      {
        title: 'A new entry, not an edit',
        body: 'The reprint prints warning 1 in English. It is a new log entry that points at the original, which stays unchanged.',
        highlight: printOutput,
      },
    ],
  },
  {
    id: 'network-pause',
    title: 'Another pharmacy pauses a sentence',
    summary: 'A report elsewhere pauses Chinese “twice a day”. Every pharmacy is told, gets its callback list, and prints English.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    steps: [
      {
        title: 'A report at another pharmacy',
        body: 'Another pharmacy files a severity 1 report on the Chinese twice-a-day sentence. Simulated here from the presenter.',
        doLabel: 'Simulate the report',
        perform: () => [{ type: 'simulateExternalReport' }],
        done: (s) => s.notice?.kind === 'paused',
      },
      {
        title: 'Notice and callback list',
        body: 'Every Kroll pharmacy is notified. This one lists Ms. Leung’s earlier fills that printed the sentence.',
        highlight: () => '[data-testid=callback-list]',
        doLabel: 'OK',
        perform: () => [{ type: 'closeNotice' }],
        done: (s) => s.notice === null,
      },
      {
        title: 'Her refill now',
        body: 'The same sig no longer offers the paused sentence.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'paused',
      },
      {
        title: 'Paused: English until fixed',
        body: 'Kroll explains why and prints English. No one is asked to judge the Chinese.',
        highlight: () => '[data-testid=btn-print-english]',
        doLabel: 'Print English label',
        perform: (_s, ctx) => [{ type: 'print', englishOnly: true, view: ctx.view }],
        done: printed,
      },
    ],
  },
  {
    id: 'fix-ships',
    title: 'TELUS ships the fix',
    summary: 'The paused sentence comes back in a new library version, reports close as Fixed, and labels translate again.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    endsWith: (s) => s.dialog?.kind === 'exact' && s.paused.length === 0,
    steps: [
      {
        title: 'A sentence is paused',
        body: 'Start where the last case ended: Chinese “twice a day” is paused after another pharmacy’s report.',
        doLabel: 'Pause it',
        perform: () => [{ type: 'simulateExternalReport' }, { type: 'closeNotice' }],
        done: (s) => s.paused.length > 0,
      },
      {
        title: 'Both translators re-review',
        body: 'A severity 1 fix ships within 48 hours as a new library version.',
        doLabel: 'Ship the fix',
        perform: () => [{ type: 'simulateFix' }],
        done: (s) => s.notice?.kind === 'fixed',
      },
      {
        title: 'Library updated',
        body: 'Kroll is on the new version and the report is marked Fixed, with dates, in Utilities → Translation reports.',
        highlight: () => '[data-testid=dialog-notice-fixed]',
        doLabel: 'OK',
        perform: () => [{ type: 'closeNotice' }],
        done: (s) => s.notice === null,
      },
      {
        title: 'Translating again',
        body: 'The same sig matches the corrected sentence again.',
        highlight: () => '[data-testid=sig-input]',
        doLabel: 'Press Enter',
        perform: () => [{ type: 'submitSig' }],
        done: (s) => s.dialog?.kind === 'exact',
      },
    ],
  },
  {
    id: 'wrong-phrase',
    title: 'Wrong English phrase picked',
    summary: 'The translation was right; the pharmacy chose the wrong sig. Logged as a pharmacy error. Nothing is paused.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    endsWith: (s) => s.report?.step === 'done' && s.paused.length === 0,
    steps: [
      {
        title: 'Rx History',
        body: 'Rx → Rx History lists every print of this prescription.',
        highlight: () => '[data-testid=menu-rx]',
        doLabel: 'Open Rx History',
        perform: () => [{ type: 'openRxHistory' }, { type: 'rxHistory', changes: { selected: 'P7C-9KD' } }],
        done: (s) => s.rxHistory !== null,
      },
      {
        title: 'Report the earlier fill',
        body: 'In this example, fill 2 should have been once a day. The Chinese said exactly what the wrong English said.',
        highlight: () => '[data-testid=btn-history-report]',
        doLabel: 'Report a translation issue',
        perform: () => [{ type: 'startReport', origin: 'history', trace: 'P7C-9KD' }, { type: 'report', changes: { line: 'directions' } }, { type: 'reportStep', step: 'form' }],
        done: (s) => s.report?.step === 'form',
      },
      {
        title: 'Wrong English phrase picked',
        body: 'This is a pharmacy error, not a translation error. It’s logged as a usability signal and the sentence stays in use.',
        highlight: () => '[data-testid=issue-wrongPhrase]',
        doLabel: 'Submit report',
        perform: () => [{ type: 'report', changes: { type: 'wrongPhrase', noticedBy: 'pharmacist', taken: 'no' } }, { type: 'submitReport' }],
        done: (s) => s.report?.step === 'done',
      },
    ],
  },
  {
    id: 'offline-dispute',
    title: 'Offline, then a dispute',
    summary: 'Receipts queue offline and send later. In a dispute, the pharmacy exports the entry and TELUS verifies its fingerprint.',
    setup: { type: 'scenario', persona: 'leung', language: 'zh-Hans', sig: '1C PO BID' },
    endsWith: (s) => s.rxHistory?.verified === true,
    steps: [
      {
        title: 'The pharmacy goes offline',
        body: 'Translated labels still print from the local library. The print receipt to TELUS waits in a queue.',
        doLabel: 'Go offline and print',
        perform: (s, ctx) => {
          const offline = reducer(s, { type: 'setOnline', online: false })
          const after = reducer(offline, { type: 'submitSig' })
          return after.dialog?.kind === 'exact'
            ? [{ type: 'setOnline', online: false }, { type: 'submitSig' }, { type: 'confirm', candidate: after.dialog.candidate }, { type: 'print', englishOnly: false, view: ctx.view }]
            : []
        },
        done: printed,
      },
      {
        title: 'Receipt queued',
        body: 'The translation record says the receipt is queued. Its fingerprint was fixed at print time.',
        highlight: printOutput,
        doLabel: 'Back online',
        perform: () => [{ type: 'setOnline', online: true }],
        done: (s) => s.online,
      },
      {
        title: 'A dispute: find the entry',
        body: 'Rx History → View entry shows exactly what printed: phrases, library version, who confirmed it.',
        highlight: () => '[data-testid=btn-view-entry]',
        doLabel: 'View entry',
        perform: (s) => {
          const last = s.audit[s.audit.length - 1]
          return [{ type: 'go', screen: 'fill' }, { type: 'openRxHistory' }, { type: 'rxHistory', changes: { selected: last?.trace ?? null, view: 'entry' } }]
        },
        done: (s) => s.rxHistory?.view === 'entry',
      },
      {
        title: 'Verify, then export',
        body: 'TELUS recomputes the fingerprint from the exported entry and compares it with the receipt. A match proves nothing changed since printing.',
        highlight: () => '[data-testid=btn-verify-entry]',
        doLabel: 'Verify against receipt',
        perform: () => [{ type: 'verifyEntry' }],
        done: (s) => s.rxHistory?.verified === true,
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
