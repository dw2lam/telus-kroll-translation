import { useEffect, useState } from 'react'
import { provider } from '@/data/demoProvider'
import { hasTranslation, LANGUAGES, languageByCode } from '@/data/languages'
import { fillDose, KROLL_ALIASES, KROLL_EXPANSIONS, PHRASEBOOK } from '@/data/phrasebook'
import type { LanguageCode, TranslationResult } from '@/data/types'
import './cheatsheet.css'

type Outcome = TranslationResult['kind']

const OUTCOME: Record<Outcome, { label: string; frame: string; tone: string }> = {
  exact: { label: 'Exact match', frame: 'B4', tone: 'ok' },
  closest: { label: 'Closest match', frame: 'B7', tone: 'near' },
  candidates: { label: 'Top 5', frame: 'B8', tone: 'near' },
  noVerified: { label: 'Phrasing guide', frame: 'B9', tone: 'guide' },
  cannotTranslate: { label: 'Can’t translate', frame: 'B10', tone: 'stop' },
  notYetTranslatable: { label: 'Not yet translatable', frame: 'B4t', tone: 'stop' },
}

const TRANSLATED = LANGUAGES.filter(hasTranslation)
const UNTRANSLATED = LANGUAGES.filter((l) => l.code !== 'en' && !hasTranslation(l))

const FREE_TEXT = [
  '1 CAP QHS PRN DIZZINESS',
  'take 2 capsules by mouth twice daily',
  '1 cap at bedtime as needed for sleep',
  '1 cap four times daily',
  'take 1 capsule daily with food',
  'take 1 capsule every morning',
  '1 cap bid tid',
  'zzz qqq',
]

function Badge({ outcome }: { outcome: Outcome }) {
  const o = OUTCOME[outcome]
  return (
    <span className={`cs-badge is-${o.tone}`}>
      {o.label} <em>{o.frame}</em>
    </span>
  )
}

