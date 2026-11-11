import { Fragment, useEffect, useMemo, useState } from 'react'
import { provider } from '@/data/demoProvider'
import { hasTranslation, LANGUAGES, languageByCode } from '@/data/languages'
import { fillDose, KROLL_ALIASES, KROLL_EXPANSIONS, PHRASEBOOK } from '@/data/phrasebook'
import type { LanguageCode, TranslationResult, VerifiedSig } from '@/data/types'
import './cheatsheet.css'

/** The demo patient's language. Every scenario runs in it, so the sheet shows just this one. */
const DEMO_LANGUAGE: LanguageCode = 'zh-Hans'

/** Codes grouped by what they mean, so the list scans by intent rather than alphabet. */
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
  { kind: 'exact', label: 'Exact match', frame: 'B4', tone: 'ok', meaning: 'A verified sentence for the sig. Confirm and print both labels.' },
  { kind: 'closest', label: 'Closest match', frame: 'B7', tone: 'near', meaning: 'Free text close to a verified sentence. Use it only if it says the same thing.' },
  { kind: 'candidates', label: 'Top 5', frame: 'B8', tone: 'near', meaning: 'Other verified sentences ranked by fit.', via: 'Closest → Not this one' },
  { kind: 'noVerified', label: 'Phrasing guide', frame: 'B9', tone: 'guide', meaning: 'Codes that do translate, to reword the sig.', via: 'Top 5 → None of these' },
  { kind: 'cannotTranslate', label: 'Can’t translate', frame: 'B10', tone: 'stop', meaning: 'Nothing verified fits. English label, plus a translation request.' },
  { kind: 'notYetTranslatable', label: 'Not yet translatable', frame: 'B4t', tone: 'stop', meaning: 'The patient’s language has no verified sentences yet.' },
  { kind: 'paused', label: 'Paused', frame: 'E', tone: 'stop', meaning: 'A severity 1 report paused the sentence. English until TELUS ships the fix.', via: 'Simulate → Another pharmacy reports a phrase, then 1C PO BID' },
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

const sentence = (sig: VerifiedSig): string => provider.render(sig, demoLanguage, '1') ?? '—'
const english = (sig: VerifiedSig): string => fillDose(KROLL_EXPANSIONS[sig.code] ?? sig.english.toUpperCase(), '1')

interface Props {
  /** Loads the sig for that language into F12 Fill Rx and runs it. Omitted when printing the sheet. */
  onLoad?: (language: LanguageCode, sig: string) => void
  onClose?: () => void
  onSavePdf?: () => unknown
  standalone?: boolean
}

