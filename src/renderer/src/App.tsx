import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { SCENARIOS } from './data/demo'
import { Highlight } from './demo/Highlight'
import { Icon, MOD, Presenter, type GuideProgress } from './demo/Presenter'
import { stateAt, stepsFor, tourById } from './demo/tours'
import { FillRxScreen } from './flow/FillRxScreen'
import { LabelPreviewDialog } from './flow/LabelPreviewDialog'
import { PatientScreen } from './flow/PatientScreen'
import type { LanguageCode } from './data/types'
import { initialState, reducer } from './flow/state'
import { TranslatedSigDialog } from './flow/TranslatedSigDialog'
import { PrintView } from './print/PrintView'
import './print/print.css'

interface Fit {
  zoom: number
  width: number
  height: number
}

/**
 * Kroll fills the whole stage. Its controls are drawn at the Figma frames' 9–11px
 * sizes, so the window is laid out at `stage / zoom` and zoomed back up: on a
 * large screen everything grows instead of leaving a small window in a big void.
 */
function useFill(): [(el: HTMLDivElement | null) => void, Fit] {
  const [el, ref] = useState<HTMLDivElement | null>(null)
  const [fit, setFit] = useState<Fit>({ zoom: 1, width: 1024, height: 700 })
  useLayoutEffect(() => {
    if (!el) return
    const measure = (): void => {
      const w = el.clientWidth
      const h = el.clientHeight
      const zoom = Math.max(0.8, Math.min(2.4, Math.min(w / 1024, h / 700)))
      setFit({ zoom, width: w / zoom, height: h / zoom })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
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

function writePref(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // Preference only; it still applies for this session.
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [stageRef, fit] = useFill()
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
    dispatch({ type: 'scenario', language: scenario.language, sig: scenario.sig })
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
          startTour('exact')
        } else if (command === 'settings') setPresenter((p) => (writePref(PRESENTER_KEY, !p), !p))
        else if (command === 'restart') restart()
      }),
    [startTour, restart, showPresenter],
  )

  // A cell clicked in the cheat-sheet window loads here and runs.
  useEffect(
    () =>
      window.kroll?.onLoadScenario((language, sig) => {
        dispatch({ type: 'scenario', language: language as LanguageCode, sig, submit: true })
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
      } else if (e.key === 'Escape' && state.preview) {
        dispatch({ type: 'closePreview' })
      } else if (e.key === 'Escape' && state.dialog) {
        dispatch({ type: 'closeDialog' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fillOrPrint, state.dialog, state.preview, presenter, guide, doStep, back, showPresenter])

  const progress: GuideProgress | null = tour && guide ? { tour, steps, step: guide.step, ready } : null

  return (
    <div className="app">
      <main className="app-main">
        {state.screen === 'print' && state.job ? (
          <PrintView key={state.job.id} job={state.job} onBack={() => dispatch({ type: 'go', screen: 'fill' })} onNewRx={() => dispatch({ type: 'reset' })} />
        ) : (
          <div className="kroll-stage" ref={stageRef}>
            <div className="kroll-window" style={{ zoom: fit.zoom, width: fit.width, height: fit.height }} data-testid={`screen-${state.screen}`}>
              {state.screen === 'patient' ? (
                <PatientScreen
                  language={state.language}
                  onLanguage={(l) => dispatch({ type: 'setLanguage', language: l })}
                  onOk={() => dispatch({ type: 'go', screen: 'fill' })}
                  onNewRx={() => dispatch({ type: 'go', screen: 'fill' })}
                />
              ) : (
                <FillRxScreen
                  language={state.language}
                  sigInput={state.sigInput}
                  translated={state.confirmed?.text ?? null}
                  dialogOpen={state.dialog !== null}
                  onSig={(sig) => dispatch({ type: 'setSig', sig })}
                  onSubmit={() => dispatch({ type: 'submitSig' })}
                  onPatient={() => dispatch({ type: 'go', screen: 'patient' })}
                  onFill={fillOrPrint}
                  onPreview={() => dispatch({ type: 'previewLabels' })}
                />
              )}
              {state.dialog && (
                <TranslatedSigDialog dialog={state.dialog} printView={printView} language={state.language} sigEntered={state.sigEntered} dispatch={dispatch} />
              )}
              {state.preview && state.job && (
                <LabelPreviewDialog
                  job={state.job}
                  reason={state.preview}
                  untranslated={state.language !== 'en' && !state.confirmed}
                  show3d={show3d}
                  onShow3d={() => dispatch({ type: 'show3d' })}
                  onClose={() => dispatch({ type: 'closePreview' })}
                />
              )}
            </div>
          </div>
        )}
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
          onCollapse={() => showPresenter(false)}
        />
      </div>
      {current && <Highlight selector={current.highlight?.(state)} />}
    </div>
  )
}
