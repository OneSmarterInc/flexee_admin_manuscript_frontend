import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'

export default function Home() {
  return <PublicationShell>
    <div className="wrap landing-wrap">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Manuscript submissions</div>
      <p className="kicker">Editorial submissions</p>
      <h1 className="publication-title">Share your manuscript.</h1>
      <p className="publication-lede">Log in as an author to upload manuscripts, check semantic readiness, and find matching venues and publications across our network.</p>

      <div className="publication-choices">
        <article className="choice-card">
          <p className="choice-type">Authors</p>
          <h2>Manage your submissions in one place.</h2>
          <p>Sign up to upload your manuscripts, receive AI-driven readiness reports, and match with appropriate journals, conferences, and publishers.</p>
          <button className="copper-button" onClick={() => go('/author')}>Go to Author Dashboard</button>
        </article>
      </div>

      <div className="landing-note">
        <h2>What happens after submission?</h2>
        <p>The platform extracts the manuscript text, runs comprehensive structural and semantic readiness checks using our flexible AI integration, automatically matches your work to venues, and handles double-blind reviews.</p>
        <p>When online submission is unavailable, email <a href="mailto:editor@flexee.org">editor@flexee.org</a>.</p>
      </div>
    </div>
  </PublicationShell>
}
