import { useCallback, useEffect, useLayoutEffect, useReducer, useState } from 'react'
import { CheatSheet } from './cheatsheet/CheatSheet'
import { SCENARIOS } from './data/demo'
import { languageByCode } from './data/languages'
import { FillRxScreen } from './flow/FillRxScreen'
import { LabelPreviewDialog } from './flow/LabelPreviewDialog'
import { PatientScreen } from './flow/PatientScreen'
import { initialState, reducer } from './flow/state'
import { TranslatedSigDialog } from './flow/TranslatedSigDialog'
import { PrintView } from './print/PrintView'
import './print/print.css'

const STEPS = [
  { id: 'patient', label: 'F3 Patient · language' },
  { id: 'fill', label: 'F12 Fill Rx · sig' },
  { id: 'dialog', label: 'Translated Sig' },
  { id: 'print', label: 'Print labels' },
] as const

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

function readShow3d(): boolean {
  try {
    return localStorage.getItem(SHOW_3D_KEY) !== 'off'
  } catch {
    return true
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [stageRef, fit] = useFill()
  const [show3d, setShow3d] = useState(readShow3d)
  const [cheatSheet, setCheatSheet] = useState(false)
  const printView = show3d ? '3d' : 'inline'
  const language = languageByCode(state.language)

  const toggle3d = (on: boolean): void => {
    setShow3d(on)
    try {
      localStorage.setItem(SHOW_3D_KEY, on ? 'on' : 'off')
    } catch {
      // Preference only; the toggle still works for this session.
    }
    if (!on && state.screen === 'print') dispatch({ type: 'previewLabels' })
  }
  const step = state.screen === 'print' ? 'print' : state.dialog ? 'dialog' : state.screen

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
      if (e.key === 'F3') {
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
        setCheatSheet((c) => !c)
      } else if (e.key === 'Escape' && state.preview) {
        dispatch({ type: 'closePreview' })
      } else if (e.key === 'Escape' && state.dialog) {
        dispatch({ type: 'closeDialog' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fillOrPrint, state.dialog, state.preview])

  return (
    <div className="app">
      <header className="demo-bar">
        <div className="demo-brand">
          <span className="demo-leaf" />
          Kroll Label <span className="demo-tag">Demo</span>
        </div>
        <ol className="demo-steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className={s.id === step ? 'is-current' : STEPS.findIndex((x) => x.id === step) > i ? 'is-done' : undefined}>
              {s.label}
            </li>
          ))}
        </ol>
        <div className="demo-controls">
          <span className="demo-lang" title="Patient language">
            {language.name}
          </span>
          <label className="demo-switch" title="Print to the 3D printer and vial, or show the labels inside Kroll">
            <input type="checkbox" checked={show3d} onChange={(e) => toggle3d(e.target.checked)} data-testid="toggle-3d" />
            <span className="demo-switch-track" />
            3D print view
          </label>
          <select
            aria-label="Scenario"
            data-testid="scenario"
            value=""
            onChange={(e) => {
              const scenario = SCENARIOS.find((s) => s.id === e.target.value)
              if (scenario) dispatch({ type: 'scenario', language: scenario.language, sig: scenario.sig })
              setCheatSheet(false)
            }}
          >
            <option value="" disabled>
              Load a scenario…
            </option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.detail}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setCheatSheet((c) => !c)} className={cheatSheet ? 'is-on' : undefined} data-testid="btn-cheatsheet">
            Cheat sheet
          </button>
          <button type="button" onClick={() => dispatch({ type: 'reset' })} data-testid="btn-restart">
            Restart
          </button>
        </div>
      </header>

      <div className="app-body">
      {cheatSheet && (
        <CheatSheet
          onLoad={(language, sig) => {
            dispatch({ type: 'scenario', language, sig, submit: true })
            setCheatSheet(false)
          }}
          onSavePdf={() => window.kroll?.saveCheatSheetPdf()}
          onClose={() => setCheatSheet(false)}
        />
      )}
      {state.screen === 'print' && state.job ? (
        <PrintView job={state.job} onBack={() => dispatch({ type: 'go', screen: 'fill' })} onNewRx={() => dispatch({ type: 'reset' })} />
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
      </div>
    </div>
  )
}
