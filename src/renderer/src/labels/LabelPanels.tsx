import peelOff from '@/assets/peel-off.svg'
import { type Details, patientName, RX, RX_WARNINGS } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import { forForm } from '@/data/phrasebook'
import type { Language, LanguageCode } from '@/data/types'
import type { PrintJob } from '@/flow/state'
import './labels.css'

export const PANEL_WIDTH = 576
/** Width of panel 2's text column. */
const SIG_WIDTH = 541

/**
 * The largest size that keeps a translated sig on one line, so panel 2 stays shorter than
 * panel 1, which covers it on the vial. Chinese characters are about 1em wide; Devanagari
 * averages under half that per character.
 */
function sigSize(text: string, language: LanguageCode): number {
  const base = language === 'hi' ? 28 : 30
  const perCharacter = language === 'zh-Hans' ? 1 : 0.45
  return Math.min(base, Math.floor(SIG_WIDTH / (text.length * perCharacter)))
}

/** Panel 1 — Kroll's English vial label, plus the pointer strip when a translation is under it (Figma label 10). */
export function Panel1({ job }: { job: PrintJob }) {
  const t = job.translation
  const d = job.details
  const strings = t ? languageByCode(t.language).label : undefined
  const rtl = t ? languageByCode(t.language).rtl : false
  return (
    <div className="lbl lbl-p1" data-panel="1">
      <div className="lbl-p1-body">
        <div className="lbl-rx">
          <p className="lbl-pharmacy">{`${RX.pharmacy}   ${RX.pharmacyPhone}`}</p>
          <p className="lbl-address">{RX.pharmacyAddress}</p>
          <div className="lbl-line">
            <span className="lbl-hl lbl-17b">Rx:{RX.number}</span>
            <span className="lbl-16b">{patientName(d)}</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-12">{d.doctor}</span>
            <span className="lbl-10">{RX.date}</span>
          </div>
          <div className="lbl-line is-start">
            <span className="lbl-16">{d.quantity} {job.form === 'tablet' ? 'TAB' : RX.form}</span>
            <span className="lbl-16b">{`${d.brand}  ${d.strength}`}</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-12 lbl-italic">{d.generic} {d.strength}</span>
            <span className="lbl-7">Expiry:{RX.expiry}</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-10">{`DIN:  ${RX.din}  ${RX.manufacturer}`}</span>
            <span className="lbl-hl lbl-10b">Refills: {d.refills}</span>
          </div>
          <p className="lbl-17b lbl-sig" data-testid="label-english-sig">{job.englishSig}</p>
        </div>
        <div className="lbl-warnings">
          {RX.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      </div>
      {t && strings && (
        <div className="lbl-pointer" dir={rtl ? 'rtl' : 'ltr'}>
          <div className="lbl-pointer-text">
            <p className="lbl-pointer-main" lang={t.language}>{strings.pointer}</p>
            <p className="lbl-pointer-gloss" dir="ltr">Look at the back for instructions — printed in the patient’s language, not English</p>
          </div>
          <div className="lbl-peel">
            <img src={peelOff} width={64} height={35.833} alt="" style={rtl ? { transform: 'scaleX(-1)' } : undefined} />
            <span lang={t.language}>{strings.peel}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Quantity, refills, dates and prescriber in the patient's language. The values stay as dispensed. */
function Dispensing({ language, details, form }: { language: Language; details: Details; form: PrintJob['form'] }) {
  const d = language.label!.dispensing
  const fields: [string, string][] = [
    [forForm(d.quantity, form), details.quantity],
    [d.refills, details.refills],
    [d.date, RX.date],
    [d.expiry, RX.expiry],
    [d.prescriber, details.doctor],
  ]
  return (
    <p className="lbl-dispensing" lang={language.code} dir={language.rtl ? 'rtl' : 'ltr'} data-testid="label-dispensing">
      {fields.map(([template, value], i) => {
        const [before, after] = template.split('{}')
        return (
          <span key={template}>
            {i > 0 && '  ·  '}
            {before}
            <bdi dir="ltr">{value}</bdi>
            {after}
          </span>
        )
      })}
    </p>
  )
}

/** Panel 2 — the under-panel in the patient's language, revealed when panel 1 is peeled (Figma C2). */
export function Panel2({ job }: { job: PrintJob }) {
  const t = job.translation
  if (!t) return null
  const language = languageByCode(t.language)
  const strings = language.label!
  const warnings = RX_WARNINGS[t.language]
  const dir = language.rtl ? 'rtl' : 'ltr'
  const d = job.details
  return (
    <div className="lbl lbl-p2" data-panel="2">
      <div className="lbl-p2-head" dir={dir}>
        <span lang={t.language} className="lbl-p2-title">{strings.header}</span>
        <span className="lbl-9b" dir="ltr">{strings.tag}</span>
      </div>
      <div className="lbl-p2-body">
        <div className="lbl-line" dir={dir}>
          <div className="lbl-stack" dir="ltr">
            <span className="lbl-16b">{patientName(d)}</span>
            <span className="lbl-11b">{`${d.brand}  ${d.strength}  ·  ${d.generic}`}</span>
          </div>
          <div className="lbl-stack is-end" dir="ltr">
            <span className="lbl-11b">Rx:{RX.number}</span>
            <span className="lbl-9">DIN: {RX.din}</span>
          </div>
        </div>
        <div className="lbl-rule" />
        <div className="lbl-translated" dir={dir}>
          <p className="lbl-translated-main" lang={t.language} style={{ fontSize: sigSize(t.text, t.language) }} data-testid="label-translated-sig">
            {t.text}
          </p>
          <p className="lbl-gloss" dir="ltr">{t.gloss}</p>
          <Dispensing language={language} details={d} form={job.form} />
        </div>
        <div className="lbl-footer" dir={dir}>
          {strings.footer.map((line) => (
            <p key={line} lang={t.language}>{line}</p>
          ))}
        </div>
        {warnings && (
          <>
            <div className="lbl-rule" />
            <div className="lbl-p2-warnings" lang={t.language} dir={dir} data-testid="label-translated-warnings">
              <ol>
                {warnings.slice(0, 2).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ol>
              <ol start={3}>
                {warnings.slice(2).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ol>
            </div>
          </>
        )}
        <p className="lbl-demo" dir="ltr">DEMO — illustrative wording, not a verified translation</p>
      </div>
    </div>
  )
}
