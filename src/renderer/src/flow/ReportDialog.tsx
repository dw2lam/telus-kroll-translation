import { useState } from 'react'
import { ISSUE_TYPES, NOTICED_BY, SEVERITY_TEXT, severityOf, type Taken } from '@/data/audit'
import { languageByCode } from '@/data/languages'
import { DButton, Dialog as KDialog, DialogRow } from '@/kroll/primitives'
import { outcomeOf, shortTime } from './RxHistoryDialog'
import { type Action, type FlowState, reportLines } from './state'

const TAKEN: { id: Taken; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unknown', label: 'Unknown' },
]

const STATUS_TEXT = { received: 'Received', paused: 'Phrase paused for every pharmacy', fixed: 'Fixed', noChange: 'No change to the library' } as const

/**
 * PRD 1: report a translation issue. From the preview before printing, a printed label, the Rx
 * history, or a phone call (Rx number lookup). The pharmacist picks a line by its English, never a
 * phrase ID; severity is computed from the issue type, never chosen.
 */
export function ReportDialog({ state, printView, dispatch }: { state: FlowState; printView: '3d' | 'inline'; dispatch: (a: Action) => void }) {
  const r = state.report!
  const set = (changes: Partial<typeof r>): void => dispatch({ type: 'report', changes })
  const close = (): void => dispatch({ type: 'closeReport' })
  const [lookupRx, setLookupRx] = useState(r.rx)
  const entry = r.trace ? state.audit.find((e) => e.trace === r.trace) : undefined
  const language = languageByCode(entry?.language ?? state.job?.translation?.language ?? state.language)
  const lines = reportLines(state)
  const beforePrint = r.trace === null

  if (r.step === 'lookup') {
    const prints = state.audit.filter((e) => e.rx === r.rx && e.lines.length > 0).sort((a, b) => b.printedAt.localeCompare(a.printedAt))
    return (
      <KDialog title="Report a translation issue" onClose={close} width={640} testId="dialog-report"
        footer={<>
          <DButton primary onClick={() => r.trace && dispatch({ type: 'reportStep', step: 'line' })} testId="btn-report-next">Next</DButton>
          <DButton onClick={close} testId="btn-report-cancel">Cancel</DButton>
        </>}>
        <span className="k-dnote">Find the label from what the patient can read you: the Rx number is on every label.</span>
        <form className="k-dialog-row" onSubmit={(e) => { e.preventDefault(); set({ rx: lookupRx.trim(), trace: null }) }}>
          <span className="k-dlabel">Rx number</span>
          <input className="k-input" value={lookupRx} onChange={(e) => setLookupRx(e.target.value)} data-testid="report-rx" autoFocus />
          <DButton onClick={() => set({ rx: lookupRx.trim(), trace: null })} testId="btn-report-find">Find</DButton>
        </form>
        {prints.length === 0 ? (
          <span className="k-dnote">No translated prints for Rx {r.rx}.</span>
        ) : (
          <table className="k-table is-selectable">
            <thead>
              <tr>{['Fill', 'Printed', 'Patient', 'Language', 'Library', 'Outcome'].map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {prints.map((e) => (
                <tr key={e.trace} className={e.trace === r.trace ? 'is-selected' : ''} onClick={() => set({ trace: e.trace })} data-testid={`report-print-${e.trace}`}>
                  <td>{e.fill}</td>
                  <td>{shortTime(e.printedAt)}</td>
                  <td>{e.patient}</td>
                  <td>{languageByCode(e.language).name}</td>
                  <td>{e.libraryVersion}</td>
                  <td>{outcomeOf(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </KDialog>
    )
  }

  if (r.step === 'line') {
    return (
      <KDialog title="Report a translation issue — which line?" onClose={close} width={720} testId="dialog-report"
        footer={<>
          <DButton primary onClick={() => r.line && dispatch({ type: 'reportStep', step: 'form' })} testId="btn-report-next">Next</DButton>
          {r.origin === 'lookup' && <DButton onClick={() => dispatch({ type: 'reportStep', step: 'lookup' })} testId="btn-report-back">Back</DButton>}
          <DButton onClick={close} testId="btn-report-cancel">Cancel</DButton>
        </>}>
        <span className="k-dnote">
          {beforePrint ? 'The label about to print.' : `Rx ${r.rx} · ${entry ? shortTime(entry.printedAt) : ''} · ${language.name}.`} Each line shows the standard English it was translated from.
        </span>
        <div className="k-choices" role="radiogroup">
          {lines.map((l) => (
            <LineChoice key={l.key} id={l.key} selected={r.line === l.key} onSelect={() => set({ line: l.key })} english={l.english} text={l.text} lang={language.code} rtl={language.rtl} />
          ))}
          <LineChoice id="whole" selected={r.line === 'whole'} onSelect={() => set({ line: 'whole' })} english="Whole label" />
          <LineChoice id="unsure" selected={r.line === 'unsure'} onSelect={() => set({ line: 'unsure' })} english="Not sure which line" />
        </div>
      </KDialog>
    )
  }

  if (r.step === 'form') {
    const severity = r.type ? severityOf(r.type) : undefined
    const ready = r.type && r.noticedBy && (beforePrint || r.taken)
    return (
      <KDialog title="Report a translation issue — what’s wrong?" onClose={close} width={640} testId="dialog-report"
        footer={<>
          <DButton primary onClick={() => ready && dispatch({ type: 'submitReport' })} testId="btn-report-submit">✓ Submit report</DButton>
          <DButton onClick={() => dispatch({ type: 'reportStep', step: 'line' })} testId="btn-report-back">Back</DButton>
          <DButton onClick={close} testId="btn-report-cancel">Cancel</DButton>
        </>}>
        <span className="k-hint">Line: {r.line === 'whole' ? 'Whole label' : r.line === 'unsure' ? 'Not sure which line' : lines.find((l) => l.key === r.line)?.english}</span>
        <fieldset className="k-fieldset">
          <legend>Issue</legend>
          {ISSUE_TYPES.map((t) => (
            <label key={t.id} className="k-check" data-testid={`issue-${t.id}`}>
              <input type="radio" name="issue" checked={r.type === t.id} onChange={() => set({ type: t.id })} />
              <span><b>{t.label}</b> <span className="k-hint">{t.detail}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="k-form-cols">
          <fieldset className="k-fieldset">
            <legend>Who noticed it</legend>
            {NOTICED_BY.map((n) => (
              <label key={n.id} className="k-check" data-testid={`noticed-${n.id}`}>
                <input type="radio" name="noticed" checked={r.noticedBy === n.id} onChange={() => set({ noticedBy: n.id })} />
                <span>{n.label}</span>
              </label>
            ))}
          </fieldset>
          {!beforePrint && (
            <fieldset className="k-fieldset">
              <legend>Medication taken since?</legend>
              {TAKEN.map((t) => (
                <label key={t.id} className="k-check" data-testid={`taken-${t.id}`}>
                  <input type="radio" name="taken" checked={r.taken === t.id} onChange={() => set({ taken: t.id })} />
                  <span>{t.label}</span>
                </label>
              ))}
            </fieldset>
          )}
        </div>
        <label className="k-note">
          <span>Note (optional)</span>
          <textarea value={r.note} onChange={(e) => set({ note: e.target.value })} rows={2} data-testid="report-note" />
          <span className="k-hint is-warning">Don’t enter patient details. No patient information leaves the pharmacy.</span>
        </label>
        {r.type && (
          <div className={'k-severity is-s' + (severity ?? 0)} data-testid="report-severity">
            {severity ? (
              <>
                <b>{SEVERITY_TEXT[severity].title}</b>
                <span>{SEVERITY_TEXT[severity].response}</span>
              </>
            ) : (
              <>
                <b>Pharmacy error · no change to the library</b>
                <span>Logged as a usability signal. The phrase isn’t paused, because the translation itself is right.</span>
              </>
            )}
            <span className="k-hint">Set by Kroll from the issue type, so every pharmacy’s reports are triaged the same way.</span>
          </div>
        )}
      </KDialog>
    )
  }

  // Done: report number, status, and what to do now.
  const report = state.reports.find((x) => x.id === r.reportId)!
  const directions = r.line === 'directions' || r.line === 'whole' || r.line === 'unsure'
  const job = r.trace ? state.jobs[r.trace] : state.job
  const patient = job?.details
  const contact = report.taken === 'yes'
  const aims = report.taken === 'yes' || report.severity === 1
  return (
    <KDialog title={`Report ${report.id} submitted`} onClose={close} width={640} testId="dialog-report-done"
      footer={<>
        {beforePrint ? (
          <>
            <DButton primary onClick={() => dispatch({ type: 'printFlagged', englishOnly: false, view: printView })} testId="btn-print-flagged" disabled={directions}>
              Print with this line in English
            </DButton>
            <DButton primary={directions} onClick={() => dispatch({ type: 'printFlagged', englishOnly: true, view: printView })} testId="btn-print-english-only">
              Print English only
            </DButton>
          </>
        ) : (
          r.trace && (
            <>
              <DButton primary onClick={() => dispatch({ type: 'reprint', trace: r.trace!, englishOnly: false, view: printView })} testId="btn-reprint-corrected" disabled={directions}>
                Corrected reprint
              </DButton>
              <DButton primary={directions} onClick={() => dispatch({ type: 'reprint', trace: r.trace!, englishOnly: true, view: printView })} testId="btn-reprint-english">
                English-only reprint
              </DButton>
            </>
          )
        )}
        <DButton onClick={close} testId="btn-report-close">Close</DButton>
      </>}>
      <div className={'k-severity is-s' + (report.severity ?? 0)}>
        <b>{report.severity ? SEVERITY_TEXT[report.severity].title : 'Pharmacy error · no change to the library'}</b>
        <span>{report.severity ? SEVERITY_TEXT[report.severity].response : 'Logged as a usability signal; the phrase stays in use.'}</span>
      </div>
      <ol className="k-timeline" data-testid="report-timeline">
        {report.timeline.map((t) => (
          <li key={t.status}>
            <b>{STATUS_TEXT[t.status]}</b> <span className="k-hint">{shortTime(t.at)}</span>
          </li>
        ))}
        {!report.timeline.some((t) => t.status === 'fixed' || t.status === 'noChange') && <li className="is-pending">Fixed or no change: Kroll updates this when TELUS responds.</li>}
      </ol>
      {beforePrint && (
        <span className="k-dnote" data-testid="report-print-note">
          {directions
            ? 'The flagged line is the dosing directions. Directions translate fully or not at all, so no translated label prints: English only.'
            : 'The flagged line can print in English with a “could not be translated” note; the rest stays translated. English only is always an option.'}
        </span>
      )}
      {!beforePrint && (
        <span className="k-dnote">
          {directions
            ? 'The dosing directions were flagged, so a reprint is English only.'
            : 'A corrected reprint prints the flagged line in English. The original print stays in the log; the reprint is a new entry.'}
        </span>
      )}
      {contact && patient && (
        <div className="k-callout" data-testid="report-contact">
          <b>Contact the patient</b>
          <span>
            The medication was taken since this label printed. Call {patient.salutation} {patient.lastName} ({patient.phoneLabel}: {patient.phone}) to check the dose taken and explain the correction.
          </span>
        </div>
      )}
      {aims && (
        <div className="k-callout is-warning" data-testid="report-aims">
          <b>Incident reporting</b>
          <span>This may be a medication incident. The pharmacy must report it to the College of Pharmacists through AIMS. Kroll doesn’t file it for you.</span>
        </div>
      )}
    </KDialog>
  )
}

function LineChoice({ id, selected, onSelect, english, text, lang, rtl }: { id: string; selected: boolean; onSelect: () => void; english: string; text?: string; lang?: string; rtl?: boolean }) {
  return (
    <button type="button" className={'k-choice k-line' + (selected ? ' is-selected' : '')} role="radio" aria-checked={selected} onClick={onSelect} data-testid={`line-${id}`}>
      {selected ? <span className="k-radio is-on" /> : <span className="k-radio" />}
      <span className="k-en">{english}</span>
      {text && <span className="k-tr" lang={lang} dir={rtl ? 'rtl' : 'ltr'}>{text}</span>}
    </button>
  )
}
