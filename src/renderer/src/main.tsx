import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/400-italic.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/700.css'
import '@fontsource/noto-sans-arabic/400.css'
import '@fontsource/noto-sans-arabic/700.css'
import '@fontsource/noto-sans-tc/400.css'
import '@fontsource/noto-sans-tc/700.css'
import './styles/app.css'
import './styles/kroll.css'
import './styles/demo.css'
import App from './App'
import { CheatSheet } from './cheatsheet/CheatSheet'
import { LabelRenderPage } from './labels/LabelRenderPage'

// The main process loads `#render?…` offscreen to rasterise or print label panels.
const hash = window.location.hash
const page = hash.startsWith('#render?') ? (
  <LabelRenderPage params={new URLSearchParams(hash.slice('#render?'.length))} />
) : hash === '#cheatsheet' ? (
  <CheatSheet standalone />
) : hash === '#cheatsheet-window' ? (
  <CheatSheet
    onLoad={(language, sig) => window.kroll?.loadScenario(language, sig)}
    onSavePdf={() => window.kroll?.saveCheatSheetPdf()}
    onClose={() => window.close()}
  />
) : (
  <App />
)

if (hash === '#cheatsheet-window') document.title = 'Telus Kroll Translation Demo — Cheat Sheet'

// The app window lets macOS draw the presenter sidebar's material (vibrancy).
if (page.type === App) document.documentElement.dataset.platform = window.kroll?.platform ?? ''

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
