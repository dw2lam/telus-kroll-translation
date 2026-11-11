import type { TranslationRecord as Record } from './state'

/**
 * What Kroll saves to the Rx history for a print (hi-fi B3). For a translated label it names the
 * verified phrase and the pharmacist who confirmed the English, so responsibility is on the record.
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
  const pairs: [string, string][] = [
    ['Language', record.language],
    ['Phrase', `${record.phrase} · ${record.version}`],
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
      <span className="k-hint">Saved to the Rx history. If the library later corrects this phrase, Kroll flags every Rx that used it.</span>
    </div>
  )
}
