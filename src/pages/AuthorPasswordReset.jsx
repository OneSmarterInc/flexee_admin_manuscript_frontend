import React, { useEffect, useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { api } from '../api.js'

const MIN_LENGTH = 8 // same rule as author sign-up

function AuthShell({ crumb, eyebrow, title, lede, children }) {
  return <PublicationShell>
    <div className="wrap author-auth-page">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace / {crumb}</div>
      <section className="author-auth-shell">
        <div className="author-auth-intro">
          <p className="kicker">Author workspace</p>
          <h1>Get back into your manuscript workspace.</h1>
          <p className="author-auth-lede">Change your password right here if you know your current one, or have a one-time reset link emailed to you if you don't.</p>
          <div className="author-auth-benefits" aria-label="How it works">
            <div><span>01</span><p><b>Know your current password?</b><small>Enter it with a new one and the change is instant.</small></p></div>
            <div><span>02</span><p><b>Don't remember it?</b><small>Get a reset link by email; it expires in 30 minutes and works once.</small></p></div>
            <div><span>03</span><p><b>Sign in again</b><small>Other devices are signed out after any password change.</small></p></div>
          </div>
        </div>
        <div className="author-auth-card">
          <div className="author-auth-card-head">
            <span className="author-auth-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {lede && <p>{lede}</p>}
          </div>
          {children}
          <div className="author-auth-divider"><span>Remembered it?</span></div>
          <button className="author-auth-secondary" type="button" onClick={() => go('/author/login')}>Back to sign in</button>
        </div>
      </section>
    </div>
  </PublicationShell>
}

function ChangeWithCurrentPassword({ onUseEmail }) {
  const [email, setEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mismatch = confirm.length > 0 && password !== confirm

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('The new password and the confirmation do not match.'); return }
    if (password.length < MIN_LENGTH) { setError(`The new password must be at least ${MIN_LENGTH} characters.`); return }
    setBusy(true)
    try {
      await api('/api/author/password-change/', {
        method: 'POST',
        body: JSON.stringify({ email, current_password: current, new_password: password, confirm_password: confirm }),
      })
      window.history.replaceState({}, '', '/author/login?changed=1')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      setError(err.message || 'The password could not be changed. Try again.')
      setBusy(false)
    }
  }

  return <>
    <form className="author-auth-form" onSubmit={submit}>
      {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}
      <label htmlFor="change-email">
        <span>Email address</span>
        <input id="change-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="name@example.com" required autoFocus />
      </label>
      <label htmlFor="change-current-password">
        <span>Current password</span>
        <input id="change-current-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={current}
          onChange={e => setCurrent(e.target.value)} placeholder="Your current password" required />
      </label>
      <label htmlFor="change-new-password">
        <span>New password</span>
        <input id="change-new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder={`At least ${MIN_LENGTH} characters`} required />
      </label>
      <label htmlFor="change-confirm-password">
        <span>Confirm new password</span>
        <input id="change-confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="Type it again" required
          className={mismatch ? 'author-account-invalid' : ''} />
        {mismatch && <small className="author-reset-hint">Does not match the new password.</small>}
      </label>
      <label className="author-account-show author-reset-show">
        <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords
      </label>
      <button type="submit" className="copper-button author-auth-submit" disabled={busy || !email || !current || !password || !confirm}>
        {busy ? 'Changing…' : 'Change password'}
      </button>
    </form>
    <p className="author-auth-note author-reset-alt">
      Don't remember your current password?{' '}
      <button type="button" className="author-reset-again" onClick={onUseEmail}>Email me a reset link</button>
    </p>
  </>
}

