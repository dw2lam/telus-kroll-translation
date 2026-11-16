import type { CSSProperties } from 'react'
import { patientName, RX } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import type { PrintJob } from '@/flow/state'
import { STICKERS, type Sticker } from './stickers'
import { sentenceCase, type Vial, vialById } from './vials'
import './labels.css'

/** The vial's type scale as CSS custom properties, so one stylesheet draws every C3 size. */
function frontVars(v: Vial): CSSProperties {
  const f = v.front
  return {
    width: v.width,
    minHeight: v.height,
    '--pad-y': `${f.padY}px`,
    '--pad-x': `${f.padX}px`,
    '--gap': `${f.gap}px`,
    '--critical-gap': `${f.criticalGap}px`,
    '--pointer': `${f.pointerFont}px`,
    '--name': `${f.name}px`,
    '--drug': `${f.drug}px`,
    '--generic': `${f.generic}px`,
    '--directions': `${f.directions}px`,
    '--hl-y': `${f.highlight.y}px`,
    '--hl-x': `${f.highlight.x}px`,
    '--details': `${f.details}px`,
    '--details-gap': `${f.detailsGap}px`,
    '--peel': `${v.peel.size}px`,
    '--peel-font': `${v.peel.font}px`,
  } as CSSProperties
}

function backVars(v: Vial): CSSProperties {
  const b = v.back
  return {
    width: v.width,
    minHeight: v.height,
    '--head-h': `${b.headerHeight}px`,
    '--head-x': `${b.headerPadX}px`,
    '--head-font': `${b.headerFont}px`,
    '--tag-font': `${b.tagFont}px`,
    '--pad-y': `${b.padY}px`,
    '--pad-x': `${b.padX}px`,
    '--gap': `${b.gap}px`,
    '--name': `${b.name}px`,
    '--drug': `${b.drug}px`,
    '--side': `${b.side}px`,
    '--directions': `${b.directions}px`,
    '--hl-y': `${v.front.highlight.y}px`,
    '--hl-x': `${v.front.highlight.x}px`,
  } as CSSProperties
}

/**
 * Panel 1, the front label (Figma C3): patient, drug and directions first and largest, then the
 * required details. No warnings: those are stickers. With a translation underneath, a peel tab,
 * and on labels with room for it, a "turn to the back" line in the patient's language.
 */
export function Panel1({ job }: { job: PrintJob }) {
  const v = vialById(job.vial)
  const t = job.translation
  const strings = t ? languageByCode(t.language).label : undefined
  const chromeInEnglish = job.englishLines.includes('chrome')
  const d = job.details
  return (
    <div className={'lbl lbl-front' + (t ? ' has-peel' : '')} data-panel="1" data-vial={v.id} style={frontVars(v)}>
      {t && strings && v.pointer && (
        <div className="lbl-pointer">
          {!chromeInEnglish && <p className="lbl-pointer-main" lang={t.language}>{strings.pointer}</p>}
          <p className="lbl-pointer-en">Turn to the back for translated medication instructions</p>
        </div>
      )}
      <div className="lbl-critical">
        <p className="lbl-name">{patientName(d)}</p>
        <div>
          <p className="lbl-drug">{`${d.brand}  ${d.strength}`}</p>
          <p className="lbl-generic">{d.generic} {d.strength}</p>
        </div>
        <p className="lbl-directions" data-testid="label-english-sig">
          <span>{sentenceCase(job.englishSig)}</span>
        </p>
      </div>
      <div className="lbl-divider" />
      <div className="lbl-details">
        <p className="lbl-row"><span>Rx: {job.rx}</span><span>Filled: {job.date}</span></p>
        <p className="lbl-row"><span>{d.doctor}</span><span>{`Qty: ${d.quantity} ${job.form === 'tablet' ? 'TAB' : RX.form} · Refills: ${d.refills}`}</span></p>
        <p className="lbl-row"><span>{`DIN: ${RX.din}  ${RX.manufacturer}`}</span><span>Expiry: {job.expiry}</span></p>
      </div>
      <p className="lbl-pharmacy">{`${RX.pharmacy}   ${RX.pharmacyPhone} · ${RX.pharmacyAddress}`}</p>
      {t && strings && (
        <div className="lbl-peel" aria-label="Peel tab">
          <img src={v.peel.src} alt="" />
          <span>
            {!chromeInEnglish && <span lang={t.language}>{strings.peel}</span>}
            <span>Peel</span>
          </span>
        </div>
      )}
    </div>
  )
}

/** Panel 2, the under-panel in the patient's language, revealed when panel 1 is peeled (Figma C3). */
export function Panel2({ job }: { job: PrintJob }) {
  const t = job.translation
  if (!t) return null
  const v = vialById(job.vial)
  const language = languageByCode(t.language)
  const strings = language.label!
  const chromeInEnglish = job.englishLines.includes('chrome')
  const dir = language.rtl ? 'rtl' : 'ltr'
  const d = job.details
  const expiryLabel = chromeInEnglish ? 'Expiry:' : v.back.expiryEnglish ? `${strings.expiry} Expiry:` : `${strings.expiry}:`
  return (
    <div className="lbl lbl-back" data-panel="2" data-vial={v.id} style={backVars(v)}>
      <div className="lbl-back-head" dir={dir}>
        <span className="lbl-back-title" lang={chromeInEnglish ? 'en' : t.language}>{chromeInEnglish ? 'Instructions' : strings.header}</span>
        <span className="lbl-back-tag" dir="ltr">{strings.tag}</span>
      </div>
      <div className="lbl-back-body">
        <div className="lbl-back-top" dir={dir}>
          <div className="lbl-back-who" dir="ltr">
            <p className="lbl-name">{patientName(d)}</p>
            <p className="lbl-drug">{`${d.brand}  ${d.strength}`}</p>
          </div>
          <div className="lbl-back-side" dir="ltr">
            <p className="is-bold">Rx: {job.rx}</p>
            <p>DIN: {RX.din}</p>
            <p lang={chromeInEnglish ? 'en' : t.language}>{expiryLabel} {job.expiry}</p>
          </div>
        </div>
        <div className="lbl-divider" />
        <p className="lbl-directions" lang={t.language} dir={dir} data-testid="label-translated-sig">
          <span>{t.text}</span>
        </p>
        <p className="lbl-gloss">{sentenceCase(t.gloss)}</p>
        <p className="lbl-trace" data-testid="label-trace">
          Trace {job.trace} · Library {job.libraryVersion} · <span className="lbl-demo">demo wording, not verified</span>
        </p>
      </div>
    </div>
  )
}

/** One auxiliary warning sticker (Figma C3 "Warning sticker / …"), 2″ × 0.5″. */
export function WarningSticker({ sticker }: { sticker: Sticker }) {
  return (
    <div className="lbl-sticker" style={{ background: sticker.colour }} data-testid={`sticker-${sticker.id}`}>
      <img src={sticker.icon} width={30} height={30} alt="" />
      <div>
        <p className="lbl-sticker-title">{sticker.title}</p>
        {sticker.detail && <p className="lbl-sticker-detail">{sticker.detail}</p>}
      </div>
    </div>
  )
}

/** The stickers for this drug's warnings, in priority order. They go on the vial, never on the label. */
export function Stickers() {
  const stickers = STICKERS.filter((s) => RX.warnings[s.warning] !== undefined)
  return (
    <div className="lbl-stickers" data-testid="label-stickers">
      {stickers.map((s) => (
        <WarningSticker key={s.id} sticker={s} />
      ))}
    </div>
  )
}
