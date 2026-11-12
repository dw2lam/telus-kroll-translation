import { useMemo, useRef, useState } from 'react'
import { provider } from '@/data/demoProvider'
import { languageByCode } from '@/data/languages'
import { PHRASEBOOK } from '@/data/phrasebook'
import type { LanguageCode } from '@/data/types'
import { decodeSig, DO_NOT_USE, latinOf, lookupPart, meaningOf, PARTS, type Part, ROLE_LABEL, ROOTS, type Token } from './sigAnatomy'
import { DEMO_LANGUAGE, isDraft, LAUNCH, outcome, sentence, sigByCode } from './shared'

/** The lesson, top to bottom. Also the contents column while the Learn tab is open. */
export const LESSON = [
  { id: 'what', label: 'What a sig is' },
  { id: 'read', label: 'Read it left to right' },
  { id: 'pieces', label: 'The pieces' },
  { id: 'stack', label: 'Codes stack' },
  { id: 'translate', label: 'Why codes translate' },
  { id: 'watch', label: 'Watch out' },
  { id: 'practice', label: 'Practice' },
]

/** The building blocks, grouped the way a pharmacist learns them. */
const PIECES: { title: string; note: string; codes: string[] }[] = [
  { title: 'Times a day', note: 'BID, TID, QID: the Latin number + in die, “in a day”. Once a day is spelled out.', codes: ['DAILY', 'BID', 'TID', 'QID'] },
  { title: 'Every few hours', note: 'Q + hours + H. Around the clock, not just while awake.', codes: ['Q4H', 'Q6H', 'Q8H', 'Q12H', 'Q4-6H'] },
  { title: 'Time of day', note: 'Q + when.', codes: ['QAM', 'QPM', 'QHS'] },
  { title: 'Only if, or with', note: 'Added after the timing.', codes: ['PRN', 'AC', 'PC', 'CF', 'SLP'] },
  { title: 'Route and the rest', note: 'PO is understood for capsules and tablets.', codes: ['PO', 'UD'] },
]

const STACKS: { parts: string[]; code: string }[] = [
  { parts: ['QHS', 'PRN', 'SLP'], code: 'QHS PRN SLP' },
  { parts: ['DAILY', 'CF'], code: 'DAILY CF' },
  { parts: ['Q4-6H', 'PRN'], code: 'Q4-6H PRN' },
]

/** Pieces that aren't codes on their own open a real code that uses them. */
const TRY_FOR: Record<string, string> = { PO: '1C PO DAILY', SLP: 'QHS PRN SLP', 'Q4-6H': 'Q4-6H PRN' }

const TRY: string[] = ['2T PO BID', 'QHS PRN SLP', '*1C', '1 CAP DAILY FOR ANEMIA']

interface Props {
  onLoad?: (language: LanguageCode, sig: string) => void
  standalone?: boolean
}

/**
 * Learn tab: a short lesson on reading sig codes, a live decoder beside it that breaks any sig into
 * its pieces and shows what both label panels would say, and a practice quiz at the end.
 */
