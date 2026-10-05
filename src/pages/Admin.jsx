import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { go } from '../components/SiteChrome.jsx'
import VenueAgentsPanel from '../components/admin/VenueAgentsPanel.jsx'
import EditorWorkspacePanel from '../components/admin/EditorWorkspacePanel.jsx'
import AuditLogPanel from '../components/admin/AuditLogPanel.jsx'
import AdminAccountMenu from '../components/admin/AdminAccountMenu.jsx'
import '../admin-professional.css'

// Loaded on demand: only platform superusers open Venue Discovery.
const VenueDiscoveryPanel = lazy(() => import('../components/admin/VenueDiscoveryPanel.jsx'))

const decisions = {
  PASS_TO_HUMAN: 'Pass to human',
  REFER_TO_HUMAN_WITH_FLAGS: 'Refer with flags',
  RETURN_TO_AUTHOR: 'Return to author',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
}

function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label> }
function StatusPill({ value }) { return <span className={`admin-badge ${value || ''}`}>{decisions[value] || value || '—'}</span> }

const viewLayouts = {
  smtp: { section: 'px-4 py-5 md:px-7', inner: 'mx-auto max-w-[1500px]' },
  default: { section: 'px-4 py-4 md:px-7 md:py-5', inner: 'mx-auto max-w-[1750px]' },
}

function AdminTop({ children, sidebar, sidebarOpen = false, onToggleSidebar, username = '', view = 'default', mainRef = null, platformSuperuser = false, memberships = [] }) {
  const layout = viewLayouts[view] || viewLayouts.default
  return (
    <div className="admin-demo-root h-screen overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-40 h-[78px] border-b border-white/80 glass shadow-[0_5px_22px_rgba(62,37,23,.04)]">
        <div className="flex h-full items-center justify-between px-4 md:px-7">
          <div className="flex items-center gap-4">
            {sidebar && (
              <button
                type="button"
                aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={sidebarOpen}
                onClick={onToggleSidebar}
                className={`admin-demo-hamburger shine grid h-[52px] w-[52px] place-items-center rounded-[17px] bg-flexee-500 text-white shadow-orange ${sidebarOpen ? 'active' : ''}`}
              >
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </svg>
              </button>
            )}
            <div className="flex items-baseline gap-3">
              <div className="text-[20px] font-black tracking-[-.025em]">Flexee Admin</div>
              <div className="desktop-only text-[15px] font-semibold text-muted">Editorial operations</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="desktop-only flex items-center gap-2 rounded-full border border-green-200 bg-green-50/90 px-4 py-2 text-[13px] font-extrabold text-green-700">
              <span className="status-dot bg-green-500"></span>
              Systems operational
            </div>
            <button type="button" className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-muted transition hover:bg-white hover:text-ink">Help</button>
            {username && <AdminAccountMenu username={username} platformSuperuser={platformSuperuser} memberships={memberships} />}
          </div>
        </div>
      </header>

      {sidebar && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onToggleSidebar}
          className={`admin-demo-backdrop fixed inset-0 z-50 bg-[#21170f]/35 backdrop-blur-[7px] ${sidebarOpen ? 'open' : ''}`}
        />
      )}

      {sidebar && (
        <aside
          className={`admin-demo-drawer fixed bottom-4 left-4 top-4 z-[60] w-[330px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[30px] border border-white/80 bg-[#fffdfb]/96 backdrop-blur-2xl ${sidebarOpen ? 'open' : ''}`}
          aria-hidden={!sidebarOpen}
        >
          {sidebar}
        </aside>
      )}

      <main ref={mainRef} className="page-scroll soft-grid h-screen overflow-y-auto pt-[78px]">
        <section key={view} className={`view active ${layout.section}`}>
          <div className={layout.inner}>
            {children}
          </div>
        </section>
        <div className="h-10"></div>
      </main>
    </div>
  )
}

import { QRCodeSVG } from 'qrcode.react'

