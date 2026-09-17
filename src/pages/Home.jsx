import React from 'react'
import { PublicationShell, go } from '../components/SiteChrome.jsx'

export default function Home() {
  return <PublicationShell>
    <div className="wrap landing-wrap">
      <div className="crumb"><a href="https://www.flexee.org/">Flexee</a> / Manuscript submissions</div>
      <p className="kicker">Editorial submissions</p>
      <h1 className="publication-title">Share your manuscript.</h1>
      <p className="publication-lede">Choose the publication you are submitting to. A submission starts the first-gate editorial review; it is not an acceptance decision.</p>

      <div className="publication-choices">
        <article className="choice-card">
          <p className="choice-type">Five Zero Books</p>
          <h2>A companion book for one Flexee simulation.</h2>
          <p>Submit a Five Zero Book manuscript, name the simulation it pairs with, disclose how AI was used, and send it through the same first-gate rules used by the manuscript review engine.</p>
          <button className="copper-button" onClick={() => go('/submit-book')}>Submit a manuscript</button>
        </article>
        <article className="choice-card">
          <p className="choice-type">Field Notes Journal</p>
          <h2>A first-hand account of AI in practice.</h2>
          <p>Submit a practitioner article about what a business tried, what happened, and—crucially—what did not work.</p>
          <button className="copper-button" onClick={() => go('/submit-article')}>Submit an article</button>
        </article>
      </div>

      <div className="landing-note">
        <h2>What happens after submission?</h2>
        <p>The Django backend extracts the manuscript text, performs the structural checks, calls the configured Anthropic model only when judgment is needed, stores the complete response in SQLite, and records the result for the protected admin dashboard.</p>
        <p>When online submission is unavailable, email <a href="mailto:editor@flexee.org">editor@flexee.org</a>.</p>
      </div>
    </div>
  </PublicationShell>
}
