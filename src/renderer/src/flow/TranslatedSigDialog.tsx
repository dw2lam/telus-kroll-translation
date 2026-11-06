import radioOn from '@/assets/radio-selected.svg'
import { provider } from '@/data/demoProvider'
import { languageByCode } from '@/data/languages'
import { fillDose, forForm } from '@/data/phrasebook'
import type { Candidate, LanguageCode } from '@/data/types'
import { DButton, Dialog as KDialog, DialogRow } from '@/kroll/primitives'
import type { Action, Dialog } from './state'

interface Props {
  dialog: Dialog
  /** Where printing goes: the 3D print view, or the label preview inside Kroll. */
  printView: '3d' | 'inline'
  language: LanguageCode
  sigEntered: string
  dispatch: (action: Action) => void
}

function Translation({ text, language, size }: { text: string; language: LanguageCode; size: number }) {
  const lang = languageByCode(language)
  return (
    <span className="k-translation" lang={language} dir={lang.rtl ? 'rtl' : 'ltr'} style={{ fontSize: size, textAlign: lang.rtl ? 'right' : 'left' }}>
      {text}
    </span>
  )
}

function SigEntered({ sig }: { sig: string }) {
  return (
    <DialogRow label="Sig entered">
      <div className="k-dfield">
        <span className="k-strong">{sig}</span>
      </div>
    </DialogRow>
  )
}

/** The Translated Sig pop-up in each of its states (Figma B4, B4t, B7, B8, B9, B10). */
export function TranslatedSigDialog({ dialog, printView, language, sigEntered, dispatch }: Props) {
  const lang = languageByCode(language)
  const close = (): void => dispatch({ type: 'closeDialog' })
  const back = <DButton onClick={close} testId="btn-back">✗ Back to Rx</DButton>
  const render = (c: Candidate): string => provider.render(c.sig, lang, c.dose, c.form) ?? ''
  const title = `Translated Sig — ${lang.name}`

  switch (dialog.kind) {
    case 'exact': {
      const c = dialog.candidate
      return (
        <KDialog title={title} onClose={close} width={560} testId="dialog-exact"
          footer={<><DButton primary onClick={() => dispatch({ type: 'confirm', candidate: c })} testId="btn-print-translation">✓ Print with translation</DButton>{back}</>}>
          <SigEntered sig={sigEntered} />
          <DialogRow label="Matched sig code">
            <div className="k-dfield" style={{ fontSize: 10 }}>
              <span>{fillDose(forForm(c.sig.english, c.form ?? 'capsule'), c.dose)}</span>
              <span className="k-match is-ok">Exact match</span>
            </div>
          </DialogRow>
          <DialogRow label={lang.name}>
            <div className="k-dfield">
              <Translation text={render(c)} language={language} size={lang.code === 'hi' ? 10 : 12} />
            </div>
          </DialogRow>
        </KDialog>
      )
    }
    case 'closest': {
      const c = dialog.candidate
      return (
        <KDialog title={title} onClose={close} width={600} testId="dialog-closest"
          footer={<>
            <DButton primary onClick={() => dispatch({ type: 'confirm', candidate: c })} testId="btn-use-sig">✓ Use this sig</DButton>
            <DButton onClick={() => dispatch({ type: 'notThisOne' })} testId="btn-not-this-one">Not this one</DButton>
            {back}
          </>}>
          <SigEntered sig={sigEntered} />
          <DialogRow label="Read as">
            <div className="k-dfield"><span>{dialog.readAs}</span></div>
          </DialogRow>
          <DialogRow label="Closest sig code">
            <div className="k-dfield">
              <span>{c.sig.code} · {fillDose(forForm(c.sig.english, c.form ?? 'capsule'), c.dose)}</span>
              <span className="k-match is-muted">Closest match · {Math.round(c.confidence * 100)}%</span>
            </div>
          </DialogRow>
          <DialogRow label={lang.name}>
            <div className="k-dfield"><Translation text={render(c)} language={language} size={15} /></div>
          </DialogRow>
        </KDialog>
      )
    }
    case 'candidates':
      return (
        <KDialog title={title} onClose={close} width={660} testId="dialog-candidates"
          footer={<>
            <DButton primary onClick={() => dispatch({ type: 'confirm', candidate: dialog.candidates[dialog.selected] })} testId="btn-use-selected">✓ Use selected</DButton>
            <DButton onClick={() => dispatch({ type: 'noneOfThese' })} testId="btn-none-of-these">None of these</DButton>
            {back}
          </>}>
          <SigEntered sig={sigEntered} />
          <span className="k-hint">Select the sig you meant:</span>
          <div className="k-choices" role="radiogroup">
            {dialog.candidates.map((c, i) => (
              <button type="button" key={c.sig.code} className="k-choice" role="radio" aria-checked={i === dialog.selected}
                onClick={() => dispatch({ type: 'selectCandidate', index: i })}>
                {i === dialog.selected ? <img src={radioOn} width={10} height={10} alt="" /> : <span className="k-radio" />}
                <span className="k-code">{c.sig.code}</span>
                <span className="k-en">{fillDose(forForm(c.sig.english, c.form ?? 'capsule'), c.dose)}</span>
                <span className="k-tr" lang={language} dir={lang.rtl ? 'rtl' : 'ltr'}>{render(c)}</span>
              </button>
            ))}
          </div>
        </KDialog>
      )
    case 'guide': {
      const guide = provider.phrasingGuide(lang)
      return (
        <KDialog title={title} onClose={close} width={640} testId="dialog-guide"
          footer={<>
            <DButton primary onClick={close} testId="btn-reword">✓ Back to Rx to reword</DButton>
            <DButton onClick={() => dispatch({ type: 'noneOfTheseFit' })} testId="btn-none-fit">None of these fit</DButton>
          </>}>
          <SigEntered sig={sigEntered} />
          <span className="k-dnote">
            No verified {lang.name} sig code matches this sig. Sig codes with a verified {lang.name} translation for capsules — reword the sig to one of these:
          </span>
          <div className="k-choices">
            {guide.map((s) => (
              <div className="k-choice is-compact" key={s.code}>
                <span className="k-code">{s.code}</span>
                <span className="k-en">{s.english}</span>
                <span className="k-tr" lang={language} dir={lang.rtl ? 'rtl' : 'ltr'}>{s.translations[language]}</span>
              </div>
            ))}
          </div>
        </KDialog>
      )
    }
    case 'cannotTranslate':
      return (
        <KDialog title="Unable to translate" onClose={close} width={480} testId="dialog-cannot"
          footer={<><DButton primary onClick={() => dispatch({ type: 'print', englishOnly: true, view: printView })} testId="btn-print-english">✓ Print English label only</DButton>{back}</>}>
          <SigEntered sig={sigEntered} />
          <span className="k-dnote is-warning">
            This sig can’t be translated. {dialog.reason} The vial label will print in English only.
          </span>
        </KDialog>
      )
    case 'notYetTranslatable':
      return (
        <KDialog title={title} onClose={close} width={480} testId="dialog-not-yet"
          footer={<><DButton primary onClick={() => dispatch({ type: 'print', englishOnly: true, view: printView })} testId="btn-print-english">✓ Print English label</DButton>{back}</>}>
          <DialogRow label="Patient language">
            <div className="k-dfield"><span className="k-strong">{lang.name} — captured, not yet translatable</span></div>
          </DialogRow>
          <span className="k-dnote is-warning">
            No verified {lang.name} sig codes are configured in Kroll yet. The vial label will print in English.
          </span>
        </KDialog>
      )
  }
}
