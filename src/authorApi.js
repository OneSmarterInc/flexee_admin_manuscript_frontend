import { api, apiBlob } from './api.js'

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

export async function authorLogin(email, password) {
  const user = await api('/api/author/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return user
}

export async function authorRegister(name, email, password) {
  const user = await api('/api/author/register/', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return user
}

export async function authorLogout() {
  try {
    await api('/api/author/logout/', { method: 'POST' })
  } finally {
    clearAuthorSession()
  }
}

export async function resendAuthorVerification() {
  return await api('/api/author/resend-verification/', { method: 'POST' })
}

export async function fetchAuthorSession() {
  try {
    return await api('/api/author/session/')
  } catch (err) {
    if (err.status === 401) return null
    throw err
  }
}

export async function fetchAuthorManuscripts() {
  return await api('/api/author/manuscripts/list/')
}

export function hasAuthorSession() {
  const session = getAuthorSession()
  return Boolean(session.manuscriptId && session.accessToken)
}

export async function authorApi(path, options = {}) {
  const session = getAuthorSession()
  const headers = { ...(options.headers || {}) }
  
  if (session.accessToken) {
    headers['X-Manuscript-Token'] = session.accessToken
  }

  return api(path, {
    ...options,
    headers,
  })
}

export async function authorApiBlob(path, options = {}) {
  const session = getAuthorSession()
  const headers = { ...(options.headers || {}) }

  if (session.accessToken) {
    headers['X-Manuscript-Token'] = session.accessToken
  }

  return apiBlob(path, {
    ...options,
    headers,
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

export async function fetchAuthorJobStatus(jobId) {
  return await authorApi(`/api/author/jobs/${jobId}/`)
}

export async function pollAuthorJob(jobId, onProgress) {
  const timeoutMs = 10 * 60 * 1000
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Background processing is taking longer than expected. Please retry from this page.'))
        return
      }
      try {
        const status = await fetchAuthorJobStatus(jobId)
        if (onProgress) onProgress(status)
        if (status.status === 'completed') {
          clearInterval(interval)
          resolve(status)
        } else if (status.status === 'failed') {
          clearInterval(interval)
          reject(new Error(status.error || 'Job failed'))
        }
      } catch (err) {
        clearInterval(interval)
        reject(err)
      }
    }, 2000)
  })
}
