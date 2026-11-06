import { type Details, PERSONAS, type PersonaId } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import { provider } from '@/data/demoProvider'
import { type DoseForm, fillDose, forForm, KROLL_EXPANSIONS, parseSigCode } from '@/data/phrasebook'
import type { Candidate, LanguageCode, VerifiedSig } from '@/data/types'

export type Screen = 'patient' | 'fill' | 'print'

/** Which Translated Sig pop-up is open (Figma B4, B4t, B7, B8, B9, B10). */
export type Dialog =
  | { kind: 'exact'; candidate: Candidate }
  | { kind: 'closest'; candidate: Candidate; readAs: string; others: Candidate[] }
  | { kind: 'candidates'; candidates: Candidate[]; selected: number }
  | { kind: 'guide' }
  | { kind: 'cannotTranslate'; reason: string }
  | { kind: 'notYetTranslatable' }

/** What goes to the label printer. */
export interface PrintJob {
  id: number
  /** The names, drug and quantities on the label, as edited on screen. */
  details: Details
  form: DoseForm
  /** Kroll's own English sig, unchanged. */
  englishSig: string
  translation: null | {
    language: LanguageCode
    text: string
    /** The verified sentence's English, shown under the translation. */
    gloss: string
  }
}

export interface FlowState {
  screen: Screen
  persona: PersonaId
  /** Fields changed on screen, over the persona. The sidebar's reset clears these. */
  edits: Partial<Details>
  language: LanguageCode
  sigInput: string
  /** The sig as last submitted (what the pop-up says was entered). */
  sigEntered: string
  dialog: Dialog | null
  confirmed: null | { sig: VerifiedSig; dose: string; form: DoseForm; text: string }
  job: PrintJob | null
  /** The label preview open inside Kroll: right after printing, or on request. */
  preview: null | 'printed' | 'requested'
}

export const initialState: FlowState = {
  screen: 'patient',
  persona: 'rohan',
  edits: {},
  language: 'hi',
  sigInput: 'QD',
  sigEntered: '',
  dialog: null,
  confirmed: null,
  job: null,
  preview: null,
}

export type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'setLanguage'; language: LanguageCode }
  | { type: 'setSig'; sig: string }
  | { type: 'submitSig' }
  | { type: 'closeDialog' }
  | { type: 'confirm'; candidate: Candidate }
  | { type: 'notThisOne' }
  | { type: 'selectCandidate'; index: number }
  | { type: 'noneOfThese' }
  | { type: 'noneOfTheseFit' }
  | { type: 'print'; englishOnly: boolean; view: '3d' | 'inline' }
  | { type: 'previewLabels' }
  | { type: 'closePreview' }
  | { type: 'show3d' }
  | { type: 'scenario'; language: LanguageCode; sig: string; submit?: boolean; persona?: PersonaId; screen?: Screen }
  | { type: 'edit'; changes: Partial<Details> }
  | { type: 'resetEdits' }
  | { type: 'reset' }
  /** Replaces the whole state (the guided demo jumping to a step). */
  | { type: 'load'; state: FlowState }

