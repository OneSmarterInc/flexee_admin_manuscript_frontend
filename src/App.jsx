import React, { Suspense, lazy, useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import SubmitBook from './pages/SubmitBook.jsx'
import SubmitArticle from './pages/SubmitArticle.jsx'
// The admin portal is a separate bundle, so authors and visitors never download it.
const AdminPage = lazy(() => import('./pages/Admin.jsx'))
import AuthorDashboard from './pages/AuthorDashboard.jsx'
import AuthorLogin from './pages/AuthorLogin.jsx'
import AuthorSignup from './pages/AuthorSignup.jsx'
import { AuthorForgotPassword, AuthorResetPassword } from './pages/AuthorPasswordReset.jsx'
import AuthorNewSubmission from './pages/AuthorNewSubmission.jsx'
import AuthorReadiness from './pages/AuthorReadiness.jsx'
import AuthorVenueMatches from './pages/AuthorVenueMatches.jsx'
import AuthorVenueAssessment from './pages/AuthorVenueAssessment.jsx'
import AuthorSubmissionStatus from './pages/AuthorSubmissionStatus.jsx'
import AuthorTransfer from './pages/AuthorTransfer.jsx'
import AuthorManuscriptDetails from './pages/AuthorManuscriptDetails.jsx'
import JournalIndex from './pages/JournalIndex.jsx'
import JournalPage from './pages/JournalPage.jsx'
import JournalClaimVerify from './pages/JournalClaimVerify.jsx'
import EditorSetPassword from './pages/EditorSetPassword.jsx'
import { fetchAuthorSession } from './authorApi.js'
import { AuthorAccountContext } from './components/AuthorAccountMenu.jsx'

function RequireAuthor({ children }) {
  const [allowed, setAllowed] = useState(false)
  const [account, setAccount] = useState(null)

  useEffect(() => {
    let active = true

    fetchAuthorSession()
      .then(user => {
        if (!active) return
        if (user) {
          setAccount({ name: user.name || '', email: user.email || '' })
          setAllowed(true)
          return
        }
        window.history.replaceState({}, '', '/author/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      .catch(() => {
        if (!active) return
        window.history.replaceState({}, '', '/author/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

    return () => {
      active = false
    }
  }, [])

  if (!allowed) return null
  return <AuthorAccountContext.Provider value={account}>{children}</AuthorAccountContext.Provider>
}

// Author portal pages share the Admin panel design system.
// The class only wraps author routes, so public pages keep their current look.
function AuthorTheme({ children }) {
  return <div className="author-admin-theme">{children}</div>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const handler = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  if (path === '/submit-book' || path === '/submit-book.html' || path === '/submit-book.php') return <SubmitBook />
  if (path === '/submit-article' || path === '/submit-article.html' || path === '/submit-article.php') return <SubmitArticle />

  // The journal index is public: anyone can search it (build plan step 8).
  if (path === '/journals') return <AuthorTheme><JournalIndex /></AuthorTheme>
  if (path.startsWith('/journals/v/') || path.startsWith('/journals/i/')) return <AuthorTheme><JournalPage path={path} /></AuthorTheme>
  if (path === '/journals/claim/verify') return <AuthorTheme><JournalClaimVerify /></AuthorTheme>
  if (path === '/author/login') return <AuthorTheme><AuthorLogin /></AuthorTheme>
  if (path === '/author/signup') return <AuthorTheme><AuthorSignup /></AuthorTheme>
  if (path === '/author/forgot-password') return <AuthorTheme><AuthorForgotPassword /></AuthorTheme>
  if (path === '/author/reset-password') return <AuthorTheme><AuthorResetPassword /></AuthorTheme>
  if (path === '/author') return <AuthorTheme><RequireAuthor><AuthorDashboard /></RequireAuthor></AuthorTheme>
  if (path === '/author/new') return <AuthorTheme><RequireAuthor><AuthorNewSubmission /></RequireAuthor></AuthorTheme>
  if (path === '/author/manuscript') return <AuthorTheme><RequireAuthor><AuthorNewSubmission mode="edit" /></RequireAuthor></AuthorTheme>
  if (path === '/author/manuscript-details') return <AuthorTheme><RequireAuthor><AuthorManuscriptDetails /></RequireAuthor></AuthorTheme>
  if (path === '/author/readiness') return <AuthorTheme><RequireAuthor><AuthorReadiness /></RequireAuthor></AuthorTheme>
  if (path === '/author/venues') return <AuthorTheme><RequireAuthor><AuthorVenueMatches /></RequireAuthor></AuthorTheme>
  if (path === '/author/venue-assessment' || path.startsWith('/author/venue-assessment/')) return <AuthorTheme><RequireAuthor><AuthorVenueAssessment /></RequireAuthor></AuthorTheme>
  if (path === '/author/status') return <AuthorTheme><RequireAuthor><AuthorSubmissionStatus /></RequireAuthor></AuthorTheme>
  if (path === '/author/transfer') return <AuthorTheme><RequireAuthor><AuthorTransfer /></RequireAuthor></AuthorTheme>

  if (path === '/admin/set-password') return <EditorSetPassword />
  if (path.startsWith('/admin')) return <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#746c66', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading admin…</div>}><AdminPage path={path} /></Suspense>
  return <Home />
}
