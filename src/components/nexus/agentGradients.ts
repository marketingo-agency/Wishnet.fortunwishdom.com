/**
 * Shared agent gradient map used by AgentConfigGrid and AgentConfigPanel.
 * Centralises the hardcoded hex values so they only live in one place.
 */
export const AGENT_GRADIENTS: Record<string, string> = {
  nexus:    'linear-gradient(135deg, #84cc16, #16a34a)',
  promptor: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
  osha:     'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  echo:     'linear-gradient(135deg, #3b82f6, #4f46e5)',
  pulse:    'linear-gradient(135deg, #ec4899, #d946ef)',
  pixel:    'linear-gradient(135deg, #ec4899, #f43f5e)',
};

export const AGENT_GRADIENT_FALLBACK = 'linear-gradient(135deg, #6b7280, #4b5563)';
