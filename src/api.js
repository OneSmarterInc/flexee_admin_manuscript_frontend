const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function apiUrl(path) {
  return `${BASE}${path}`
}

export function errorText(value) {
  if (typeof value === 'string') return value;
  if (value && value.message) return value.message;
  if (value && value.detail) return value.detail;
  return 'Job failed';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

async function getCsrfToken() {
  const response = await fetch(apiUrl('/api/csrf/'), {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`Unable to initialize CSRF protection (${response.status})`)
  }
  const payload = await response.json()
  if (!payload?.csrfToken) {
    throw new Error('CSRF token was not returned by the server')
  }
  return payload.csrfToken
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = options.body instanceof FormData
    ? { ...(options.headers || {}) }
    : {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      }

  if (!SAFE_METHODS.has(method)) {
    headers['X-CSRFToken'] = await getCsrfToken()
  }

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  })
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch { payload = { detail: text } }
  if (!response.ok) {
    const error = new Error(payload.detail || `Request failed (${response.status})`)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export async function pollPublicSubmission(submissionId, onProgress) {
  const timeoutMs = 10 * 60 * 1000
  const intervalMs = 4000
  const startTime = Date.now()
  let failures = 0

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval)
        reject(new Error('timeout'))
        return
      }
      try {
        const status = await api(`/api/submissions/${submissionId}/status/`)
        failures = 0
        if (onProgress) onProgress(status)
        if (status.status === 'completed') {
          clearInterval(interval)
          resolve(status)
        } else if (status.status === 'failed') {
          clearInterval(interval)
          reject(new Error(errorText(status.error)))
        }
      } catch (err) {
        failures += 1
        if (failures >= 4) {
          clearInterval(interval)
          reject(err)
        }
      }
    }, intervalMs)
  })
}

export async function apiBlob(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { ...(options.headers || {}) }

  if (!SAFE_METHODS.has(method)) {
    headers['X-CSRFToken'] = await getCsrfToken()
  }

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers,
  })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const payload = await response.json()
      detail = payload.detail || detail
    } catch {
      // Binary/download endpoints may not return JSON errors.
    }
    const error = new Error(detail)
    error.status = response.status
    throw error
  }
  return {
    blob: await response.blob(),
    disposition: response.headers.get('Content-Disposition') || '',
  }
}
