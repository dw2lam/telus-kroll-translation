import { useState } from 'react'
import type { AuditEntry } from '@/data/audit'
import { languageByCode } from '@/data/languages'
import { DButton, Dialog as KDialog, DialogRow } from '@/kroll/primitives'
import type { Action, FlowState } from './state'

/** `11-Nov-2026 14:32` from an ISO time. */
export function shortTime(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function outcomeOf(e: AuditEntry): string {
  if (e.corrects) return e.match === 'english-only' ? 'English-only reprint' : 'Corrected reprint'
  if (e.match === 'english-only') return 'English only'
  return e.linesInEnglish.length ? 'Translated · some lines English' : 'Translated'
}

/** Reports filed against a print, read from the report list (entries themselves are never edited). */
const reportsFor = (state: FlowState, trace: string): string[] => state.reports.filter((r) => r.trace === trace).map((r) => r.id)

/**
 * Rx → Rx History… (PRD 1 and 2): every print of a prescription, found by its number. Pick one to
 * see its audit entry, verify it against the print receipt, export it, or report a translation issue.
 */
export function RxHistoryDialog({ state, dispatch }: { state: FlowState; dispatch: (a: Action) => void }) {
  const h = state.rxHistory!
  const [draftRx, setDraftRx] = useState(h.rx)
  const [exported, setExported] = useState<string | null>(null)
  const prints = state.audit.filter((e) => e.rx === h.rx).sort((a, b) => b.printedAt.localeCompare(a.printedAt))
  const selected = prints.find((e) => e.trace === h.selected) ?? null
  const close = (): void => dispatch({ type: 'closeRxHistory' })

  if (h.view === 'entry' && selected) {
    const receipt = state.receipts.find((r) => r.trace === selected.trace)
    const exportEntry = async (): Promise<void> => {
      const path = await window.kroll?.exportAuditEntry(JSON.stringify(selected, null, 2), `audit-${selected.rx}-fill${selected.fill}-${selected.trace}.json`)
      if (path) setExported(path)
    }
    return (
      <KDialog title={`Audit entry — Rx:${selected.rx} fill ${selected.fill}`} onClose={close} width={660} testId="dialog-audit-entry"
        footer={<>
          {exported && <span className="k-hint k-saved">Exported to {exported}</span>}
          <DButton onClick={() => void exportEntry()} testId="btn-export-entry">Export entry</DButton>
          <DButton onClick={() => dispatch({ type: 'verifyEntry' })} testId="btn-verify-entry">Verify against receipt</DButton>
          <DButton primary onClick={() => dispatch({ type: 'rxHistory', changes: { view: 'list' } })} testId="btn-entry-back">Back</DButton>
        </>}>
        <div className="k-entry-grid">
          <Pair k="Trace" v={selected.trace} />
          <Pair k="Printed" v={shortTime(selected.printedAt)} />
          <Pair k="User" v={selected.user} />
          <Pair k="Patient" v={selected.patient} />
          <Pair k="Sig typed" v={selected.sigTyped} />
          <Pair k="Match" v={selected.match} />
          <Pair k="Language" v={`${languageByCode(selected.language).name} (${selected.script})`} />
          <Pair k="Library" v={selected.libraryVersion} />
          {selected.corrects && <Pair k="Corrects" v={selected.corrects} />}
          <Pair k="Reports" v={reportsFor(state, selected.trace).join(', ') || 'None'} />
        </div>
        {selected.lines.length > 0 && (
          <table className="k-table">
            <thead>
              <tr><th>Line</th><th>Phrase ID</th><th>Printed</th></tr>
            </thead>
            <tbody>
              {selected.lines.map((l) => (
                <tr key={l.key}>
                  <td>{l.key}</td>
                  <td>{l.phraseId}</td>
                  <td>{selected.linesInEnglish.includes(l.key) ? 'English (not translated)' : 'Translated'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="k-record">
          <span className="k-record-title">Fingerprint {selected.fingerprint}</span>
          <span className="k-hint">
            Computed from the whole entry at print time. Entries can’t be edited or deleted; a correction is added as a new entry.{' '}
            {receipt ? `Print receipt ${receipt.status === 'queued' ? 'queued (offline)' : 'sent to TELUS'}.` : 'No receipt: English-only prints send none.'}
          </span>
          {h.verified !== null && (
            <span className={h.verified ? 'k-verify is-ok' : 'k-verify is-bad'} data-testid="verify-result">
              {h.verified ? '✓ Matches the print receipt: this entry hasn’t changed since printing.' : '✗ No matching receipt for this entry.'}
            </span>
          )}
        </div>
      </KDialog>
    )
  }

  return (
    <KDialog title="Rx History" onClose={close} width={720} testId="dialog-rx-history"
      footer={<>
        <DButton onClick={() => selected && dispatch({ type: 'rxHistory', changes: { view: 'entry' } })} testId="btn-view-entry">View entry</DButton>
        <DButton onClick={() => selected && dispatch({ type: 'startReport', origin: 'history', trace: selected.trace })} testId="btn-history-report">Report a translation issue</DButton>
        <DButton primary onClick={close} testId="btn-history-close">Close</DButton>
      </>}>
      <form className="k-dialog-row" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'rxHistory', changes: { rx: draftRx.trim(), selected: null } }) }}>
        <span className="k-dlabel">Rx number</span>
        <input className="k-input" value={draftRx} onChange={(e) => setDraftRx(e.target.value)} data-testid="history-rx" />
        <DButton onClick={() => dispatch({ type: 'rxHistory', changes: { rx: draftRx.trim(), selected: null } })} testId="btn-history-find">Find</DButton>
      </form>
      {prints.length === 0 ? (
        <span className="k-dnote">No prints found for Rx {h.rx}.</span>
      ) : (
        <table className="k-table is-selectable">
          <thead>
            <tr>
              {['Fill', 'Printed', 'Patient', 'Language', 'Library', 'Trace', 'Outcome', 'Reports'].map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {prints.map((e) => (
              <tr key={e.trace} className={e.trace === h.selected ? 'is-selected' : ''} onClick={() => dispatch({ type: 'rxHistory', changes: { selected: e.trace } })} data-testid={`history-row-${e.trace}`}>
                <td>{e.fill}</td>
                <td>{shortTime(e.printedAt)}</td>
                <td>{e.patient}</td>
                <td>{languageByCode(e.language).name}</td>
                <td>{e.libraryVersion}</td>
                <td>{e.trace}</td>
                <td>{outcomeOf(e)}</td>
                <td>{reportsFor(state, e.trace).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <span className="k-hint">Patients can read the Rx number from their label when they call. Select a print to see its entry or report an issue.</span>
    </KDialog>
  )
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <DialogRow label={k}>
      <div className="k-dfield" style={{ fontSize: 10 }}><span>{v}</span></div>
    </DialogRow>
  )
}
