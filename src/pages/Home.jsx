import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'

export default function Home() {
  return <PublicationShell>
    <div className="wrap landing-wrap">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Manuscript submissions</div>
      <p className="kicker">Editorial submissions</p>
      <h1 className="publication-title">Share your manuscript.</h1>
      <p className="publication-lede">Log in as an author to upload manuscripts, check semantic readiness, and find matching venues and publications across our network.</p>

      <div className="publication-choices publication-choices-single">
        <article className="choice-card author-entry-card">
          <div className="author-entry-card-head">
            <p className="choice-type">Authors</p>
            <span className="author-entry-eyebrow">Unified submission workspace</span>
          </div>
          <h2>Submit articles, papers, and book manuscripts.</h2>
          <p className="author-entry-copy">Use one author dashboard to upload your work, run readiness checks, compare matching journals, conferences, and publishers, and track each submission through the editorial process.</p>
          <div className="author-entry-types" aria-label="Supported submission types">
            <span>Research articles</span>
            <span>Review articles</span>
            <span>Conference papers</span>
            <span>Case studies</span>
            <span>Book manuscripts</span>
          </div>
          <button className="copper-button author-entry-button" onClick={() => go('/author')}>Go to Author Dashboard</button>
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
