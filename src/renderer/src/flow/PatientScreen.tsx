import { useEffect, useRef, useState } from 'react'
import type { Details } from '@/data/demo'
import { hasTranslation, LANGUAGES, languageByCode } from '@/data/languages'
import type { LanguageCode } from '@/data/types'
import { Btn, Field, FKeyBar, Label, MenuBar, StatusBar } from '@/kroll/primitives'
import patientPhoto from '@/assets/patient-photo.svg'
import leungPhoto from '@/assets/patient-leung.jpg'

/** F3 Patient (Figma B1 / B2): where the patient's language is captured. */
export function PatientScreen({ language, details, onEdit, onLanguage, onOk, onNewRx, onRequests, photo }: {
  language: LanguageCode
  details: Details
  onEdit: (changes: Partial<Details>) => void
  onLanguage: (l: LanguageCode) => void
  onOk: () => void
  onNewRx: () => void
  onRequests: () => void
  /** Whether the patient has a photo on file. */
  photo: boolean
}) {
  const edit = (key: keyof Details) => ({ value: details[key], onEdit: (value: string) => onEdit({ [key]: value }), testId: `edit-${key}` })
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent): void => {
      if (!listRef.current?.parentElement?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  return (
    <>
      <MenuBar variant="patient" onRequests={onRequests} />
      <FKeyBar
        keys={[
          { key: 'F3', label: 'Patient', current: true },
          { key: 'F5', label: 'Drug' },
          { key: 'F7', label: 'Doctor' },
          { key: 'F9', label: 'Workflow' },
          { key: 'F10', label: 'Pickup' },
          { key: 'F11', label: 'Drop-off' },
          { key: 'F12', label: 'New Rx', onClick: onNewRx },
        ]}
      />
      <div className="k-tabs">
        <span className="k-tab is-current">Patient</span>
        <span className="k-tab">Profile</span>
      </div>
      <div className="k-patient">
        <div className="k-row" style={{ gap: 6 }}>
          <Label width={52}>Last Name</Label>
          <Field {...edit('lastName')} width={150} h17 focus />
          <Label width={52}>First Name</Label>
          <Field {...edit('firstName')} width={120} h17 />
          <Label width={48}>Salutation</Label>
          <Field {...edit('salutation')} width={66} h17 caret />
          <span style={{ flex: 1 }} />
          <Btn width={60} ok bold onClick={onOk} testId="btn-patient-ok">
            OK
          </Btn>
          <Btn width={62}>✓ Select</Btn>
          <Btn width={62}>✗ Scan</Btn>
        </div>
        <div className="k-patient-body">
          <div className="k-col" style={{ width: 250, gap: 4 }}>
            <div className="k-row"><Label width={48}>Address 1</Label><Field {...edit('address')} width={190} h17 /></div>
            <div className="k-row"><Label width={48}>Address 2</Label><Field width={190} h17 /></div>
            <div className="k-row"><Label width={48}>City</Label><Field {...edit('city')} width={110} h17 caret /></div>
            <div className="k-row"><Label width={48}>Postal</Label><Field {...edit('postal')} width={110} h17 /></div>
            <div className="k-row"><Label width={48}>Email</Label><Field {...edit('email')} width={145} h17 /></div>
            <div className="k-row"><Label width={48}>Quick Code</Label><Field width={110} h17 /></div>
          </div>
          <div className="k-col" style={{ width: 300, gap: 6 }}>
            <div className="k-phones">
              <div className="k-phones-head">
                <span>Phone Numbers (1)</span>
                <span className="k-row" style={{ width: 'auto', gap: 2 }}>
                  <span className="k-mini">F2</span>
                  <span className="k-mini">Ins</span>
                  <span className="k-mini">Del</span>
                </span>
              </div>
              <div className="k-phones-row is-head"><span>Description</span><span>Phone</span></div>
              <div className="k-phones-row"><span>Home</span><span>{details.phone}</span></div>
            </div>
            <div className="k-row">
              <Label width={62}>Family Doctor</Label>
              <Field width={150} h17 />
              <span className="k-mini is-16">F2</span>
              <span className="k-mini is-16" style={{ width: 34 }}>Clear</span>
            </div>
          </div>
          <div className="k-col is-open" style={{ width: 190, gap: 4 }}>
            <div className="k-row"><Label width={48}>Birthdate</Label><Field {...edit('birthdate')} width={110} h17 /></div>
            <div className="k-row"><Label width={48}>Age</Label><Field {...edit('age')} width={110} h17 /></div>
            <div className="k-row"><Label width={48}>Gender</Label><Field {...edit('gender')} width={110} h17 caret /></div>
            <div className="k-row is-open">
              <Label width={48}>Language</Label>
              <div className="k-select" style={{ position: 'relative' }}>
                <button type="button" className="k-field h17" style={{ width: 110 }} onClick={() => setOpen((o) => !o)} data-testid="language-field">
                  <span>{languageByCode(language).name}</span>
                  <span className="k-caret">▾</span>
                </button>
                {open && (
                  <div className="k-list" ref={listRef} style={{ width: 237, top: 18, left: 0 }} role="listbox" data-testid="language-list">
                    {LANGUAGES.map((l) => (
                      <button
                        type="button"
                        key={l.code}
                        className={l.code === language ? 'is-selected' : undefined}
                        onClick={() => {
                          onLanguage(l.code)
                          setOpen(false)
                        }}
                      >
                        <span>{l.name}</span>
                        {hasTranslation(l) && <span className="k-avail">(Translation Available)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="k-row"><Label width={48}>Height</Label><Field {...edit('height')} width={110} h17 /></div>
            <div className="k-row"><Label width={48}>Weight</Label><Field {...edit('weight')} width={110} h17 /></div>
            <div className="k-row"><Label width={48}>PHN</Label><Field width={110} h17 caret /></div>
          </div>
          <div className="k-col" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <div className="k-photo"><img src={photo ? leungPhoto : patientPhoto} width={140} height={92} alt={photo ? `Photo of ${details.firstName} ${details.lastName}` : 'No photo on file'} /></div>
            <div className="k-row" style={{ width: 'auto' }}>
              <Btn width={52}>Load</Btn>
              <Btn width={52}>Delete</Btn>
            </div>
          </div>
        </div>
      </div>
      <div className="k-comments">
        <div className="k-comments-head">
          <span>Comments (0)</span>
          <span className="k-row" style={{ width: 'auto', gap: 2 }}>
            <span className="k-mini">F2</span>
            <span className="k-mini">Ins</span>
            <span className="k-mini">Del</span>
          </span>
        </div>
        <div className="k-comments-cols">
          <span style={{ width: 140 }}>Topic</span>
          <span>Comment</span>
        </div>
      </div>
      <StatusBar />
    </>
  )
}
