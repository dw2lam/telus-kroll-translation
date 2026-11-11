import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { SCENARIOS } from './data/demo'
import { Highlight } from './demo/Highlight'
import { Icon, MOD, Presenter, type GuideProgress } from './demo/Presenter'
import { stateAt, stepsFor, tourById } from './demo/tours'
import { FillRxScreen } from './flow/FillRxScreen'
import { LabelPreviewDialog } from './flow/LabelPreviewDialog'
import { PatientScreen } from './flow/PatientScreen'
import type { LanguageCode } from './data/types'
import { detailsOf, initialState, reducer } from './flow/state'
import { RequestsDialog } from './flow/RequestsDialog'
import { TranslatedSigDialog } from './flow/TranslatedSigDialog'
import { KrollMenus, KrollStatus, type MenuEntry } from './kroll/primitives'
import { NoticeDialog } from './flow/NoticeDialog'
import { ReportDialog } from './flow/ReportDialog'
import { ReportsDialog } from './flow/ReportsDialog'
import { RxHistoryDialog } from './flow/RxHistoryDialog'
import { PrintView } from './print/PrintView'
import './print/print.css'

interface Fit {
  zoom: number
  width: number
  height: number
}

/** Presenter scale steps for the Kroll window. 1 is "fit": Kroll fills the stage. */
export const SCALES = [0.75, 0.9, 1, 1.25, 1.5, 1.75, 2]
const SCALE_KEY = 'kroll-label.scale'
const MAGNIFIER_KEY = 'kroll-label.magnifier'
/** How far the magnifier zooms in. */
const MAGNIFY = 2

/**
 * Kroll fills the whole stage. Its controls are drawn at the Figma frames' 9–11px
 * sizes, so the window is laid out at `stage / zoom` and zoomed back up: on a
 * large screen everything grows instead of leaving a small window in a big void.
 * `scale` multiplies that: below 1 Kroll gets more room, above 1 it grows past the
 * stage (never laid out under 1024×700) and the stage scrolls.
 */