export function Learn({ onLoad, standalone }: Props) {
  const [sig, setSig] = useState('2T PO BID')
  const decoderRef = useRef<HTMLInputElement>(null)
  const decode = (s: string) => () => {
    setSig(s)
    decoderRef.current?.closest('.cs-decoder')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <div className={'cs-learn' + (standalone ? ' is-static' : '')}>
      <div className="cs-lesson">
        <Step n={1} id="what" title="A sig is the directions, in shorthand">
          <p>
            <em>Sig</em> is short for the Latin <em>signa</em>, “label it”. Prescribers write directions in shorthand. The pharmacy types the matching
            sig code into Kroll, and Kroll prints the directions in full words. The patient never sees the code.
          </p>
          <div className="cs-flow">
            <div className="cs-flow-box">
              <span className="cs-flow-k">Prescription</span>
              <span className="cs-flow-rx">1 cap po bid</span>
            </div>
            <span className="cs-flow-arrow" aria-hidden>→</span>
            <div className="cs-flow-box">
              <span className="cs-flow-k">Kroll Sig field</span>
              <code className="cs-code is-big">BID</code>
            </div>
            <span className="cs-flow-arrow" aria-hidden>→</span>
            <div className="cs-flow-box is-label">
              <span className="cs-flow-k">Label, panel 1</span>
              <span className="cs-flow-label">TAKE 1 CAPSULE TWICE A DAY</span>
              <span className="cs-flow-k">Panel 2 · {languageByCode(DEMO_LANGUAGE).name}</span>
              <span className="cs-tr" lang={DEMO_LANGUAGE}>{sentence(sigByCode('BID')!, DEMO_LANGUAGE)}</span>
            </div>
          </div>
        </Step>

        <Step n={2} id="read" title="Read it left to right">
          <p>A full sig answers four questions in order. Only the last one is required: <code className="cs-code">BID</code> alone means 1 capsule.</p>
          <Tokens tokens={decodeSig('2T PO BID').tokens} big />
          <div className="cs-printed">
            <span className="cs-flow-k">Kroll prints</span>
            <span className="cs-flow-label">
              TAKE <mark className="is-dose">2</mark> <mark className="is-form">TABLETS</mark> <mark className="is-when">TWICE A DAY</mark>
            </span>
          </div>
          <p className="cs-aside">PO, by mouth, is understood, so the demo’s labels don’t print it. Try your own in the decoder{standalone ? '' : ' on the right'}.</p>
        </Step>

        <Step n={3} id="pieces" title="Learn the pieces">
          <p>Most codes are Latin, built from a few roots:</p>
          <div className="cs-roots">
            {ROOTS.map((r) => (
              <div key={r.code} className="cs-root">
                <code>{r.code}</code>
                <span className="cs-latin">{r.latin}</span>
                <span>{r.means}</span>
              </div>
            ))}
          </div>
          <p className="cs-formula">
            <code className="cs-code">Q</code> + <code className="cs-code">6</code> + <code className="cs-code">H</code> = <code className="cs-code">Q6H</code>
            <span>every 6 hours</span>
          </p>
          {PIECES.map((g) => (
            <div key={g.title} className="cs-piece-group">
              <div className="cs-piece-head">
                <span className="cs-piece-title">{g.title}</span>
                <span className="cs-aside">{g.note}</span>
              </div>
              <div className="cs-pieces">
                {g.codes.map((c) => {
                  const p = lookupPart(c)!
                  return <PieceCard key={c} part={p} onClick={standalone ? undefined : decode(TRY_FOR[c] ?? c)} />
                })}
              </div>
            </div>
          ))}
        </Step>

        <Step n={4} id="stack" title="Codes stack">
          <p>Timing first, then conditions. Each piece keeps its meaning.</p>
          <div className="cs-stacks">
            {STACKS.map((s) => (
              <button key={s.code} type="button" className="cs-stack" onClick={standalone ? undefined : decode(s.code)}>
                {s.parts.map((p, i) => (
                  <span key={p} className="cs-stack-part">
                    {i > 0 && <span className="cs-plus">+</span>}
                    <code className="cs-code">{p}</code>
                  </span>
                ))}
                <span className="cs-plus">=</span>
                <span className="cs-stack-means">{meaningOf(s.code)}</span>
              </button>
            ))}
          </div>
          <p className="cs-aside">
            Kroll knows only the {PHRASEBOOK.length} combinations in its Sig Codes table (all on the Reference tab). Anything else is typed as free text.
          </p>
        </Step>

        <Step n={5} id="translate" title="Why codes translate exactly">
          <div className="cs-compare">
            <CompareCard sig="BID" title="A code" text="One code, one verified sentence per language. Kroll fills in the dose and form." onTry={standalone ? undefined : decode('BID')} />
            <CompareCard
              sig="1 CAP DAILY FOR ANEMIA"
              title="Free text"
              text="Kroll has to match it to a verified sentence, and the pharmacist confirms the match. If nothing fits, the label prints in English."
              onTry={standalone ? undefined : decode('1 CAP DAILY FOR ANEMIA')}
            />
          </div>
        </Step>

        <Step n={6} id="watch" title="Watch out">
          <ul className="cs-watch">
            <li>
              <b><code className="cs-code">Q4H</code> isn’t <code className="cs-code">QID</code>.</b> Every 4 hours runs around the clock, up to six times a day.
            </li>
            <li>
              <b><code className="cs-code">AC</code> and <code className="cs-code">PC</code> are about meals,</b> not morning and evening. That’s{' '}
              <code className="cs-code">QAM</code> and <code className="cs-code">QPM</code>.
            </li>
            <li>
              <b>There’s no <code className="cs-code">QD</code> or <code className="cs-code">OD</code>.</b> Both are on ISMP Canada’s Do Not Use list (2006,
              reaffirmed 2018): QD has been misread as QID, and OD as “right eye”. The list says to use “daily”, so the demo’s code is{' '}
              <code className="cs-code">DAILY</code>.
            </li>
          </ul>
        </Step>

        {!standalone && (
          <Step n={7} id="practice" title="Practice">
            <Quiz onShow={(c) => decode(c)()} />
          </Step>
        )}
      </div>

      {!standalone && <Decoder sig={sig} setSig={setSig} inputRef={decoderRef} onLoad={onLoad} />}
    </div>
  )
}

