import { useEffect, useMemo, useState } from 'react'
import leaf from '@/assets/leaf.svg'
import { provider } from '@/data/demoProvider'
import { hasTranslation, LANGUAGES, languageByCode } from '@/data/languages'
import { fillDose, KROLL_ALIASES, KROLL_EXPANSIONS, PHRASEBOOK } from '@/data/phrasebook'
import type { LanguageCode, TranslationResult, VerifiedSig } from '@/data/types'
import './cheatsheet.css'

/** The demo patient's language; the free-text examples run in it. */
const DEMO_LANGUAGE: LanguageCode = 'zh-Hans'
/** Launch languages, in the order the table shows them. */
const LAUNCH: LanguageCode[] = ['zh-Hans', 'hi']

/** Codes grouped by what they mean, so the table scans by intent rather than alphabet. */
const GROUPS: { title: string; codes: string[] }[] = [
  { title: 'How often', codes: ['QD', 'BID', 'TID', 'QID'] },
  { title: 'Time of day', codes: ['QAM', 'QPM', 'QHS'] },
  { title: 'Every few hours', codes: ['Q4H', 'Q6H', 'Q8H', 'Q12H', 'Q4-6H PRN'] },
  { title: 'As needed', codes: ['PRN', 'QD PRN', 'QHS PRN', 'QHS PRN SLP'] },
  { title: 'With meals', codes: ['AC', 'PC', 'CF', 'QD CF', 'BID CF'] },
]

type Outcome = TranslationResult['kind'] | 'paused'

/** Each Translated Sig pop-up, in the order a pharmacist can meet them. */
const OUTCOMES: { kind: Outcome; label: string; frame: string; tone: string; meaning: string; via?: string }[] = [
  { kind: 'exact', label: 'Exact match', frame: 'B4', tone: 'ok', meaning: 'A verified sentence for the sig. Confirm the English and print both labels.' },
  { kind: 'closest', label: 'Closest match', frame: 'B7', tone: 'near', meaning: 'Free text close to a verified sentence. Use it only if it says the same thing.' },
  { kind: 'candidates', label: 'Top 5', frame: 'B8', tone: 'near', meaning: 'Other verified sentences, ranked by fit.', via: 'Closest → Not this one' },
  { kind: 'noVerified', label: 'Phrasing guide', frame: 'B9', tone: 'guide', meaning: 'Codes that do translate, to reword the sig.', via: 'Top 5 → None of these' },
  { kind: 'cannotTranslate', label: 'Can’t translate', frame: 'B10', tone: 'stop', meaning: 'Nothing verified fits. English label, and a translation request is logged.' },
  { kind: 'notYetTranslatable', label: 'Not yet translatable', frame: 'B4t', tone: 'stop', meaning: 'The patient’s language has no verified sentences yet.' },
  { kind: 'paused', label: 'Paused', frame: 'E6', tone: 'stop', meaning: 'A severity 1 report paused the sentence. English until TELUS ships the fix.', via: 'Simulate → Another pharmacy reports a problem, then 1C PO BID' },
]

/** How to reach each edge case while playing freely, without its walkthrough. */
const EDGE_CASES: { title: string; how: string; load?: { language: LanguageCode; sig: string } }[] = [
  { title: 'Language not supported yet', how: 'F3 → Language: Persian, Tagalog or any without “Translation Available” → F12 → ↵', load: { language: 'fa', sig: 'QD' } },
  { title: 'No verified sentence fits', how: 'Type free text, e.g. 1 CAP QD FOR ANEMIA → ↵ → Not this one → None of these → None of these fit', load: { language: DEMO_LANGUAGE, sig: '1 CAP QD FOR ANEMIA' } },
  { title: 'Technician flags a line before printing', how: 'A code → ↵ → Preview labels → Report a translation issue → pick a warning' },
  { title: 'Dosing directions flagged', how: 'As above, pick the directions line → Changes the meaning → no translated label prints' },
  { title: 'Family calls days later', how: 'Utilities → Report a translation issue… → Rx 1000048 → pick the print' },
  { title: 'Another pharmacy pauses a sentence', how: 'Sidebar → Simulate: Another pharmacy reports a problem → then 1C PO BID → ↵' },
  { title: 'TELUS ships the fix', how: 'Sidebar → Simulate: TELUS ships the fix' },
  { title: 'Wrong English phrase picked', how: 'Rx → Rx History → pick a print → Report a translation issue → Wrong English phrase picked' },
  { title: 'Offline, then a dispute', how: 'Sidebar → Pharmacy online off → print → Rx → Rx History → View entry → Verify against receipt' },
]

/** Free text worth trying live. The sheet picks whichever reaches each outcome. */
const FREE_TEXT = ['1 CAP QD FOR ANEMIA', '1 cap bid tid', '1 CAP QHS PRN DIZZINESS', 'take 2 caps every other day', 'zzz qqq']

const demoLanguage = languageByCode(DEMO_LANGUAGE)
const TRANSLATED = LANGUAGES.filter(hasTranslation)
const RECORDED_ONLY = LANGUAGES.filter((l) => l.code !== 'en' && !hasTranslation(l))

/** A live example for each outcome, worked out from the provider so the sheet can't drift from the app. */
function exampleFor(kind: Outcome): { language: LanguageCode; sig: string } | null {
  if (kind === 'exact') return { language: DEMO_LANGUAGE, sig: 'QD' }
  if (kind === 'notYetTranslatable') return { language: 'fa', sig: 'QD' }
  if (kind === 'paused') return null
  const sig = FREE_TEXT.find((s) => provider.translate(s, demoLanguage).kind === kind)
  return sig ? { language: DEMO_LANGUAGE, sig } : null
}

