// Who stands behind a venue record. An editor-configured venue and one Flexee read from
// the publisher's pages must never look the same, so each tier has its own badge.

const TIERS = {
  claimed: {
    label: 'Editor-confirmed',
    datePrefix: 'updated',
    help: 'The venue’s editors set these rules themselves in Flexee.',
  },
  verified_index: {
    label: 'Checked from official pages',
    datePrefix: 'checked',
    help: 'Flexee read the venue’s official pages and confirmed each rule against the page text. Rules can change; check the venue’s own site before you submit.',
  },
  listed: {
    label: 'Listed only',
    datePrefix: '',
    help: 'Basic details only. Flexee has not read this venue’s rules yet.',
  },
}

export function trustTier(venue) {
  const tier = venue?.trust?.tier
  return TIERS[tier] ? tier : 'claimed'
}

export function formatVerifiedAge(value, now = new Date()) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.max(0, Math.floor((now - date) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 63) return `${Math.round(days / 7)} weeks ago`
  const months = Math.round(days / 30)
  if (months < 24) return `${months} months ago`
  return `${Math.round(days / 365)} years ago`
}

function exactDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/**
 * Small badge: tier + how long ago it was confirmed.
 * `withSources` adds the official-page links under it (used on the venue page).
 */
export default function VenueTrustBadge({ venue, withSources = false, className = '' }) {
  const tier = trustTier(venue)
  const info = TIERS[tier]
  const verifiedAt = venue?.trust?.last_verified_at
  const age = formatVerifiedAge(verifiedAt)
  const title = `${info.help}${verifiedAt ? ` Last ${info.datePrefix || 'checked'}: ${exactDate(verifiedAt)}.` : ''}`
  const sources = withSources && tier === 'verified_index' ? (venue?.trust?.source_urls || []).slice(0, 3) : []

  return <span className={`venue-trust-wrap ${className}`}>
    <span className={`venue-trust venue-trust-${tier}`} title={title}>
      <i aria-hidden="true"></i>
      <span>{info.label}</span>
    </span>
    {age && info.datePrefix && <span className="venue-trust-date" title={exactDate(verifiedAt)}>
      {info.datePrefix.charAt(0).toUpperCase() + info.datePrefix.slice(1)} {age}
    </span>}
    {sources.length > 0 && <span className="venue-trust-sources">
      Source{sources.length > 1 ? 's' : ''}: {sources.map((url, i) => <span key={url}>
        {i > 0 && ', '}<a href={url} target="_blank" rel="noopener noreferrer">{hostOf(url) || 'official page'}</a>
      </span>)}
    </span>}
  </span>
}
