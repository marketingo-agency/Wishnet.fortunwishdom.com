/**
 * Osha Chat Constants
 * Mode definitions, starter prompts, and deep research progress messages.
 */

// ── Assistant modes ──────────────────────────────────────────────────────────
export const ASSISTANT_MODES = [
  { value: 'guide', label: '📖 Guide', description: 'Step-by-step onboarding assistant' },
  { value: 'operator', label: '⚡ Operator', description: 'Task-oriented, concise answers' },
  { value: 'workshop', label: '🎓 Workshop', description: 'Guided brainstorming session' },
];

// ── Power modes ──────────────────────────────────────────────────────────────
export const POWER_MODES = [
  { value: 'deep-research', label: '🔍 Deep Research', description: 'In-depth research with web access' },
];

export const ALL_MODES = [...ASSISTANT_MODES, ...POWER_MODES];
export const POWER_MODE_VALUES = new Set(POWER_MODES.map(m => m.value));

export const ASSISTANT_STARTERS: Record<string, { label: string; prompt: string }[]> = {
  guide: [
    { label: 'Walk me through the platform', prompt: 'Walk me through how the Fortun Wishnet platform works' },
    { label: 'Set up a Wish Companion collection', prompt: 'How do I set up a new Wish Companion collection?' },
    { label: 'Explain the Brain knowledge base', prompt: 'Explain the Brain knowledge base and how to use it' },
    { label: 'Create my first campaign brief', prompt: 'Guide me through creating my first campaign brief' },
    { label: 'Managing Wish Vaults', prompt: 'What are the best practices for managing Wish Vaults?' },
  ],
  operator: [
    { label: 'Active agent tools & status', prompt: 'List all active agent tools and their status' },
    { label: 'Bulk-upload files', prompt: 'How do I bulk-upload files to the Files Manager?' },
    { label: 'Supported file formats', prompt: 'What file formats does the platform support?' },
    { label: 'Publish a product page', prompt: 'Show me the quickest way to publish a product page' },
    { label: 'Connect an LLM provider', prompt: 'How do I connect an LLM provider in Settings?' },
  ],
  workshop: [
    { label: 'Start a workshop', prompt: 'Run a brainstorming workshop for our new character launch campaign. Start with your opening questions.' },
    { label: 'Content strategy workshop', prompt: 'Guide me through a workshop to develop a 3-month content strategy for our brand.' },
    { label: 'Character design workshop', prompt: 'Run a character design workshop for a new Wish Companion. Guide me step by step.' },
    { label: 'Brand voice workshop', prompt: 'Lead a brand voice workshop to refine how Fortun Wishnet speaks to Wish Keepers.' },
    { label: 'Wish Vault experience workshop', prompt: 'Facilitate a workshop to design the ultimate Wish Vault unboxing and discovery experience.' },
  ],
};

export const POWER_STARTERS: Record<string, { label: string; prompt: string }[]> = {
  'deep-research': [
    { label: 'Market research', prompt: 'Conduct deep research on the current state of the collectibles market, including trends, key players, and growth opportunities.' },
    { label: 'Competitor analysis', prompt: 'Research our top 5 competitors in the collectibles industry and compare their strategies, products, and market positioning.' },
    { label: 'Industry trends', prompt: 'Research emerging trends in AI-powered e-commerce and how they could apply to our platform.' },
    { label: 'Kids collectibles sentiment', prompt: 'Research current consumer sentiment and buying behavior in the kids collectibles market.' },
    { label: 'Storytelling-driven brands', prompt: 'Research case studies of storytelling-driven brands and how narrative impacts customer loyalty and sales.' },
  ],
};

// ── Deep Research Stage Progress ─────────────────────────────────────────────
// 5-stage time-driven indicator shown during deep research. Time thresholds
// live in the controller (advanceStageIndex) so the stage labels stay visual-only.
export const DEEP_RESEARCH_STAGES: string[] = [
  'Searching sources...',
  'Reading and extracting findings...',
  'Analyzing and cross-referencing...',
  'Synthesizing findings...',
  'Composing research report...',
];

