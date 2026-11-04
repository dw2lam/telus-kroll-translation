import { useEffect, useRef } from 'react'
import type { PrintJob } from '@/flow/state'
import { Panel1, Panel2 } from './LabelPanels'

declare global {
  interface Window {
    __labelReady?: { width: number; height: number }
  }
}

/**
 * The page the main process loads offscreen to rasterise or print label panels:
 * `#render?job=…&panels=1,2&zoom=3[&pdf=1]`. It reports the tallest panel's CSS
 * size on `window.__labelReady` once fonts have loaded and layout has settled.
 */
export function LabelRenderPage({ params }: { params: URLSearchParams }) {
  const job = JSON.parse(params.get('job') ?? '{}') as PrintJob
  const panels = (params.get('panels') ?? '1').split(',')
  const zoom = Number(params.get('zoom') ?? '1')
  const pdf = params.get('pdf') === '1'
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void document.fonts.ready.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const sizes = Array.from(root.current?.querySelectorAll<HTMLElement>('.lbl') ?? []).map((el) => ({ width: el.offsetWidth, height: el.offsetHeight }))
          window.__labelReady = {
            width: Math.max(0, ...sizes.map((s) => s.width)),
            height: Math.max(0, ...sizes.map((s) => s.height)),
          }
        }),
      ),
    )
  }, [])

  return (
    <div ref={root} className={'label-render' + (pdf ? ' is-pdf' : '')} style={{ zoom }}>
      {panels.map((p) => (
        <div key={p} className="label-render-page">
          {p === '1' ? <Panel1 job={job} /> : <Panel2 job={job} />}
        </div>
      ))}
    </div>
  )
}