function AdminLogin({ onLogin }) {
  const [step, setStep] = useState(1)
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [totpUri, setTotpUri] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleStep1(e) {
    e.preventDefault(); setBusy(true); setError('')
    const form = new FormData(e.currentTarget)
    const username = form.get('username')
    const password = form.get('password')
    try {
      const res = await api('/api/admin/verify-password/', { method: 'POST', body: JSON.stringify({ username, password }) })
      setCreds({ username, password })
      if (res.totp_setup_uri) setTotpUri(res.totp_setup_uri)
      else setTotpUri(null)
      setStep(2)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function handleStep2(e) {
    e.preventDefault(); setBusy(true); setError('')
    const form = new FormData(e.currentTarget)
    const totp = form.get('totp')
    try { 
      await api('/api/admin/login/', { method: 'POST', body: JSON.stringify({ ...creds, totp }) })
      onLogin() 
    }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const lockIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>

  return (
    <div className="al-page">
      <div className="al-wrap">
        <div className="al-brand">flexee</div>

        <section className="al-card">
          <h1>{step === 1 ? 'Admin sign in' : 'Two-factor check'}</h1>
          <p className="al-subtitle">
            {step === 1
              ? 'Enter your credentials to continue.'
              : totpUri ? 'Set up your authenticator app, then enter the 6-digit code.' : 'Enter the 6-digit code from your authenticator app.'}
          </p>

          {step === 1 ? (
            <form onSubmit={handleStep1}>
              <div className="al-field">
                <label htmlFor="al-username">Username</label>
                <input id="al-username" name="username" type="text" autoComplete="username" placeholder="Enter username" required autoFocus />
              </div>
              <div className="al-field">
                <label htmlFor="al-password">Password</label>
                <input id="al-password" name="password" type="password" autoComplete="current-password" placeholder="Enter password" required />
              </div>
              {error && <div className="al-error" role="alert">{error}</div>}
              <button className="al-btn" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Continue'}</button>
            </form>
          ) : (
            <form onSubmit={handleStep2}>
              <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" defaultValue={creds.username} />
              <input type="password" name="password" style={{ display: 'none' }} autoComplete="current-password" defaultValue={creds.password} />

              {totpUri && (
                <div className="al-qr">
                  <p>Scan this QR code with your authenticator app (for example Google Authenticator) to set up two-factor authentication.</p>
                  <div className="al-qr-box"><QRCodeSVG value={totpUri} size={168} /></div>
                </div>
              )}

              <div className="al-field">
                <label htmlFor="al-totp">Authenticator code</label>
                <input id="al-totp" name="totp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6"
                  autoComplete="one-time-code" required placeholder="000000" autoFocus className="al-code" />
              </div>
              {error && <div className="al-error" role="alert">{error}</div>}
              <button className="al-btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </form>
          )}

          <div className="al-note">{lockIcon}Two-factor authentication required</div>
        </section>

        <div className="al-back">
          <button type="button" onClick={() => step === 2 ? (setStep(1), setError('')) : go('/')}>
            &larr; {step === 2 ? 'Back to sign in' : 'Return to public site'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Detail({ id, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { api(`/api/admin/submissions/${id}/`).then(setData).catch(e => setError(e.message)) }, [id])

  return <div className="admin-drawer-backdrop" onClick={onClose}><aside className="admin-drawer" onClick={e => e.stopPropagation()}>
    <div className="admin-drawer-head">
      <div><h2>{data?.title || 'Submission'}</h2><div className="admin-muted">{data ? `${data.author_name} · ${data.kind}` : 'Loading…'}</div></div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="admin-btn secondary" onClick={onClose}>Close</button>
      </div>
    </div>
    {error && <div className="admin-error">{error}</div>}

    {data && <>
      <div className="admin-detail-grid">
        <div><b>Admin Decision</b><StatusPill value={data.admin_decision} /></div><div><b>Status</b><StatusPill value={data.status} /></div>
        <div><b>AI Decision</b><StatusPill value={data.decision} /></div><div><b>Email state</b>{data.notification_status || '—'}</div>
        <div><b>Author</b>{data.author_name}</div><div><b>Email</b>{data.author_email || '—'}</div>
        <div><b>Type</b>{data.kind}</div><div><b>Words</b>{data.total_words?.toLocaleString() || '—'}</div>
        <div><b>File</b>{data.manuscript_filename}</div><div><b>Bytes</b>{data.manuscript_bytes?.toLocaleString() || '—'}</div>
        <div><b>Simulation</b>{data.declared_sim || '—'}</div><div><b>Co-authors</b>{data.coauthors || '—'}</div>
      </div>
      
      {data.editor_summary && (!data.zip_contents || data.zip_contents.length === 0) && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Editor Summary</h3>
          <div className="admin-card" style={{ padding: '16px', background: 'var(--paper)', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '14px' }}>
            {data.editor_summary}
          </div>
        </div>
      )}
      {data.zip_contents && data.zip_contents.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>ZIP Contents</h3>
          <div className="admin-card" style={{ padding: '16px', background: 'var(--paper)', fontSize: '14px', color: 'var(--muted)' }}>
            This submission is a ZIP archive containing {data.zip_contents.length} documents. Click "View chapter summaries" in the table's summary column to view the detailed breakdowns.
          </div>
        </div>
      )}
    </>}
  </aside></div>
}

function ActionModal({ id, action, onClose, onRefresh }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const endpoint = `/api/admin/submissions/${id}/${action}/`
      const payload = action === 'accept' ? { message } : { reason: message }
      await api(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      onRefresh()
      onClose()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
        <div className="admin-modal-header">
          <h3>{action === 'accept' ? 'Accept Submission' : 'Reject Submission'}</h3>
          <p>{action === 'accept' ? 'Send a confirmation note to the author.' : 'Please provide a reason for the rejection.'}</p>
        </div>
        <div className="admin-modal-body">
          <Field label={action === 'accept' ? 'Message to author (optional)' : 'Reason for rejection'}>
            <textarea required={action === 'reject'} value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Type your message here..." />
          </Field>
          {error && <div className="admin-error">{error}</div>}
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button className={`admin-btn ${action === 'reject' ? 'danger' : ''}`} type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Confirm Action'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SMTPSettingsPage({ onSave }) {
  const [form, setForm] = useState({
    sender_name: '', sender_email: '', reply_to_email: '',
    host: '', port: 587, username: '', password: '',
    use_tls: true, use_ssl: false, test_email: '',
    admin_notification_emails: ''
  });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    api('/api/admin/smtp/').then(data => {
      setForm(data);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const getSecurityProtocol = () => {
    if (form.use_ssl) return 'SSL';
    if (form.use_tls) return 'TLS';
    return 'None';
  };

  const handleSecurityChange = (val) => {
    if (val === 'SSL') setForm({ ...form, use_ssl: true, use_tls: false });
    else if (val === 'TLS') setForm({ ...form, use_ssl: false, use_tls: true });
    else setForm({ ...form, use_ssl: false, use_tls: false });
  };

  async function handleSave(e) {
    if (e) e.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      await api('/api/admin/smtp/', { method: 'POST', body: JSON.stringify(form) });
      setSuccess('SMTP settings saved successfully!');
      if (onSave) onSave();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleTest(e) {
    if (e) e.preventDefault();
    setTesting(true); setError(''); setSuccess('');
    try {
      const res = await api('/api/admin/smtp/test/', { method: 'POST', body: JSON.stringify(form) });
      setSuccess(res.message || 'Test email sent successfully!');
      setTestSuccess(true);
    } catch (err) { setError(err.message); setTestSuccess(false); }
    finally { setTesting(false); }
  }

  const updateForm = (updates) => {
    setForm({ ...form, ...updates });
    setTestSuccess(false);
    setSuccess('');
    setError('');
  };

  if (loading) {
    return <div className="premium-card rounded-[28px] p-6 text-[15px] font-semibold text-muted">Loading current settings…</div>;
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[13px] font-extrabold uppercase tracking-[.15em] text-flexee-600">System settings</div>
          <h2 className="serif mt-1 text-[41px] leading-none md:text-[48px]">Email delivery</h2>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            Configure sender identity, SMTP credentials, administrator copies and delivery verification from one compact screen.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-2.5 text-[13px] font-extrabold text-green-700">
          <span className="status-dot bg-green-500"></span>
          SMTP configuration detected
        </div>
      </div>

      <form onSubmit={handleSave} className="grid items-start gap-4 xl:grid-cols-[1.12fr_.88fr]">
        <div className="premium-card rounded-[28px] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Connection</div>
              <h3 className="serif mt-1 text-[29px]">SMTP server</h3>
            </div>
            <span className="rounded-full border border-flexee-100 bg-flexee-50 px-3 py-1.5 text-[13px] font-extrabold text-flexee-700">
              {getSecurityProtocol()} · Port {form.port || 587}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">SMTP host</span>
              <input className="field" type="text" value={form.host || ''} onChange={e => updateForm({ host: e.target.value })} required />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">SMTP port</span>
              <input className="field" type="number" value={form.port || 587} onChange={e => updateForm({ port: parseInt(e.target.value) || 587 })} required />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">SMTP username</span>
              <input className="field" type="text" value={form.username || ''} onChange={e => updateForm({ username: e.target.value })} required />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">Security protocol</span>
              <select className="field" value={getSecurityProtocol()} onChange={e => handleSecurityChange(e.target.value)}>
                <option value="TLS">TLS</option>
                <option value="SSL">SSL</option>
                <option value="None">None</option>
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">SMTP password</span>
              <div className="relative">
                <input
                  className="field pr-36"
                  type="password"
                  value={form.password || ''}
                  onChange={e => updateForm({ password: e.target.value })}
                  placeholder="Leave blank to keep existing password"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-stone-100 px-2.5 py-1 text-[12px] font-extrabold text-muted">
                  Stored securely
                </span>
              </div>
            </label>
          </div>

          <div className="my-4 border-t border-line"></div>

          <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Sender identity</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">Sender name</span>
              <input className="field" type="text" value={form.sender_name || ''} onChange={e => updateForm({ sender_name: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">Sender email</span>
              <input className="field" type="email" value={form.sender_email || ''} onChange={e => updateForm({ sender_email: e.target.value })} placeholder="editor@flexee.org" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">Reply-to email</span>
              <input className="field" type="email" value={form.reply_to_email || ''} onChange={e => updateForm({ reply_to_email: e.target.value })} placeholder="Optional reply-to address" />
            </label>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="premium-card rounded-[28px] p-5">
            <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Notifications</div>
            <h3 className="serif mt-1 text-[29px]">Administrator copies</h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-[13px] font-extrabold uppercase tracking-[.04em] text-muted">Admin notification emails</span>
              <textarea
                className="field min-h-[88px]"
                value={form.admin_notification_emails || ''}
                onChange={e => updateForm({ admin_notification_emails: e.target.value })}
                placeholder="editor1@flexee.org, editor2@flexee.org"
              />
              <span className="mt-1.5 block text-[13px] leading-5 text-muted">
                BCC recipients for submission, acceptance, rejection and custom author emails.
              </span>
            </label>
          </div>

          <div className="premium-card rounded-[28px] p-5">
            <div className="text-[13px] font-extrabold uppercase tracking-[.07em] text-muted">Verification</div>
            <h3 className="serif mt-1 text-[29px]">Test delivery</h3>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                className="field flex-1"
                type="email"
                value={form.test_email || ''}
                onChange={e => updateForm({ test_email: e.target.value })}
                placeholder="test@example.com"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="shine whitespace-nowrap rounded-2xl bg-[#B97807] px-5 py-3 text-[13px] font-extrabold text-white shadow-sm transition hover:bg-[#9b6203] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            {testSuccess && success && <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700">✓ {success}</div>}
          </div>

          <div className="rounded-[24px] border border-flexee-100 bg-gradient-to-br from-flexee-50 via-white to-white p-5 shadow-card">
            <div className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-flexee-100 text-flexee-700">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3 4 6v5c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V6l-8-3Z"/>
                  <path d="m9.5 12 1.7 1.7 3.5-4"/>
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-extrabold">Credential protection</div>
                <p className="mt-1 text-[13px] leading-6 text-muted">
                  Existing passwords are never displayed. Leave the field blank to preserve the stored credential.
                </p>
              </div>
            </div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">{error}</div>}
          {!testSuccess && success && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-bold text-green-700">{success}</div>}

          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="shine rounded-2xl bg-flexee-500 px-6 py-3 text-[14px] font-extrabold text-white shadow-orange hover:bg-flexee-600 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Saving…' : 'Save configuration'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function SendEmailModal({ id, onClose, onRefresh }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api(`/api/admin/submissions/${id}/send-email/`, { method: 'POST', body: JSON.stringify({ subject, body }) })
      onRefresh()
      onClose()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px' }}>
        <div className="admin-modal-header">
          <h3>Send Custom Email</h3>
          <p>Reach out directly to the author regarding their submission.</p>
        </div>
        <div className="admin-modal-body">
          <Field label="Subject">
            <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </Field>
          <Field label="Message Body">
            <textarea required value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Type your message here..." />
          </Field>
          {error && <div className="admin-error">{error}</div>}
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send mail'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ZipContentsModal({ item, onClose }) {
  const docs = item.zip_contents || []
  const totalWords = docs.reduce((sum, d) => sum + (d.word_count || 0), 0)

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '1024px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '28px' }}>{item.manuscript_filename}</h3>
            </div>
          </div>
          <p>{docs.length} document{docs.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} total words</p>
        </div>

        <div className="admin-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Chapter-wise Document List */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)' }}>Chapter-wise Documents</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {docs.map((doc, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(28,26,23,0.08)',
                  borderRadius: '14px', padding: '18px 20px',
                  transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,92,50,0.2)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(28,26,23,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(28,26,23,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--copper), #e68d5c)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, flexShrink: 0,
                      }}>{idx + 1}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--ink)' }}>{doc.filename}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{doc.path !== doc.filename ? doc.path : ''}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
                      background: 'rgba(28,26,23,0.04)', padding: '4px 10px', borderRadius: '20px',
                      whiteSpace: 'nowrap',
                    }}>{doc.word_count?.toLocaleString() || 0} words</span>
                  </div>
                  <div style={{
                    fontSize: '13.5px', lineHeight: '1.6', color: '#555',
                    background: '#faf8f5', borderRadius: '10px', padding: '14px 16px',
                    borderLeft: '3px solid var(--copper)',
                  }}>
                    {doc.preview || '(no preview available)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Summary */}
          {item.editor_summary && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--copper)' }}>Overall Summary</span>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(168,92,50,0.04) 0%, rgba(200,140,80,0.04) 100%)',
                border: '1px solid rgba(168,92,50,0.12)',
                borderRadius: '14px', padding: '18px 20px',
                whiteSpace: 'pre-wrap', lineHeight: '1.65', fontSize: '14px', color: 'var(--ink)',
              }}>
                {item.editor_summary}
              </div>
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn secondary" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// Each admin page has its own address, so refresh, links and Back/Forward keep the page.
const ADMIN_VIEW_PATHS = {
  editor: '/admin',
  venues: '/admin/venue-agents',
  discovery: '/admin/venue-discovery',
  audit: '/admin/audit-log',
  smtp: '/admin/email-settings',
}
const SUPERUSER_VIEWS = new Set(['discovery', 'smtp'])

export function adminViewFromPath(path, platformSuperuser = false) {
  const clean = String(path || '/admin').replace(/\/+$/, '') || '/admin'
  const view = Object.keys(ADMIN_VIEW_PATHS).find(key => ADMIN_VIEW_PATHS[key] === clean) || 'editor'
  return SUPERUSER_VIEWS.has(view) && !platformSuperuser ? 'editor' : view
}

function AdminDashboard({ path = '/admin', username, onLogout, platformSuperuser = false, memberships = [] }) {
  const [filters, setFilters] = useState({ q: '', kind: '', status: '', decision: '' })
  const [applied, setApplied] = useState(filters)
  const [data, setData] = useState({ counts: {}, items: [] })
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [inlineAction, setInlineAction] = useState(null)
  const [emailActionId, setEmailActionId] = useState(null)
  const [zipViewItem, setZipViewItem] = useState(null)
  const currentView = adminViewFromPath(path, platformSuperuser)
  const setCurrentView = useCallback(view => {
    const target = ADMIN_VIEW_PATHS[view] || '/admin'
    if (window.location.pathname.replace(/\/+$/, '') !== target) {
      window.history.pushState({}, '', target)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [])

  // An address the account cannot use, or an unknown one, is shown as the default page.
  useEffect(() => {
    const clean = String(path || '/admin').replace(/\/+$/, '') || '/admin'
    const expected = ADMIN_VIEW_PATHS[currentView]
    if (clean !== expected && !/^\/admin\/submissions\//.test(clean)) {
      window.history.replaceState({}, '', expected)
    }
  }, [path, currentView])
  const [openVenueId, setOpenVenueId] = useState('')

  useEffect(() => {
    if (currentView !== 'venues') setOpenVenueId('')
  }, [currentView])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mainRef = useRef(null)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }, [currentView])
  
  const query = useMemo(() => new URLSearchParams(Object.entries(applied).filter(([,v]) => v)).toString(), [applied])
  function load() { if (platformSuperuser && currentView === 'dashboard') { setError(''); api(`/api/admin/submissions/?${query}`).then(setData).catch(e => setError(e.message)) } }

  useEffect(() => { load() }, [query, currentView])
  async function logout() { await api('/api/admin/logout/', { method: 'POST', body: '{}' }); onLogout() }
  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-flexee-400 via-flexee-500 to-flexee-700 text-[24px] text-white shadow-orange serif">F</div>
          <div>
            <div className="serif text-[30px] leading-none">Flexee</div>
            <div className="mt-1.5 text-[12px] font-extrabold uppercase tracking-[.14em] text-muted">Scholarly Network</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-muted transition hover:bg-flexee-50 hover:text-flexee-700"
          aria-label="Close navigation"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 6 12 12"/>
            <path d="m18 6-12 12"/>
          </svg>
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-4">
        <div className="mb-2 px-3 text-[13px] font-extrabold uppercase tracking-[.12em] text-ink">Workspace</div>
        <nav className="space-y-1.5">
          <button
            className={`nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-extrabold ${currentView === 'editor' ? 'active' : ''}`}
            type="button"
            onClick={() => { setCurrentView('editor'); setSidebarOpen(false) }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <rect x="4" y="3" width="16" height="18" rx="2"/>
                <path d="M8 8h8M8 12h8M8 16h5"/>
              </svg>
            </span>
            Editor Workspace
          </button>

          <button
            className={`nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-extrabold ${currentView === 'venues' ? 'active' : ''}`}
            type="button"
            onClick={() => { setCurrentView('venues'); setSidebarOpen(false) }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>
              </svg>
            </span>
            Venue Agents
          </button>

          {platformSuperuser && <button
            className={`nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-extrabold ${currentView === 'discovery' ? 'active' : ''}`}
            type="button"
            onClick={() => { setCurrentView('discovery'); setSidebarOpen(false) }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/>
                <path d="m20 20-3.4-3.4"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
            </span>
            Venue Discovery
          </button>}

          <button
            className={`nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-extrabold ${currentView === 'audit' ? 'active' : ''}`}
            type="button"
            onClick={() => { setCurrentView('audit'); setSidebarOpen(false) }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M5 4h14v16H5z"/>
                <path d="M8 8h8M8 12h8M8 16h5"/>
              </svg>
            </span>
            Audit Log
          </button>
        </nav>

        {platformSuperuser && <>
          <div className="my-5 border-t border-line"></div>
          <div className="mb-2 px-3 text-[13px] font-extrabold uppercase tracking-[.12em] text-ink">Settings</div>
          <button
            className={`nav-item flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-extrabold ${currentView === 'smtp' ? 'active' : ''}`}
            type="button"
            onClick={() => { setCurrentView('smtp'); setSidebarOpen(false) }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M3 6h18v12H3z"/>
                <path d="m3 7 9 6 9-6"/>
              </svg>
            </span>
            Configure SMTP
          </button>
        </>}

      </div>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-[#faf6f2] p-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-flexee-500 text-[14px] font-black text-white">
            {(username || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-extrabold">{username}</div>
            <div className="text-[13px] font-medium text-muted">Platform administrator</div>
          </div>
          <button type="button" onClick={logout} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted" title="Log out" aria-label="Log out">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M10 17l5-5-5-5"/>
              <path d="M15 12H3"/>
              <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return <AdminTop sidebar={sidebarContent} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} username={username} platformSuperuser={platformSuperuser} memberships={memberships} view={currentView} mainRef={mainRef}>
    
    {currentView === 'smtp' ? (
      <SMTPSettingsPage />
    ) : currentView === 'venues' ? (
      <VenueAgentsPanel key={openVenueId || 'venues'} platformSuperuser={platformSuperuser} memberships={memberships} initialVenueId={openVenueId} />
    ) : currentView === 'discovery' && platformSuperuser ? (
      <Suspense fallback={<div className="premium-card rounded-[22px] p-8 text-center text-[15px] font-semibold text-muted">Loading Venue Discovery…</div>}>
        <VenueDiscoveryPanel onOpenVenue={id => { setOpenVenueId(id); setCurrentView('venues') }} />
      </Suspense>
    ) : currentView === 'editor' ? (
      <EditorWorkspacePanel platformSuperuser={platformSuperuser} memberships={memberships} />
    ) : currentView === 'audit' ? (
      <AuditLogPanel />
    ) : (
      <>
        <div className="admin-ui-page-head">
          <div>
            <p className="venue-admin-kicker">Submission operations</p>
            <h2>Manuscript dashboard</h2>
            <p>Monitor submissions, review states, delivery status, and editorial outcomes.</p>
          </div>
        </div>
        <div className="admin-stats">
          {[{ label: 'Total Submissions', count: data.counts.total || 0, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { label: 'Completed', count: data.counts.completed || 0, color: '#10b981', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Processing', count: data.counts.processing || 0, color: '#f59e0b', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
            { label: 'Failed', count: data.counts.failed || 0, color: '#ef4444', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map((s, i) => (
            <div key={i} className="admin-stat">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                <div className="k" style={{ marginTop: 0, color: s.color || 'var(--muted)' }}>{s.label}</div>
                <div style={{ color: s.color || 'var(--muted)', opacity: 0.8 }}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg></div>
              </div>
              <div className="n" style={{ color: s.color || 'var(--ink)' }}>{s.count}</div>
            </div>
          ))}
        </div>
        <div className="admin-filters">
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input style={{ paddingLeft: '38px' }} type="search" placeholder="Search by title, author, email, or ID..." value={filters.q} onChange={e => setFilters({...filters,q:e.target.value})} />
          </div>
          <select value={filters.status} onChange={e => setFilters({...filters,status:e.target.value})}><option value="">All statuses</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select>
          <select value={filters.kind} onChange={e => setFilters({...filters,kind:e.target.value})}><option value="">All types</option><option value="book">Book</option><option value="article">Article</option></select>
          <select value={filters.decision} onChange={e => setFilters({...filters,decision:e.target.value})}><option value="">All decisions</option>{Object.entries(decisions).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="admin-btn" onClick={() => setApplied(filters)}>Apply Filters</button>
        </div>
        {error && <div className="admin-error">{error}</div>}
    <section className="admin-table-card">
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Submission</th>
              <th>Date</th>
              <th>Summary</th>
              <th>Status</th>
              <th>Decision</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(item => (
              <tr key={item.id} className="data-row" onClick={() => setSelected(item.id)}>
                <td>
                  <div className="data-title">
                    {item.title}
                  </div>
                  <div className="data-meta">{item.author_name}</div>
                  {item.manuscript_filename?.toLowerCase().endsWith('.zip') && (
                    <div className="data-meta" style={{ fontSize: '12px', opacity: 0.7, fontStyle: 'italic' }}>{item.manuscript_filename}</div>
                  )}
                  {item.author_email && <div className="data-meta" style={{ fontSize: '12px', opacity: 0.8 }}>{item.author_email}</div>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ color: 'var(--ink)' }}>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  <div className="data-meta" style={{ fontSize: '12px' }}>{new Date(item.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td onClick={(e) => {
                  e.stopPropagation();
                  window.history.pushState({}, '', `/admin/submissions/${item.id}`)
                  window.dispatchEvent(new Event('popstate'))
                }}>
                  <div className="data-summary" style={{ cursor: 'pointer', color: 'var(--copper)', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.zip_contents && item.zip_contents.length > 0 ? 'View ZIP summaries' : 'View summary'}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </div>
                </td>
                <td><StatusPill value={item.status} /></td>
                <td>
                  <div className="admin-action-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                    {!item.admin_decision ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="admin-action-btn accept" onClick={e => { e.stopPropagation(); setInlineAction({id:item.id, type:'accept'}) }}>Accept</button>
                        <button className="admin-action-btn reject" onClick={e => { e.stopPropagation(); setInlineAction({id:item.id, type:'reject'}) }}>Reject</button>
                      </div>
                    ) : <StatusPill value={item.admin_decision} />}
                    
                    {(item.status === 'failed' || !item.editor_summary?.trim()) && (
                      <button className="admin-btn secondary" style={{padding:'6px 12px',fontSize:'12px',borderRadius:'8px', marginTop: '4px'}} onClick={async (e) => {
                        e.stopPropagation()
                        const pastedKey = window.prompt('Paste Anthropic API key for this one recovery. Leave blank to use backend ANTHROPIC_API_KEY.')
                        if (pastedKey === null) return
                        e.currentTarget.disabled = true
                        e.currentTarget.textContent = 'Generating...'
                        try {
                          await api(`/api/admin/submissions/${item.id}/api-summary/`, { method: 'POST', body: JSON.stringify(pastedKey.trim() ? { api_key: pastedKey.trim() } : {}) })
                          window.alert('API summary generated successfully.')
                          load()
                        } catch (err) {
                          window.alert(err.message || 'API summary recovery failed')
                          load()
                        }
                      }}>API Summary</button>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button className="admin-btn secondary" style={{padding:'6px 12px',fontSize:'12px',borderRadius:'8px'}} onClick={(e) => { e.stopPropagation(); setEmailActionId(item.id); }}>
                      {item.notification_status === 'sent' ? 'Sent' : 'Email'}
                    </button>
                    <button className="admin-icon-btn" onClick={(e) => { e.stopPropagation(); window.open('/api/admin/submissions/' + item.id + '/download/', '_blank'); }} title="View manuscript">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>                    </button>
                    <button className="admin-icon-btn delete-btn" onClick={async (e) => { e.stopPropagation(); if (window.confirm('Delete this submission?')) { await api(`/api/admin/submissions/${item.id}/delete/`, {method: 'POST'}); load(); } }} title="Delete submission">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>No matching submissions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
    {selected && <Detail id={selected} onClose={() => setSelected(null)} />}
    {inlineAction && <ActionModal id={inlineAction.id} action={inlineAction.type} onClose={() => setInlineAction(null)} onRefresh={load} />}
    {emailActionId && <SendEmailModal id={emailActionId} onClose={() => setEmailActionId(null)} onRefresh={load} />}
    {zipViewItem && <ZipContentsModal item={zipViewItem} onClose={() => setZipViewItem(null)} />}
    </>
    )}
  </AdminTop>
}

function AdminSubmissionSummaryPage({ submissionId, onBack }) {
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api(`/api/admin/submissions/${submissionId}/`).then(setItem).catch(e => setError(e.message))
  }, [submissionId])

  if (error) return <AdminTop><div style={{padding: '40px'}}><button className="admin-btn secondary" onClick={onBack}>← Back</button><p style={{color: 'red', marginTop: '20px'}}>{error}</p></div></AdminTop>
  if (!item) return <AdminTop><div style={{padding: '40px'}}><p>Loading...</p></div></AdminTop>

  const docs = Array.isArray(item.zip_contents) ? item.zip_contents : []
  return (
    <AdminTop>
      <div className="admin-summary-page">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px'}}>
        <div>
          <h2 style={{fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '42px', fontWeight: '400', margin: '0 0 10px', color: 'var(--ink)', lineHeight: 1}}>
            {item.title || item.manuscript_filename || 'Submission summary'}
          </h2>
          <div style={{color: 'var(--muted)', fontSize: '15px'}}>
            {item.author_name || '—'} · {item.kind || '—'} · {item.manuscript_filename || ''}
          </div>
        </div>
        <button style={{border: '1px solid rgba(28,26,23,0.1)', background: '#fff', borderRadius: '12px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(28,26,23,0.05)'}} onClick={onBack}>
          ← Back to dashboard
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '26px'}}>
        {[{l: 'Status', v: item.status}, {l: 'AI Decision', v: item.decision}, {l: 'Words', v: Number(item.total_words || 0).toLocaleString()}, {l: 'Email State', v: item.notification_status}].map((m, i) => (
          <div key={i} style={{background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '18px', padding: '16px 18px', boxShadow: '0 8px 28px rgba(28,26,23,0.035)'}}>
            <div style={{fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 800, color: 'var(--muted)', marginBottom: '8px'}}>{m.l}</div>
            <div style={{fontSize: '15px', fontWeight: 700, color: 'var(--ink)'}}>{m.v || '—'}</div>
          </div>
        ))}
      </div>

      <section style={{background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(28,26,23,0.06)', marginBottom: '24px'}}>
        <div style={{padding: '22px 24px', background: 'linear-gradient(135deg, rgba(168,92,50,0.08), rgba(255,255,255,0.6))', borderBottom: '1px solid rgba(168,92,50,0.12)'}}>
          <h3 style={{margin: 0, fontSize: '22px', color: 'var(--ink)'}}>{docs.length ? 'Overall Editor Summary' : 'Editor Summary'}</h3>
          <p style={{margin: '6px 0 0', color: 'var(--muted)', fontSize: '14px'}}>{docs.length ? 'Generated from all extracted ZIP documents.' : 'Generated for this submitted manuscript file.'}</p>
        </div>
        <div style={{whiteSpace: 'pre-wrap', lineHeight: '1.72', fontSize: '15px', color: 'var(--ink)', padding: '24px'}}>
          {item.editor_summary || 'No summary available.'}
        </div>
      </section>

      {docs.length > 0 && (
        <section style={{background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(28,26,23,0.06)', marginBottom: '24px'}}>
          <div style={{padding: '22px 24px', background: 'linear-gradient(135deg, rgba(168,92,50,0.08), rgba(255,255,255,0.6))', borderBottom: '1px solid rgba(168,92,50,0.12)'}}>
            <h3 style={{margin: 0, fontSize: '22px', color: 'var(--ink)'}}>Chapter-wise / PDF-wise Summaries</h3>
            <p style={{margin: '6px 0 0', color: 'var(--muted)', fontSize: '14px'}}>{docs.length} document{docs.length === 1 ? '' : 's'}</p>
          </div>
          <div style={{padding: '24px'}}>
            <div style={{display: 'grid', gap: '16px'}}>
              {docs.map((doc, index) => (
                <article key={index} style={{background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(28,26,23,0.08)', borderRadius: '18px', overflow: 'hidden'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', padding: '18px 20px', background: '#fffaf5', borderBottom: '1px solid rgba(28,26,23,0.07)'}}>
                    <div>
                      <div style={{fontWeight: 800, color: 'var(--ink)', fontSize: '15px'}}>{index + 1}. {doc.filename || 'Document'}</div>
                      <div style={{color: 'var(--muted)', fontSize: '12px', marginTop: '4px'}}>{doc.path || ''}</div>
                    </div>
                    <div style={{whiteSpace: 'nowrap', padding: '6px 11px', borderRadius: '999px', background: 'rgba(28,26,23,0.045)', color: 'var(--muted)', fontSize: '12px', fontWeight: 800}}>
                      {Number(doc.word_count || 0).toLocaleString()} words
                    </div>
                  </div>
                  <div style={{whiteSpace: 'pre-wrap', lineHeight: '1.68', padding: '18px 20px', fontSize: '14px', color: 'var(--ink)'}}>
                    {doc.preview || '(no summary available)'}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>
    </AdminTop>
  )
}

export default function AdminPage({ path }) {
  const [state, setState] = useState({ mode: 'checking', username: '', platformSuperuser: false, memberships: [] })
  async function check() {
    try {
      const s = await api('/api/admin/session/')
      setState({
        mode: s.authenticated ? 'in' : 'out',
        username: s.username || '',
        platformSuperuser: Boolean(s.platform_superuser),
        memberships: s.memberships || [],
      })
    } catch {
      setState({ mode: 'out', username: '', platformSuperuser: false, memberships: [] })
    }
  }
  useEffect(() => { check() }, [])
  if (state.mode === 'checking') return <AdminTop><p>Checking admin session…</p></AdminTop>

  if (state.mode !== 'in') {
    return <AdminLogin onLogin={check} />
  }

  const match = path?.match(/^\/admin\/submissions\/([^/]+)$/)
  const submissionId = match ? match[1] : null

  if (submissionId && state.platformSuperuser) {
    return <AdminSubmissionSummaryPage submissionId={submissionId} onBack={() => {
      window.history.pushState({}, '', '/admin')
      window.dispatchEvent(new Event('popstate'))
    }} />
  }

  return <AdminDashboard path={path} username={state.username} platformSuperuser={state.platformSuperuser} memberships={state.memberships} onLogout={() => setState({mode:'out',username:'',platformSuperuser:false,memberships:[]})} />
}
