import { useState } from 'react'
import { languageByCode } from '@/data/languages'
import { Panel1, Panel2, Stickers } from '@/labels/LabelPanels'
import { vialById } from '@/labels/vials'
import { saveLabelPdf } from '@/labels/savePdf'
import { DButton, Dialog as KDialog, PrintIcon } from '@/kroll/primitives'
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
  /** Report a translation issue on this label (PRD 1): before printing, or the printed label. */
  onReport: () => void
  /** Print what's previewed (before printing only). */
  onPrint: () => void
}

/** The printed labels, previewed inside Kroll (Labels menu, Labels F2, Ctrl+L, or printing with the 3D view off). */
export function LabelPreviewDialog({ job, reason, untranslated, show3d, onShow3d, onClose, onReport, onPrint }: Props) {
  const [saved, setSaved] = useState<string | null>(null)
  const language = job.translation ? languageByCode(job.translation.language) : null
  const vial = vialById(job.vial)
  const printed = reason === 'printed'
  const title = printed ? `Labels printed — Rx:${job.rx}` : `Label Preview — Rx:${job.rx} (not printed yet)`
  return (
    <KDialog
      title={title}
      onClose={onClose}
      width={920}
      testId="label-preview"
      footer={
        <>
          {saved && <span className="k-hint k-saved">Saved to {saved}</span>}
          {job.translation && <DButton onClick={onReport} testId="btn-preview-report">Report a translation issue</DButton>}
          <DButton onClick={() => void saveLabelPdf(job).then((p) => p && setSaved(p))} testId="btn-preview-pdf">Save label PDF</DButton>
          {show3d && printed && <DButton onClick={onShow3d} testId="btn-preview-3d">Show on vial (3D)</DButton>}
          {printed ? (
            <DButton primary onClick={onClose} testId="btn-preview-close">✓ Done</DButton>
          ) : (
            <>
              <DButton onClick={onClose} testId="btn-preview-close">Close</DButton>
              <DButton primary onClick={onPrint} testId="btn-preview-print"><PrintIcon />Print labels</DButton>
            </>
          )}
        </>
      }
    >
      {printed && (
        <div className="k-confirm" data-testid="print-confirm">
          <span className="k-confirm-check">✓</span>
          <span>
            <b>{language ? 'Labels printed' : 'English label printed'}</b>
            {language
              ? ` · Panel 1 in English on the front, panel 2 in ${language.name} underneath.`
              : job.record?.kind === 'request'
                ? ' · No translation has been confirmed for this sig yet.'
                : job.record?.kind === 'reprint'
                  ? ' · An English-only reprint. The earlier label stays in the log.'
                  : untranslated
                    ? ' · No translated sentence was used for this fill.'
                    : ''}
          </span>
        </div>
      )}
      {!printed && (
        <span className="k-hint">
          {language
            ? `Two-panel peel label · panel 1 English (front), panel 2 ${language.name} (under-panel).`
            : untranslated
              ? 'English label only — no translation has been confirmed for this sig yet.'
              : 'English label only.'}
        </span>
      )}
      <span className="k-hint">{`${vial.name} vial · label ${vial.inches}. Warnings go on stickers, not the label.`}</span>
      {printed && <TranslationRecord record={job.record} variant="kroll" />}
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
        <figure>
          <figcaption>Warning stickers — on the vial, never on the label</figcaption>
          <div className="k-preview-stickers"><Stickers /></div>
        </figure>
      </div>
    </KDialog>
  )
}
