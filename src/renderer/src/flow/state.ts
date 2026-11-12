import {
  type AuditEntry,
  callbackList,
  directionsPhraseId,
  type IssueType,
  labelLines,
  type LabelLine,
  type MatchType,
  type NoticedBy,
  phraseToPause,
  type PrintReceipt,
  receiptFor,
  scriptOf,
  sealEntry,
  severityOf,
  type Taken,
  traceCode,
  type TranslationReport,
} from '@/data/audit'
import { type Details, krollDate, krollDateTime, LIBRARY_VERSION, PERSONA_RX, PERSONAS, type PersonaId, PHARMACIST, RX, SEED_REQUESTS, type TranslationRequest } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import { provider } from '@/data/demoProvider'
import { SEED_AUDIT, SEED_JOBS, SEED_RECEIPTS } from '@/data/history'
import { type DoseForm, fillDose, forForm, KROLL_EXPANSIONS, parseSigCode } from '@/data/phrasebook'
import type { Candidate, LanguageCode, VerifiedSig } from '@/data/types'

export type Screen = 'patient' | 'fill' | 'print'

/** Which Translated Sig pop-up is open (Figma B4, B4t, B7, B8, B9, B10, and the paused state). */
export type Dialog =
  | { kind: 'exact'; candidate: Candidate }
  | { kind: 'closest'; candidate: Candidate; readAs: string; others: Candidate[] }
  | { kind: 'candidates'; candidates: Candidate[]; selected: number }
  | { kind: 'guide' }
  | { kind: 'cannotTranslate'; reason: string }
  | { kind: 'notYetTranslatable' }
  /** The matching sentence is paused after a severity 1 report: it prints in English until fixed. */
  | { kind: 'paused'; candidate: Candidate }

/** What goes to the label printer. */
export interface PrintJob {
  id: number
  rx: string
  fill: number
  /** The names, drug and quantities on the label, as edited on screen. */
  details: Details
  form: DoseForm
  /** Kroll's own English sig, unchanged. */
  englishSig: string
  /** Fill date and expiry as printed. */
  date: string
  expiry: string
  translation: null | {
    language: LanguageCode
    text: string
    /** The verified sentence's English, shown under the translation. */
    gloss: string
    /** The Kroll code the sentence is filed under. */
    sigCode: string
  }
  /** Printed on translated labels; identifies the print, not the patient. */
  trace: string
  libraryVersion: string
  /** Under-panel lines printed in English instead (flagged before printing, or paused). */
  englishLines: string[]
  /** What Kroll saves to the Rx history for this print (shown in the printed preview). */
  record: TranslationRecord | null
}

/** The Rx history entry that makes the split of responsibility visible. */
export type TranslationRecord =
  | { kind: 'translated'; language: string; trace: string; version: string; confirmedBy: string; printed: string; receipt: PrintReceipt['status'] }
  | { kind: 'request'; id: string }
  | { kind: 'reprint'; trace: string; corrects: string; englishOnly: boolean }

/** PRD 1's report, step by step. Lives in the reducer so walkthroughs can drive it. */
export interface ReportDraft {
  /** Where it was opened: the preview before printing, a printed label, the Rx history, or a phone call. */
  origin: 'preview' | 'printed' | 'history' | 'lookup'
  step: 'lookup' | 'line' | 'form' | 'done'
  rx: string
  /** The print being reported. Null before printing (the job in the preview). */
  trace: string | null
  /** A line key, `whole` or `unsure`. */
  line: string | null
  type: IssueType | null
  noticedBy: NoticedBy | null
  taken: Taken | null
  note: string
  reportId: string | null
}

