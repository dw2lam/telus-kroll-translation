import { useState } from 'react'
import { RX } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import { Panel1, Panel2 } from '@/labels/LabelPanels'
import { saveLabelPdf } from '@/labels/savePdf'
import { DButton, Dialog as KDialog } from '@/kroll/primitives'
import type { PrintJob } from './state'
import { TranslationRecord } from './TranslationRecord'

interface Props {
  job: PrintJob
  reason: 'printed' | 'requested'
  /** Whether the patient's language still has no confirmed translation on this Rx. */
  untranslated: boolean
  show3d: boolean
  onShow3d: () => void
  onClose: () => void
}

/** The printed labels, previewed inside Kroll (Labels menu, Labels F2, Ctrl+L, or printing with the 3D view off). */
export function LabelPreviewDialog({ job, reason, untranslated, show3d, onShow3d, onClose }: Props) {
  const [saved, setSaved] = useState<string | null>(null)
  const language = job.translation ? languageByCode(job.translation.language) : null
  const title = reason === 'printed' ? `Labels printed — Rx:${RX.number}` : `Label Preview — Rx:${RX.number}`
  return (
    <KDialog
      title={title}
      onClose={onClose}
      width={920}
      testId="label-preview"
      footer={
        <>
          {saved && <span className="k-hint k-saved">Saved to {saved}</span>}
          <DButton onClick={() => void saveLabelPdf(job).then((p) => p && setSaved(p))} testId="btn-preview-pdf">Save label PDF</DButton>
          {show3d && <DButton onClick={onShow3d} testId="btn-preview-3d">Show on vial (3D)</DButton>}
          <DButton primary onClick={onClose} testId="btn-preview-close">{reason === 'printed' ? '✓ Done' : 'Close'}</DButton>
        </>
      }
    >
      <span className="k-hint">
        {language
          ? `Two-panel peel label · panel 1 English (front), panel 2 ${language.name} (under-panel).`
          : untranslated
            ? 'English label only — no translation has been confirmed for this sig yet.'
            : 'English label only.'}
      </span>
      {reason === 'printed' && <TranslationRecord record={job.record} variant="kroll" />}
      <div className="k-preview-panels">
        <figure>
          <figcaption>Panel 1 — front, dispensed label</figcaption>
          <div className="k-preview-frame"><Panel1 job={job} /></div>
        </figure>
        {job.translation && (
          <figure>
            <figcaption>Panel 2 — under-panel, revealed when panel 1 is peeled</figcaption>
            <div className="k-preview-frame"><Panel2 job={job} /></div>
          </figure>
        )}
      </div>
    </KDialog>
  )
}