/**
 * The presenter's reference: every sig code with the English Kroll prints and the Chinese the
 * under-panel prints, grouped by meaning, plus what each pop-up means and a live example of it.
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
      !q || s.code.toLowerCase().includes(q) || english(s).toLowerCase().includes(q) || sentence(s).includes(query.trim())
    return all
      .map((g) => ({ title: g.title, sigs: g.codes.map((c) => byCode.get(c)).filter((s): s is VerifiedSig => !!s && matches(s)) }))
      .filter((g) => g.sigs.length > 0)
  }, [query])

  const examples = useMemo(() => OUTCOMES.map((o) => ({ ...o, example: exampleFor(o.kind) })), [])

  return (
    <div className={'cs' + (standalone ? ' is-standalone' : '')} data-testid="cheatsheet">
      <header className="cs-head">
        <div>
          <h1>Cheat sheet</h1>
          <p>
            Ms. Leung · {demoLanguage.name}. {onLoad ? 'Click anything to run it in Kroll.' : ''} All non-English wording is illustrative, not verified.
          </p>
        </div>
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
              <button type="button" className="is-primary" onClick={onClose} data-testid="btn-cheatsheet-close">
                Close
              </button>
            )}
          </div>
        )}
      </header>

      <div className="cs-layout">
        <main className="cs-main">
          <div className="cs-colhead" aria-hidden>
            <span>Code</span>
            <span>English label (Kroll)</span>
            <span>{demoLanguage.name} under-panel</span>
          </div>
          {groups.map((g) => (
            <section key={g.title} className="cs-group">
              <h2>{g.title}</h2>
              <ul>
                {g.sigs.map((s) => (
                  <li key={s.code}>
                    <button type="button" className={'cs-sig' + (onLoad ? ' is-clickable' : '')} onClick={load(DEMO_LANGUAGE, s.code)} disabled={!onLoad} data-testid={`cs-sig-${s.code}`}>
                      <span className="cs-code">{s.code}</span>
                      <span className="cs-en">{english(s)}</span>
                      <span className="cs-tr" lang={DEMO_LANGUAGE}>{sentence(s)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <div className="cs-empty">
              <p>No sig code matches “{query.trim()}”.</p>
              {onLoad && (
                <button type="button" className="cs-try" onClick={load(DEMO_LANGUAGE, query.trim())} data-testid="cs-try-free-text">
                  Try it as a free-text sig in Kroll
                </button>
              )}
            </div>
          )}
        </main>

        <aside className="cs-side">
          <section>
            <h2>What can happen</h2>
            <ol className="cs-outcomes">
              {examples.map((o) => (
                <li key={o.kind}>
                  <div className="cs-outcome-head">
                    <span className={`cs-dot is-${o.tone}`} />
                    <b>{o.label}</b>
                    <em>{o.frame}</em>
                  </div>
                  <p>{o.meaning}</p>
                  {o.via ? (
                    <p className="cs-via">Reached by {o.via}</p>
                  ) : (
                    o.example && (
                      <button type="button" className={'cs-example' + (onLoad ? ' is-clickable' : '')} onClick={load(o.example.language, o.example.sig)} disabled={!onLoad}>
                        {o.example.language !== DEMO_LANGUAGE && <span>{languageByCode(o.example.language).name} · </span>}
                        <code>{o.example.sig}</code>
                      </button>
                    )
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2>Reporting and the log</h2>
            <dl className="cs-keys">
              <dt>Rx → Rx History</dt><dd>Every print by Rx number; view entry, verify, export, report</dd>
              <dt>Utilities</dt><dd>Report a translation issue (by Rx number) · Translation reports · Translation requests</dd>
              <dt>Preview labels</dt><dd>From the match pop-up: report before printing</dd>
              <dt>Rx 1000048</dt><dd>Ms. Leung’s earlier label, for the phone-call case</dd>
            </dl>
          </section>

          <section>
            <h2>Typing a sig</h2>
            <dl className="cs-keys">
              <dt><code>BID</code></dt><dd>The code alone: 1 capsule</dd>
              <dt><code>2 BID</code></dt><dd>With a dose</dd>
              <dt><code>1T PO BID</code></dt><dd><code>T</code> for tablet, <code>C</code> for capsule</dd>
              {Object.entries(KROLL_ALIASES).map(([alias, { code, dose }]) => (
                <Fragment key={alias}>
                  <dt><code>{alias}</code></dt>
                  <dd>{dose ? `${dose} × ${code}` : `Same as ${code}`}</dd>
                </Fragment>
              ))}
            </dl>
          </section>

          <section>
            <h2>Languages</h2>
            <p className="cs-langs">
              <b>Translates:</b> {TRANSLATED.map((l) => l.name).join(', ')}.
              <br />
              <b>Recorded only</b> (English label): {RECORDED_ONLY.map((l) => l.name).join(', ')}.
            </p>
          </section>

          <section>
            <h2>Keys</h2>
            <dl className="cs-keys">
              <dt>↵</dt><dd>Translate the sig</dd>
              <dt>F3 · F12</dt><dd>Patient · Fill Rx (F12 again prints)</dd>
              <dt>⌘/Ctrl L</dt><dd>Preview labels inside Kroll</dd>
              <dt>Esc</dt><dd>Close the pop-up</dd>
              <dt>F1</dt><dd>This sheet</dd>
              <dt>⇧⌘M</dt><dd>Magnifier</dd>
              <dt>⌘+ ⌘− ⌘0</dt><dd>Scale Kroll</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
