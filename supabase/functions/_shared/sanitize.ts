/**
 * Shared sanitization utilities for edge functions.
 * AGENT-003: prevents prompt injection via user-controlled text
 * (e.g., heart rule names/content) interpolated into LLM system prompts.
 */

/**
 * Sanitize text before interpolation into LLM system prompts.
 * Strips characters that could break JSON mode, close XML/system tags,
 * or inject prompt control sequences.
 */
export function sanitizeForPrompt(text: string): string {
  return text
    // Remove potential XML/system tag closers
    .replace(/<\/?system[^>]*>/gi, '')
    .replace(/<\/?user[^>]*>/gi, '')
    .replace(/<\/?assistant[^>]*>/gi, '')
    // Remove triple backticks (could break code fences in prompt)
    .replace(/```/g, "'''")
    // Neutralize common prompt injection patterns
    .replace(/\bignore\s+(all\s+)?previous\s+instructions?\b/gi, '[filtered]')
    .replace(/\byou\s+are\s+now\b/gi, '[filtered]')
    .replace(/\bact\s+as\b/gi, '[filtered]')
    .replace(/\bforget\s+(everything|all)\b/gi, '[filtered]')
    // Trim excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Deterministic backstop for the "No em dashes or en dashes" Heart rule.
 * The Heart rule is the soft layer (every agent injects it), but models still
 * emit em/en dashes a meaningful fraction of the time, so this guarantees they
 * never reach the user. Apply to FINAL generated text before it is returned or
 * persisted, never to code or system prompts.
 *
 * Targets figure dash (U+2012), en dash (U+2013), em dash (U+2014), and
 * horizontal bar (U+2015) as literal members of a regex character class.
 * Note: building this class via `new RegExp` string interpolation misparses
 * the adjacent dashes as a range, so these MUST stay literal regex literals.
 *
 * - Numeric ranges keep a tight hyphen: "2014–2016" -> "2014-2016".
 * - Every other dash (the dominant case: a clause-break em dash) becomes a
 *   comma, which reads naturally in prose and captions: "home — it was late"
 *   -> "home, it was late".
 * Artifacts from the comma substitution (doubled commas, a comma jammed before
 * other punctuation or after an opener, a leading comma) are normalized away.
 */
export function stripDashes(text: string): string {
  if (!text) return text;
  return text
    // Numeric range: keep a tight hyphen.
    .replace(/(\d)\s*[‒–—―]\s*(\d)/g, '$1-$2')
    // Any remaining typographic dash (clause break, leading/trailing): comma.
    .replace(/\s*[‒–—―]\s*/g, ', ')
    // Normalize artifacts left by the comma substitution.
    .replace(/ +,/g, ',')                 // space before comma
    .replace(/,{2,}/g, ',')               // doubled commas
    .replace(/,\s*([.!?;:)\]])/g, '$1')   // comma jammed before other punctuation
    .replace(/([(\[])\s*,\s*/g, '$1')     // comma right after an opener
    .replace(/[ \t]{2,}/g, ' ')           // collapsed double spaces
    .replace(/^\s*,\s*/, '');             // leading comma
}
