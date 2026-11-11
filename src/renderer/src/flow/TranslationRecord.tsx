import type { TranslationRecord as Record } from './state'

/**
 * What Kroll saves to the Rx history for a print (hi-fi B3, PRD 2). For a translated label it gives
 * the trace code printed on the label and the pharmacist who confirmed the English, so
 * responsibility is on the record. Phrase IDs stay in the log; the pharmacist never sees them.
 */
export function TranslationRecord({ record, variant }: { record: Record | null; variant: 'kroll' | 'print' }) {
  if (!record) return null
  const cls = variant === 'kroll' ? 'k-record' : 'print-record'
  if (record.kind === 'request') {
    return (
      <div className={cls} data-testid="translation-record">
        <span className="k-record-title">Translation record</span>
        <span className="k-record-grid">English label only · Translation request {record.id} logged</span>
      </div>
    )
  }
  if (record.kind === 'reprint') {
    return (
      <div className={cls} data-testid="translation-record">
        <span className="k-record-title">Translation record</span>
        <span className="k-record-grid">
          {record.englishOnly ? 'English-only reprint' : 'Corrected reprint'} · Trace {record.trace} · replaces {record.corrects}
        </span>
        <span className="k-hint">Added as a new entry. The original print stays in the log unchanged.</span>
      </div>
    )
  }
  const pairs: [string, string][] = [
    ['Language', record.language],
    ['Trace', record.trace],
    ['Library', record.version],
    ['Confirmed by', record.confirmedBy],
    ['Printed', record.printed],
  ]
  return (
    <div className={cls} data-testid="translation-record">
      <span className="k-record-title">Translation record</span>
      <div className="k-record-grid">
        {pairs.map(([k, v]) => (
          <span key={k}>
            <span className="k-dlabel">{k}</span>
            {v}
          </span>
        ))}
      </div>
      <span className="k-hint">
        Saved to the Rx history.{' '}
        {record.receipt === 'queued' ? 'Offline: the print receipt is queued and sends when the connection returns.' : 'Print receipt sent to TELUS (no patient information).'}
      </span>
    </div>
  )
}
