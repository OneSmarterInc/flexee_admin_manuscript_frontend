import React, { useState } from 'react'
import { api } from '../api.js'

// A new editor sets their password from the link sent when their journal claim was approved (step 9).
export default function EditorSetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState({ busy: false, error: '', done: '' })

  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, error: '', done: '' })
    try {
      const result = await api('/api/admin/set-password/', { method: 'POST', body: JSON.stringify({ token, password, confirm }) })
      setState({ busy: false, error: '', done: result.email })
    } catch (err) {
      setState({ busy: false, error: err?.payload?.detail || err.message || 'The password could not be set.', done: '' })
    }
  }

  return <div className="flex min-h-screen items-center justify-center bg-[#f7f2ec] px-4 py-10" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
    <div className="w-full max-w-[460px] rounded-[24px] border border-line bg-white p-7 shadow-card">
      <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-flexee-600">Flexee Admin</div>
      <h1 className="serif mt-1 text-[30px] leading-tight">{state.done ? 'Password set' : 'Set your password'}</h1>
      {state.done ? <>
        <p className="mt-2 text-[14.5px] text-muted">Sign in as <b className="text-ink">{state.done}</b>. The first time, you will set up a sign-in code app (two-step sign-in).</p>
        <a href="/admin" className="mt-4 inline-block rounded-xl bg-flexee-500 px-5 py-2.5 text-[14px] font-extrabold text-white no-underline hover:bg-flexee-600">Go to sign in</a>
      </> : <form onSubmit={submit} className="mt-3 space-y-3">
        <p className="text-[14px] text-muted">Use at least 12 characters.</p>
        <label className="block text-[13px] font-extrabold">New password
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="field mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[15px]" required minLength={12} />
        </label>
        <label className="block text-[13px] font-extrabold">Confirm password
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className="field mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-[15px]" required />
        </label>
        {state.error && <div className="admin-error venue-admin-message">{state.error}</div>}
        <button type="submit" disabled={state.busy || !token} className="w-full rounded-xl border-0 bg-flexee-500 px-5 py-2.5 text-[14px] font-extrabold text-white hover:bg-flexee-600 disabled:opacity-60">{state.busy ? 'Saving…' : 'Set password'}</button>
      </form>}
    </div>
  </div>
}
