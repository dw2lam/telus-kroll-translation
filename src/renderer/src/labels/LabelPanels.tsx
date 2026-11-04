import peelOff from '@/assets/peel-off.svg'
import { RX, RX_WARNINGS } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import type { PrintJob } from '@/flow/state'
import './labels.css'

export const PANEL_WIDTH = 576

/** Panel 1 — Kroll's English vial label, plus the pointer strip when a translation is under it (Figma label 10). */
export function Panel1({ job }: { job: PrintJob }) {
  const t = job.translation
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
            <span className="lbl-16b">Shah, Rohan</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-12">{RX.doctor}</span>
            <span className="lbl-10">{RX.date}</span>
          </div>
          <div className="lbl-line is-start">
            <span className="lbl-16">{RX.quantity} {RX.form}</span>
            <span className="lbl-16b">{`${RX.brand}  ${RX.strength}`}</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-12 lbl-italic">{RX.generic} {RX.strength}</span>
            <span className="lbl-7">Expiry:{RX.expiry}</span>
          </div>
          <div className="lbl-line">
            <span className="lbl-10">{`DIN:  ${RX.din}  ${RX.manufacturer}`}</span>
            <span className="lbl-hl lbl-10b">Refills: {RX.refills}</span>
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

/** Panel 2 — the under-panel in the patient's language, revealed when panel 1 is peeled (Figma label 10 / 12). */
export function Panel2({ job }: { job: PrintJob }) {
  const t = job.translation
  if (!t) return null
  const language = languageByCode(t.language)
  const strings = language.label!
  const warnings = RX_WARNINGS[t.language]
  return (
    <div className={'lbl lbl-p2' + (warnings ? ' has-warnings' : '')} data-panel="2">
      <div className="lbl-p2-head" dir={language.rtl ? 'rtl' : 'ltr'}>
        <span lang={t.language} className="lbl-p2-title">{strings.header}</span>
        <span className="lbl-9b" dir="ltr">{strings.tag}</span>
      </div>
      <div className="lbl-p2-body">
        <div className={warnings ? 'lbl-p2-cols' : undefined} dir={warnings && language.rtl ? 'rtl' : undefined}>
          <div className="lbl-p2-main" dir="ltr">
            <div className="lbl-line">
              <div className="lbl-stack">
                <span className="lbl-16b">Shah, Rohan</span>
                <span className="lbl-11b">{`${RX.brand}  ${RX.strength}  ·  ${RX.generic}`}</span>
              </div>
              <div className="lbl-stack is-end">
                <span className="lbl-11b">Rx:{RX.number}</span>
                <span className="lbl-9">DIN: {RX.din}</span>
              </div>
            </div>
            <div className="lbl-rule" />
            <div className="lbl-translated" dir={language.rtl ? 'rtl' : 'ltr'}>
              <p className="lbl-translated-main" lang={t.language} data-testid="label-translated-sig">{t.text}</p>
              <p className="lbl-gloss" dir="ltr">{t.gloss}</p>
            </div>
          </div>
          {warnings && (
            <ol className="lbl-p2-warnings" lang={t.language} dir={language.rtl ? 'rtl' : 'ltr'} data-testid="label-translated-warnings">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          )}
        </div>
        <div className="lbl-footer">
          {strings.footer.map((line) => (
            <p key={line} lang={t.language}>{line}</p>
          ))}
          <p className="lbl-demo" dir="ltr">DEMO — illustrative wording, not a verified translation</p>
        </div>
      </div>
    </div>
  )
}
