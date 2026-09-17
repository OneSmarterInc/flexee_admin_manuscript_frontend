import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api.js'
import { go, SiteHeader, SiteFooter } from '../components/SiteChrome.jsx'

const decisions = {
  PASS_TO_HUMAN: 'Pass to human',
  REFER_TO_HUMAN_WITH_FLAGS: 'Refer with flags',
  RETURN_TO_AUTHOR: 'Return to author',
}

function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label> }
function StatusPill({ value }) { return <span className={`admin-badge ${value || ''}`}>{decisions[value] || value || '—'}</span> }

function AdminTop({ children, sidebar, sidebarOpen = true, onToggleSidebar }) {
  return (
    <div className="admin-page" style={{ display: 'flex', minHeight: '100vh', alignItems: 'stretch' }}>
      
      {sidebar && (
        <button 
          onClick={onToggleSidebar}
          style={{ 
            position: 'fixed', top: '24px', left: '24px', zIndex: 60, 
            padding: '10px', background: 'var(--copper)', color: '#fff', borderRadius: '10px', 
            display: 'flex', boxShadow: '0 4px 12px rgba(168,92,50,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      )}

      {sidebar && (
        <aside style={{ 
          width: sidebarOpen ? '280px' : '0px', 
          opacity: sidebarOpen ? 1 : 0,
          overflow: 'hidden',
          flexShrink: 0, 
          borderRight: sidebarOpen ? '1px solid rgba(28,26,23,0.08)' : 'none', 
          background: 'rgba(255,255,255,0.6)', 
          backdropFilter: 'blur(10px)', 
          display: 'flex', 
          flexDirection: 'column', 
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{ width: '280px', height: '100%', paddingTop: '80px' }}>
            {sidebar}
          </div>
        </aside>
      )}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <div className="admin-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 48px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}

function AdminLogin({ onLogin }) {
  const [step, setStep] = useState(1)
  const [creds, setCreds] = useState({ username: '', password: '' })
  const [totpUri, setTotpUri] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(false)

  async function handleStep1(e) {
    e.preventDefault(); setBusy(true); setError('')
    const form = new FormData(e.currentTarget)
    const username = form.get('username')
    const password = form.get('password')
    try {
      const res = await api('/api/admin/verify-password/', { method: 'POST', body: JSON.stringify({ username, password }) })
      setCreds({ username, password })
      setTotpUri(res.totp_uri)
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

  return (
    <div className="admin-login-page">
      <div className="admin-login-wrapper" style={{ transition: 'all 0.3s ease' }}>
        <div className="admin-login-header">
          <h1 style={{fontFamily:"'Instrument Serif', Georgia, serif", fontSize: '42px', margin: '0 0 8px 0', color: 'var(--ink)'}}>Flexee Admin</h1>
          <p style={{color: 'var(--muted)', margin: 0, fontSize: '15px'}}>{step === 1 ? 'Sign in to manage manuscript submissions.' : 'Enter your authenticator code.'}</p>
        </div>
        
        {step === 1 ? (
          <form onSubmit={handleStep1} className="admin-login-form">
            <Field label="Username"><input name="username" autoComplete="username" required autoFocus /></Field>
            <Field label="Password"><input name="password" type="password" autoComplete="current-password" required /></Field>
            {error && <div className="admin-error" role="alert" style={{margin: 0}}>{error}</div>}
            <button className="admin-btn login-btn" type="submit" disabled={busy}>{busy ? 'Verifying...' : 'Continue'}</button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="admin-login-form">
            <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" defaultValue={creds.username} />
            <input type="password" name="password" style={{ display: 'none' }} autoComplete="current-password" defaultValue={creds.password} />
            <Field label="Authenticator code"><input name="totp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" required placeholder="000000" autoFocus /></Field>
            {error && <div className="admin-error" role="alert" style={{margin: 0}}>{error}</div>}
            <button className="admin-btn login-btn" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              {!showQR ? (
                <button type="button" onClick={() => setShowQR(true)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>First time logging in? Setup Authenticator</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '16px', padding: '16px', background: 'var(--canvas)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>Scan this QR code with Google Authenticator or Authy:</p>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}>
                    <QRCodeSVG value={totpUri} size={150} />
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
        
        <div style={{textAlign: 'center', marginTop: '28px'}}>
          <button type="button" onClick={() => step === 2 ? setStep(1) : go('/')} style={{background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px'}}>
            &larr; {step === 2 ? 'Back' : 'Return to public site'}
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
      
      {data.editor_summary && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Editor Summary</h3>
          <div className="admin-card" style={{ padding: '16px', background: 'var(--canvas)', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '14px' }}>
            {data.editor_summary}
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
      <form onSubmit={handleSubmit} className="admin-card" onClick={e => e.stopPropagation()} style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '32px', fontWeight: 400 }}>
          {action === 'accept' ? 'Accept Submission' : 'Reject Submission'}
        </h3>
        <Field label={action === 'accept' ? 'Message to author (optional)' : 'Reason for rejection'}>
          <textarea required={action === 'reject'} value={message} onChange={e => setMessage(e.target.value)} rows={5} />
        </Field>
        {error && <div className="admin-error">{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '20px' }}>
          <button className={`admin-btn ${action === 'reject' ? 'danger' : ''}`} type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send mail'}
          </button>
          <button className="admin-btn secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function SMTPSettingsModal({ onClose }) {
  const [form, setForm] = useState({ host: '', port: 587, username: '', password: '', use_tls: true })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api('/api/admin/smtp/').then(data => {
      setForm(data)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      await api('/api/admin/smtp/', { method: 'POST', body: JSON.stringify(form) })
      setSuccess('SMTP settings saved successfully!')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSave} className="admin-card" onClick={e => e.stopPropagation()} style={{ padding: '32px', width: '100%', maxWidth: '480px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '32px', fontWeight: 400 }}>Setup SMTP</h3>
        <p style={{ color: 'var(--muted)', margin: '0 0 24px 0', fontSize: '14px' }}>Configure email delivery settings for notifications.</p>
        {loading ? <p>Loading current settings…</p> : <>
          <Field label="SMTP Host"><input type="text" value={form.host} onChange={e => setForm({...form, host: e.target.value})} placeholder="e.g. smtp.gmail.com" required /></Field>
          <Field label="Port"><input type="number" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value) || 587})} placeholder="587" required /></Field>
          <Field label="Username"><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="your-email@gmail.com" required /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="App password" required /></Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--ink)' }}>
            <input type="checkbox" checked={form.use_tls} onChange={e => setForm({...form, use_tls: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: 'var(--brand)' }} />
            Use TLS (recommended)
          </label>
        </>}
        {error && <div className="admin-error" style={{ marginTop: '16px' }}>{error}</div>}
        {success && <div style={{ marginTop: '16px', padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '14px' }}>{success}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '24px' }}>
          <button className="admin-btn" type="submit" disabled={busy || loading}>{busy ? 'Saving...' : 'Save Settings'}</button>
          <button className="admin-btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
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
      <form onSubmit={handleSubmit} className="admin-card" onClick={e => e.stopPropagation()} style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '32px', fontWeight: 400 }}>
          Send Custom Email
        </h3>
        <Field label="Subject">
          <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} />
        </Field>
        <Field label="Message Body">
          <textarea required value={body} onChange={e => setBody(e.target.value)} rows={8} />
        </Field>
        {error && <div className="admin-error">{error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '20px' }}>
          <button className="admin-btn" type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send mail'}
          </button>
          <button className="admin-btn secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function AdminDashboard({ username, onLogout }) {
  const [filters, setFilters] = useState({ q: '', kind: '', status: '', decision: '' })
  const [applied, setApplied] = useState(filters)
  const [data, setData] = useState({ counts: {}, items: [] })
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [inlineAction, setInlineAction] = useState(null)
  const [emailActionId, setEmailActionId] = useState(null)
  const [smtpOpen, setSmtpOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const setKindFilter = (k) => { const nf = {...filters, kind: k}; setFilters(nf); setApplied(nf); setMenuOpen(false); }
  
  const query = useMemo(() => new URLSearchParams(Object.entries(applied).filter(([,v]) => v)).toString(), [applied])
  function load() { setError(''); api(`/api/admin/submissions/?${query}`).then(setData).catch(e => setError(e.message)) }
  useEffect(() => { load() }, [query])
  async function logout() { await api('/api/admin/logout/', { method: 'POST', body: '{}' }); onLogout() }
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 24px 32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
        <div>
          <h1 style={{ margin: '0 0 0 8px', fontSize: '32px', fontFamily: "'Instrument Serif', Georgia, serif", color: 'var(--ink)', lineHeight: 1 }}>Flexee</h1>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', marginTop: '8px' }}>Views</div>
        <button style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filters.kind === '' ? 'rgba(28,26,23,0.06)' : 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', fontWeight: filters.kind === '' ? 600 : 400, transition: 'background 0.2s' }} onClick={() => setKindFilter('')}>All Submissions</button>
        <button style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filters.kind === 'book' ? 'rgba(28,26,23,0.06)' : 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', fontWeight: filters.kind === 'book' ? 600 : 400, transition: 'background 0.2s' }} onClick={() => setKindFilter('book')}>Books Only</button>
        <button style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', background: filters.kind === 'article' ? 'rgba(28,26,23,0.06)' : 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', fontWeight: filters.kind === 'article' ? 600 : 400, transition: 'background 0.2s' }} onClick={() => setKindFilter('article')}>Articles Only</button>
        
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', marginTop: '24px' }}>Settings</div>
        <button style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', transition: 'background 0.2s' }} onClick={() => setSmtpOpen(true)}>⚙ Configure SMTP</button>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(28,26,23,0.08)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>{username}</div>
        <button className="admin-btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={logout}>Sign out</button>
      </div>
    </div>
  )

  return <AdminTop sidebar={sidebarContent} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}>
    <div style={{ marginBottom: '32px' }}>
      <div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '42px', fontWeight: 400, margin: '0 0 8px 0', color: 'var(--ink)', letterSpacing: '-0.02em' }}>Dashboard Overview</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '16px' }}>Review results, delivery state, and submission diagnostics.</p>
      </div>
    </div>
    <div className="admin-stats"><div className="admin-card admin-stat"><div className="n">{data.counts.total || 0}</div><div className="k">Total submissions</div></div><div className="admin-card admin-stat"><div className="n">{data.counts.completed || 0}</div><div className="k">Completed</div></div><div className="admin-card admin-stat"><div className="n">{data.counts.processing || 0}</div><div className="k">Processing</div></div><div className="admin-card admin-stat"><div className="n">{data.counts.failed || 0}</div><div className="k">Failed</div></div></div>
    <div className="admin-card admin-filters"><input className="search" type="search" placeholder="Search title, author, email, or submission ID" value={filters.q} onChange={e => setFilters({...filters,q:e.target.value})} /><select value={filters.status} onChange={e => setFilters({...filters,status:e.target.value})}><option value="">All statuses</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select><select value={filters.kind} onChange={e => setFilters({...filters,kind:e.target.value})}><option value="">All types</option><option value="book">Book</option><option value="article">Article</option></select><select value={filters.decision} onChange={e => setFilters({...filters,decision:e.target.value})}><option value="">All decisions</option>{Object.entries(decisions).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><button className="admin-btn" onClick={() => setApplied(filters)}>Apply</button></div>
    {error && <div className="admin-error">{error}</div>}
    <section className="admin-card admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>Title / Author</th><th>Created</th><th>Summary</th><th>Status</th><th>Action</th><th>View</th><th>Email</th><th style={{width:'40px'}}></th></tr></thead><tbody>{data.items.map(item => <tr className="data-row" key={item.id} onClick={() => setSelected(item.id)}><td><b>{item.title}</b><small>{item.author_name}{item.author_email ? ` · ${item.author_email}` : ''}</small></td><td>{new Date(item.created_at).toLocaleString()}</td><td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.editor_summary || '—'}</td><td><StatusPill value={item.status} /></td><td>{!item.admin_decision ? <div style={{display:'flex',gap:'8px'}}><button className="admin-btn" style={{padding:'6px 14px',fontSize:'13px'}} onClick={e => {e.stopPropagation(); setInlineAction({id:item.id, type:'accept'})}}>Accept</button><button className="admin-btn danger" style={{padding:'6px 14px',fontSize:'13px'}} onClick={e => {e.stopPropagation(); setInlineAction({id:item.id, type:'reject'})}}>Reject</button></div> : <StatusPill value={item.admin_decision} />}</td><td><button style={{background:'none',border:'none',color:'var(--ink, #000)',cursor:'pointer',padding:'4px'}} onClick={(e) => { e.stopPropagation(); window.open('/api/admin/submissions/' + item.id + '/download/', '_blank'); }} title="View manuscript"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></td><td><button className="admin-btn secondary" style={{padding:'4px 10px',fontSize:'12px'}} onClick={(e) => { e.stopPropagation(); setEmailActionId(item.id); }}>{item.notification_status === 'sent' ? 'Sent' : (item.notification_status || 'Email')}</button></td><td><button style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',padding:'4px'}} onClick={async (e) => { e.stopPropagation(); if (window.confirm('Delete this submission?')) { await api(`/api/admin/submissions/${item.id}/delete/`, {method: 'POST'}); load(); } }} title="Delete submission"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td></tr>)}{!data.items.length && <tr><td colSpan="8" className="admin-empty">No matching submissions.</td></tr>}</tbody></table></div></section>
    {selected && <Detail id={selected} onClose={() => setSelected(null)} />}
    {inlineAction && <ActionModal id={inlineAction.id} action={inlineAction.type} onClose={() => setInlineAction(null)} onRefresh={load} />}
    {emailActionId && <SendEmailModal id={emailActionId} onClose={() => setEmailActionId(null)} onRefresh={load} />}
    {smtpOpen && <SMTPSettingsModal onClose={() => setSmtpOpen(false)} />}
  </AdminTop>
}

export default function AdminPage() {
  const [state, setState] = useState({ mode: 'checking', username: '' })
  async function check() { try { const s = await api('/api/admin/session/'); setState({ mode: s.authenticated ? 'in' : 'out', username: s.username || '' }) } catch { setState({ mode: 'out', username: '' }) } }
  useEffect(() => { check() }, [])
  if (state.mode === 'checking') return <AdminTop><p>Checking admin session…</p></AdminTop>
  return state.mode === 'in' ? <AdminDashboard username={state.username} onLogout={() => setState({mode:'out',username:''})} /> : <AdminLogin onLogin={check} />
}