function Step({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`cs-${id}`} className="cs-card cs-step">
      <h2><span className="cs-step-n">{n}</span>{title}</h2>
      {children}
    </section>
  )
}

function PieceCard({ part, onClick }: { part: Part; onClick?: () => void }) {
  return (
    <button type="button" className={`cs-piece is-${part.role}`} onClick={onClick} disabled={!onClick} data-testid={`cs-piece-${part.code}`}>
      <code>{part.code}</code>
      <span className="cs-latin">{part.latin ?? 'pharmacy shorthand'}</span>
      <span className="cs-piece-means">{part.means}</span>
    </button>
  )
}

function Tokens({ tokens, big }: { tokens: Token[]; big?: boolean }) {
  return (
    <div className={'cs-tokens' + (big ? ' is-big' : '')}>
      {tokens.map((t, i) => (
        <div key={i} className={`cs-tok is-${t.role}`}>
          <span className="cs-tok-role">{ROLE_LABEL[t.role]}</span>
          <span className="cs-tok-text">{t.text}</span>
          <span className="cs-tok-means">{t.means}</span>
          {t.latin && <span className="cs-latin">{t.latin}</span>}
          {DO_NOT_USE[t.text] && <span className="cs-dnu">Do Not Use list</span>}
        </div>
      ))}
    </div>
  )
}

function CompareCard({ sig, title, text, onTry }: { sig: string; title: string; text: string; onTry?: () => void }) {
  const result = provider.translate(sig, languageByCode(DEMO_LANGUAGE))
  const o = outcome(result.kind)
  return (
    <div className="cs-compare-card">
      <span className="cs-piece-title">{title}</span>
      <button type="button" className="cs-chip" onClick={onTry} disabled={!onTry}>{sig}</button>
      <span className="cs-outcome"><span className={`cs-dot is-${o.tone}`} />{o.label}</span>
      <span className="cs-aside">{text}</span>
    </div>
  )
}

/**
 * Type any sig and see it broken into pieces, the English line Kroll prints, and panel 2 in a launch
 * language. Free text shows which Translated Sig pop-up it would open instead.
 */