/** A Kroll notice: a phrase was paused (here or at another pharmacy), or a fix shipped. */
export type Notice =
  | { kind: 'paused'; phraseId: string; english: string; language: LanguageCode; elsewhere: boolean; reportId: string }
  | { kind: 'fixed'; version: string; phraseIds: string[] }

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
  confirmed: null | { sig: VerifiedSig; dose: string; form: DoseForm; text: string; match: MatchType }
  job: PrintJob | null
  /** The label preview open inside Kroll: right after printing, or on request. */
  preview: null | 'printed' | 'requested'
  /** The English-only pop-ups' "request a verified translation" box. Checked by default. */
  requestTranslation: boolean
  /** Translation requests logged so far, oldest first. */
  requests: TranslationRequest[]
  /** Utilities → Translation requests… is open. */
  showRequests: boolean
  // ---- PRD 2: this pharmacy's audit log and what it sent TELUS
  audit: AuditEntry[]
  /** Every print's job, by trace, so a past label can be shown and reprinted. */
  jobs: Record<string, PrintJob>
  receipts: PrintReceipt[]
  /** Off: receipts queue and send when the connection returns. */
  online: boolean
  libraryVersion: string
  // ---- PRD 1: reports, paused phrases, notices
  reports: TranslationReport[]
  paused: string[]
  report: ReportDraft | null
  notice: Notice | null
  /** Rx → Rx History… */
  rxHistory: null | { rx: string; selected: string | null; view: 'list' | 'entry'; verified: boolean | null }
  showReports: boolean
}

