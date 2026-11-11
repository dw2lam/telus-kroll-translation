import type { TranslationRequest } from '@/data/demo'
import { SEED_REQUESTS } from '@/data/demo'
import { DButton, Dialog as KDialog } from '@/kroll/primitives'

const seeded = new Set(SEED_REQUESTS.map((r) => r.id))

/** Utilities → Translation requests…: every sig or language logged from an English-only print (hi-fi B3). */
export function RequestsDialog({ requests, onClose }: { requests: TranslationRequest[]; onClose: () => void }) {
  return (
    <KDialog title="Translation requests" onClose={onClose} width={640} testId="dialog-requests"
      footer={<DButton primary onClick={onClose} testId="btn-requests-close">Close</DButton>}>
      <span className="k-dnote">Requests go to the translation library team. Most-requested languages and sigs are verified first.</span>
      <table className="k-table">
        <thead>
          <tr>
            {['Request', 'Language', 'Sig entered', 'Rx', 'Logged', 'Status'].map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className={seeded.has(r.id) ? '' : 'is-new'} data-testid="request-row">
              <td>{r.id}</td>
              <td>{r.language}</td>
              <td>{r.sig}</td>
              <td>{r.rx}</td>
              <td>{r.logged}</td>
              <td><span className={'k-badge ' + (r.status === 'Verified' ? 'is-ok' : r.status === 'In review' ? 'is-review' : 'is-muted')}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </KDialog>
  )
}
