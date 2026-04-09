/**
 * Osha Chat Constants
 * Mode definitions, starter prompts, pack shortcuts, and deep research progress messages.
 */

// ── Assistant modes ──────────────────────────────────────────────────────────
export const ASSISTANT_MODES = [
  { value: 'guide', label: '📖 Guide', description: 'Step-by-step onboarding assistant' },
  { value: 'operator', label: '⚡ Operator', description: 'Task-oriented, concise answers' },
  { value: 'creative', label: '🎨 Creative', description: 'Imaginative content generation' },
  { value: 'analyst', label: '🔬 Analyst', description: 'Structured reasoning & sourcing' },
];

// ── Ideation modes (from Muse) ───────────────────────────────────────────────
export const IDEATION_MODES = [
  { value: 'spark', label: '⚡ Spark', description: 'Generate many ideas fast' },
  { value: 'expand', label: '🔭 Expand', description: 'Turn one idea into a full concept' },
  { value: 'combine', label: '🔀 Combine', description: 'Merge ideas into hybrids' },
  { value: 'filter', label: '🎯 Filter', description: 'Score and shortlist ideas' },
  { value: 'workshop', label: '🎓 Workshop', description: 'Guided brainstorming session' },
];

// ── Power modes ──────────────────────────────────────────────────────────────
export const POWER_MODES = [
  { value: 'deep-research', label: '🔍 Deep Research', description: 'In-depth research with web access' },
];

export const ALL_MODES = [...ASSISTANT_MODES, ...IDEATION_MODES, ...POWER_MODES];
export const IDEATION_MODE_VALUES = new Set(IDEATION_MODES.map(m => m.value));
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
  creative: [
    { label: 'Wish Companion origin story', prompt: 'Write a magical origin story for a new Wish Companion' },
    { label: 'Enchanting product names', prompt: 'Create 5 enchanting product names for a starlight collection' },
    { label: 'Social post for a Wish Vault', prompt: 'Draft a social post announcing a limited-edition Wish Vault' },
    { label: 'Festival of Wishes campaign', prompt: 'Imagine a seasonal campaign around the Festival of Wishes' },
    { label: 'Bedtime-story product description', prompt: 'Write a bedtime-story-style product description for a plush toy' },
  ],
  analyst: [
    { label: 'Memorable Wish Companions', prompt: 'Analyze the key elements that make a Wish Companion memorable' },
    { label: 'Content strategies comparison', prompt: 'Compare different content strategies for collectible launches' },
    { label: 'First-time Wish Keeper journey', prompt: 'Break down the customer journey for a first-time Wish Keeper' },
    { label: 'Seasonal vs evergreen collections', prompt: 'Evaluate the pros and cons of seasonal vs evergreen collections' },
    { label: 'Wonder-first branding', prompt: 'Assess what makes wonder-first branding effective for families' },
  ],
};

