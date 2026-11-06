import type { ReactNode } from 'react'
import { useState } from 'react'
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
  const { guide, show3d, onShow3d, onCheatSheet, onRestart, edited, onResetEdits, onCollapse } = props
  const [tab, setTab] = useState<'walkthroughs' | 'scenarios'>('walkthroughs')

  return (
    <aside className="pz" aria-label="Presenter" data-testid="presenter">
      <header className="pz-toolbar">
        <span className="pz-title">Presenter</span>
        <button type="button" className="pz-icon-btn" onClick={onCollapse} title={`Hide presenter (${MOD},)`} aria-label="Hide presenter" data-testid="pz-collapse">
          <Icon name="sidebar" size={17} />
        </button>
      </header>

      <div className="pz-segmented" role="tablist">
        {(['walkthroughs', 'scenarios'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-selected' : undefined} onClick={() => setTab(t)} data-testid={`pz-tab-${t}`}>
            {t === 'walkthroughs' ? 'Walkthroughs' : 'Scenarios'}
          </button>
        ))}
      </div>

      <div className="pz-scroll">
        {tab === 'scenarios' ? (
          <Scenarios onScenario={props.onScenario} />
        ) : guide ? (
          <Walkthrough {...props} guide={guide} />
        ) : (
          <TourList onStartTour={props.onStartTour} />
        )}
      </div>

      <div className="pz-footer">
        <Group>
          <label className="pz-row">
            <span className="pz-row-icon"><Icon name="cube" /></span>
            <span className="pz-row-text">3D print view</span>
            <input type="checkbox" className="pz-switch" checked={show3d} onChange={(e) => onShow3d(e.target.checked)} data-testid="toggle-3d" />
          </label>
          <button type="button" className="pz-row" onClick={onCheatSheet} data-testid="btn-cheatsheet">
            <span className="pz-row-icon"><Icon name="doc" /></span>
            <span className="pz-row-text">Cheat sheet</span>
            <kbd>F1</kbd>
            <span className="pz-chevron" title="Opens in its own window"><Icon name="popout" size={13} /></span>
          </button>
          <button type="button" className="pz-row" onClick={onResetEdits} disabled={edited === 0} data-testid="btn-reset-edits">
            <span className="pz-row-icon"><Icon name="undo" /></span>
            <span className="pz-row-text">Reset names and details</span>
            {edited > 0 && <kbd data-testid="edit-count">{edited}</kbd>}
          </button>
          <div className="pz-row is-static">
            <span className="pz-row-icon"><Icon name="update" /></span>
            <span className="pz-row-text" data-testid="app-version">Version {version}</span>
            <button type="button" className="pz-btn" onClick={() => window.kroll?.checkForUpdates()} title="Check for updates" data-testid="btn-update">
              Update
            </button>
          </div>
          <button type="button" className="pz-row" onClick={onRestart} data-testid="btn-restart">
            <span className="pz-row-icon"><Icon name="restart" /></span>
            <span className="pz-row-text">Restart demo</span>
          </button>
        </Group>
      </div>
    </aside>
  )
}

function TourList({ onStartTour }: { onStartTour: (id: string) => void }) {
  return (
    <>
      <p className="pz-intro">
        A clickable Kroll prototype with one new feature: a second label in the patient’s language. Translated wording is team-written placeholder
        text, not verified.
      </p>
      <Group label="Walk through">
        {TOURS.map((t, i) => (
          <button type="button" key={t.id} className="pz-row is-tall" onClick={() => onStartTour(t.id)} data-testid={`tour-${t.id}`}>
            <span className="pz-badge">{i + 1}</span>
            <span className="pz-row-text">
              {t.title}
              <small>{t.summary}</small>
            </span>
            <span className="pz-chevron"><Icon name="chevronRight" size={13} /></span>
          </button>
        ))}
      </Group>
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
        <Icon name="chevronLeft" size={13} /> Walkthroughs
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

function Scenarios({ onScenario }: { onScenario: (id: string) => void }) {
  return (
    <>
      <p className="pz-intro">Opens F12 Fill Rx with the patient and sig filled in. Press Enter in the Sig box to continue.</p>
      <Group>
        {SCENARIOS.map((s) => (
          <button type="button" key={s.id} className="pz-row is-tall" onClick={() => onScenario(s.id)} data-testid={`scenario-${s.id}`}>
            <span className="pz-row-text">
              {s.title}
              <small>{s.detail}</small>
            </span>
            <span className="pz-chevron"><Icon name="chevronRight" size={13} /></span>
          </button>
        ))}
      </Group>
    </>
  )
}
