import React, { useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { authorLogin } from '../authorApi.js'

export default function AuthorLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authorLogin(email, password)
      go('/author')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicationShell>
      <div className="wrap author-auth-page">
        <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace / Sign in</div>

        <section className="author-auth-shell">
          <div className="author-auth-intro">
            <p className="kicker">Author workspace</p>
            <h1>Manage your manuscript journey in one secure place.</h1>
            <p className="author-auth-lede">Sign in to prepare submissions, review readiness, compare venues, track editorial decisions, and transfer a manuscript when needed.</p>

            <div className="author-auth-benefits" aria-label="Workspace benefits">
              <div><span>01</span><p><b>One manuscript record</b><small>Keep your manuscript, readiness history, and venue-specific submissions connected.</small></p></div>
              <div><span>02</span><p><b>Venue-specific preparation</b><small>Review scope, policy, evidence, and editorial requirements before submission.</small></p></div>
              <div><span>03</span><p><b>Human editorial decisions</b><small>AI assists with preparation while editors retain publication authority.</small></p></div>
            </div>
          </div>

          <div className="author-auth-card">
            <div className="author-auth-card-head">
              <span className="author-auth-eyebrow">Welcome back</span>
              <h2>Sign in to your account</h2>
              <p>Use the email and password associated with your author account.</p>
            </div>

            <form className="author-auth-form" onSubmit={handleSubmit}>
              {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}

              <label htmlFor="email">
                <span>Email address</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label htmlFor="password">
                <span>Password</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button type="submit" className="copper-button author-auth-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="author-auth-divider"><span>New to Flexee?</span></div>

            <button className="author-auth-secondary" type="button" onClick={() => go('/author/signup')}>
              Create an author account
            </button>

            <p className="author-auth-note">Your manuscript workspace is available only after authentication.</p>
          </div>
        </section>
      </div>
    </PublicationShell>
  )
}
