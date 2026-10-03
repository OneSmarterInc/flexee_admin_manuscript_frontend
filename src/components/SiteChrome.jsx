import React, { useState } from 'react'

const external = {
  home: 'https://www.flexee.org/',
  how: 'https://www.flexee.org/#how-different',
  simulations: 'https://www.flexee.org/#simulations',
  rapid: 'https://rapidsims.flexee.org/',
  books: 'https://www.flexee.org/books.php',
  journal: 'https://www.flexee.org/journal.php',
  executive: 'https://www.flexee.org/#executive-education',
  contact: 'https://www.flexee.org/#contact',
}

export function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const links = [
    [external.how, 'How the simulations work'], [external.simulations, 'Simulations'],
    [external.rapid, 'RapidSims'], [external.books, 'Five Zero Books'],
    [external.journal, 'Field Notes Journal'], [external.executive, 'Executive Education'],
    [external.contact, 'Contact'],
  ]
  return <>
    <div className="announce">Five Zero Books and Field Notes Journal — inaugural editor announced</div>
    <header className="site-header">
      <div className="wrap nav">
        <button className="logo-button" onClick={() => go('/')}>flexee</button>
        <nav className="nav-links" aria-label="Primary">
          {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <button className="hamburger" type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
      </div>
    </header>
    <div className={`mobile-overlay ${open ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
      <button className="overlay-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
      <button className="mobile-local" onClick={() => { setOpen(false); go('/') }}>Manuscript submissions</button>
      {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
    </div>
  </>
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="wrap">
      <div className="footer-grid">
        <div>
          <div className="footer-tag">flexee</div>
          <p className="footer-copy">AI-first business education for students, faculty, corporate trainers, and government acquisition programs.</p>
        </div>
        <div className="footer-col">
          <h4>Simulations</h4>
          <a href="https://www.flexee.org/supply-chain.php">Supply Chain</a>
          <a href="https://www.flexee.org/supply-chain-executive.php">Supply Chain Executive</a>
          <a href="https://www.flexee.org/analytics.php">Data Analytics</a>
          <a href="https://www.flexee.org/healthcare.php">Healthcare</a>
          <a href="https://www.flexee.org/finance.php">Financial Accounting</a>
          <a href="https://www.flexee.org/erp.php">ERP</a>
          <a href="https://www.flexee.org/acquisitions.php">Defense Acquisitions</a>
          <a href="https://www.flexee.org/mis.php">MIS</a>
        </div>
        <div className="footer-col">
          <h4>Products</h4>
          <a href="https://rapidsims.flexee.org/">RapidSims</a>
          <a href="https://www.flexee.org/books.php">Five Zero Books</a>
          <a href="https://www.flexee.org/journal.php">Field Notes Journal</a>
          <a href="https://www.flexee.org/#executive-education">Executive Education</a>
        </div>
        <div className="footer-col">
          <h4>For faculty</h4>
          <a href="https://www.flexee.org/pricing.php">Pricing</a>
          <a href="https://www.flexee.org/custom.php">Custom builds</a>
          <a href="https://www.flexee.org/security.php">Security & privacy</a>
          <a href="https://www.flexee.org/support.php">Support</a>
          <a href="https://www.flexee.org/contact.php">Contact</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Flexee LLC. All rights reserved.</span>
        <span><a href="https://x.com/FlexeeLLC">X</a><a href="https://www.youtube.com/@FlexeeLLC">YouTube</a></span>
      </div>
    </div>
  </footer>
}

export function PublicationShell({ children }) {
  return <><SiteHeader /><main className="publication-main">{children}</main><SiteFooter /></>
}
