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
      <div className="wrap author-dashboard">
        <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Author Login</div>
        <section className="author-hero" style={{ paddingBottom: '2rem' }}>
          <div>
            <h1 className="publication-title">Author Login</h1>
            <p className="publication-lede">Sign in to manage your manuscripts, view feedback, and submit new work.</p>
          </div>
        </section>

        <section className="author-form-section" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <form className="author-workflow-form" onSubmit={handleSubmit}>
            {error && <div className="author-prototype-notice author-error-banner" role="alert">{error}</div>}
            
            <div className="row">
              <label htmlFor="email">Email</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="row">
              <label htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="copper-button" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '14.5px' }}>
              Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); go('/author/signup') }}>Sign up</a>
            </p>
          </form>
        </section>
      </div>
    </PublicationShell>
  )
}