function Decoder({
  sig,
  setSig,
  inputRef,
  onLoad,
}: {
  sig: string
  setSig: (s: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onLoad?: (language: LanguageCode, sig: string) => void
}) {
  const [language, setLanguage] = useState<LanguageCode>(DEMO_LANGUAGE)
  const decoded = useMemo(() => decodeSig(sig), [sig])
  const result = useMemo(() => (sig.trim() ? provider.translate(sig, languageByCode(language)) : null), [sig, language])
  const known = decoded.code ? sigByCode(decoded.code) : undefined
  const panel2 = result?.kind === 'exact' ? sentence(result.candidate.sig, language, result.candidate.dose, result.candidate.form) : null
  const o = result ? outcome(result.kind) : null

  return (
    <aside className="cs-decoder" data-testid="cs-decoder">
      <div className="cs-decoder-head">
        <span className="cs-piece-title">Sig decoder</span>
        <span className="cs-aside">Type any sig</span>
      </div>
      <input
        ref={inputRef}
        className="cs-decoder-input"
        value={sig}
        onChange={(e) => setSig(e.target.value)}
        spellCheck={false}
        placeholder="e.g. 2T PO BID"
        data-testid="cs-decoder-input"
      />
      <div className="cs-try">
        {TRY.map((t) => (
          <button key={t} type="button" className={'cs-chip' + (t === sig ? ' is-on' : '')} onClick={() => setSig(t)}>{t}</button>
        ))}
      </div>

      {decoded.tokens.length > 0 && <Tokens tokens={decoded.tokens} />}

      <div className="cs-decoder-out">
        <span className="cs-flow-k">Panel 1 · English</span>
        {decoded.english ? (
          <span className="cs-flow-label" data-testid="cs-decoder-english">{decoded.english}</span>
        ) : (
          <span className="cs-aside">{sig.trim() ? 'Not a Kroll code, so Kroll treats it as free text.' : 'Type a sig above.'}</span>
        )}
        {known && <span className="cs-aside">{meaningOf(known.code)}{latinOf(known.code) && <> · <span className="cs-latin">{latinOf(known.code)}</span></>}</span>}
      </div>

      <div className="cs-decoder-out">
        <div className="cs-decoder-lang">
          <span className="cs-flow-k">Panel 2</span>
          <div className="cs-seg" role="tablist">
            {LAUNCH.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={language === l} className={language === l ? 'is-on' : ''} onClick={() => setLanguage(l)}>
                {languageByCode(l).name}
              </button>
            ))}
          </div>
        </div>
        {o && (
          <span className="cs-outcome" data-testid="cs-decoder-outcome"><span className={`cs-dot is-${o.tone}`} />{o.label}</span>
        )}
        {panel2 && (
          <span className="cs-tr is-big" lang={language}>
            {panel2}
            {result?.kind === 'exact' && isDraft(result.candidate.sig, language) && <span className="cs-draft">Draft</span>}
          </span>
        )}
        {o && !panel2 && <span className="cs-aside">{o.meaning}</span>}
        {result?.kind === 'closest' && (
          <div className="cs-suggest" data-testid="cs-decoder-suggest">
            <span className="cs-flow-k">Kroll suggests</span>
            <span><code className="cs-code">{result.candidate.sig.code}</code> {meaningOf(result.candidate.sig.code)}</span>
            <span className="cs-tr" lang={language}>{sentence(result.candidate.sig, language, result.candidate.dose, result.candidate.form)}</span>
            <span className="cs-aside">The extra words don’t translate, so the pharmacist checks it still says the same thing.</span>
          </div>
        )}
        {result?.kind === 'candidates' && (
          <div className="cs-suggest">
            <span className="cs-flow-k">Nearest verified codes</span>
            <span>{result.candidates.map((c) => <code key={c.sig.code} className="cs-code cs-gap">{c.sig.code}</code>)}</span>
          </div>
        )}
      </div>

      <div className="cs-decoder-foot">
        <span className="cs-aside">Illustrative wording, not verified.</span>
        {onLoad && (
          <button type="button" className="cs-btn is-primary" disabled={!sig.trim()} onClick={() => onLoad(language, sig.trim())} data-testid="cs-decoder-run">
            Run in Kroll
          </button>
        )}
      </div>
    </aside>
  )
}