/** What the result would print or offer, in one line. */
function detail(result: TranslationResult, language: LanguageCode): string | null {
  const lang = languageByCode(language)
  switch (result.kind) {
    case 'exact':
      return provider.render(result.candidate.sig, lang, result.candidate.dose)
    case 'closest':
      return `${result.candidate.sig.code} · ${Math.round(result.candidate.confidence * 100)}%`
    case 'candidates':
      return result.candidates.map((c) => c.sig.code).join(' · ')
    default:
      return null
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
 * Every sig code × patient language, and the free-text examples, with the state
 * each one reaches — computed live from the translation provider, so it can't
 * drift from what the app does. Click any cell to load it.
 */
export function CheatSheet({ onLoad, onClose, onSavePdf, standalone }: Props) {
  const [saving, setSaving] = useState(false)
  const load = (language: LanguageCode, sig: string) => (onLoad ? () => onLoad(language, sig) : undefined)

  useEffect(() => {
    if (!standalone) return
    void document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        ;(window as { __pageReady?: boolean }).__pageReady = true
      }),
    )
  }, [standalone])

  return (
    <div className={'cs' + (standalone ? ' is-standalone' : '')} data-testid="cheatsheet">
      <header className="cs-head">
        <div>
          <h1>Telus Kroll Translation Demo — cheat sheet</h1>
          <p>
            Every sig code and patient language, and the Translated Sig state each one reaches. Generated live from the demo provider.
            {onLoad && ' Click any cell to load it into F12 Fill Rx.'} All non-English wording is illustrative, not verified.
          </p>
        </div>
        {!standalone && (
          <div className="cs-actions">
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

      <section>
        <h2>Sig codes × patient language</h2>
        <p className="cs-note">
          Type the code in the Sig field with or without a dose: <code>BID</code>, <code>2 BID</code>, <code>2 CAP PO BID</code>. Also read:{' '}
          {Object.entries(KROLL_ALIASES).map(([a, { code, dose }], i) => (
            <span key={a}>{i > 0 && ', '}<code>{a}</code> = {dose ? `${dose} × ` : ''}{code}</span>
          ))}. <b>Draft</b> marks a sentence nobody on the team has written or checked yet.
        </p>
        <table className="cs-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>English label (Kroll)</th>
              {TRANSLATED.map((l) => (
                <th key={l.code}>{l.name}</th>
              ))}
              <th>{UNTRANSLATED.map((l) => l.name).join(' · ')}</th>
            </tr>
          </thead>
          <tbody>
            {PHRASEBOOK.map((sig) => (
              <tr key={sig.code}>
                <td className="cs-code">{sig.code}</td>
                <td className="cs-en">{fillDose(KROLL_EXPANSIONS[sig.code] ?? sig.english.toUpperCase(), '1')}</td>
                {TRANSLATED.map((l) => {
                  const result = provider.translate(sig.code, l)
                  const text = detail(result, l.code)
                  return (
                    <td key={l.code} className={'cs-cell' + (onLoad ? ' is-clickable' : '')} onClick={load(l.code, sig.code)} title={onLoad ? `Load ${sig.code} for a ${l.name} patient` : undefined}>
                      <Badge outcome={result.kind} />
                      {sig.drafts?.[l.code] && result.kind === 'exact' && <span className="cs-draft">Draft</span>}
                      {text && (
                        <span className="cs-tr" lang={l.code} dir={l.rtl ? 'rtl' : 'ltr'}>
                          {text}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className={'cs-cell' + (onLoad ? ' is-clickable' : '')} onClick={load('tl', sig.code)}>
                  <Badge outcome="notYetTranslatable" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="cs-columns">
        <section>
          <h2>Free-text sigs · Hindi patient</h2>
          <table className="cs-table">
            <thead>
              <tr>
                <th>Typed in the Sig field</th>
                <th>First state</th>
                <th>Offers</th>
              </tr>
            </thead>
            <tbody>
              {FREE_TEXT.map((sig) => {
                const result = provider.translate(sig, languageByCode('hi'))
                return (
                  <tr key={sig} className={onLoad ? 'is-clickable' : undefined} onClick={load('hi', sig)}>
                    <td className="cs-code">{sig}</td>
                    <td><Badge outcome={result.kind} /></td>
                    <td className="cs-tr" lang="hi">{detail(result, 'hi') ?? (result.kind === 'cannotTranslate' ? 'English label only' : '—')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Pharmacist moves</h2>
          <ol className="cs-steps">
            <li><b>Closest (B7)</b> → <i>✓ Use this sig</i> prints · <i>Not this one</i> → <b>Top 5 (B8)</b></li>
            <li><b>Top 5 (B8)</b> → <i>✓ Use selected</i> prints · <i>None of these</i> → <b>Phrasing guide (B9)</b></li>
            <li><b>Phrasing guide (B9)</b> → <i>✓ Back to Rx to reword</i> · <i>None of these fit</i> → <b>Can’t translate (B10)</b></li>
            <li><b>Can’t translate / Not yet translatable</b> → <i>✓ Print English label</i> (panel 1 only)</li>
            <li>Every confirmed translation lands in the Rx (B5), then prints a two-panel peel label.</li>
          </ol>

          <h2>Patient languages (F3 → Language)</h2>
          <ul className="cs-langs">
            {LANGUAGES.filter((l) => l.code !== 'en').map((l) => (
              <li key={l.code} className={onLoad ? 'is-clickable' : undefined} onClick={load(l.code, 'QD')}>
                <span>{l.name}</span>
                <Badge outcome={hasTranslation(l) ? 'exact' : 'notYetTranslatable'} />
                {l.rtl && hasTranslation(l) && <span className="cs-rtl">right-to-left</span>}
              </li>
            ))}
            <li><span>English</span><span className="cs-muted">no pop-up — prints the English label</span></li>
          </ul>

          <h2>Keys</h2>
          <dl className="cs-keys">
            <dt>↵</dt><dd>Translate the sig</dd>
            <dt>F3 / F12</dt><dd>Patient / Fill Rx (F12 again prints)</dd>
            <dt>Ctrl/⌘ L</dt><dd>Preview labels inside Kroll (also Labels menu, Labels F2)</dd>
            <dt>Esc</dt><dd>Close the pop-up</dd>
          </dl>
        </section>
      </div>
    </div>
  )
}
