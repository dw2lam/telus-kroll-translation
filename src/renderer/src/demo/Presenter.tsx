import type { ReactNode } from 'react'
import { version } from '../../../../package.json'
import { SCENARIOS } from '@/data/demo'
import { type Tour, TOURS, type TourStep } from './tours'

export interface GuideProgress {
  tour: Tour
  steps: TourStep[]
  /** Index into `steps`; `steps.length` once the walkthrough is finished. */
  step: number
  /** The current step's control can be used right now (for example the peel button once printing finishes). */
  ready: boolean
}

interface Props {
  guide: GuideProgress | null
  show3d: boolean
  onShow3d: (on: boolean) => void
  onStartTour: (id: string) => void
  onStep: (index: number) => void
  onDoStep: () => void
  onExitTour: () => void
  onScenario: (id: string) => void
  onCheatSheet: () => void
  onRestart: () => void
  /** How many fields have been changed on screen. */
  edited: number
  onResetEdits: () => void
  onCollapse: () => void
  /** Kroll window scale; 1 fits the window. */
  scale: number
  onScale: (step: 1 | -1 | 0) => void
  magnifier: boolean
  onMagnifier: (on: boolean) => void
  /** TELUS-side events the demo can't otherwise reach. */
  onSimulate: (event: 'externalReport' | 'fix') => void
  online: boolean
  onOnline: (online: boolean) => void
  /** Phrases paused right now, for the Simulate group's status. */
  pausedCount: number
}

const isMac = window.kroll?.platform === 'darwin'
export const MOD = isMac ? '⌘' : 'Ctrl+'

const ICONS = {
  sidebar: 'M3.5 4.5h17a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18V6a1.5 1.5 0 0 1 1.5-1.5Zm11 0v15',
  chevronRight: 'm9 5 7 7-7 7',
  chevronLeft: 'm15 5-7 7 7 7',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  cube: 'M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2L12 2.8Zm0 0v0M4 7.2l8 4.4 8-4.4M12 11.6v9.6',
  doc: 'M7 2.8h7l5 5v12.4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Zm7 0v5h5M9 13h7M9 17h7',
  restart: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4.5H9',
  undo: 'M9 5 4.5 9.5 9 14M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3',
  update: 'M12 3.5v12m0 0-4.5-4.5m4.5 4.5 4.5-4.5M4.5 20.5h15',
  popout: 'M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  scale: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  alert: 'M12 3.5 21.5 20h-19L12 3.5ZM12 10v4.5M12 17.2v.3',
  wifi: 'M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0M12 19.5v.2',
  magnifier: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm4.8 11.3L20 20M8 10.5h5M10.5 8v5',
}

