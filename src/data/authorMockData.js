export const previewManuscript = {
  title: 'AI Agents in Manufacturing Operations',
  type: 'Research article',
  words: 6240,
  references: 36,
  authors: 'Alex Morgan; Priya Shah',
  keywords: ['AI agents', 'manufacturing', 'operations', 'automation'],
}

export const readinessChecks = [
  { label: 'Manuscript file', state: 'pass', detail: 'Readable manuscript file detected.' },
  { label: 'Abstract', state: 'pass', detail: 'Abstract is present and clearly separated.' },
  { label: 'Methods section', state: 'pass', detail: 'A methods section is present.' },
  { label: 'AI-use disclosure', state: 'pass', detail: 'Disclosure supplied with the submission.' },
  { label: 'References', state: 'pass', detail: 'Reference section detected with 36 entries.' },
  { label: 'Data availability statement', state: 'warning', detail: 'No clear data availability statement was detected.' },
  { label: 'Method detail', state: 'warning', detail: 'Sampling and evaluation criteria may need more detail for some venues.' },
]

export const venueMatches = [
  {
    slug: 'applied-ai-review',
    name: 'Applied AI Review',
    type: 'Journal',
    fit: 'Strong fit',
    tone: 'good',
    summary: 'Close topical alignment with applied AI, operations, and evidence-led implementation studies.',
    reasons: ['Topic fits applied AI scope', 'Research article type accepted', 'Length is within the preview range', 'Current interest includes agentic systems'],
    gaps: ['Add a data availability statement'],
  },
  {
    slug: 'enterprise-systems-journal',
    name: 'Enterprise Systems Journal',
    type: 'Journal',
    fit: 'Possible fit',
    tone: 'warn',
    summary: 'Good enterprise technology alignment, with a few reporting requirements to address first.',
    reasons: ['Enterprise systems topic alignment', 'Empirical methods accepted', 'Manufacturing context is relevant'],
    gaps: ['Methods detail may need expansion', 'Reproducibility statement required'],
  },
  {
    slug: 'ai-practice-conference',
    name: 'AI Practice Conference',
    type: 'Conference',
    fit: 'Possible fit',
    tone: 'warn',
    summary: 'The practical use case aligns, but the conference format differs from the current manuscript format.',
    reasons: ['Agentic AI is in scope', 'Applied case evidence is relevant'],
    gaps: ['Convert to conference paper format', 'Condense to the event word limit'],
  },
]

export const selectedVenue = {
  ...venueMatches[0],
  scope: 'Applied artificial intelligence research with clear operational or organizational evidence.',
  articleType: 'Research article',
  currentDemand: 'Agentic systems, AI operations, and measurable enterprise implementation outcomes.',
  assessment: [
    ['Outlet fit', 'Strong', 'The manuscript directly addresses applied AI agents in an operational manufacturing context.'],
    ['Policy compliance', 'Needs one update', 'Core submission information is present; add a data availability statement before formal submission.'],
    ['Contribution', 'Promising', 'The manuscript contributes an implementation-focused view of agentic AI in production operations.'],
    ['Methods', 'Reviewable', 'The methods are identifiable, but reviewer-facing sampling detail could be made more explicit.'],
    ['Citation integrity', 'No blocking issue in preview', 'References are structurally present. External verification will be produced by the connected evidence service.'],
    ['Reviewer expertise', 'Suggested', 'AI agents, manufacturing systems, operations management, and applied machine learning.'],
  ],
  evidence: [
    ['Methods finding', 'Manuscript · Methods section', 'Evaluation criteria are described, but participant/site selection needs a clearer statement.'],
    ['Policy gap', 'Venue policy · Reporting requirements', 'A data availability statement is required for this article type.'],
    ['Scope fit', 'Venue scope + manuscript topic', 'Both emphasize applied AI systems in operational settings.'],
  ],
}
