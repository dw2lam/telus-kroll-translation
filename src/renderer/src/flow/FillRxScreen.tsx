import { useEffect, useRef, useState } from 'react'
import { type Details, patientName, RX } from '@/data/demo'
import { languageByCode } from '@/data/languages'
import type { LanguageCode } from '@/data/types'
import { Btn, Field, FKeyBar, Label, MenuBar } from '@/kroll/primitives'
import { parseSigCode } from '@/data/phrasebook'
import { krollSigText } from './state'

interface Props {
  language: LanguageCode
  details: Details
  onEdit: (changes: Partial<Details>) => void
  sigInput: string
  translated: string | null
  dialogOpen: boolean
  onSig: (sig: string) => void
  onSubmit: () => void
  onPatient: () => void
  onFill: () => void
  onPreview: () => void
}

/** F12 Fill Rx (Figma B3 / B5 / B6), the screen the Translated Sig pop-up opens over. */
export function FillRxScreen({ language, details, onEdit, sigInput, translated, dialogOpen, onSig, onSubmit, onPatient, onFill, onPreview }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const lang = languageByCode(language)
  const sigText = krollSigText(sigInput)
  const form = parseSigCode(sigInput)?.form ?? 'capsule'
  const edit = (key: keyof Details) => ({ value: details[key], onEdit: (value: string) => onEdit({ [key]: value }), testId: `edit-${key}` })
  // Keeps what's being typed exactly as typed; `Last, First` is only split into the two fields.
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const editName = (value: string): void => {
    setNameDraft(value)
    const comma = value.indexOf(',')
    onEdit(comma < 0 ? { lastName: value, firstName: '' } : { lastName: value.slice(0, comma).trim(), firstName: value.slice(comma + 1).trim() })
  }

  useEffect(() => {
    if (!dialogOpen) input.current?.focus()
  }, [dialogOpen])

  return (
    <>
      <MenuBar variant="rx" onLabels={onPreview} />
      <FKeyBar
        keys={[
          { key: 'F3', label: 'Patient', onClick: onPatient },
          { key: 'F5', label: 'Drug' },
          { key: 'F7', label: 'Doctor' },
          { key: 'F9', label: 'Workflow' },
          { key: 'F10', label: 'Pickup' },
          { key: 'F11', label: 'Drop-off' },
          { key: 'F12', label: 'Fill Rx', current: true, onClick: onFill },
        ]}
      />
      <div className="k-bar" style={{ height: 26 }}>
        <Field value="0" width={34} />
        <Btn width={70}>New Rx</Btn>
        <Btn width={82}>Pending Adj</Btn>
        <Label width={40}>First Fill</Label>
        <Field value="06/10/14" width={60} />
        <Label width={92}>Last Fill Information</Label>
        <Field value="0" width={30} />
        <Label width={20}>Qty</Label>
        <Field value="$0.00" width={46} />
        <Label width={20}>Init</Label>
        <span style={{ flex: 1 }} />
        <Btn width={62} ok>
          ✓ Lookup
        </Btn>
        <Btn width={62} onClick={onPatient}>
          ✗ Cancel
        </Btn>
      </div>
      <div className="k-bar" style={{ height: 26, gap: 5 }}>
        <Label width={36}>Priority</Label>
        <Field value="Waiting" width={110} caret />
        <Btn width={22}>F2</Btn>
        <Label width={20}>Due</Label>
        <Field value="in 14 mins" width={74} />
        <Btn width={66}>Forward Rx</Btn>
        <Btn width={22}>F2</Btn>
        <Label width={54}>Work Order</Label>
        <Field value="60" width={38} />
        <Btn width={22}>F2</Btn>
        <Label width={38}>Delivery</Label>
        <Field value="Pickup" width={84} caret />
      </div>

      <div className="k-search">
        <div className="k-panel" style={{ background: 'var(--field-patient)', flex: '1 0 0' }}>
          <span>Patient Search</span>
          <div className="k-row"><Label width={40}>Name</Label><span className="k-grow" onBlur={() => setNameDraft(null)}><Field value={nameDraft ?? patientName(details)} onEdit={editName} testId="edit-name" grow /></span><Label width={20}>Age</Label><Field value={details.age.split(' ')[0]} onEdit={(age) => onEdit({ age: `${age} years` })} width={28} testId="edit-age" /></div>
          <div className="k-row"><Label width={40}>Address</Label><Field {...edit('address')} grow /><Field {...edit('gender')} width={44} /></div>
          <div className="k-row"><Label width={40}>City</Label><Field {...edit('city')} grow /><Label width={24}>Prov</Label><Field value="ON" width={30} /></div>
          <div className="k-row"><Label width={40}>Phone</Label><Field value="Home" width={52} /><Field {...edit('phone')} grow /></div>
          <div className="k-row"><Label width={40}>Plan</Label><Field width={60} /><Label width={42}>Client ID</Label><Field grow /></div>
          <div className="k-box">Allergies</div>
          <div className="k-box">Conditions</div>
        </div>
        <div className="k-panel" style={{ background: 'var(--field-drug)', flex: '1 0 0' }}>
          <span>Drug Search</span>
          <div className="k-row"><Field value="Pack 500" grow caret /></div>
          <div className="k-row"><Label width={38}>Brand</Label><Field {...edit('brand')} grow /><Field {...edit('strength')} width={48} /></div>
          <div className="k-row"><Label width={38}>Generic</Label><Field {...edit('generic')} grow /><Field value="EUC (Eur" width={48} /></div>
          <div className="k-row">
            <Label width={38}>Pack</Label><Field value="500" width={40} />
            <Label width={26}>Form</Label><Field value={form === 'tablet' ? 'TAB' : RX.form} width={34} />
            <Label width={30}>Sched</Label><Field value="3" width={24} />
          </div>
          <div className="k-row"><Label width={38}>Purch</Label><Field value="$66.83" width={54} /><Label width={38}>OnHand</Label><Field value="-190" width={40} /></div>
          <div className="k-row"><Label width={38}>DIN</Label><Field value={RX.din} width={64} /><Label width={38}>Min Qty</Label><Field value="0" width={28} /></div>
          <div className="k-drugimg">drug image</div>
        </div>
        <div className="k-panel" style={{ background: 'var(--field-doctor)', flex: '1 0 0', alignSelf: 'flex-start' }}>
          <span>Doc Search</span>
          <div className="k-row"><Label width={38}>Loc</Label><Field value="Office" grow caret /></div>
          <div className="k-row"><Label width={38}>Name</Label><Field {...edit('doctor')} grow /></div>
          <div className="k-row"><Label width={38}>Address</Label><Field value="220 Duncan Mill Road Suite 202" grow /></div>
          <div className="k-row"><Label width={38}>City</Label><Field value="Toronto" grow /><Label width={24}>Prov</Label><Field value="ON" width={30} /></div>
          <div className="k-row"><Label width={38}>Phone</Label><Field value="(416) 383-1010" grow /></div>
          <div className="k-row"><Label width={38}>Lic#</Label><Field value="123456" width={60} /><Label width={40}>Alt. Lic#</Label><Field grow /></div>
        </div>
      </div>

      <div className="k-dispensing">
        <div className="k-panel k-form k-form-sig">
          <div className="k-row">
            <Label width={24}>Sig</Label>
            <label className="k-field k-sig-input" style={{ width: Math.min(330, Math.max(70, sigInput.length * 5.6 + 14)) }}>
              <input
                ref={input}
                value={sigInput}
                spellCheck={false}
                aria-label="Sig"
                data-testid="sig-input"
                onChange={(e) => onSig(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSubmit()
                  }
                }}
              />
            </label>
            {!dialogOpen && !translated && sigInput.trim() && <span className="k-sig-hint">↵ Enter to translate</span>}
          </div>
          <div className="k-sigtext">
            <b>{sigText}</b>
          </div>
          <div className="k-row"><Label width={74}>Route of Admin</Label><Field value="Oral" grow caret /></div>
          <div className="k-row"><Label width={74}>Dosage Form</Label><Field value={form === 'tablet' ? 'Tablet' : 'Capsule'} grow caret /></div>
          {translated && (
            <>
              <span style={{ marginTop: 14 }}>Translated</span>
              <div className="k-sigtext" lang={language} dir={lang.rtl ? 'rtl' : 'ltr'} data-testid="translated-sig">
                <b>{translated}</b>
              </div>
            </>
          )}
        </div>
        <div className="k-panel k-form k-form-dispense">
          <div className="k-row"><Label width={44}>Init</Label><Field value="SB" width={40} /><Field value="SB" width={40} /></div>
          <div className="k-row"><Label width={44}>Disp Qty</Label><Field {...edit('quantity')} width={40} /><Btn width={56}>Refills(+)</Btn><Field {...edit('refills')} width={24} /></div>
          <div className="k-row"><Label width={44}>Days</Label><Field value="30" width={40} /></div>
          <div className="k-row"><Label width={44}>Prod Sel</Label><Field value="None" width={84} caret /></div>
          <div className="k-row"><Label width={44}>O/W</Label><Field value="Written" width={84} caret /></div>
          <div className="k-row">
            <Label width={44}>Labels</Label>
            <Field value="1" width={34} />
            <Btn width={22} onClick={onPreview} title="Preview labels" testId="btn-labels-f2">F2</Btn>
          </div>
        </div>
        <div className="k-panel k-form" style={{ flex: '1 0 0', gap: 2 }}>
          {[
            ['Auth Qty', '210', '7'],
            ['Rem Qty', '210', '7'],
            ['G. P. %', '73.09'],
            ['Acq Cost', '$4.01'],
            ['Cost', '$4.41'],
            ['Markup', '$0.00'],
            ['Fee', '$10.49'],
          ].map(([label, value, extra]) => (
            <div className="k-row" key={label}>
              <Label width={56}>{label}</Label>
              <Field value={value} width={52} right />
              {extra && <Field value={extra} width={22} />}
            </div>
          ))}
          <div className="k-row"><Label width={56}>Total</Label><Field value="$14.90" width={52} right total /></div>
        </div>
      </div>
    </>
  )
}