export function Icon({ name, size = 15 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

function Group({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="pz-group">
      {label && <div className="pz-group-label">{label}</div>}
      <div className="pz-group-body">{children}</div>
    </div>
  )
}

/** Presenter sidebar, styled like a macOS inspector. Everything here sits outside Kroll. */
export function Presenter(props: Props) {
  const { guide, show3d, onShow3d, onCheatSheet, onRestart, edited, onResetEdits, onCollapse, scale, onScale, magnifier, onMagnifier, onSimulate, online, onOnline, pausedCount } = props

  return (
    <aside className="pz" aria-label="Presenter" data-testid="presenter">
      <header className="pz-toolbar">
        <span className="pz-title">Presenter</span>
        <button type="button" className="pz-icon-btn" onClick={onCollapse} title={`Hide presenter (${MOD},)`} aria-label="Hide presenter" data-testid="pz-collapse">
          <Icon name="sidebar" size={17} />
        </button>
      </header>

      <div className="pz-scroll">
        {guide ? (
          <Walkthrough {...props} guide={guide} />
        ) : (
          <>
            <ScenarioList onStartTour={props.onStartTour} onScenario={props.onScenario} />
            <Simulate onSimulate={onSimulate} online={online} onOnline={onOnline} pausedCount={pausedCount} />
          </>
        )}
      </div>

      <div className="pz-footer">
        {/* View and demo controls, as a compact toolbar. */}
        <div className="pz-tools" role="toolbar" aria-label="Demo controls">
          <button type="button" className="pz-tool" aria-pressed={show3d} onClick={() => onShow3d(!show3d)} title="Labels print onto a vial in 3D" data-testid="toggle-3d">
            <Icon name="cube" size={17} />
            <span>3D print</span>
          </button>
          <button type="button" className="pz-tool" aria-pressed={magnifier} onClick={() => onMagnifier(!magnifier)} title={`Zoom in around the pointer (${isMac ? '⇧⌘M' : 'Ctrl+Shift+M'})`} data-testid="toggle-magnifier">
            <Icon name="magnifier" size={17} />
            <span>Magnifier</span>
          </button>
          <button type="button" className="pz-tool" onClick={onCheatSheet} title="Cheat sheet (F1), in its own window" data-testid="btn-cheatsheet">
            <Icon name="doc" size={17} />
            <span>Cheat sheet</span>
          </button>
          <button type="button" className="pz-tool" onClick={onResetEdits} disabled={edited === 0} title="Put back the names and details you edited" data-testid="btn-reset-edits">
            <Icon name="undo" size={17} />
            <span>Undo edits</span>
            {edited > 0 && <span className="pz-tool-badge" data-testid="edit-count">{edited}</span>}
          </button>
          <button type="button" className="pz-tool" onClick={onRestart} title="Start the demo over" data-testid="btn-restart">
            <Icon name="restart" size={17} />
            <span>Start over</span>
          </button>
          <span className="pz-scale" title="Scale Kroll">
            <button type="button" onClick={() => onScale(-1)} disabled={scale <= 0.75} title={`Zoom out (${MOD}−)`} aria-label="Zoom out" data-testid="scale-down">−</button>
            <button type="button" className="pz-scale-value" onClick={() => onScale(0)} title={`Fit the window (${MOD}0)`} data-testid="scale-value">
              {scale === 1 ? 'Fit' : `${Math.round(scale * 100)}%`}
            </button>
            <button type="button" onClick={() => onScale(1)} disabled={scale >= 2} title={`Zoom in (${MOD}+)`} aria-label="Zoom in" data-testid="scale-up">+</button>
          </span>
        </div>

        <div className="pz-version">
          <span data-testid="app-version">Version {version}</span>
          <button type="button" className="pz-link" onClick={() => window.kroll?.checkForUpdates()} data-testid="btn-update">
            Check for updates
          </button>
        </div>
      </div>
    </aside>
  )
}

/** TELUS-side events and the pharmacy's connection: what one pharmacy can't trigger by itself. */
function Simulate({ onSimulate, online, onOnline, pausedCount }: Pick<Props, 'onSimulate' | 'online' | 'onOnline' | 'pausedCount'>) {
  return (
    <section className="pz-sim" aria-label="Simulate the translation network">
      <div className="pz-sim-head">
        <span>Simulate the network</span>
        {pausedCount > 0 && <span className="pz-pill is-warn" data-testid="paused-count">{pausedCount} paused</span>}
      </div>
      <button type="button" className="pz-wide" onClick={() => onSimulate('externalReport')} data-testid="sim-external-report">
        <Icon name="alert" size={14} />
        <span>Another pharmacy reports a problem<small>Pauses Chinese “twice a day” everywhere</small></span>
      </button>
      <button type="button" className="pz-wide" onClick={() => onSimulate('fix')} data-testid="sim-fix">
        <Icon name="check" size={14} />
        <span>TELUS ships the fix<small>Paused sentences come back</small></span>
      </button>
      <label className="pz-wide is-switch">
        <Icon name="wifi" size={14} />
        <span>Pharmacy online<small>{online ? 'Print receipts send right away' : 'Offline: print receipts wait in a queue'}</small></span>
        <input type="checkbox" className="pz-switch" checked={online} onChange={(e) => onOnline(e.target.checked)} data-testid="toggle-online" />
      </label>
    </section>
  )
}

/** Each scenario: Guide me walks through it step by step; Set up loads it and leaves Kroll to you. */
function ScenarioList({ onStartTour, onScenario }: { onStartTour: (id: string) => void; onScenario: (id: string) => void }) {
  const groups = [
    { label: 'Main demo', list: SCENARIOS.filter((s) => !s.edge) },
    { label: 'Edge cases', list: SCENARIOS.filter((s) => s.edge) },
  ]
  return (
    <>
      <p className="pz-intro">
        <b>▶ Walkthrough</b> takes you through a scenario one step at a time, with notes. <b>Load only</b> fills in Kroll for that scenario and leaves the clicking to you.
      </p>
      {groups.map(({ label, list }) => (
        <Group key={label} label={label}>
          {list.map((s) => (
            <div key={s.id} className="pz-scn">
              <span className={'pz-scn-num' + (s.edge ? '' : ' is-demo')}>{SCENARIOS.indexOf(s) + 1}</span>
              <span className="pz-scn-text">
                <span className="pz-scn-title">{s.title}</span>
                <span className="pz-scn-detail">{s.detail}</span>
                <span className="pz-scn-actions">
                  {s.tour && (
                    <button type="button" className="pz-btn is-primary is-small" onClick={() => onStartTour(s.tour!)} title="Step by step, with notes; Kroll highlights what to click" data-testid={`tour-${s.tour}`}>
                      ▶ Walkthrough
                    </button>
                  )}
                  <button type="button" className="pz-btn is-small" onClick={() => onScenario(s.id)} title="Fill in Kroll for this scenario, without the step-by-step notes" data-testid={`scenario-${s.id}`}>
                    Load only
                  </button>
                </span>
              </span>
            </div>
          ))}
        </Group>
      ))}
    </>
  )
}

function Walkthrough({ guide, onStep, onDoStep, onExitTour, onStartTour }: Props & { guide: GuideProgress }) {
  const { tour, steps, step, ready } = guide
  const finished = step >= steps.length
  const next = tour.next ? TOURS.find((t) => t.id === tour.next) : undefined

  return (
    <div className="pz-walk" data-testid="walkthrough" data-step={step}>
      <button type="button" className="pz-back" onClick={onExitTour} data-testid="tour-exit">
        <Icon name="chevronLeft" size={13} /> Scenarios
      </button>
      <h2>{tour.title}</h2>
      <p className="pz-sub">{finished ? 'Complete' : `Step ${step + 1} of ${steps.length}`}</p>

      <ol className="pz-steps">
        {steps.map((s, i) => {
          const state = i < step ? 'is-done' : i === step ? 'is-current' : undefined
          return (
            <li key={s.title} className={state}>
              <button type="button" className="pz-step-head" onClick={() => onStep(i)} data-testid={`step-${i}`}>
                <span className="pz-step-dot">{i < step ? <Icon name="check" size={11} /> : i + 1}</span>
                <span>{s.title}</span>
              </button>
              {i === step && (
                <div className="pz-step-body">
                  <p>{s.body}</p>
                  <div className="pz-step-actions">
                    <button type="button" className="pz-btn is-primary" onClick={onDoStep} disabled={!ready} data-testid="step-do">
                      {s.doLabel ?? 'Next'}
                    </button>
                    {i > 0 && (
                      <button type="button" className="pz-btn" onClick={() => onStep(i - 1)} data-testid="step-back">
                        Back
                      </button>
                    )}
                  </div>
                  {s.perform && <p className="pz-hint">{ready ? 'Or use the highlighted control in Kroll.' : 'Waiting for the printer…'}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {finished && (
        <div className="pz-done" data-testid="tour-finished">
          <span className="pz-done-icon"><Icon name="check" size={18} /></span>
          <p>Walkthrough complete.</p>
          <div className="pz-step-actions">
            {next && (
              <button type="button" className="pz-btn is-primary" onClick={() => onStartTour(next.id)} data-testid="tour-next">
                Next: {next.title}
              </button>
            )}
            <button type="button" className="pz-btn" onClick={() => onStartTour(tour.id)} data-testid="tour-again">
              Start over
            </button>
          </div>
        </div>
      )}
      <p className="pz-keys">PageDown / PageUp step forward and back, so a presentation clicker works.</p>
    </div>
  )
}
