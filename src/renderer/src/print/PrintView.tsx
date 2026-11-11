import { useEffect, useMemo, useState } from 'react'
import { languageByCode } from '@/data/languages'
import type { PrintJob } from '@/flow/state'
import { Panel1, Panel2, PANEL_WIDTH } from '@/labels/LabelPanels'
import { saveLabelPdf } from '@/labels/savePdf'
import PrintScene, { type PrintPhase, type SceneLabel } from './PrintScene'
import { TranslationRecord } from '@/flow/TranslationRecord'

const PX_PER_INCH = PANEL_WIDTH / 4

/** Rasterises each printed panel through the main process so the 3D label shows the exact DOM label. */
function usePanelImages(job: PrintJob): SceneLabel[] | null {
  const [labels, setLabels] = useState<SceneLabel[] | null>(null)
  useEffect(() => {
    let cancelled = false
    setLabels(null)
    const bridge = window.kroll
    if (!bridge) return
    const json = JSON.stringify(job)
    // Panel 2 goes on the vial first; panel 1 is laminated over it.
    const panels: ('1' | '2')[] = job.translation ? ['2', '1'] : ['1']
    void Promise.all(panels.map((panel) => bridge.renderLabel({ job: json, panel }, 3))).then((images) => {
      if (cancelled) return
      setLabels(
        images.map((img, i) => ({
          id: `panel-${panels[i]}`,
          widthIn: img.width / PX_PER_INCH,
          heightIn: img.height / PX_PER_INCH,
          image: img.dataUrl,
          layer: panels[i] === '1' ? 1 : 0,
        })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [job])
  return labels
}

const PHASE_TEXT: Record<PrintPhase, string> = {
  idle: 'Preparing labels…',
  printing: 'Printing',
  applying: 'Applying to vial',
  done: 'Labelled',
}

/** The demo's last step: the labels Kroll would print, and a visualiser that prints them onto a vial. */
export function PrintView({ job, onBack, onNewRx, onReport }: { job: PrintJob; onBack: () => void; onNewRx: () => void; onReport: () => void }) {
  const labels = usePanelImages(job)
  const [run, setRun] = useState(0)
  const [phase, setPhase] = useState<{ phase: PrintPhase; index: number }>({ phase: 'idle', index: 0 })
  const [peeled, setPeeled] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const language = job.translation ? languageByCode(job.translation.language) : null
  const status = useMemo(() => {
    if (!labels) return PHASE_TEXT.idle
    const which = labels[phase.index]?.layer === 0 ? 'panel 2 (under-panel)' : 'panel 1 (English)'
    return phase.phase === 'done' ? PHASE_TEXT.done : `${PHASE_TEXT[phase.phase]} ${labels.length > 1 ? which : 'English label'}`
  }, [labels, phase])

  const replay = (): void => {
    setPeeled(false)
    setRun((r) => r + 1)
  }

  const savePdf = async (): Promise<void> => {
    const path = await saveLabelPdf(job)
    if (path) setSaved(path)
  }

  return (
    <div className="print-view" data-testid="print-view">
      <section className="print-stage">
        {labels ? (
          <PrintScene labels={labels} runKey={run} peel={peeled ? 1 : 0} onPhase={(p, index) => setPhase({ phase: p, index })} />
        ) : (
          <div className="print-loading">Rendering labels…</div>
        )}
        <div className="print-status" data-testid="print-status" data-phase={phase.phase}>
          <span className={'print-dot is-' + phase.phase} />
          {status}
        </div>
        <div className="print-actions">
          <button type="button" onClick={replay} data-testid="btn-replay">↻ Replay</button>
          {job.translation && (
            <button type="button" onClick={() => setPeeled((p) => !p)} disabled={phase.phase !== 'done'} data-testid="btn-peel" data-peeled={peeled}>
              {peeled ? 'Press panel back' : 'Peel panel 1'}
            </button>
          )}
          <span className="print-hint">Drag to orbit · scroll to zoom</span>
        </div>
      </section>
      <aside className="print-side">
        <header>
          <h1>Printed labels</h1>
          <p>
            {language
              ? `Two-panel peel label · English on the front, ${language.name} underneath.`
              : 'English label only — no verified translation was printed.'}
          </p>
        </header>
        <div className="print-panels">
          <TranslationRecord record={job.record} variant="print" />
          <figure>
            <figcaption>Panel 1 — front, dispensed label</figcaption>
            <div className="print-panel-frame"><Panel1 job={job} /></div>
          </figure>
          {job.translation && (
            <figure>
              <figcaption>Panel 2 — under-panel, revealed when panel 1 is peeled</figcaption>
              <div className="print-panel-frame"><Panel2 job={job} /></div>
            </figure>
          )}
        </div>
        <footer>
          {saved && <p className="print-saved">Saved to {saved}</p>}
          <div className="print-buttons">
            <button type="button" onClick={() => void savePdf()} data-testid="btn-save-pdf">Save label PDF</button>
            {job.translation && (
              <button type="button" onClick={onReport} data-testid="btn-report-print">Report a translation issue</button>
            )}
            <button type="button" onClick={onBack} data-testid="btn-back-to-rx">Back to Rx</button>
            <button type="button" className="is-primary" onClick={onNewRx} data-testid="btn-new-rx">New Rx</button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
