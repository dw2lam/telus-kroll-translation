import type { CSSProperties, ReactNode } from 'react'
import leaf from '@/assets/leaf.svg'

/** A read-only Kroll text box. */
export function Field({ value, width, grow, right, total, h17, focus, caret, style }: {
  value?: ReactNode
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
  return (
    <button type="button" className={['k-btn', ok && 'is-ok', bold && 'is-bold'].filter(Boolean).join(' ')} style={{ width }} onClick={onClick} title={title} data-testid={testId}>
      {children}
    </button>
  )
}

const MENUS = ['File', 'Edit', 'Rx', 'View', 'Labels', 'Profile', 'Reports', 'Utilities', 'NH', 'Cards', 'Session', 'Help']
const PATIENT_MENUS = ['File', 'Edit', 'Patient', 'Profile', 'Network', 'Utilities', 'NH', 'Cards', 'Session', 'Help']

export function MenuBar({ variant, onLabels }: { variant: 'patient' | 'rx'; onLabels?: () => void }) {
  const items = variant === 'patient' ? PATIENT_MENUS : MENUS
  return (
    <div className="k-menubar">
      {items.map((m) =>
        variant === 'rx' && m === 'Labels' ? (
          <span key={m} className="is-link" role="button" title="Preview labels (Ctrl+L)" onClick={onLabels} data-testid="menu-labels">
            {m}
          </span>
        ) : (
          <span key={m}>{m}</span>
        ),
      )}
    </div>
  )
}

export interface FKey {
  key: string
  label: string
  current?: boolean
  onClick?: () => void
}

export function FKeyBar({ keys }: { keys: FKey[] }) {
  return (
    <div className="k-fkeys">
      {keys.map((k) => (
        <button type="button" key={k.key} className={'k-fkey' + (k.current ? ' is-current' : '')} onClick={k.onClick}>
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

export function DButton({ children, primary, onClick, testId }: { children: ReactNode; primary?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className={'k-dbtn' + (primary ? ' is-primary' : '')} onClick={onClick} data-testid={testId}>
      {children}
    </button>
  )
}
