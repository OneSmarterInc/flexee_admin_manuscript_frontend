import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { api } from '../api.js'

// The link an editor gets after claiming a journal (build plan step 9). Confirming is a POST, so a
// mail scanner opening the link cannot confirm it by itself.
export default function JournalClaimVerify() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [state, setState] = useState({ busy: false, done: null, error: '' })

  async function confirm() {
    setState({ busy: true, done: null, error: '' })
    try {
      setState({ busy: false, done: await api('/api/journals/claim/verify/', { method: 'POST', body: JSON.stringify({ token }) }), error: '' })
    } catch (err) {
      setState({ busy: false, done: null, error: err?.payload?.detail || err.message || 'This link could not be confirmed.' })
    }
  }
  useEffect(() => { if (!token) setState(s => ({ ...s, error: 'This link is missing its code.' })) }, [token])

  return <PublicationShell>
    <div className="wrap author-flow-page py-10">
      <section className="author-panel mx-auto max-w-[620px] px-6 py-6">
        <p className="kicker">Claim a journal</p>
        <h1 className="serif mt-1 text-[32px] leading-tight">{state.done ? 'Thank you.' : 'Confirm your email address'}</h1>
        {state.done ? <p className="mt-2 text-[15px]">{state.done.detail}</p>
          : <p className="mt-2 text-[15px] text-muted">Confirm that this email address is yours. A Flexee administrator then reviews your claim.</p>}
        {state.error && <div className="admin-error venue-admin-message mt-3">{state.error}</div>}
        {!state.done && token && <button type="button" onClick={confirm} disabled={state.busy}
          className="mt-4 rounded-xl border-0 bg-flexee-500 px-5 py-2.5 text-[14px] font-extrabold text-white hover:bg-flexee-600 disabled:opacity-60">{state.busy ? 'Confirming…' : 'Confirm my email'}</button>}
        <div className="mt-4"><button type="button" className="author-text-link" onClick={() => go('/journals')}>Back to the journal index</button></div>
      </section>
    </div>
  </PublicationShell>
}
