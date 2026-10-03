import { X } from './Icons'

export function Page({ eyebrow, title, desc, actions, children }: { eyebrow: string; title: string; desc: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-desc">{desc}</p>
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  )
}

export function Money({ value }: { value: number | string | null | undefined }) {
  return <span>₹{Number(value || 0).toLocaleString('en-IN')}</span>
}

export function initials(name: string) {
  return name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export function formatDate(date?: string | null) {
  if (!date) return '—'
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return <div className="empty"><div className="spinner" aria-hidden="true" /><div style={{ marginTop: 10 }}>{text}</div></div>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty"><strong style={{ color: 'var(--ink)' }}>{title}</strong><div style={{ marginTop: 6 }}>{text}</div></div>
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="notice warning-box" style={{ marginBottom: 14 }}><strong>Something went wrong.</strong> {message}</div>
}
