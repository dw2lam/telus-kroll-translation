import { createContext, type CSSProperties, type ReactNode, useContext, useEffect, useState } from 'react'
import { PHARMACIST } from '@/data/demo'
import leaf from '@/assets/leaf.svg'

/**
 * The status bar's message, and a way to set it. Controls that aren't part of the demo say so
 * here instead of silently doing nothing.
 */
export const KrollStatus = createContext<{ message: string | null; notify: (message: string) => void }>({ message: null, notify: () => {} })

const notInDemo = (label: string): string => `${label.replace(/\s+/g, ' ').trim()} isn’t part of this demo.`

/** `JL` for `RPh J. Lee`: Kroll's Init fields and status bar. */
export const pharmacistInitials = PHARMACIST.replace(/^RPh\s+/, '').split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join('')

/** Kroll's bottom bar: messages, the signed-in pharmacist, and the clock. */
export function StatusBar() {
  const { message } = useContext(KrollStatus)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const pad = (n: number): string => String(n).padStart(2, '0')
  const clock = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  return (
    <div className="k-status">
      <span className={message ? 'k-status-msg' : undefined} data-testid="status-message">{message ?? 'Ready'}</span>
      <span>{`User: ${pharmacistInitials} (${PHARMACIST})`}</span>
      <span>{clock}</span>
    </div>
  )
}

/** A Kroll text box, read-only unless it has `onEdit`. */
export function Field({ value, width, grow, right, total, h17, focus, caret, style, onEdit, testId }: {
  value?: ReactNode
  onEdit?: (value: string) => void
  testId?: string
  width?: number
  grow?: boolean
  right?: boolean
  total?: boolean
  h17?: boolean
  focus?: boolean
  caret?: boolean
  style?: CSSProperties
}) {
  const cls = ['k-field', grow && 'is-grow', right && 'is-right', total && 'is-total', h17 && 'h17', focus && 'is-focus'].filter(Boolean).join(' ')
  if (onEdit) {
    return (
      <label className={cls + ' is-editable'} style={{ width, ...style }}>
        <input value={typeof value === 'string' ? value : ''} spellCheck={false} onChange={(e) => onEdit(e.target.value)} data-testid={testId} />
        {caret && <span className="k-caret">▾</span>}
      </label>
    )
  }
  return (
    <div className={cls} style={{ width, ...style }}>
      <span>{value ?? '​'}</span>
      {caret && <span className="k-caret">▾</span>}
    </div>
  )
}

export function Label({ children, width }: { children: ReactNode; width?: number }) {
  return (
    <span className="k-label" style={{ width }}>
      {children}
    </span>
  )
}

export function Btn({ children, width, ok, bold, onClick, title, testId }: { children: ReactNode; width?: number; ok?: boolean; bold?: boolean; onClick?: () => void; title?: string; testId?: string }) {
  const { notify } = useContext(KrollStatus)
  const fallback = (e: React.MouseEvent<HTMLButtonElement>): void => notify(notInDemo(e.currentTarget.textContent ?? 'This'))
  return (
    <button type="button" className={['k-btn', ok && 'is-ok', bold && 'is-bold', !onClick && 'is-inert'].filter(Boolean).join(' ')} style={{ width }} onClick={onClick ?? fallback} title={title} data-testid={testId}>
      {children}
    </button>
  )
}

const MENUS = ['File', 'Edit', 'Rx', 'View', 'Labels', 'Profile', 'Reports', 'Utilities', 'NH', 'Cards', 'Session', 'Help']
const PATIENT_MENUS = ['File', 'Edit', 'Patient', 'Profile', 'Network', 'Utilities', 'NH', 'Cards', 'Session', 'Help']

/** A dropdown item in Kroll's menu bar. */
export interface MenuEntry {
  label: string
  onClick: () => void
  testId: string
}

/** Menus with working items, by menu name (`Rx`, `Utilities`). App provides them so every screen shares one set. */
export const KrollMenus = createContext<Partial<Record<string, MenuEntry[]>>>({})

export function MenuBar({ variant, onLabels }: { variant: 'patient' | 'rx'; onLabels?: () => void; onRequests?: () => void }) {
  const items = variant === 'patient' ? PATIENT_MENUS : MENUS
  const menus = useContext(KrollMenus)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    const close = (): void => setOpen(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  return (
    <div className="k-menubar">
      {items.map((m) => {
        const entries = menus[m]
        if (entries?.length) {
          return (
            <span key={m} className="k-menu">
              <span className="is-link" role="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => (o === m ? null : m)) }} data-testid={`menu-${m.toLowerCase()}`}>
                {m}
              </span>
              {open === m && (
                <div className="k-list">
                  {entries.map((entry) => (
                    <button type="button" key={entry.testId} onClick={() => { setOpen(null); entry.onClick() }} data-testid={entry.testId}>
                      {entry.label}
                    </button>
                  ))}
                </div>
              )}
            </span>
          )
        }
        return variant === 'rx' && m === 'Labels' ? (
          <span key={m} className="is-link" role="button" title="Preview labels (Ctrl+L)" onClick={onLabels} data-testid="menu-labels">
            {m}
          </span>
        ) : (
          <MenuItem key={m} label={m} />
        )
      })}
    </div>
  )
}

function MenuItem({ label }: { label: string }) {
  const { notify } = useContext(KrollStatus)
  return <span onClick={() => notify(notInDemo(`The ${label} menu`))}>{label}</span>
}

export interface FKey {
  key: string
  label: string
  current?: boolean
  onClick?: () => void
}

export function FKeyBar({ keys }: { keys: FKey[] }) {
  const { notify } = useContext(KrollStatus)
  return (
    <div className="k-fkeys">
      {keys.map((k) => (
        <button type="button" key={k.key} className={'k-fkey' + (k.current ? ' is-current' : '') + (k.onClick || k.current ? '' : ' is-inert')}
          onClick={k.onClick ?? (k.current ? undefined : () => notify(notInDemo(`${k.key} - ${k.label}`)))}>
          {k.key} - {k.label}
        </button>
      ))}
    </div>
  )
}

export function Dialog({ title, onClose, width, children, footer, testId }: { title: string; onClose: () => void; width: number; children: ReactNode; footer: ReactNode; testId?: string }) {
  return (
    <div className="k-scrim">
      <div className="k-dialog" style={{ width }} role="dialog" aria-label={title} data-testid={testId}>
        <div className="k-dialog-title">
          <span className="k-title">
            <img src={leaf} width={10} height={10} alt="" />
            {title}
          </span>
          <button type="button" className="k-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="k-dialog-body">{children}</div>
        <div className="k-dialog-footer">{footer}</div>
      </div>
    </div>
  )
}

export function DialogRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="k-dialog-row">
      <span className="k-dlabel">{label}</span>
      {children}
    </div>
  )
}

export function DButton({ children, primary, onClick, testId, disabled }: { children: ReactNode; primary?: boolean; onClick: () => void; testId?: string; disabled?: boolean }) {
  return (
    <button type="button" className={'k-dbtn' + (primary ? ' is-primary' : '')} onClick={onClick} data-testid={testId} disabled={disabled}>
      {children}
    </button>
  )
}
