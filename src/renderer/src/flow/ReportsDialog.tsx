import { SEVERITY_TEXT } from '@/data/audit'
import { DButton, Dialog as KDialog } from '@/kroll/primitives'
import { shortTime } from './RxHistoryDialog'
import type { Action, FlowState } from './state'

const STATUS = { received: 'Received', paused: 'Phrase paused', fixed: 'Fixed', noChange: 'No change' } as const

/** Utilities → Translation reports…: every report this pharmacy filed or was told about, with its status (PRD 1). */
export function ReportsDialog({ state, dispatch }: { state: FlowState; dispatch: (a: Action) => void }) {
  const close = (): void => dispatch({ type: 'closeReports' })
  const reports = [...state.reports].reverse()
  return (
    <KDialog title="Translation reports" onClose={close} width={720} testId="dialog-reports"
      footer={<DButton primary onClick={close} testId="btn-reports-close">Close</DButton>}>
      <span className="k-dnote">Reports this pharmacy filed, and pauses from other pharmacies’ reports. Status updates as TELUS responds.</span>
      {reports.length === 0 ? (
        <span className="k-hint">No reports yet. Report from a label preview, Rx History, or Utilities → Report a translation issue…</span>
      ) : (
        <table className="k-table">
          <thead>
            <tr>{['Report', 'Filed', 'Rx', 'Line', 'Severity', 'Status'].map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const last = r.timeline[r.timeline.length - 1]
              return (
                <tr key={r.id} data-testid={`report-row-${r.id}`}>
                  <td>{r.id}</td>
                  <td>{shortTime(r.filedAt)}</td>
                  <td>{r.elsewhere ? 'Another pharmacy' : r.rx}</td>
                  <td className="k-wrap">{r.lineEnglish}</td>
                  <td>{r.severity ? SEVERITY_TEXT[r.severity].title.split(' · ')[0] : 'Pharmacy error'}</td>
                  <td><span className={'k-badge ' + (last.status === 'fixed' ? 'is-ok' : last.status === 'paused' ? 'is-warn' : 'is-muted')}>{STATUS[last.status]}</span> <span className="k-hint">{shortTime(last.at)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </KDialog>
  )
}