export const initialState: FlowState = {
  screen: 'patient',
  persona: 'leung',
  edits: {},
  language: 'zh-Hans',
  sigInput: 'DAILY',
  sigEntered: '',
  dialog: null,
  confirmed: null,
  job: null,
  preview: null,
  requestTranslation: true,
  requests: SEED_REQUESTS,
  showRequests: false,
  audit: SEED_AUDIT,
  jobs: SEED_JOBS,
  receipts: SEED_RECEIPTS,
  online: true,
  libraryVersion: LIBRARY_VERSION,
  reports: [],
  paused: [],
  report: null,
  notice: null,
  rxHistory: null,
  showReports: false,
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
  | { type: 'toggleRequest' }
  | { type: 'openRequests' }
  | { type: 'closeRequests' }
  // PRD 1 / PRD 2
  | { type: 'openRxHistory'; rx?: string }
  | { type: 'rxHistory'; changes: Partial<NonNullable<FlowState['rxHistory']>> }
  | { type: 'closeRxHistory' }
  | { type: 'verifyEntry' }
  | { type: 'startReport'; origin: ReportDraft['origin']; trace?: string }
  | { type: 'report'; changes: Partial<ReportDraft> }
  | { type: 'reportStep'; step: ReportDraft['step'] }
  | { type: 'submitReport' }
  | { type: 'closeReport' }
  /** After a report before printing: print with the flagged line in English, or English only. */
  | { type: 'printFlagged'; englishOnly: boolean; view: '3d' | 'inline' }
  /** After a report on a printed label: a corrected or English-only reprint. */
  | { type: 'reprint'; trace: string; englishOnly: boolean; view: '3d' | 'inline' }
  | { type: 'openReports' }
  | { type: 'closeReports' }
  | { type: 'closeNotice' }
  | { type: 'simulateExternalReport' }
  | { type: 'simulateFix' }
  | { type: 'setOnline'; online: boolean }
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

/** The prescription on screen. */
export const rxOf = (state: FlowState): string => PERSONA_RX[state.persona]

/** The under-panel lines a job prints (empty for English only). */
export function linesOf(job: PrintJob): LabelLine[] {
  if (!job.translation) return []
  return labelLines({
    language: job.translation.language,
    sigCode: job.translation.sigCode,
    text: job.translation.text,
    gloss: job.translation.gloss,
    details: job.details,
    form: job.form,
    date: job.date,
    expiry: job.expiry,
  })
}

/** The lines a report is about: the printed entry's, or the job in the preview before printing. */
export function reportLines(state: FlowState): LabelLine[] {
  const r = state.report
  if (!r) return []
  if (r.trace) return state.audit.find((e) => e.trace === r.trace)?.lines ?? []
  return state.job ? linesOf(state.job) : []
}

/** The phrase a line points at; `whole` reports the directions, `unsure` points at nothing. */
function reportedPhrase(lines: LabelLine[], line: string | null): { phraseId: string | null; english: string } {
  if (line === 'unsure') return { phraseId: null, english: 'Not sure which line' }
  const target = line === 'whole' ? lines.find((l) => l.kind === 'directions') : lines.find((l) => l.key === line)
  return { phraseId: target?.phraseId ?? null, english: line === 'whole' ? 'Whole label' : (target?.english ?? '') }
}

/** Trace codes come from a per-launch random sequence: random-looking, never built from the Rx. */
const SESSION_SEED = Math.floor(Math.random() * 2 ** 31)
function seeded(n: number): () => number {
  let a = (SESSION_SEED + n * 7919) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let jobs = 0

/** The labels Kroll would print right now: its English sig, plus the confirmed translation unless English only. */
function buildJob(state: FlowState, englishOnly: boolean, record: TranslationRecord | null = null): PrintJob {
  const confirmed = englishOnly ? null : state.confirmed
  const rx = rxOf(state)
  return {
    record,
    id: ++jobs,
    rx,
    fill: Math.max(0, ...state.audit.filter((e) => e.rx === rx).map((e) => e.fill)) + 1,
    details: detailsOf(state),
    form: parseSigCode(state.sigEntered || state.sigInput)?.form ?? 'capsule',
    englishSig: krollSigText(state.sigEntered || state.sigInput),
    date: RX.date,
    expiry: RX.expiry,
    translation: confirmed
      ? {
          language: state.language,
          text: confirmed.text,
          gloss: fillDose(forForm(confirmed.sig.english, confirmed.form), confirmed.dose).toUpperCase(),
          sigCode: confirmed.sig.code,
        }
      : null,
    trace: traceCode(seeded(state.audit.length)),
    libraryVersion: state.libraryVersion,
    englishLines: [],
  }
}

/** Under-panel lines whose phrase is paused print in English automatically. */
function withPausedLines(job: PrintJob, paused: string[]): PrintJob {
  const lines = linesOf(job)
  const auto = lines.filter((l) => l.kind !== 'directions' && paused.includes(l.phraseId)).map((l) => l.key)
  return auto.length ? { ...job, englishLines: [...new Set([...job.englishLines, ...auto])] } : job
}

/** Logs a print (PRD 2) and queues or sends its receipt. Translated prints only send receipts. */
function logPrint(state: FlowState, job: PrintJob, match: AuditEntry['match'], sigTyped: string, corrects?: string): Pick<FlowState, 'audit' | 'jobs' | 'receipts'> {
  const lines = linesOf(job)
  const entry = sealEntry({
    trace: job.trace,
    rx: job.rx,
    fill: job.fill,
    // To the minute, as Kroll shows it; walkthrough steps replay the same print with the same entry.
    printedAt: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
    user: PHARMACIST,
    sigTyped,
    englishSig: job.englishSig,
    match,
    libraryVersion: job.libraryVersion,
    language: job.translation?.language ?? state.language,
    script: scriptOf(job.translation?.language ?? state.language),
    lines,
    linesInEnglish: job.englishLines,
    reports: [],
    patient: `${job.details.lastName}${job.details.firstName ? `, ${job.details.firstName}` : ''}`,
    ...(corrects ? { corrects } : {}),
  })
  return {
    audit: [...state.audit, entry],
    jobs: { ...state.jobs, [job.trace]: job },
    receipts: job.translation ? [...state.receipts, receiptFor(entry, state.online)] : state.receipts,
  }
}

const recordFor = (job: PrintJob, state: FlowState, now: Date): TranslationRecord | null =>
  job.translation
    ? {
        kind: 'translated',
        language: languageByCode(job.translation.language).name,
        trace: job.trace,
        version: job.libraryVersion,
        confirmedBy: PHARMACIST,
        printed: krollDateTime(now),
        receipt: state.online ? 'sent' : 'queued',
      }
    : null

/** The next request in the queue for what's on screen: the sig, or the whole language when none is configured. */
function newRequest(state: FlowState, now: Date): TranslationRequest {
  const highest = Math.max(0, ...state.requests.map((r) => Number(r.id.slice(3))))
  return {
    id: `TR-${String(highest + 1).padStart(4, '0')}`,
    language: languageByCode(state.language).name,
    sig: state.dialog?.kind === 'notYetTranslatable' ? '(language)' : krollSigText(state.sigEntered).slice(0, 40),
    rx: rxOf(state),
    logged: krollDate(now),
    status: 'Pending',
  }
}

const isPaused = (state: FlowState, c: Candidate): boolean => state.paused.includes(directionsPhraseId(c.sig.code, state.language))

function nextReportId(reports: TranslationReport[]): string {
  return `RPT-${String(153 + reports.length).padStart(4, '0')}`
}

/** Puts the job on the printer: the 3D view, or the preview inside Kroll. */
function sendToPrinter(state: FlowState, job: PrintJob, view: '3d' | 'inline'): FlowState {
  const next = { ...state, dialog: null, job, requestTranslation: true, report: null }
  if (view === 'inline') return { ...next, screen: 'fill', preview: 'printed' }
  return { ...next, screen: 'print', preview: null }
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
      let dialog: Dialog =
        result.kind === 'candidates'
          ? { kind: 'candidates', candidates: result.candidates, selected: 0 }
          : result.kind === 'noVerified'
            ? { kind: 'guide' }
            : result
      // A paused sentence is never offered: it prints in English until the fix ships.
      if ((dialog.kind === 'exact' || dialog.kind === 'closest') && isPaused(state, dialog.candidate)) {
        dialog = { kind: 'paused', candidate: dialog.candidate }
      } else if (dialog.kind === 'candidates') {
        const open = dialog.candidates.filter((c) => !isPaused(state, c))
        dialog = open.length ? { ...dialog, candidates: open } : { kind: 'paused', candidate: dialog.candidates[0] }
      }
      return { ...state, sigEntered: sig, confirmed: null, dialog, requestTranslation: true }
    }
    case 'closeDialog':
      return { ...state, dialog: null }
    case 'confirm': {
      const language = languageByCode(state.language)
      const form = action.candidate.form ?? 'capsule'
      const text = provider.render(action.candidate.sig, language, action.candidate.dose, form)
      if (text === null) return state
      const match: MatchType = state.dialog?.kind === 'closest' ? 'closest-confirmed' : state.dialog?.kind === 'candidates' ? 'selected-confirmed' : 'exact'
      return { ...state, dialog: null, confirmed: { sig: action.candidate.sig, dose: action.candidate.dose, form, text, match } }
    }
    case 'notThisOne': {
      if (state.dialog?.kind !== 'closest') return state
      const rest = [state.dialog.candidate, ...state.dialog.others].filter((c) => !isPaused(state, c))
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
      const now = new Date()
      let requests = state.requests
      let record: TranslationRecord | null = null
      const englishOnlyDialog = state.dialog?.kind === 'cannotTranslate' || state.dialog?.kind === 'notYetTranslatable'
      if (action.englishOnly && englishOnlyDialog && state.requestTranslation) {
        const request = newRequest(state, now)
        requests = [...requests, request]
        record = { kind: 'request', id: request.id }
      }
      let job = withPausedLines(buildJob(state, action.englishOnly), state.paused)
      if (!record) record = recordFor(job, state, now)
      job = { ...job, record }
      const logged = logPrint(state, job, job.translation ? (state.confirmed?.match ?? 'exact') : 'english-only', state.sigEntered || state.sigInput)
      return sendToPrinter({ ...state, ...logged, requests }, job, action.view)
    }
    case 'toggleRequest':
      return { ...state, requestTranslation: !state.requestTranslation }
    case 'openRequests':
      return { ...state, showRequests: true }
    case 'closeRequests':
      return { ...state, showRequests: false }
    case 'previewLabels':
      if (!state.sigInput.trim()) return state
      return { ...state, dialog: null, screen: 'fill', job: withPausedLines(buildJob(state, false), state.paused), preview: 'requested' }
    case 'closePreview':
      return { ...state, preview: null }
    case 'show3d':
      return state.job ? { ...state, preview: null, screen: 'print' } : state

    // ---------------------------------------------------------------- Rx history (PRD 1 / 2)
    case 'openRxHistory':
      return { ...state, screen: state.screen === 'print' ? 'fill' : state.screen, rxHistory: { rx: action.rx ?? rxOf(state), selected: null, view: 'list', verified: null } }
    case 'rxHistory':
      return state.rxHistory ? { ...state, rxHistory: { ...state.rxHistory, verified: null, ...action.changes } } : state
    case 'closeRxHistory':
      return { ...state, rxHistory: null }
    case 'verifyEntry': {
      const h = state.rxHistory
      const entry = h?.selected ? state.audit.find((e) => e.trace === h.selected) : undefined
      if (!h || !entry) return state
      const receipt = state.receipts.find((r) => r.trace === entry.trace)
      return { ...state, rxHistory: { ...h, verified: receipt !== undefined && receipt.fingerprint === entry.fingerprint } }
    }

    // ---------------------------------------------------------------- Reports (PRD 1)
    case 'startReport': {
      const fromPreview = action.origin === 'preview'
      const trace = fromPreview ? null : (action.trace ?? null)
      const rx = trace ? (state.audit.find((e) => e.trace === trace)?.rx ?? rxOf(state)) : rxOf(state)
      return {
        ...state,
        screen: state.screen === 'print' ? 'fill' : state.screen,
        preview: null,
        rxHistory: null,
        report: {
          origin: action.origin,
          step: action.origin === 'lookup' ? 'lookup' : 'line',
          rx,
          trace,
          line: null,
          type: null,
          noticedBy: fromPreview ? 'technician' : null,
          taken: null,
          note: '',
          reportId: null,
        },
      }
    }
    case 'report':
      return state.report ? { ...state, report: { ...state.report, ...action.changes } } : state
    case 'reportStep':
      return state.report ? { ...state, report: { ...state.report, step: action.step } } : state
    case 'submitReport': {
      const r = state.report
      if (!r || !r.type || !r.noticedBy || !r.line) return state
      const now = new Date()
      const lines = reportLines(state)
      const { phraseId, english } = reportedPhrase(lines, r.line)
      const severity = severityOf(r.type)
      const id = nextReportId(state.reports)
      const pause = phraseToPause({ severity, phraseId })
      const report: TranslationReport = {
        id,
        trace: r.trace ?? state.job?.trace ?? '',
        rx: r.rx,
        line: r.line,
        lineEnglish: english,
        phraseId,
        type: r.type,
        noticedBy: r.noticedBy,
        taken: r.trace ? r.taken : null,
        severity,
        beforePrint: r.trace === null,
        filedAt: now.toISOString(),
        timeline: [
          { status: 'received', at: now.toISOString() },
          ...(pause ? [{ status: 'paused' as const, at: now.toISOString() }] : []),
          ...(severity === null ? [{ status: 'noChange' as const, at: now.toISOString() }] : []),
        ],
      }
      const language = (r.trace ? state.audit.find((e) => e.trace === r.trace)?.language : state.job?.translation?.language) ?? state.language
      return {
        ...state,
        reports: [...state.reports, report],
        paused: pause && !state.paused.includes(pause) ? [...state.paused, pause] : state.paused,
        report: { ...r, step: 'done', reportId: id },
        notice: pause ? { kind: 'paused', phraseId: pause, english, language, elsewhere: false, reportId: id } : state.notice,
      }
    }
    case 'closeReport':
      return { ...state, report: null }
    case 'printFlagged': {
      const r = state.report
      if (!r || !state.job) return state
      const now = new Date()
      const flaggedDirections = r.line === 'directions' || r.line === 'whole'
      const englishOnly = action.englishOnly || flaggedDirections || r.line === 'unsure'
      // Dosing directions translate fully or not at all; any other flagged line prints in English.
      let job = englishOnly
        ? { ...state.job, translation: null, englishLines: [] }
        : { ...state.job, englishLines: [...new Set([...state.job.englishLines, r.line!])] }
      job = { ...job, record: recordFor(job, state, now) }
      const logged = logPrint(state, job, job.translation ? (state.confirmed?.match ?? 'exact') : 'english-only', state.sigEntered || state.sigInput)
      return sendToPrinter({ ...state, ...logged, preview: null }, job, action.view)
    }
    case 'reprint': {
      const old = state.jobs[action.trace]
      const r = state.report
      if (!old) return state
      const flagged = r?.line ?? null
      const englishOnly = action.englishOnly || !old.translation || flagged === 'directions' || flagged === 'whole' || flagged === 'unsure'
      const base: PrintJob = {
        ...old,
        id: ++jobs,
        fill: old.fill,
        trace: traceCode(seeded(state.audit.length)),
        libraryVersion: state.libraryVersion,
        date: RX.date,
      }
      let job: PrintJob = englishOnly
        ? { ...base, translation: null, englishLines: [] }
        : withPausedLines({ ...base, englishLines: [...new Set([...old.englishLines, ...(flagged ? [flagged] : [])])] }, state.paused)
      job = { ...job, record: { kind: 'reprint', trace: job.trace, corrects: old.trace, englishOnly: !job.translation } }
      const entry = state.audit.find((e) => e.trace === action.trace)
      const logged = logPrint(state, job, job.translation ? (entry?.match ?? 'exact') : 'english-only', entry?.sigTyped ?? '', old.trace)
      return sendToPrinter({ ...state, ...logged }, job, action.view)
    }
    case 'openReports':
      return { ...state, screen: state.screen === 'print' ? 'fill' : state.screen, showReports: true }
    case 'closeReports':
      return { ...state, showReports: false }
    case 'closeNotice':
      return { ...state, notice: null }

    // ---------------------------------------------------------------- Simulate (presenter)
    case 'simulateExternalReport': {
      // Another pharmacy's severity 1 report on the Chinese twice-daily sentence: every Kroll pharmacy pauses it.
      const phraseId = directionsPhraseId('BID', 'zh-Hans')
      if (state.paused.includes(phraseId)) return { ...state, notice: { kind: 'paused', phraseId, english: 'TAKE 1 CAPSULE BY MOUTH TWICE DAILY', language: 'zh-Hans', elsewhere: true, reportId: 'RPT-0098' } }
      const now = new Date().toISOString()
      const report: TranslationReport = {
        id: 'RPT-0098',
        trace: '',
        rx: '',
        line: 'directions',
        lineEnglish: 'TAKE [N] CAPSULE(S) BY MOUTH TWICE DAILY',
        phraseId,
        type: 'meaning',
        noticedBy: 'otherPharmacy',
        taken: 'unknown',
        severity: 1,
        beforePrint: false,
        filedAt: now,
        timeline: [
          { status: 'received', at: now },
          { status: 'paused', at: now },
        ],
        elsewhere: true,
      }
      return {
        ...state,
        screen: state.screen === 'print' ? 'fill' : state.screen,
        reports: [...state.reports.filter((r) => r.id !== report.id), report],
        paused: [...state.paused, phraseId],
        notice: { kind: 'paused', phraseId, english: 'TAKE 1 CAPSULE BY MOUTH TWICE DAILY', language: 'zh-Hans', elsewhere: true, reportId: report.id },
      }
    }
    case 'simulateFix': {
      const now = new Date().toISOString()
      const fixed = state.paused
      const [major, minor] = state.libraryVersion.slice(1).split('.').map(Number)
      const version = minor >= 12 ? `v${major + 1}.01` : `v${major}.${String(minor + 1).padStart(2, '0')}`
      return {
        ...state,
        screen: state.screen === 'print' ? 'fill' : state.screen,
        paused: [],
        libraryVersion: version,
        reports: state.reports.map((r) =>
          r.timeline.some((t) => t.status === 'fixed' || t.status === 'noChange') ? r : { ...r, timeline: [...r.timeline, { status: 'fixed', at: now }] },
        ),
        notice: { kind: 'fixed', version, phraseIds: fixed },
      }
    }
    case 'setOnline':
      return {
        ...state,
        online: action.online,
        // Queued receipts go out when the connection returns; their fingerprints were fixed at print time.
        receipts: action.online ? state.receipts.map((r) => (r.status === 'queued' ? { ...r, status: 'sent' as const } : r)) : state.receipts,
      }

    case 'scenario': {
      const persona = action.persona ?? 'leung'
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
      // Everything else, the pharmacy's log included, is the walkthrough's, so steps replay exactly.
      const edits = action.state.persona === state.persona ? state.edits : {}
      const loaded = { ...action.state, edits }
      return loaded.job ? { ...loaded, job: { ...loaded.job, details: detailsOf(loaded) } } : loaded
    }
  }
}

/** This pharmacy's callback list for a paused phrase (PRD 1): built locally, never sent to TELUS. */
export const callbacksFor = (state: FlowState, phraseId: string): AuditEntry[] => callbackList(state.audit, phraseId)
