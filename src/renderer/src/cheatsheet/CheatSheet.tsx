import { useEffect, useMemo, useState } from 'react'
import leaf from '@/assets/leaf.svg'
import { provider } from '@/data/demoProvider'
import { hasTranslation, LANGUAGES, languageByCode } from '@/data/languages'
import { KROLL_ALIASES } from '@/data/phrasebook'
import type { LanguageCode, VerifiedSig } from '@/data/types'
import { Learn, LESSON } from './Learn'
import { DEMO_LANGUAGE, english, groupedCodes, isDraft, LAUNCH, type Outcome, OUTCOMES, sentence } from './shared'
import { latinOf, meaningOf } from './sigAnatomy'
import './cheatsheet.css'

/** How to reach each edge case while playing freely, without its walkthrough. */
const EDGE_CASES: { title: string; how: string; load?: { language: LanguageCode; sig: string } }[] = [
  { title: 'Language not supported yet', how: 'F3 → Language: Persian, Tagalog or any without “Translation Available” → F12 → ↵', load: { language: 'fa', sig: 'DAILY' } },
  { title: 'No verified sentence fits', how: 'Type free text, e.g. 1 CAP DAILY FOR ANEMIA → ↵ → Not this one → None of these → None of these fit', load: { language: DEMO_LANGUAGE, sig: '1 CAP DAILY FOR ANEMIA' } },
  { title: 'Technician flags a line before printing', how: 'A code → ↵ → Preview labels → Report a translation issue → pick a warning' },
  { title: 'Dosing directions flagged', how: 'As above, pick the directions line → Changes the meaning → no translated label prints' },
  { title: 'Family calls days later', how: 'Utilities → Report a translation issue… → Rx 1000048 → pick the print' },
  { title: 'Another pharmacy pauses a sentence', how: 'Sidebar → Simulate: Another pharmacy reports a problem → then 1C PO BID → ↵' },
  { title: 'TELUS ships the fix', how: 'Sidebar → Simulate: TELUS ships the fix' },
  { title: 'Wrong English phrase picked', how: 'Rx → Rx History → pick a print → Report a translation issue → Wrong English phrase picked' },
  { title: 'Offline, then a dispute', how: 'Sidebar → Pharmacy online off → print → Rx → Rx History → View entry → Verify against receipt' },
]

/** Free text worth trying live. The sheet picks whichever reaches each outcome. */
const FREE_TEXT = ['1 CAP DAILY FOR ANEMIA', '1 cap bid tid', '1 CAP QHS PRN DIZZINESS', 'take 2 caps every other day', 'zzz qqq']

const demoLanguage = languageByCode(DEMO_LANGUAGE)
const TRANSLATED = LANGUAGES.filter(hasTranslation)
const RECORDED_ONLY = LANGUAGES.filter((l) => l.code !== 'en' && !hasTranslation(l))

/** A live example for each outcome, worked out from the provider so the sheet can't drift from the app. */
function exampleFor(kind: Outcome): { language: LanguageCode; sig: string } | null {
  if (kind === 'exact') return { language: DEMO_LANGUAGE, sig: 'DAILY' }
  if (kind === 'notYetTranslatable') return { language: 'fa', sig: 'DAILY' }
  if (kind === 'paused') return null
  const sig = FREE_TEXT.find((s) => provider.translate(s, demoLanguage).kind === kind)
  return sig ? { language: DEMO_LANGUAGE, sig } : null
}

type Tab = 'learn' | 'reference' | 'guide'

const TABS: { id: Tab; label: string; sections: { id: string; label: string }[] }[] = [
  { id: 'learn', label: 'Learn sig codes', sections: LESSON },
  {
    id: 'reference',
    label: 'Code reference',
    sections: [
      { id: 'codes', label: 'All sig codes' },
      { id: 'typing', label: 'Ways to type a sig' },
    ],
  },
  {
    id: 'guide',
    label: 'Demo guide',
    sections: [
      { id: 'outcomes', label: 'What can happen' },
      { id: 'edge', label: 'Edge cases' },
      { id: 'reporting', label: 'Reporting and the log' },
      { id: 'keys', label: 'Keys and languages' },
    ],
  },
]

const TAB_KEY = 'cheatsheet.tab'
function savedTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY)
    return t === 'reference' || t === 'guide' ? t : 'learn'
  } catch {
    return 'learn'
  }
}

interface Props {
  /** Loads the sig for that language into F12 Fill Rx and runs it. Omitted when printing the sheet. */
  onLoad?: (language: LanguageCode, sig: string) => void
  onClose?: () => void
  onSavePdf?: () => unknown
  standalone?: boolean
}

/**
 * The presenter's cheat sheet, in Kroll's style, as three tabs: a lesson on reading sig codes with a
 * live decoder and practice quiz, a reference of every code, and the demo guide. Computed from the
 * translation provider, so it can't drift from what the app does. Printed, it shows all three.
 */
