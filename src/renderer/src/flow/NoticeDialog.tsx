import { useState } from 'react'
import { languageByCode } from '@/data/languages'
import { DButton, Dialog as KDialog } from '@/kroll/primitives'
import { shortTime } from './RxHistoryDialog'
import { type Action, callbacksFor, type FlowState } from './state'

/**
 * A notice from the translation network (PRD 1): a phrase was paused after a severity 1 report,
 * with this pharmacy's callback list built locally from its own audit log, or a fix shipped.
 */
export function NoticeDialog({ state, dispatch }: { state: FlowState; dispatch: (a: Action) => void }) {
  const notice = state.notice!
  const [called, setCalled] = useState<string[]>([])
  const close = (): void => dispatch({ type: 'closeNotice' })

  if (notice.kind === 'fixed') {
    return (
      <KDialog title="Translation library updated" onClose={close} width={520} testId="dialog-notice-fixed"
        footer={<DButton primary onClick={close} testId="btn-notice-close">OK</DButton>}>
        <span className="k-dnote">
          Library {notice.version} is now in use. {notice.phraseIds.length ? 'The paused sentence was re-reviewed by both translators and is back in use; reports are marked Fixed.' : 'No sentences were paused.'}
        </span>
        <span className="k-hint">Labels that printed in English while it was paused can be reprinted from Rx History.</span>
      </KDialog>
    )
  }

  const callbacks = callbacksFor(state, notice.phraseId)
  return (
    <KDialog title="Translation paused" onClose={close} width={660} testId="dialog-notice-paused"
      footer={<DButton primary onClick={close} testId="btn-notice-close">OK</DButton>}>
      <span className="k-dnote is-warning">
        {notice.elsewhere ? 'Another pharmacy reported' : `Your report ${notice.reportId} flagged`} a {languageByCode(notice.language).name} sentence that could cause harm. It’s paused for every Kroll pharmacy and prints in English until both translators re-review it.
      </span>
      <div className="k-record">
        <span className="k-record-title">Paused sentence</span>
        <span>{notice.english}</span>
      </div>
      <span className="k-record-title">Callback list: prescriptions at this pharmacy that printed it ({callbacks.length})</span>
      {callbacks.length === 0 ? (
        <span className="k-hint">None. No one here received this sentence.</span>
      ) : (
        <table className="k-table" data-testid="callback-list">
          <thead>
            <tr>{['Rx', 'Fill', 'Patient', 'Printed', 'Trace', 'Called'].map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {callbacks.map((e) => (
              <tr key={e.trace}>
                <td>{e.rx}</td>
                <td>{e.fill}</td>
                <td>{e.patient}</td>
                <td>{shortTime(e.printedAt)}</td>
                <td>{e.trace}</td>
                <td>
                  <input type="checkbox" checked={called.includes(e.trace)} onChange={() => setCalled((c) => (c.includes(e.trace) ? c.filter((t) => t !== e.trace) : [...c, e.trace]))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <span className="k-hint">Built here from this pharmacy’s audit log. TELUS never sees this list.</span>
    </KDialog>
  )
}