const sentence = (sig: VerifiedSig, language: LanguageCode): string => provider.render(sig, languageByCode(language), '1') ?? '—'
const english = (sig: VerifiedSig): string => fillDose(KROLL_EXPANSIONS[sig.code] ?? sig.english.toUpperCase(), '1')
const isDraft = (sig: VerifiedSig, language: LanguageCode): boolean => !sig.translations[language] && !!sig.drafts?.[language]

const SECTIONS = [
  { id: 'codes', label: 'Sig codes' },
  { id: 'outcomes', label: 'What can happen' },
  { id: 'edge', label: 'Edge cases' },
  { id: 'reporting', label: 'Reporting and the log' },
  { id: 'typing', label: 'Typing a sig' },
  { id: 'keys', label: 'Keys and languages' },
]

interface Props {
  /** Loads the sig for that language into F12 Fill Rx and runs it. Omitted when printing the sheet. */
  onLoad?: (language: LanguageCode, sig: string) => void
  onClose?: () => void
  onSavePdf?: () => unknown
  standalone?: boolean
}

/**
 * The presenter's reference, in Kroll's style: every sig code with the English Kroll prints and the
 * launch-language sentences, what each pop-up means, how to reach every edge case, and the keys.
 * Computed from the translation provider, so it can't drift from what the app does.
 */
export function CheatSheet({ onLoad, onClose, onSavePdf, standalone }: Props) {
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
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
    const byCode = new Map(PHRASEBOOK.map((s) => [s.code, s]))
    const grouped = new Set(GROUPS.flatMap((g) => g.codes))
    const all = [...GROUPS, { title: 'Other', codes: PHRASEBOOK.map((s) => s.code).filter((c) => !grouped.has(c)) }]
    const q = query.trim().toLowerCase()
    const matches = (s: VerifiedSig): boolean =>
      !q || s.code.toLowerCase().includes(q) || english(s).toLowerCase().includes(q) || LAUNCH.some((l) => sentence(s, l).includes(query.trim()))
    return all
      .map((g) => ({ title: g.title, sigs: g.codes.map((c) => byCode.get(c)).filter((s): s is VerifiedSig => !!s && matches(s)) }))
      .filter((g) => g.sigs.length > 0)
  }, [query])

  const examples = useMemo(() => OUTCOMES.map((o) => ({ ...o, example: exampleFor(o.kind) })), [])

  return (
    <div className={'cs' + (standalone ? ' is-standalone' : '')} data-testid="cheatsheet">
      <header className="cs-head">
        <span className="cs-title"><img src={leaf} width={14} height={14} alt="" />Cheat sheet</span>
        <span className="cs-sub">Ms. Leung reads Chinese (Simplified). Translated wording is illustrative, not verified.{onLoad ? ' Click a row to run it in Kroll.' : ''}</span>
        {!standalone && (
          <div className="cs-actions">
            <input
              className="cs-search"
              type="search"
              placeholder="Find a sig code or phrase"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

      <div className="cs-body">
        {!standalone && (
          <nav className="cs-nav" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#cs-${s.id}`}>{s.label}</a>
            ))}
          </nav>
        )}

        <main className="cs-main">
          <section id="cs-codes" className="cs-card">
            <h2>Sig codes</h2>
            <p className="cs-lead">Every Kroll code, grouped by meaning. Type it in F12 Fill Rx and press ↵; Chinese and Hindi are the launch languages.</p>
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
                    <th>English label (Kroll)</th>
                    {LAUNCH.map((l) => <th key={l}>{languageByCode(l).name}</th>)}
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.title}>
                    <tr className="cs-group"><th colSpan={2 + LAUNCH.length}>{g.title}</th></tr>
                    {g.sigs.map((s) => (
                      <tr key={s.code} className={'cs-sig' + (onLoad ? ' is-clickable' : '')} onClick={load(DEMO_LANGUAGE, s.code)} data-testid={`cs-sig-${s.code}`}>
                        <td><code className="cs-code">{s.code}</code></td>
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

          <section id="cs-outcomes" className="cs-card">
            <h2>What can happen</h2>
            <p className="cs-lead">The Translated Sig pop-up has seven states. Click an example to reach it.</p>
            <table className="cs-table">
              <thead>
                <tr><th>State</th><th>What it means</th><th>Try it</th></tr>
              </thead>
              <tbody>
                {examples.map((o) => (
                  <tr key={o.kind}>
                    <td className="cs-nowrap"><span className={`cs-dot is-${o.tone}`} />{o.label} <span className="cs-frame">{o.frame}</span></td>
                    <td>{o.meaning}</td>
                    <td>
                      {o.via ? (
                        <span className="cs-muted">{o.via}</span>
                      ) : (
                        o.example && (
                          <button type="button" className="cs-chip" onClick={load(o.example.language, o.example.sig)} disabled={!onLoad}>
                            {o.example.language !== DEMO_LANGUAGE && `${languageByCode(o.example.language).name} · `}
                            {o.example.sig}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
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

          <section id="cs-typing" className="cs-card">
            <h2>Typing a sig</h2>
            <table className="cs-table cs-keys">
              <tbody>
                <tr><td><code className="cs-code">BID</code></td><td>The code alone: 1 capsule</td></tr>
                <tr><td><code className="cs-code">2 BID</code></td><td>With a dose</td></tr>
                <tr><td><code className="cs-code">1T PO BID</code></td><td><code className="cs-code">T</code> for tablet, <code className="cs-code">C</code> for capsule</td></tr>
                {Object.entries(KROLL_ALIASES).map(([alias, { code, dose }]) => (
                  <tr key={alias}><td><code className="cs-code">{alias}</code></td><td>{dose ? `${dose} × ${code}` : `Same as ${code}`}</td></tr>
                ))}
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
        </main>
      </div>
    </div>
  )
}
