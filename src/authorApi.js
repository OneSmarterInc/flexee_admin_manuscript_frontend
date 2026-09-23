import { api } from './api.js'

const SESSION_KEY = 'flexeeAuthorSessionV1'

export function getAuthorSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveAuthorSession(patch) {
  const current = getAuthorSession()
  const next = { ...current, ...patch }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function clearAuthorSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function hasAuthorSession() {
  const session = getAuthorSession()
  return Boolean(session.manuscriptId && session.accessToken)
}

export async function authorApi(path, options = {}) {
  const session = getAuthorSession()
  if (!session.accessToken) {
    const error = new Error('This browser session does not have access to the manuscript. Start a new submission or reopen it from the same session.')
    error.code = 'author_session_missing'
    throw error
  }

  return api(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-Manuscript-Token': session.accessToken,
    },
  })
}

export async function createAuthorManuscript(formData) {
  const payload = await api('/api/author/manuscripts/', {
    method: 'POST',
    body: formData,
  })
  if (!payload?.manuscript?.id || !payload?.access_token) {
    throw new Error('The manuscript was created without the access information required to continue.')
  }
  saveAuthorSession({
    manuscriptId: payload.manuscript.id,
    accessToken: payload.access_token,
    manuscriptTitle: payload.manuscript.title,
    submissionId: null,
    selectedVenueId: null,
    selectedVenueSlug: null,
  })
  return payload
}

export function currentManuscriptPath(suffix = '') {
  const session = getAuthorSession()
  if (!session.manuscriptId) {
    const error = new Error('No active manuscript is available in this browser session.')
    error.code = 'author_session_missing'
    throw error
  }
  return `/api/author/manuscripts/${session.manuscriptId}${suffix}`
}

export function currentSubmissionPath(suffix = '') {
  const session = getAuthorSession()
  if (!session.submissionId) {
    const error = new Error('No venue submission has been created yet.')
    error.code = 'author_submission_missing'
    throw error
  }
  return `/api/author/venue-submissions/${session.submissionId}${suffix}`
}

export function friendlyAuthorError(error) {
  if (!error) return 'Something went wrong.'
  if (error.status === 401 || error.status === 403 || error.code === 'author_session_missing') {
    return 'This browser no longer has access to the manuscript. Start a new submission to create a new secure author session.'
  }
  return error.message || 'Something went wrong.'
}