type Mode = 'meaning' | 'code'
interface Question {
  answer: string
  options: string[]
}

/** Codes that teach something on their own; stacks are covered by their parts. */
const QUIZ_CODES = ['BID', 'TID', 'QID', 'QAM', 'QPM', 'QHS', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'PRN', 'AC', 'PC', 'CF', 'UD', 'QHS PRN', 'BID CF']

const shuffle = <T,>(xs: T[]): T[] => [...xs].sort(() => Math.random() - 0.5)

/** Distractors that look alike are the ones worth learning to tell apart. */
function ask(previous?: string): Question {
  const answer = shuffle(QUIZ_CODES.filter((c) => c !== previous))[0]
  const alike = (c: string): number => (c[0] === answer[0] ? 1 : 0) + (c.length === answer.length ? 1 : 0) + Math.random() * 1.5
  const others = QUIZ_CODES.filter((c) => c !== answer).sort((a, b) => alike(b) - alike(a)).slice(0, 3)
  return { answer, options: shuffle([answer, ...others]) }
}

function Quiz({ onShow }: { onShow: (code: string) => void }) {
  const [mode, setMode] = useState<Mode>('meaning')
  const [q, setQ] = useState<Question>(() => ask())
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const next = (): void => {
    setQ(ask(q.answer))
    setPicked(null)
  }
  const pick = (option: string): void => {
    if (picked) return
    setPicked(option)
    setScore((s) => ({ right: s.right + (option === q.answer ? 1 : 0), asked: s.asked + 1 }))
  }
  const label = (code: string): string => (mode === 'meaning' ? meaningOf(code) : code)
  const answerPart = PARTS[q.answer] ?? lookupPart(q.answer)

  return (
    <div className="cs-quiz" data-testid="cs-quiz">
      <div className="cs-quiz-head">
        <div className="cs-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'meaning'} className={mode === 'meaning' ? 'is-on' : ''} onClick={() => { setMode('meaning'); next() }}>
            Code → meaning
          </button>
          <button type="button" role="tab" aria-selected={mode === 'code'} className={mode === 'code' ? 'is-on' : ''} onClick={() => { setMode('code'); next() }}>
            Meaning → code
          </button>
        </div>
        <span className="cs-aside" data-testid="cs-quiz-score">{score.asked ? `${score.right} of ${score.asked} right` : 'Pick an answer'}</span>
      </div>
      <p className="cs-quiz-q">
        {mode === 'meaning' ? <>What does <code className="cs-code is-big">{q.answer}</code> mean?</> : <>Which code means <b>{meaningOf(q.answer)}</b>?</>}
      </p>
      <div className="cs-quiz-options">
        {q.options.map((opt) => {
          const state = !picked ? '' : opt === q.answer ? ' is-right' : opt === picked ? ' is-wrong' : ' is-dim'
          return (
            <button key={opt} type="button" className={'cs-quiz-opt' + state + (mode === 'code' ? ' is-code' : '')} onClick={() => pick(opt)} data-testid="cs-quiz-option">
              {label(opt)}
            </button>
          )
        })}
      </div>
      {picked && (
        <div className={'cs-quiz-feedback' + (picked === q.answer ? ' is-right' : ' is-wrong')}>
          <span>
            <b>{picked === q.answer ? 'Right.' : 'Not quite.'}</b> <code className="cs-code">{q.answer}</code> means {meaningOf(q.answer)}
            {(answerPart?.latin || latinOf(q.answer)) && <>, from <span className="cs-latin">{latinOf(q.answer) || answerPart?.latin}</span></>}.
          </span>
          <span className="cs-quiz-actions">
            <button type="button" className="cs-btn" onClick={() => onShow(q.answer)}>Show in decoder</button>
            <button type="button" className="cs-btn is-primary" onClick={next} data-testid="cs-quiz-next">Next</button>
          </span>
        </div>
      )}
    </div>
  )
}