function useFill(scale: number): [(el: HTMLDivElement | null) => void, Fit] {
  const [el, ref] = useState<HTMLDivElement | null>(null)
  const [fit, setFit] = useState<Fit>({ zoom: 1, width: 1024, height: 700 })
  useLayoutEffect(() => {
    if (!el) return
    const measure = (): void => {
      const w = el.clientWidth
      const h = el.clientHeight
      const zoom = Math.max(0.8, Math.min(2.4, Math.min(w / 1024, h / 700))) * scale
      setFit({ zoom, width: Math.max(1024, w / zoom), height: Math.max(700, h / zoom) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, scale])
  return [ref, fit]
}

const SHOW_3D_KEY = 'kroll-label.show3d'
const PRESENTER_KEY = 'kroll-label.presenter'

function readPref(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preference only; it still applies for this session.
  }
}

function writePref(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // Preference only; it still applies for this session.
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [scale, setScale] = useState(() => {
    const saved = Number(readString(SCALE_KEY))
    return SCALES.includes(saved) ? saved : 1
  })
  const stepScale = useCallback((dir: 1 | -1 | 0) => {
    setScale((current) => {
      const i = SCALES.indexOf(current)
      const next = dir === 0 ? 1 : SCALES[Math.max(0, Math.min(SCALES.length - 1, i + dir))]
      writeString(SCALE_KEY, String(next))
      return next
    })
  }, [])
  const [stageRef, fit] = useFill(scale)
  const [magnifier, setMagnifier] = useState(() => readString(MAGNIFIER_KEY) === 'on')
  const toggleMagnifier = useCallback((on?: boolean) => {
    setMagnifier((m) => {
      const next = on ?? !m
      writeString(MAGNIFIER_KEY, next ? 'on' : 'off')
      return next
    })
  }, [])
  const [lensOrigin, setLensOrigin] = useState({ x: 50, y: 50 })
  const [show3d, setShow3d] = useState(() => readPref(SHOW_3D_KEY))
  const [presenter, setPresenter] = useState(() => readPref(PRESENTER_KEY))
  const [guide, setGuide] = useState<{ tour: string; step: number } | null>(null)
  const [ready, setReady] = useState(true)
  const printView = show3d ? '3d' : 'inline'

  const tour = guide ? tourById(guide.tour) : undefined
  const steps = useMemo(() => (tour ? stepsFor(tour, { view: printView }) : []), [tour, printView])
  const current = guide ? steps[guide.step] : undefined

  const showPresenter = useCallback((on: boolean): void => {
    setPresenter(on)
    writePref(PRESENTER_KEY, on)
  }, [])

  /** Puts Kroll exactly where step `index` of the walkthrough begins. */
  const goToStep = useCallback(
    (id: string, index: number): void => {
      const t = tourById(id)
      if (!t) return
      dispatch({ type: 'load', state: stateAt(t, index, { view: printView }) })
      setGuide({ tour: id, step: index })
    },
    [printView],
  )
  const startTour = useCallback((id: string): void => goToStep(id, 0), [goToStep])

  const doStep = useCallback((): void => {
    if (!guide || !current) return
    if (current.done?.(state)) setGuide({ ...guide, step: guide.step + 1 })
    else if (current.perform && 'click' in current.perform) document.querySelector<HTMLButtonElement>(current.perform.click)?.click()
    else if (current.perform) goToStep(guide.tour, guide.step + 1)
    else setGuide({ ...guide, step: guide.step + 1 })
  }, [guide, current, state, goToStep])

  const back = useCallback((): void => {
    if (guide && guide.step > 0) goToStep(guide.tour, guide.step - 1)
  }, [guide, goToStep])

  // Doing the step in Kroll itself moves the walkthrough on. Some steps finish
  // outside the flow state (the vial peel), so this also polls.
  const latest = useRef({ state, guide, current })
  latest.current = { state, guide, current }
  useEffect(() => {
    if (!guide) return
    const check = (): void => {
      const { state: s, guide: g, current: step } = latest.current
      if (!g || !step) return
      if (step.done?.(s)) setGuide({ ...g, step: g.step + 1 })
      const click = step.perform && 'click' in step.perform ? document.querySelector<HTMLButtonElement>(step.perform.click) : null
      setReady(!click || !click.disabled)
    }
    check()
    const timer = window.setInterval(check, 200)
    return () => window.clearInterval(timer)
  }, [guide, state])

  const loadScenario = (id: string): void => {
    const scenario = SCENARIOS.find((s) => s.id === id)
    if (!scenario) return
    dispatch({ type: 'scenario', language: scenario.language, sig: scenario.sig, persona: scenario.persona })
    setGuide(null)
  }
  const restart = useCallback((): void => {
    dispatch({ type: 'reset' })
    setGuide(null)
  }, [])

  // The native Demo menu drives the same controls.
  useEffect(
    () =>
      window.kroll?.onDemoCommand((command) => {
        if (command === 'guide') {
          showPresenter(true)
          startTour('leung')
        } else if (command === 'settings') setPresenter((p) => (writePref(PRESENTER_KEY, !p), !p))
        else if (command === 'restart') restart()
        else if (command === 'zoomIn') stepScale(1)
        else if (command === 'zoomOut') stepScale(-1)
        else if (command === 'zoomReset') stepScale(0)
        else if (command === 'magnifier') toggleMagnifier()
      }),
    [startTour, restart, showPresenter, stepScale, toggleMagnifier],
  )

  // A cell clicked in the cheat-sheet window loads here and runs.
  useEffect(
    () =>
      window.kroll?.onLoadScenario((language, sig) => {
        // Ms. Leung reads Chinese; a sig for any other language loads Mrs. Farahani, whose language isn't translatable.
        dispatch({ type: 'scenario', language: language as LanguageCode, sig, submit: true, persona: language === 'zh-Hans' ? 'leung' : 'farahani' })
        setGuide(null)
      }),
    [],
  )

  const toggle3d = (on: boolean): void => {
    setShow3d(on)
    writePref(SHOW_3D_KEY, on)
    if (!on && state.screen === 'print') dispatch({ type: 'previewLabels' })
    // The steps differ between the two views; restart the walkthrough rather than land mid-step.
    if (guide) setGuide(null)
  }

  // Once a translation is confirmed, it lands in the Rx (Figma B5) and the labels print.
  useEffect(() => {
    if (!state.confirmed || state.screen !== 'fill') return
    if (state.preview) return
    const timer = setTimeout(() => dispatch({ type: 'print', englishOnly: false, view: printView }), 1400)
    return () => clearTimeout(timer)
    // Only a newly confirmed translation prints; reopening a preview later must not.
  }, [state.confirmed])

  const fillOrPrint = useCallback(() => {
    if (state.screen === 'patient') dispatch({ type: 'go', screen: 'fill' })
    else if (state.screen === 'fill' && !state.dialog) {
      if (state.confirmed || state.language === 'en') dispatch({ type: 'print', englishOnly: !state.confirmed, view: printView })
      else dispatch({ type: 'submitSig' })
    }
  }, [state.screen, state.dialog, state.confirmed, state.language, printView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        showPresenter(!presenter)
      } else if (guide && e.key === 'PageDown') {
        e.preventDefault()
        doStep()
      } else if (guide && e.key === 'PageUp') {
        e.preventDefault()
        back()
      } else if (e.key === 'F3') {
        e.preventDefault()
        dispatch({ type: 'go', screen: 'patient' })
      } else if (e.key === 'F12') {
        e.preventDefault()
        fillOrPrint()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        dispatch({ type: 'previewLabels' })
      } else if (e.key === 'F1') {
        e.preventDefault()
        window.kroll?.openCheatSheet()
      } else if (e.key === 'Escape' && state.showRequests) {
        dispatch({ type: 'closeRequests' })
      } else if (e.key === 'Escape' && state.preview) {
        dispatch({ type: 'closePreview' })
      } else if (e.key === 'Escape' && state.dialog) {
        dispatch({ type: 'closeDialog' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fillOrPrint, state.dialog, state.preview, state.showRequests, presenter, guide, doStep, back, showPresenter])

  // The status bar's message clears itself after a few seconds.
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!statusMessage) return
    const t = window.setTimeout(() => setStatusMessage(null), 4000)
    return () => window.clearTimeout(t)
  }, [statusMessage])
  const status = useMemo(() => ({ message: statusMessage, notify: setStatusMessage }), [statusMessage])

  const progress: GuideProgress | null = tour && guide ? { tour, steps, step: guide.step, ready } : null

  // Kroll's working menu items (PRD 1 and 2 entry points), shared by every screen.
  const menus = useMemo<Partial<Record<string, MenuEntry[]>>>(
    () => ({
      Rx: [{ label: 'Rx History…', onClick: () => dispatch({ type: 'openRxHistory' }), testId: 'menu-rx-history' }],
      Utilities: [
        { label: 'Report a translation issue…', onClick: () => dispatch({ type: 'startReport', origin: 'lookup' }), testId: 'menu-report-issue' },
        { label: 'Translation reports…', onClick: () => dispatch({ type: 'openReports' }), testId: 'menu-translation-reports' },
        { label: 'Translation requests…', onClick: () => dispatch({ type: 'openRequests' }), testId: 'menu-translation-requests' },
      ],
    }),
    [],
  )

  return (
    <div className="app">
      <main
        className={'app-main' + (magnifier ? ' is-magnified' : '')}
        onMouseMove={
          magnifier
            ? (e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setLensOrigin({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
              }
            : undefined
        }
      >
        <div className="magnify" style={magnifier ? { transform: `scale(${MAGNIFY})`, transformOrigin: `${lensOrigin.x}% ${lensOrigin.y}%` } : undefined}>
        {state.screen === 'print' && state.job ? (
          <PrintView
            key={state.job.id}
            job={state.job}
            onBack={() => dispatch({ type: 'go', screen: 'fill' })}
            onNewRx={() => dispatch({ type: 'reset' })}
            onReport={() => dispatch({ type: 'startReport', origin: 'printed', trace: state.job!.trace })}
          />
        ) : (
          <KrollMenus.Provider value={menus}>
          <KrollStatus.Provider value={status}>
          <div className={'kroll-stage' + (scale > 1 ? ' is-scrollable' : '')} ref={stageRef}>
            <div className="kroll-window" style={{ zoom: fit.zoom, width: fit.width, height: fit.height }} data-testid={`screen-${state.screen}`}>
              {state.screen === 'patient' ? (
                <PatientScreen
                  language={state.language}
                  details={detailsOf(state)}
                  onEdit={(changes) => dispatch({ type: 'edit', changes })}
                  onLanguage={(l) => dispatch({ type: 'setLanguage', language: l })}
                  onOk={() => dispatch({ type: 'go', screen: 'fill' })}
                  onNewRx={() => dispatch({ type: 'go', screen: 'fill' })}
                  onRequests={() => dispatch({ type: 'openRequests' })}
                  photo={state.persona}
                />
              ) : (
                <FillRxScreen
                  language={state.language}
                  details={detailsOf(state)}
                  onEdit={(changes) => dispatch({ type: 'edit', changes })}
                  sigInput={state.sigInput}
                  translated={state.confirmed?.text ?? null}
                  dialogOpen={state.dialog !== null}
                  onSig={(sig) => dispatch({ type: 'setSig', sig })}
                  onSubmit={() => dispatch({ type: 'submitSig' })}
                  onPatient={() => dispatch({ type: 'go', screen: 'patient' })}
                  onFill={fillOrPrint}
                  onPreview={() => dispatch({ type: 'previewLabels' })}
                  onRequests={() => dispatch({ type: 'openRequests' })}
                />
              )}
              {state.dialog && (
                <TranslatedSigDialog dialog={state.dialog} printView={printView} language={state.language} sigEntered={state.sigEntered} requestTranslation={state.requestTranslation} libraryVersion={state.libraryVersion} dispatch={dispatch} />
              )}
              {state.preview && state.job && (
                <LabelPreviewDialog
                  job={state.job}
                  reason={state.preview}
                  untranslated={state.language !== 'en' && !state.confirmed}
                  show3d={show3d}
                  onShow3d={() => dispatch({ type: 'show3d' })}
                  onClose={() => dispatch({ type: 'closePreview' })}
                  onReport={() => dispatch({ type: 'startReport', origin: state.preview === 'requested' ? 'preview' : 'printed', trace: state.job!.trace })}
                  onPrint={() => dispatch({ type: 'print', englishOnly: false, view: printView })}
                />
              )}
              {state.showRequests && <RequestsDialog requests={state.requests} onClose={() => dispatch({ type: 'closeRequests' })} />}
              {state.showReports && <ReportsDialog state={state} dispatch={dispatch} />}
              {state.rxHistory && <RxHistoryDialog state={state} dispatch={dispatch} />}
              {state.report && <ReportDialog state={state} printView={printView} dispatch={dispatch} />}
              {state.notice && <NoticeDialog state={state} dispatch={dispatch} />}
            </div>
          </div>
          </KrollStatus.Provider>
          </KrollMenus.Provider>
        )}
        </div>
        {!presenter && (
          <button type="button" className="pz-reveal" onClick={() => showPresenter(true)} title={`Show presenter (${MOD},)`} data-testid="pz-reveal">
            <Icon name="sidebar" size={16} />
          </button>
        )}
      </main>
      <div className={'pz-slot' + (presenter ? '' : ' is-collapsed')} inert={!presenter}>
        <Presenter
          guide={progress}
          show3d={show3d}
          onShow3d={toggle3d}
          onStartTour={startTour}
          onStep={(i) => guide && goToStep(guide.tour, i)}
          onDoStep={doStep}
          onExitTour={() => setGuide(null)}
          onScenario={loadScenario}
          onCheatSheet={() => window.kroll?.openCheatSheet()}
          onRestart={restart}
          edited={Object.keys(state.edits).length}
          onResetEdits={() => dispatch({ type: 'resetEdits' })}
          onCollapse={() => showPresenter(false)}
          scale={scale}
          onScale={stepScale}
          magnifier={magnifier}
          onMagnifier={toggleMagnifier}
          onSimulate={(event) => dispatch({ type: event === 'fix' ? 'simulateFix' : 'simulateExternalReport' })}
          online={state.online}
          onOnline={(online) => dispatch({ type: 'setOnline', online })}
          pausedCount={state.paused.length}
        />
      </div>
      {current && <Highlight selector={current.highlight?.(state)} />}
    </div>
  )
}
