import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api.js'

const MIN_LENGTH = 8 // same rule as author sign-up

/* Signed-in author ({ name, email }) for pages inside RequireAuthor.
   Null on public pages, so the profile button only appears in the author portal. */
export const AuthorAccountContext = createContext(null)

function ChangePasswordDialog({ open, onClose, email }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    setCurrent(''); setNext(''); setConfirm(''); setShow(false); setBusy(false); setError(null); setDone(false)
    function onKey(event) { if (event.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < MIN_LENGTH

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) { setError({ detail: 'The new password and the confirmation do not match.', field: 'confirm_password' }); return }
    if (next.length < MIN_LENGTH) { setError({ detail: `The new password must be at least ${MIN_LENGTH} characters.`, field: 'new_password' }); return }
    setBusy(true)
    try {
      await api('/api/author/change-password/', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next, confirm_password: confirm }),
      })
      setDone(true)
    } catch (err) {
      setError({ detail: err.message, field: err.payload?.field })
    } finally {
      setBusy(false)
    }
  }

  // Rendered into the author theme wrapper: the sticky header's backdrop blur
  // would otherwise trap a fixed-position dialog inside the header.
  const host = document.querySelector('.author-admin-theme') || document.body
  const field = (id, label, value, setValue, autoComplete, hint, invalid) => <div className="row">
    <label htmlFor={id}>{label}</label>
    <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => setValue(e.target.value)}
      autoComplete={autoComplete} required aria-invalid={invalid ? 'true' : 'false'}
      className={invalid ? 'author-account-invalid' : ''} />
    {hint && <span className="author-account-hint">{hint}</span>}
  </div>

  return createPortal(
    <div className="author-account-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="author-panel author-account-dialog" role="dialog" aria-modal="true" aria-labelledby="author-change-password-title">
        <button type="button" className="author-account-close" aria-label="Close" onClick={onClose}>×</button>
        <p className="kicker">Account security</p>
        <h2 id="author-change-password-title">Change password</h2>
        {email && <p className="author-muted-copy">{email}</p>}

        {done ? <>
          <div className="author-prototype-notice author-account-success">Your password has been changed. Other devices signed in to this account have been signed out.</div>
          <div className="author-account-actions">
            <button type="button" className="copper-button" onClick={onClose}>Done</button>
          </div>
        </> : <form className="author-auth-form" onSubmit={submit}>
          {error && <div className="author-prototype-notice author-error-banner" role="alert">{error.detail}</div>}
          {field('author-current-password', 'Current password', current, setCurrent, 'current-password', '', error?.field === 'current_password')}
          {field('author-new-password', 'New password', next, setNext, 'new-password', `At least ${MIN_LENGTH} characters.`, tooShort || error?.field === 'new_password')}
          {field('author-confirm-password', 'Confirm new password', confirm, setConfirm, 'new-password', mismatch ? 'Does not match the new password.' : '', mismatch || error?.field === 'confirm_password')}
          <label className="author-account-show">
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords
          </label>
          <div className="author-account-actions">
            <button type="button" className="author-secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="copper-button" disabled={busy || !current || !next || !confirm}>{busy ? 'Changing…' : 'Change password'}</button>
          </div>
        </form>}
      </div>
    </div>,
    host,
  )
}

/* Profile icon in the site header (author portal only). */
export function AuthorAccountButton() {
  const account = useContext(AuthorAccountContext)
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDown(event) { if (ref.current && !ref.current.contains(event.target)) setOpen(false) }
    function onKey(event) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!account) return null
  const name = account.name || account.email?.split('@')[0] || 'Author'
  const initial = name.charAt(0).toUpperCase()

  return <div className="author-account" ref={ref}>
    <button type="button" className="author-account-button" onClick={() => setOpen(v => !v)}
      aria-haspopup="dialog" aria-expanded={open} aria-label="Your account" title="Your account">
      <span>{initial}</span>
    </button>
    {open && <div className="author-account-popover" role="dialog" aria-label="Your account">
      <div className="author-account-head">
        <span className="author-account-avatar">{initial}</span>
        <div>
          <p className="kicker">Author account</p>
          <b>{name}</b>
        </div>
      </div>
      <div className="author-account-email">
        <span>Email</span>
        <b>{account.email || '—'}</b>
      </div>
      <button type="button" className="author-secondary-button author-account-change" onClick={() => { setOpen(false); setChanging(true) }}>
        Change password
      </button>
    </div>}
    <ChangePasswordDialog open={changing} onClose={() => setChanging(false)} email={account.email} />
  </div>
}


/* Profile menu in the author dashboard's workspace bar (replaces the header icon). */
export function AuthorProfileMenu({ onLogout }) {
  const account = useContext(AuthorAccountContext)
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDown(event) { if (ref.current && !ref.current.contains(event.target)) setOpen(false) }
    function onKey(event) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!account) return null
  const name = account.name || account.email?.split('@')[0] || 'Author'
  const parts = String(name).trim().split(/\s+/)
  const initials = parts.slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
  const firstName = parts[0]

  return <div className="author-profile" ref={ref}>
    <button type="button" className="author-profile-button" onClick={() => setOpen(v => !v)}
      aria-haspopup="menu" aria-expanded={open} title="Your account">
      <span className="author-profile-avatar">{initials}</span>
      <span className="author-profile-name">{firstName}</span>
      <svg className="author-profile-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div className="author-profile-menu" role="menu" aria-label="Your account">
      <div className="author-profile-head">
        <span className="author-profile-avatar lg">{initials}</span>
        <div><b>{name}</b><span>{account.email || ''}</span></div>
      </div>
      <button type="button" role="menuitem" onClick={() => { setOpen(false); setChanging(true) }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Change password
      </button>
      <hr />
      <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onLogout?.() }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
        Log out
      </button>
    </div>}
    <ChangePasswordDialog open={changing} onClose={() => setChanging(false)} email={account.email} />
  </div>
}
