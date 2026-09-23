import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api.js'
import { go } from '../components/SiteChrome.jsx'
import VenueAgentsPanel from '../components/admin/VenueAgentsPanel.jsx'
import EditorWorkspacePanel from '../components/admin/EditorWorkspacePanel.jsx'

const decisions = {
  PASS_TO_HUMAN: 'Pass to human',
  REFER_TO_HUMAN_WITH_FLAGS: 'Refer with flags',
  RETURN_TO_AUTHOR: 'Return to author',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
}

function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label> }
function StatusPill({ value }) { return <span className={`admin-badge ${value || ''}`}>{decisions[value] || value || '—'}</span> }

function AdminTop({ children, sidebar, sidebarOpen = true, onToggleSidebar }) {
  return (
    <div className="admin-page" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
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
          borderRight: sidebarOpen ? '1px solid rgba(255,255,255,0.8)' : 'none', 
          background: 'rgba(255,255,255,0.65)', 
          backdropFilter: 'blur(40px) saturate(150%)', 
          boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.03)' : 'none',
          display: 'flex', 
          flexDirection: 'column', 
          zIndex: 10,
          transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
                <button type="button" onClick={() => setShowQR(true)} style={{ background: 'none', border: 'none', color: 'var(--copper)', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>First time logging in? Setup Authenticator</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '16px', padding: '16px', background: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line)' }}>
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
    } catch (err) { setError(err.message); }
    finally { setTesting(false); }
  }

  // Clear test success if they change fields
  const updateForm = (updates) => {
    setForm({ ...form, ...updates });
    setTestSuccess(false);
    setSuccess('');
    setError('');
  };

  if (loading) return <p>Loading current settings…</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', border: '1px solid #e5e5e5', padding: '32px' }}>
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender Name</label>
            <input type="text" value={form.sender_name} onChange={e => updateForm({ sender_name: e.target.value })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender Email</label>
            <input type="email" value={form.sender_email} onChange={e => updateForm({ sender_email: e.target.value })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reply-To Email (Optional)</label>
            <input type="email" value={form.reply_to_email} onChange={e => updateForm({ reply_to_email: e.target.value })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Protocol</label>
            <select value={getSecurityProtocol()} onChange={e => handleSecurityChange(e.target.value)}
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px', background: '#fff' }}>
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="None">None</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMTP Host</label>
            <input type="text" value={form.host} onChange={e => updateForm({ host: e.target.value })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMTP Port</label>
            <input type="number" value={form.port} onChange={e => updateForm({ port: parseInt(e.target.value) || 587 })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMTP Username</label>
            <input type="text" value={form.username} onChange={e => updateForm({ username: e.target.value })} 
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMTP Password</label>
            <input type="password" value={form.password} onChange={e => updateForm({ password: e.target.value })} 
              placeholder="Leave blank to keep existing"
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1', marginTop: '16px', borderTop: '1px solid #e5e5e5', paddingTop: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notification Emails (Optional)</label>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Comma-separated emails that will receive a BCC copy of all emails sent to authors (submissions, accepts, rejects, and custom emails).</p>
            <input type="text" value={form.admin_notification_emails || ''} onChange={e => updateForm({ admin_notification_emails: e.target.value })} 
              placeholder="e.g. editor1@flexee.org, editor2@flexee.org"
              style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1', marginTop: '8px', borderTop: '1px dashed #e5e5e5', paddingTop: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Email Recipient (Optional)</label>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Where should the test email be sent? If blank, it sends to the Sender Email.</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="email" value={form.test_email || ''} onChange={e => updateForm({ test_email: e.target.value })} 
                placeholder="e.g. test@example.com"
                style={{ border: '1px solid #ccc', padding: '10px 12px', fontSize: '15px', width: '400px', maxWidth: '100%' }} />
              
              <button type="button" onClick={handleTest} disabled={testing}
                style={{ 
                  background: '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', 
                  fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.05em', 
                  cursor: testing ? 'wait' : 'pointer', textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                {testing ? 'TESTING...' : 'TEST CONNECTION'}
              </button>
            </div>
          </div>

        </div>

        <div style={{ height: '1px', background: '#e5e5e5', margin: '32px 0 24px 0' }}></div>

        {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ color: '#10b981', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={busy}
            style={{ 
              background: '#121212', 
              color: '#fff', border: 'none', padding: '14px 24px', 
              fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.05em', 
              cursor: busy ? 'wait' : 'pointer', textTransform: 'uppercase'
            }}>
            {busy ? 'SAVING...' : 'SAVE CONFIGURATION'}
          </button>
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

function AdminDashboard({ username, onLogout }) {
  const [filters, setFilters] = useState({ q: '', kind: '', status: '', decision: '' })
  const [applied, setApplied] = useState(filters)
  const [data, setData] = useState({ counts: {}, items: [] })
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [inlineAction, setInlineAction] = useState(null)
  const [emailActionId, setEmailActionId] = useState(null)
  const [zipViewItem, setZipViewItem] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const setKindFilter = (k) => { const nf = {...filters, kind: k}; setFilters(nf); setApplied(nf); setCurrentView('dashboard'); }
  
  const query = useMemo(() => new URLSearchParams(Object.entries(applied).filter(([,v]) => v)).toString(), [applied])
  function load() { if (currentView === 'dashboard') { setError(''); api(`/api/admin/submissions/?${query}`).then(setData).catch(e => setError(e.message)) } }

  useEffect(() => { load() }, [query, currentView])
  async function logout() { await api('/api/admin/logout/', { method: 'POST', body: '{}' }); onLogout() }
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 24px 32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--copper)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px', fontFamily: "'Instrument Serif', serif" }}>F</div>
        <h1 style={{ margin: 0, fontSize: '28px', fontFamily: "'Instrument Serif', Georgia, serif", color: 'var(--ink)', lineHeight: 1, fontWeight: 'bold' }}>Flexee</h1>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', paddingLeft: '16px' }}>Views</div>
        
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none', background: filters.kind === '' ? 'rgba(168,92,50,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer', color: filters.kind === '' ? 'var(--copper)' : 'var(--ink)', fontWeight: filters.kind === '' ? 600 : 500, transition: 'all 0.2s', fontSize: '15px' }} 
          onClick={() => setKindFilter('')}
          onMouseEnter={e => e.currentTarget.style.background = filters.kind === '' ? 'rgba(168,92,50,0.1)' : 'rgba(28,26,23,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = filters.kind === '' ? 'rgba(168,92,50,0.1)' : 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          All Submissions
        </button>

        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none', background: filters.kind === 'book' ? 'rgba(168,92,50,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer', color: filters.kind === 'book' ? 'var(--copper)' : 'var(--ink)', fontWeight: filters.kind === 'book' ? 600 : 500, transition: 'all 0.2s', fontSize: '15px' }} 
          onClick={() => setKindFilter('book')}
          onMouseEnter={e => e.currentTarget.style.background = filters.kind === 'book' ? 'rgba(168,92,50,0.1)' : 'rgba(28,26,23,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = filters.kind === 'book' ? 'rgba(168,92,50,0.1)' : 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Books Only
        </button>

        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none', background: filters.kind === 'article' ? 'rgba(168,92,50,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer', color: filters.kind === 'article' ? 'var(--copper)' : 'var(--ink)', fontWeight: filters.kind === 'article' ? 600 : 500, transition: 'all 0.2s', fontSize: '15px' }} 
          onClick={() => setKindFilter('article')}
          onMouseEnter={e => e.currentTarget.style.background = filters.kind === 'article' ? 'rgba(168,92,50,0.1)' : 'rgba(28,26,23,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = filters.kind === 'article' ? 'rgba(168,92,50,0.1)' : 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Articles Only
        </button>
        
        <div style={{ height: '1px', background: 'rgba(28,26,23,0.08)', margin: '16px 0' }}></div>

        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', paddingLeft: '16px' }}>Scholarly network</div>

        <button
          className={`admin-side-nav-button ${currentView === 'editor' ? 'active' : ''}`}
          type="button"
          onClick={() => setCurrentView('editor')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="m9 10 2 2 4-4"/></svg>
          Editor Workspace
        </button>

        <button
          className={`admin-side-nav-button ${currentView === 'venues' ? 'active' : ''}`}
          type="button"
          onClick={() => setCurrentView('venues')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.8-2.8.1-.1A1.7 1.7 0 0 0 4.8 15a1.7 1.7 0 0 0-1.5-1H3v-4h.3a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.8-2.8.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3h4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2v4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>
          Venue Agents
        </button>

        <div style={{ height: '1px', background: 'rgba(28,26,23,0.08)', margin: '16px 0' }}></div>
        
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', paddingLeft: '16px' }}>Settings</div>
        
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', borderRadius: '10px', border: 'none', background: currentView === 'smtp' ? 'rgba(168,92,50,0.1)' : 'transparent', textAlign: 'left', cursor: 'pointer', color: currentView === 'smtp' ? 'var(--copper)' : 'var(--ink)', fontWeight: 500, transition: 'all 0.2s', fontSize: '15px' }} 
          onClick={() => setCurrentView('smtp')}
          onMouseEnter={e => e.currentTarget.style.background = currentView === 'smtp' ? 'rgba(168,92,50,0.1)' : 'rgba(28,26,23,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = currentView === 'smtp' ? 'rgba(168,92,50,0.1)' : 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Configure SMTP
        </button>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(28,26,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--copper), #e68d5c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{username}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Administrator</div>
          </div>
        </div>
        <button 
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s' }}
          onClick={logout}
          title="Sign out"
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </div>
  )

  return <AdminTop sidebar={sidebarContent} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}>
    
    {currentView === 'smtp' ? (
      <>
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '42px', fontWeight: 'normal', margin: '0 0 12px 0', color: 'var(--ink)', letterSpacing: '0', lineHeight: 1 }}>Setup SMTP</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '16px' }}>Configure email delivery settings for notifications.</p>
          </div>
        </div>
        <SMTPSettingsPage />
      </>
    ) : currentView === 'venues' ? (
      <VenueAgentsPanel />
    ) : currentView === 'editor' ? (
      <EditorWorkspacePanel />
    ) : (
      <>
        <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '42px', fontWeight: 'normal', margin: '0 0 12px 0', color: 'var(--ink)', letterSpacing: '0', lineHeight: 1 }}>Dashboard Overview</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '16px' }}>Review results, delivery state, and submission diagnostics.</p>
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
                  if (item.zip_contents && item.zip_contents.length > 0) {
                    e.stopPropagation();
                    setZipViewItem(item);
                  }
                }}>
                  <div className="data-summary" style={item.zip_contents && item.zip_contents.length > 0 ? { cursor: 'pointer', color: 'var(--copper)', fontWeight: 600 } : {}}>
                    {item.zip_contents && item.zip_contents.length > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        View summaries
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </span>
                    ) : (item.editor_summary || '—')}
                  </div>
                </td>
                <td><StatusPill value={item.status} /></td>
                <td>
                  {!item.admin_decision ? (
                    <div className="admin-action-group">
                      <button className="admin-action-btn accept" onClick={e => { e.stopPropagation(); setInlineAction({id:item.id, type:'accept'}) }}>Accept</button>
                      <button className="admin-action-btn reject" onClick={e => { e.stopPropagation(); setInlineAction({id:item.id, type:'reject'}) }}>Reject</button>
                    </div>
                  ) : <StatusPill value={item.admin_decision} />}
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

export default function AdminPage() {
  const [state, setState] = useState({ mode: 'checking', username: '' })
  async function check() { try { const s = await api('/api/admin/session/'); setState({ mode: s.authenticated ? 'in' : 'out', username: s.username || '' }) } catch { setState({ mode: 'out', username: '' }) } }
  useEffect(() => { check() }, [])
  if (state.mode === 'checking') return <AdminTop><p>Checking admin session…</p></AdminTop>
  return state.mode === 'in' ? <AdminDashboard username={state.username} onLogout={() => setState({mode:'out',username:''})} /> : <AdminLogin onLogin={check} />
}
