import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'
import AdminModal from './AdminModal.jsx'

const MIN_LENGTH = 12

function roleText(platformSuperuser, memberships) {
  if (platformSuperuser) return 'Platform administrator'
  const role = memberships?.[0]?.role
  return { owner: 'Venue owner', editor: 'Editor', viewer: 'Viewer' }[role] || 'Administrator'
}

function PasswordField({ id, label, value, onChange, show, autoComplete, hint, invalid }) {
  return <label className="block" htmlFor={id}>
    <span className="mb-1.5 block text-[14px] font-extrabold">{label}</span>
    <input
      id={id}
      className={`field ${invalid ? '!border-red-400' : ''}`}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoComplete={autoComplete}
      required
    />
    {hint && <span className="mt-1 block text-[12px] font-medium text-muted">{hint}</span>}
  </label>
}

export function AdminChangePasswordModal({ open, onClose, email }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) return
    setCurrent(''); setNext(''); setConfirm(''); setShow(false); setBusy(false); setError(null); setDone(false)
  }, [open])

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < MIN_LENGTH

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) { setError({ detail: 'The new password and the confirmation do not match.', field: 'confirm_password' }); return }
    if (next.length < MIN_LENGTH) { setError({ detail: `The new password must be at least ${MIN_LENGTH} characters.`, field: 'new_password' }); return }
    setBusy(true)
    try {
      await api('/api/admin/change-password/', {
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

  return <AdminModal open={open} onClose={onClose} labelledBy="admin-change-password-title" maxWidth="max-w-[480px]" zIndex="z-[90]">
    <div className="border-b border-line bg-gradient-to-r from-white via-white to-flexee-50 px-6 py-4 pr-16">
      <div className="text-[12px] font-extrabold uppercase tracking-[.09em] text-flexee-600">Account security</div>
      <h3 id="admin-change-password-title" className="serif mt-0.5 text-[28px] leading-none">Change password</h3>
      {email && <div className="mt-1.5 text-[13px] font-medium text-muted">{email}</div>}
    </div>

    {done ? <div className="p-6">
      <div className="venue-admin-success venue-admin-message">Your password has been changed. Other devices signed in to this account have been signed out.</div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="shine rounded-xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange">Done</button>
      </div>
    </div> : <form className="space-y-4 p-6" onSubmit={submit}>
      {error && <div className="admin-error venue-admin-message" role="alert">{error.detail}</div>}
      <PasswordField id="admin-current-password" label="Current password" value={current} onChange={setCurrent} show={show}
        autoComplete="current-password" invalid={error?.field === 'current_password'} />
      <PasswordField id="admin-new-password" label="New password" value={next} onChange={setNext} show={show}
        autoComplete="new-password" hint={`At least ${MIN_LENGTH} characters.`} invalid={tooShort || error?.field === 'new_password'} />
      <PasswordField id="admin-confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} show={show}
        autoComplete="new-password" hint={mismatch ? 'Does not match the new password.' : ''} invalid={mismatch || error?.field === 'confirm_password'} />
      <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
        <input type="checkbox" className="h-4 w-4 accent-[#c7662d]" checked={show} onChange={e => setShow(e.target.checked)} />
        Show passwords
      </label>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm">Cancel</button>
        <button type="submit" disabled={busy || !current || !next || !confirm}
          className="shine rounded-xl bg-flexee-500 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>}
  </AdminModal>
}

/* Profile button in the admin top bar: opens a small card with the account
   details and a Change password action. */
export default function AdminAccountMenu({ username, platformSuperuser = false, memberships = [] }) {
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const ref = useRef(null)
  const email = username || ''
  const initial = (email || 'A').charAt(0).toUpperCase()
  const role = roleText(platformSuperuser, memberships)

  useEffect(() => {
    if (!open) return undefined
    function onDown(event) { if (ref.current && !ref.current.contains(event.target)) setOpen(false) }
    function onKey(event) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return <div className="relative" ref={ref}>
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Account"
      className="flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-2 py-2 shadow-sm transition hover:shadow-card md:px-3"
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-flexee-500 text-[13px] font-black text-white">{initial}</div>
      <div className="hidden pr-1 text-left md:block">
        <div className="max-w-[180px] truncate text-[13px] font-extrabold">{email || 'admin'}</div>
        <div className="text-[12px] font-medium text-muted">{role}</div>
      </div>
    </button>

    {open && <div role="dialog" aria-label="Account" className="admin-account-popover absolute right-0 top-[calc(100%+10px)] z-[65] w-[300px] rounded-[20px] border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-flexee-500 text-[16px] font-black text-white">{initial}</div>
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold uppercase tracking-[.07em] text-flexee-600">{role}</div>
          <div className="mt-0.5 truncate text-[15px] font-extrabold">{email.split('@')[0] || 'admin'}</div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-line bg-[#fcfaf8] px-3 py-2.5">
        <div className="text-[11px] font-extrabold uppercase tracking-[.07em] text-muted">Email</div>
        <div className="mt-0.5 break-all text-[14px] font-semibold">{email || '—'}</div>
      </div>
      <button
        type="button"
        onClick={() => { setOpen(false); setChanging(true) }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-sm transition hover:border-[#efc7ae] hover:bg-flexee-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Change password
      </button>
    </div>}

    <AdminChangePasswordModal open={changing} onClose={() => setChanging(false)} email={email} />
  </div>
}