/** The English sig Kroll prints: a code's expansion, or the free text as typed. */
export function krollSigText(input: string): string {
  const coded = parseSigCode(input)
  if (coded) return fillDose(forForm(KROLL_EXPANSIONS[coded.code], coded.form), coded.dose)
  return input.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** What's on screen: the persona with any edits on top. */
export const detailsOf = (state: FlowState): Details => ({ ...PERSONAS[state.persona], ...state.edits })

let jobs = 0

/** The labels Kroll would print right now: its English sig, plus the confirmed translation unless English only. */
function buildJob(state: FlowState, englishOnly: boolean): PrintJob {
  const confirmed = englishOnly ? null : state.confirmed
  return {
    id: ++jobs,
    details: detailsOf(state),
    form: parseSigCode(state.sigEntered || state.sigInput)?.form ?? 'capsule',
    englishSig: krollSigText(state.sigEntered || state.sigInput),
    translation: confirmed
      ? { language: state.language, text: confirmed.text, gloss: fillDose(forForm(confirmed.sig.english, confirmed.form), confirmed.dose).toUpperCase() }
      : null,
  }
}

export function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen, dialog: null, preview: null }
    case 'setLanguage':
      return { ...state, language: action.language, confirmed: null }
    case 'setSig':
      return { ...state, sigInput: action.sig, confirmed: null }
    case 'submitSig': {
      const sig = state.sigInput.trim()
      if (!sig) return state
      const language = languageByCode(state.language)
      if (language.code === 'en') return { ...state, sigEntered: sig, confirmed: null, dialog: null }
      const result = provider.translate(sig, language)
      const dialog: Dialog =
        result.kind === 'candidates'
          ? { kind: 'candidates', candidates: result.candidates, selected: 0 }
          : result.kind === 'noVerified'
            ? { kind: 'guide' }
            : result
      return { ...state, sigEntered: sig, confirmed: null, dialog }
    }
    case 'closeDialog':
      return { ...state, dialog: null }
    case 'confirm': {
      const language = languageByCode(state.language)
      const form = action.candidate.form ?? 'capsule'
      const text = provider.render(action.candidate.sig, language, action.candidate.dose, form)
      if (text === null) return state
      return { ...state, dialog: null, confirmed: { sig: action.candidate.sig, dose: action.candidate.dose, form, text } }
    }
    case 'notThisOne': {
      if (state.dialog?.kind !== 'closest') return state
      const rest = [state.dialog.candidate, ...state.dialog.others]
      return { ...state, dialog: { kind: 'candidates', candidates: rest, selected: 0 } }
    }
    case 'selectCandidate':
      return state.dialog?.kind === 'candidates' ? { ...state, dialog: { ...state.dialog, selected: action.index } } : state
    case 'noneOfThese':
      return { ...state, dialog: { kind: 'guide' } }
    case 'noneOfTheseFit': {
      const language = languageByCode(state.language)
      return {
        ...state,
        dialog: { kind: 'cannotTranslate', reason: `No verified ${language.name} sig code represents “${state.sigEntered}”.` },
      }
    }
    case 'print': {
      const job = buildJob(state, action.englishOnly)
      if (action.view === 'inline') return { ...state, dialog: null, screen: 'fill', job, preview: 'printed' }
      return { ...state, dialog: null, screen: 'print', job, preview: null }
    }
    case 'previewLabels':
      if (!state.sigInput.trim()) return state
      return { ...state, dialog: null, screen: 'fill', job: buildJob(state, false), preview: 'requested' }
    case 'closePreview':
      return { ...state, preview: null }
    case 'show3d':
      return state.job ? { ...state, preview: null, screen: 'print' } : state
    case 'scenario': {
      const persona = action.persona ?? 'rohan'
      const loaded: FlowState = {
        ...initialState,
        screen: action.screen ?? 'fill',
        persona,
        edits: persona === state.persona ? state.edits : {},
        language: action.language,
        sigInput: action.sig,
      }
      return action.submit ? reducer(loaded, { type: 'submitSig' }) : loaded
    }
    case 'edit': {
      const edits = { ...state.edits, ...action.changes }
      const base = PERSONAS[state.persona]
      for (const key of Object.keys(action.changes) as (keyof Details)[]) {
        if (edits[key] === base[key]) delete edits[key]
      }
      return { ...state, edits }
    }
    case 'resetEdits':
      return { ...state, edits: {} }
    case 'reset':
      return { ...initialState }
    case 'load': {
      // Stepping through a walkthrough keeps what the presenter typed for this patient.
      const edits = action.state.persona === state.persona ? state.edits : {}
      const loaded = { ...action.state, edits }
      return loaded.job ? { ...loaded, job: { ...loaded.job, details: detailsOf(loaded) } } : loaded
    }
  }
}