export const IDEATION_STARTERS: Record<string, { label: string; prompt: string }[]> = {
  spark: [
    { label: '20 product name ideas', prompt: 'Give me 20 product name ideas for a new collectible line. Group them by theme.' },
    { label: 'Campaign angles', prompt: 'Generate 20 creative campaign angle ideas for launching a new character collection.' },
    { label: 'Content ideas', prompt: 'Give me 20 content ideas for our social media channels. Focus on engagement and wonder.' },
    { label: 'Wish Companion personality traits', prompt: 'Generate 20 unique personality trait ideas for new Wish Companions. Group by archetype.' },
    { label: 'Seasonal drop themes', prompt: 'Brainstorm 20 seasonal drop theme ideas for our collectible line across all four seasons.' },
  ],
  expand: [
    { label: 'Expand into Concept Pack', prompt: 'Take this idea and turn it into a full Concept Pack: [describe your idea here]' },
    { label: 'Full concept from scratch', prompt: 'Create a full Concept Pack for a community-driven collectible drop campaign.' },
    { label: 'Unboxing experience concept', prompt: 'Expand the idea of a magical unboxing experience into a full Concept Pack for Wish Companions.' },
    { label: 'Loyalty program concept', prompt: 'Turn the idea of a Wish Keeper loyalty program into a detailed Concept Pack with tiers and rewards.' },
    { label: 'Wish Vault ritual concept', prompt: 'Expand the concept of a Wish Vault opening ritual into a full immersive experience pack.' },
  ],
  combine: [
    { label: 'Combine two ideas', prompt: 'Combine these two ideas into stronger hybrid concepts: [idea 1] and [idea 2]' },
    { label: 'Hybrid product ideas', prompt: 'Combine digital collectibles with physical products to create 3 hybrid product concepts.' },
    { label: 'Storytelling + product design', prompt: 'Combine storytelling and product design into 3 hybrid concepts for a Wish Companion launch.' },
    { label: 'Physical + digital experience', prompt: 'Combine physical unboxing with digital Wish Keeper experiences into 3 hybrid concepts.' },
    { label: 'Community + collectible concept', prompt: 'Combine community engagement with collectible mechanics into 3 hybrid campaign concepts.' },
  ],
  filter: [
    { label: 'Score my ideas', prompt: 'Score and shortlist these ideas: [paste your list here]. Use originality, feasibility, brand fit, cost, time, emotional impact, and clarity.' },
    { label: 'Shortlist from brainstorm', prompt: 'I ran a brainstorm and got 10 ideas. Help me pick the top 3: [paste ideas]' },
    { label: 'Evaluate campaign concepts', prompt: 'Evaluate these campaign concepts against our brand values and target audience: [paste concepts]' },
    { label: 'Rank collection themes', prompt: 'Rank these collection themes by brand fit, market potential, and production feasibility: [paste themes]' },
    { label: 'Score packaging ideas', prompt: 'Score these packaging design ideas on wonder factor, cost, sustainability, and unboxing experience: [paste ideas]' },
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

export const PACK_SHORTCUTS = [
  { label: '💡 Idea Pack', prompt: 'Generate an Idea Pack with 20 ideas grouped by themes. Each idea should have a title, one-line summary, use case, and execution hint.' },
  { label: '📦 Concept Pack', prompt: 'Generate a full Concept Pack for: [describe your concept here]. Include messaging pillars, creative directions, do/avoid list, and execution outline.' },
  { label: '📣 Campaign Pack', prompt: 'Generate a Campaign Pack for: [describe your campaign]. Include theme, angles, hooks, social post ideas, short video ideas, email angles, and landing page outline.' },
  { label: '📋 Workshop Summary', prompt: 'Generate a Workshop Summary from this session. Capture the key answers, top ideas shortlist, and next actions checklist.' },
  { label: '🗓 Content System', prompt: 'Generate a Content System Pack for our brand. Include a recurring series format, content pillars, episode ideas, and a monthly calendar suggestion.' },
];

// ── Deep Research Progress Messages ──────────────────────────────────────────

export function getProgressMessage(elapsedSeconds: number, topic: string): string | null {
  const shortTopic = topic.length > 60 ? topic.slice(0, 57) + '...' : topic;

  const phase1 = [
    `Starting deep research on your topic...`,
    `Scanning the web for sources related to "${shortTopic}"...`,
    `Initiating comprehensive search across multiple sources...`,
  ];
  const phase2 = [
    `Found several promising sources, diving deeper...`,
    `Exploring multiple angles on "${shortTopic}"...`,
    `Gathering data from various sources...`,
    `Reading through research papers and articles...`,
    `Uncovering interesting findings about "${shortTopic}"...`,
  ];
  const phase3 = [
    `Cross-referencing findings for accuracy...`,
    `Analyzing different perspectives and data points...`,
    `Building a comprehensive picture of "${shortTopic}"...`,
    `Verifying facts across multiple sources...`,
    `Connecting the dots between different findings...`,
  ];
  const phase4 = [
    `Compiling all findings into a comprehensive report...`,
    `Almost done — finalizing the research on "${shortTopic}"...`,
    `Putting the finishing touches on your research...`,
    `Organizing everything into a clear, structured report...`,
    `Final review of all findings before presenting...`,
  ];

  // Show a new message every 12 seconds
  if (elapsedSeconds < 5) return null; // Too early
  const messageIndex = Math.floor((elapsedSeconds - 5) / 12);

  let pool: string[];
  if (elapsedSeconds < 30) pool = phase1;
  else if (elapsedSeconds < 90) pool = phase2;
  else if (elapsedSeconds < 180) pool = phase3;
  else pool = phase4;

  return pool[messageIndex % pool.length];
}