export function CheatSheet({ onLoad, onClose, onSavePdf, standalone }: Props) {
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [tab, setTabState] = useState<Tab>(savedTab)
  const setTab = (t: Tab): void => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      /* per-window convenience only */
    }
    document.querySelector('.cs')?.scrollTo({ top: 0 })
  }
  const load = (language: LanguageCode, sig: string) => (onLoad ? () => onLoad(language, sig) : undefined)

  useEffect(() => {
    if (!standalone) return
    void document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        ;(window as { __pageReady?: boolean }).__pageReady = true
      }),
    )
  }, [standalone])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (s: VerifiedSig): boolean =>
      !q ||
      s.code.toLowerCase().includes(q) ||
      english(s).toLowerCase().includes(q) ||
      latinOf(s.code).toLowerCase().includes(q) ||
      LAUNCH.some((l) => sentence(s, l).includes(query.trim()))
    return groupedCodes()
      .map((g) => ({ title: g.title, sigs: g.sigs.filter(matches) }))
      .filter((g) => g.sigs.length > 0)
  }, [query])

  const current = TABS.find((t) => t.id === tab)!
  const show = (t: Tab): boolean => !!standalone || tab === t

  const reference = (
    <>
      <section id="cs-codes" className="cs-card">
        <h2>All sig codes</h2>
        <p className="cs-lead">
          Grouped by meaning. Type a code in F12 Fill Rx and press ↵.{onLoad ? ' Click a row to run it in Kroll.' : ''} Chinese and Hindi are the launch languages.
        </p>
        {groups.length === 0 ? (
          <div className="cs-empty">
            <p>No sig code matches “{query.trim()}”.</p>
            {onLoad && (
              <button type="button" className="cs-btn is-primary" onClick={load(DEMO_LANGUAGE, query.trim())} data-testid="cs-try-free-text">
                Try it as a free-text sig in Kroll
              </button>
            )}
          </div>
        ) : (
          <table className="cs-table cs-codes">
            <thead>
              <tr>
                <th>Code</th>
                <th>Means</th>
                <th>English label (Kroll)</th>
                {LAUNCH.map((l) => <th key={l}>{languageByCode(l).name}</th>)}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr className="cs-group"><th colSpan={3 + LAUNCH.length}>{g.title}</th></tr>
                {g.sigs.map((s) => (
                  <tr key={s.code} className={'cs-sig' + (onLoad ? ' is-clickable' : '')} onClick={load(DEMO_LANGUAGE, s.code)} data-testid={`cs-sig-${s.code}`}>
                    <td><code className="cs-code">{s.code}</code></td>
                    <td className="cs-means">
                      {meaningOf(s.code)}
                      {latinOf(s.code) && <span className="cs-latin">{latinOf(s.code)}</span>}
                    </td>
                    <td className="cs-en">{english(s)}</td>
                    {LAUNCH.map((l) => (
                      <td key={l} className="cs-tr" lang={l}>
                        {sentence(s, l)}
                        {isDraft(s, l) && <span className="cs-draft">Draft</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
      </section>

      <section id="cs-typing" className="cs-card">
        <h2>Ways to type a sig</h2>
        <p className="cs-lead">Dose and form go before the code. Anything Kroll doesn’t recognise is treated as free text.</p>
        <table className="cs-table cs-keys">
          <tbody>
            <tr><td><code className="cs-code">BID</code></td><td>The code alone: 1 capsule</td></tr>
            <tr><td><code className="cs-code">2 BID</code></td><td>With a dose</td></tr>
            <tr><td><code className="cs-code">1T PO BID</code></td><td><code className="cs-code">T</code> for tablet, <code className="cs-code">C</code> for capsule, <code className="cs-code">PO</code> by mouth</td></tr>
            <tr><td><code className="cs-code">2 CAP PO BID</code></td><td>Written out</td></tr>
            {Object.entries(KROLL_ALIASES).map(([alias, { code, dose }]) => (
              <tr key={alias}><td><code className="cs-code">{alias}</code></td><td>{dose ? `${dose} × ${code}` : `Same as ${code}`}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )

  const guide = (
    <>
      <section id="cs-outcomes" className="cs-card">
        <h2>What can happen</h2>
        <p className="cs-lead">The Translated Sig pop-up has seven states. Click an example to reach it.</p>
        <table className="cs-table">
          <thead>
            <tr><th>State</th><th>What it means</th><th>Try it</th></tr>
          </thead>
          <tbody>
            {OUTCOMES.map((o) => {
              const example = exampleFor(o.kind)
              return (
                <tr key={o.kind}>
                  <td className="cs-nowrap"><span className={`cs-dot is-${o.tone}`} />{o.label} <span className="cs-frame">{o.frame}</span></td>
                  <td>{o.meaning}</td>
                  <td>
                    {o.via ? (
                      <span className="cs-muted">{o.via}</span>
                    ) : (
                      example && (
                        <button type="button" className="cs-chip" onClick={load(example.language, example.sig)} disabled={!onLoad}>
                          {example.language !== DEMO_LANGUAGE && `${languageByCode(example.language).name} · `}
                          {example.sig}
                        </button>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section id="cs-edge" className="cs-card">
        <h2>Edge cases</h2>
        <p className="cs-lead">Each has a walkthrough in the sidebar. To show one while playing freely:</p>
        <table className="cs-table">
          <thead>
            <tr><th>Edge case</th><th>How to get there</th></tr>
          </thead>
          <tbody>
            {EDGE_CASES.map((e) => (
              <tr key={e.title} className={e.load && onLoad ? 'is-clickable' : undefined} onClick={e.load ? load(e.load.language, e.load.sig) : undefined}>
                <td className="cs-strong">{e.title}</td>
                <td>{e.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="cs-reporting" className="cs-card">
        <h2>Reporting and the log</h2>
        <table className="cs-table cs-keys">
          <tbody>
            <tr><td>Rx → Rx History…</td><td>Every print of an Rx by number: view the entry, verify it against its receipt, export it, report an issue</td></tr>
            <tr><td>Utilities → Report a translation issue…</td><td>Starts from the Rx number a patient reads out</td></tr>
            <tr><td>Utilities → Translation reports…</td><td>Every report and its status: received, paused, fixed</td></tr>
            <tr><td>Utilities → Translation requests…</td><td>Languages and sigs pharmacies asked for</td></tr>
            <tr><td>Preview labels</td><td>From the match pop-up: report a line before printing</td></tr>
            <tr><td>Rx 1000048</td><td>Ms. Leung’s earlier label, for the phone-call case</td></tr>
          </tbody>
        </table>
      </section>

      <section id="cs-keys" className="cs-card">
        <h2>Keys and languages</h2>
        <table className="cs-table cs-keys">
          <tbody>
            <tr><td>↵</td><td>Translate the sig</td></tr>
            <tr><td>F3 · F12</td><td>Patient · Fill Rx (F12 again prints)</td></tr>
            <tr><td>⌘/Ctrl L</td><td>Preview labels inside Kroll</td></tr>
            <tr><td>Esc</td><td>Close the pop-up</td></tr>
            <tr><td>F1</td><td>This sheet</td></tr>
            <tr><td>⇧⌘M</td><td>Magnifier</td></tr>
            <tr><td>⌘+ ⌘− ⌘0</td><td>Kroll size</td></tr>
            <tr><td>Translates</td><td>{TRANSLATED.map((l) => l.name).join(', ')}</td></tr>
            <tr><td>Recorded only</td><td>{RECORDED_ONLY.map((l) => l.name).join(', ')} (English label)</td></tr>
          </tbody>
        </table>
      </section>
    </>
  )

  return (
    <div className={'cs' + (standalone ? ' is-standalone' : '')} data-testid="cheatsheet">
      <header className="cs-head">
        <span className="cs-title"><img src={leaf} width={14} height={14} alt="" />Cheat sheet</span>
        {!standalone && (
          <nav className="cs-tabs" role="tablist" aria-label="Cheat sheet">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={'cs-tab' + (tab === t.id ? ' is-on' : '')} onClick={() => setTab(t.id)} data-testid={`cs-tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <span className="cs-spacer" />
        {!standalone && (
          <div className="cs-actions">
            <input
              className="cs-search"
              type="search"
              placeholder="Find a sig code or phrase"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (e.target.value && tab !== 'reference') setTab('reference')
              }}
              spellCheck={false}
              data-testid="cs-search"
            />
            {onSavePdf && (
              <button
                type="button"
                className="cs-btn"
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  Promise.resolve(onSavePdf()).finally(() => setSaving(false))
                }}
                data-testid="btn-cheatsheet-pdf"
              >
                {saving ? 'Saving…' : 'Save as PDF'}
              </button>
            )}
            {onClose && (
              <button type="button" className="cs-btn is-primary" onClick={onClose} data-testid="btn-cheatsheet-close">
                Close
              </button>
            )}
          </div>
        )}
      </header>
      <div className="cs-note">Ms. Leung reads Chinese (Simplified). All translated wording is illustrative, not verified.</div>

      <div className={'cs-body is-' + tab}>
        {!standalone && (
          <nav className="cs-nav" aria-label="Sections">
            <span className="cs-nav-title">{current.label}</span>
            {current.sections.map((s, i) => (
              <a
                key={s.id}
                href={`#cs-${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(`cs-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {tab === 'learn' && <span className="cs-nav-n">{i + 1}</span>}
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <main className="cs-main">
          {show('learn') && <Learn onLoad={onLoad} standalone={standalone} />}
          {show('reference') && reference}
          {show('guide') && guide}
        </main>
      </div>
    </div>
  )
}