function EmailResetLink({ onUseCurrent }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api('/api/author/password-reset/', { method: 'POST', body: JSON.stringify({ email }) })
      setSent(result.detail || 'If an author account exists for that email, a reset link has been sent.')
    } catch (err) {
      setError(err.message || 'The request could not be sent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    {sent ? <div className="author-auth-form">
      <div className="author-prototype-notice author-reset-success" role="status"><b>Check your email.</b> {sent}</div>
      <p className="author-auth-note">Didn't get it? Check your spam folder, or wait a minute and request another link.</p>
      <button type="button" className="author-text-link author-reset-again" onClick={() => setSent('')}>Send another link</button>
    </div> : <form className="author-auth-form" onSubmit={submit}>
      {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}
      <label htmlFor="reset-email">
        <span>Email address</span>
        <input id="reset-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="name@example.com" required autoFocus />
      </label>
      <button type="submit" className="copper-button author-auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
    </form>}
    <p className="author-auth-note author-reset-alt">
      Remember your current password?{' '}
      <button type="button" className="author-reset-again" onClick={onUseCurrent}>Change it here instead</button>
    </p>
  </>
}

export function AuthorForgotPassword() {
  const [mode, setMode] = useState('current')
  return mode === 'current'
    ? <AuthShell crumb="Forgot password" eyebrow="Forgot password" title="Change your password"
        lede="Enter your email, your current password, and a new password. The change takes effect immediately.">
        <ChangeWithCurrentPassword onUseEmail={() => setMode('email')} />
      </AuthShell>
    : <AuthShell crumb="Forgot password" eyebrow="Forgot password" title="Email me a reset link"
        lede="Enter the email address for your author account and we'll send you a link to choose a new password.">
        <EmailResetLink onUseCurrent={() => setMode('current')} />
      </AuthShell>
}

export function AuthorResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [state, setState] = useState({ checking: true, valid: false, email: '', message: '' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!token) {
      setState({ checking: false, valid: false, email: '', message: 'This reset link is incomplete. Request a new one.' })
      return undefined
    }
    api(`/api/author/password-reset/confirm/?token=${encodeURIComponent(token)}`)
      .then(result => { if (active) setState({ checking: false, valid: true, email: result.email || '', message: '' }) })
      .catch(err => { if (active) setState({ checking: false, valid: false, email: '', message: err.message }) })
    return () => { active = false }
  }, [token])

  const mismatch = confirm.length > 0 && password !== confirm

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('The new password and the confirmation do not match.'); return }
    if (password.length < MIN_LENGTH) { setError(`The new password must be at least ${MIN_LENGTH} characters.`); return }
    setBusy(true)
    try {
      await api('/api/author/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password, confirm_password: confirm }),
      })
      // Remove the token from the address bar and history, then sign in fresh.
      window.history.replaceState({}, '', '/author/login?reset=1')
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (err) {
      if (err.payload?.code === 'invalid_token') setState({ checking: false, valid: false, email: '', message: err.message })
      else setError(err.message || 'The password could not be reset. Try again.')
      setBusy(false)
    }
  }

  if (state.checking) {
    return <AuthShell crumb="Reset password" eyebrow="Reset password" title="Checking your link…" />
  }

  if (!state.valid) {
    return <AuthShell crumb="Reset password" eyebrow="Reset password" title="This link can't be used">
      <div className="author-auth-form">
        <div className="author-prototype-notice author-error-banner" role="alert">{state.message || 'This reset link is invalid or has expired.'}</div>
        <button type="button" className="copper-button author-auth-submit" onClick={() => go('/author/forgot-password')}>Request a new link</button>
      </div>
    </AuthShell>
  }

  return <AuthShell crumb="Reset password" eyebrow="Reset password" title="Choose a new password"
    lede={state.email ? `For ${state.email}` : ''}>
    <form className="author-auth-form" onSubmit={submit}>
      {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}
      <label htmlFor="reset-new-password">
        <span>New password</span>
        <input id="reset-new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder={`At least ${MIN_LENGTH} characters`} required autoFocus />
      </label>
      <label htmlFor="reset-confirm-password">
        <span>Confirm new password</span>
        <input id="reset-confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="Type it again" required
          className={mismatch ? 'author-account-invalid' : ''} />
        {mismatch && <small className="author-reset-hint">Does not match the new password.</small>}
      </label>
      <label className="author-account-show author-reset-show">
        <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords
      </label>
      <button type="submit" className="copper-button author-auth-submit" disabled={busy || !password || !confirm}>
        {busy ? 'Saving…' : 'Reset password'}
      </button>
    </form>
  </AuthShell>
}
