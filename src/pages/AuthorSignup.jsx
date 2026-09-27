import React, { useState } from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'
import { authorRegister } from '../authorApi.js'

export default function AuthorSignup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authorRegister(name, email, password)
      go('/author')
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicationShell>
      <div className="wrap author-auth-page">
        <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author workspace / Create account</div>

        <section className="author-auth-shell">
          <div className="author-auth-intro">
            <p className="kicker">Author workspace</p>
            <h1>Create your author account.</h1>
            <p className="author-auth-lede">Set up a secure workspace for manuscript preparation, venue matching, submission tracking, and editorial feedback.</p>

            <div className="author-auth-benefits" aria-label="Workspace benefits">
              <div><span>01</span><p><b>Prepare once</b><small>Upload a manuscript and keep its readiness and evidence history together.</small></p></div>
              <div><span>02</span><p><b>Compare participating venues</b><small>Use each venue's configured scope, policies, methods, and priorities.</small></p></div>
              <div><span>03</span><p><b>Stay in control</b><small>You choose where to submit; human editors make the final editorial decision.</small></p></div>
            </div>
          </div>

          <div className="author-auth-card">
            <div className="author-auth-card-head">
              <span className="author-auth-eyebrow">New author</span>
              <h2>Create an account</h2>
              <p>Use an email address you can access for account verification.</p>
            </div>

            <form className="author-auth-form" onSubmit={handleSubmit}>
              {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}

              <label htmlFor="name">
                <span>Full name</span>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <small>Use at least 8 characters.</small>
              </label>

              <button type="submit" className="copper-button author-auth-submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="author-auth-divider"><span>Already registered?</span></div>

            <button className="author-auth-secondary" type="button" onClick={() => go('/author/login')}>
              Sign in instead
            </button>

            <p className="author-auth-note">After registration, continue with the existing email-verification and submission workflow.</p>
          </div>
        </section>
      </div>
    </PublicationShell>
  )
}
