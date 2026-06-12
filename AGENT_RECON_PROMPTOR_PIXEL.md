# AGENT RECON: PROMPTOR AND PIXEL

Read-only reconnaissance of the Promptor and Pixel AI agents in the Fortun Wishnet codebase, produced for an external optimization strategist with zero prior exposure to this repository.

- Generated: 2026-06-11
- Codebase state: branch `fix/vercel-install`, commit `8e87787`
- Method: direct source reading of every cited file. No source file was modified.
- Every claim cites a repo-relative file path. Where a fact could not be confirmed in code it is marked UNVERIFIED instead of guessed.
- Where the code contradicts the project's own documentation (CLAUDE.md), this document reports what the code does and flags the contradiction.
- Verbatim-quote note: all system prompts, rules, SQL, and code are quoted byte-exact inside fenced code blocks. Some of that quoted source text contains em dash characters that exist in the source files themselves; they are preserved inside code fences because verbatim accuracy was required. All document prose outside code fences contains no em dash.

Document map: PART 1 covers Promptor (sections P-1 to P-12), PART 2 covers Pixel (sections X-1 to X-12), PART 3 is the shared infrastructure map (section 13), PART 4 is the extension surface inventory for a future CINEMA layer (section 14).

Top-level orientation for a first-time reader:

- Both agents are tabs/screens inside a Next.js 16 App Router admin app (`src/app/(protected)/ai-agents/`), gated by Supabase cookie auth plus a per-user permission column.
- Each agent's entire backend is a single Supabase Deno edge function dispatching on an `action` string in the JSON body: `supabase/functions/promptor/index.ts` and `supabase/functions/pixel-chat/index.ts`.
- Both agents hardcode their full system prompts inside those edge functions. The DB-backed prompt mechanism (`system_prompts` table via `supabase/functions/_shared/system-prompts.ts`) is consumed only by osha-chat today.
- Brand governance ("Heart rules") and brand knowledge ("Brain" RAG over `knowledge_embeddings`) are injected into prompts at request time; enforcement is prompt-level instruction only, with no post-generation validation in either agent.


---

# PART 1: PROMPTOR



## P-1. Identity and entry points

All paths are repo-relative from `c:/My-Dev-Projects/Fortun Wishnet`. Promptor is registered with agent id `promptor`, accent violet/purple, route `/ai-agents/promptor`, and is one of three actions hosted by a single edge function (`create`, `optimize`, `optimize-draft`) plus two settings actions (`get-settings`, `save-settings`).

### Route / page / screen

| File | Role |
|---|---|
| `src/app/(protected)/ai-agents/promptor/page.tsx` | Next.js App Router page. Sets `metadata.title = 'Promptor \| Fortun Wishnet'` and wraps the screen in `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_promptor">` (lines 5-12). |
| `src/screens/PromptorAgent.tsx` | The workspace screen (`"use client"`). Owns the 4-tab shell (`create`, `optimize`, `history`, `settings`, lines 20-27), lifts `lastOutput` for header retrieval chips, seeds default output type from settings (lines 40-45), and renders an "Promptor is Inactive" overlay when `agent_settings.is_active` is false (lines 47-48, 110-129). |
| `src/components/ToolProtectedRoute.tsx` | Permission gate. `agentKey` denies access only when `permissions.ai_can_access_promptor === false` (lines 42-45, PERM-01). |

### Promptor components (`src/components/promptor/`)

| File | Role |
|---|---|
| `src/components/promptor/index.ts` | Barrel export of the 6 components. |
| `src/components/promptor/PromptorHeader.tsx` | Header card: violet `Wand2` icon, "Prompt Engineering AI" badge, last-run Heart-rules / Brain-chunks count pills (lines 43-56), "Connected to MasterMind" badge, nav buttons to `/mastermind/brain/promptor` (line 85) and `/mastermind/vector-store` (line 102). |
| `src/components/promptor/PromptorCreate.tsx` | Create tab: output-type cards, blueprint pills, brief textarea, cosmetic 3-step Heart/Brain/Generate pipeline, fires the `create` action (lines 136-170). Contains the BUG-01 StrictMode mounted-guard fix (lines 124-128). |
| `src/components/promptor/PromptorOptimize.tsx` | Optimize tab: same selectors plus "Existing Prompt" and optional "Optimization Goal" textareas, fires the `optimize` action (lines 135-170). Same mounted-guard fix (lines 123-127). |
| `src/components/promptor/PromptorOutput.tsx` | Output renderer: compliance badge (`pass`/`adjusted`/`refused`, lines 53-69), retrieval meta, brief summary, compliance notes, short/full prompt cards with copy buttons, collapsible variants, negatives, QA checklist. |
| `src/components/promptor/PromptorHistory.tsx` | History tab: reads `promptor_runs` via hooks, search + type/status filters, multi-select, single/selected/clear-all delete with confirm dialog. |
| `src/components/promptor/PromptorSettings.tsx` | Settings tab: 5 collapsible sections (Output Preferences, Brand Lens tone sliders, Compliance & Heart Enforcement, Prompt Style, Memory & Retrieval) saved through the edge function. The "Always Retrieve Brain & Heart" switch is rendered checked+disabled (lines 437-446); retrieval is genuinely unconditional server-side. |
| `src/components/promptor/briefPlaceholders.ts` | Per output-type/blueprint placeholder copy. Exports `getBriefPlaceholder`, `getExistingPromptPlaceholder`, `getOptimizationGoalPlaceholder` (lines 107-115). |

### Hooks

| File | Role |
|---|---|
| `src/hooks/promptor/index.ts` | Barrel: re-exports types + all 5 hooks. |
| `src/hooks/promptor/types.ts` | `OutputType`, `ComplianceStatus`, `PrompterSettings` (note the `Prompter` spelling), `DEFAULT_SETTINGS`, `PromptorOutput`, `PromptorRun`. |
| `src/hooks/promptor/usePromptorSettings.ts` | Defines and exports `callPromptor()` (the single fetch wrapper, lines 5-22) plus `usePromptorSettings` (query `['promptor-settings']`, defaults on any throw, `staleTime` 5 min) and `useUpsertPromptorSettings`. |
| `src/hooks/promptor/useRunPromptor.ts` | Mutation for `create`/`optimize`; invalidates `['promptor-runs']` on success. |
| `src/hooks/promptor/usePromptorRuns.ts` | `usePromptorRuns` (direct Supabase select, limit 100), `useDeletePromptorRuns`, `useClearPromptorRuns`. |
| `src/hooks/promptor/useOptimizeDraft.ts` | Shared one-shot `optimize-draft` mutation used by Osha, Pixel, and Pulse; error toast via Sonner. |
| `src/hooks/promptor/usePromptorSession.ts` | Tab-state persistence in `sessionStorage` under key `promptor_session` (line 4). |
| `src/hooks/usePromptor.ts` | Backward-compat re-export of `./promptor` (not a duplicate implementation). |
| `src/hooks/usePromptorSession.ts` | Backward-compat re-export of `usePromptorSession` + `PromptorSession` type (not a duplicate implementation). |
| `src/hooks/useAgentSettings.ts` | Generic `agent_settings` table hook; `PromptorAgent` calls `useAgentSettings('promptor')` for the is-active gate (`src/screens/PromptorAgent.tsx:32`). |
| `src/hooks/useUserPermissions.ts` | Declares `'ai_can_access_promptor'` in `AgentAccessKey` (line 176) and grants admins an all-true permissions object (line 80). |

### Shared client lib / config

| File | Role |
|---|---|
| `src/lib/apiHelpers.ts` | `getAuthHeaders()` (Bearer access token + `apikey` anon key, lines 14-31) and `edgeFunctionUrl()` (lines 36-38). |
| `src/config/api.ts` | `EDGE_FUNCTIONS_URL = ${SUPABASE_URL}/functions/v1` (line 26). Note: unlike Pulse/Whisper there is NO dedicated `PROMPTOR_*` constant here; the URL is built as `edgeFunctionUrl('promptor')` in `src/hooks/promptor/usePromptorSettings.ts:5`. |
| `src/integrations/supabase/client.ts` | Browser Supabase client used by the history hooks for direct PostgREST access. |
| `src/integrations/supabase/types.ts` | Generated DB types: `promptor_runs` (line 1237), `promptor_settings` (line 1309). |
| `src/types/user.ts` | `UserPermissions.ai_can_access_promptor: boolean \| null` (line 55). |

### Registration / navigation surfaces

| File | Role |
|---|---|
| `src/data/agents.ts` | Agent registry entry `id: 'promptor'` (lines 51-65): role `'Prompt Engineer AI'`, icon `Wand2`, gradient `from-violet-500 to-purple-600`, `status: 'active'`, `path: '/ai-agents/promptor'`, `model: 'gpt-4o'` (display metadata; the real model comes from `llm_settings` at runtime). Consumed by `src/screens/AIAgents.tsx` + `src/components/agents/AgentCard.tsx` (agent grid) and `src/components/nexus/AgentConfigGrid.tsx` (Nexus config). |
| `src/routes/routeConfig.ts` | `AI_AGENT_ROUTES[0]` is Promptor (lines 44-52): `toolKey: 'ai_agents'`, `isComingSoon: false`. |
| `src/components/layout/Header.tsx` | Route-title map entry `'/ai-agents/promptor': 'Promptor'` (line 37). |
| `src/components/nexus/agentGradients.ts` | `promptor: 'linear-gradient(135deg, #8b5cf6, #9333ea)'` (line 7). |
| `src/components/nexus/AgentConfigPanel.tsx` | Nexus default system prompt for promptor (line 24). NOTE: this prompt is a Nexus-side `agent_settings` default only; the promptor edge function never reads `agent_settings` and builds its own system prompt (see flow), so this text does not influence Promptor generation. |
| `src/components/nexus/promptLibraryConstants.ts` | A prompt-library template with `agentIds: ['promptor']` (line 192). |
| `src/components/settings/EditUserSheet.tsx` | Admin per-user toggle `{ key: 'ai_can_access_promptor', label: 'Promptor (Prompts)', icon: Wand2 }` (line 96) plus default/save wiring (lines 162, 211). |
| `src/components/settings/SystemPromptsPanel.tsx` | Lists Promptor as a system-prompt-bearing agent (`{ id: 'promptor', label: 'Promptor' }`, line 37). |
| `src/components/settings/VectorStorePanel.tsx` | Mentions Promptor in agent-list formatting copy (line 69). |

### Cross-agent consumers of Promptor (`optimize-draft` wand)

| File | Role |
|---|---|
| `src/hooks/useOshaChatController.ts` | Imports `useOptimizeDraft` (line 18), exposes `handleOptimizeDraft`/`isOptimizing` (lines 76, 147-160). |
| `src/components/osha/OshaChat.tsx` | The `Wand2` button "Optimize with Promptor" next to send (lines 333-345). |
| `src/components/pixel/PixelStudio.tsx` | Same wand wiring inline (lines 19, 64-78). |
| `src/components/pulse/create/PulseComposer.tsx` | "Improve with AI" on the caption field via `optimizeDraft(caption)` (lines 20, 31, 50-58). |
| `src/components/pulse/create/PulseBulkGenerator.tsx` | Bulk loop: N sequential `optimizeDraft()` calls with a variation-instruction suffix appended to the brief (lines 18, 28, 52-58). |

### Edge function + shared edge modules

| File | Role |
|---|---|
| `supabase/functions/promptor/index.ts` | The entire Promptor backend (single `Deno.serve`, 5 actions). Detailed below. |
| `supabase/functions/_shared/cors.ts` | `getCorsHeaders()` origin allowlist (`localhost:3000/8000/8080` + `https://wishnet.fortunwishdom.com`, env override `ALLOWED_ORIGINS`). |
| `supabase/functions/_shared/rate-limit.ts` | In-memory sliding-window limiter; promptor instantiates `{ windowMs: 60_000, maxRequests: 15 }` (`supabase/functions/promptor/index.ts:17`). |
| `supabase/functions/_shared/sanitize.ts` | `sanitizeForPrompt()` applied to Heart rule name/content before prompt interpolation (`promptor/index.ts:483-486`). |
| `supabase/functions/_shared/token-budgets.ts` | `CONTENT_GENERATION: 4096` (create/optimize) and `PROMPT_OPTIMIZE: 800` (optimize-draft), lines 17 and 23. |
| `supabase/functions/_shared/usage-quota.ts` | Declares a daily quota key `'promptor-generate': 50` (line 20) BUT `promptor/index.ts` does not import this module (its only imports are supabase-js, sanitize, token-budgets, cors, rate-limit at lines 9-14), so this quota is not enforced for Promptor in the code as written. |
| `supabase/functions/_shared/system-prompts.ts` | Not imported by `promptor/index.ts`; Promptor builds its own system prompt in `buildSystemPrompt()`. |
| `supabase/functions/search-knowledge/index.ts` | Called server-to-server by promptor for Brain retrieval; embeds the query via OpenAI `text-embedding-3-small` (lines 36-56) and runs the hybrid `match_knowledge` RPC against `knowledge_embeddings` (lines 117-122). |
| `supabase/config.toml` | `[functions.promptor] verify_jwt = false` (intentional; the function does its own `auth.getUser()` round-trip, per the SEC-006 comment block). |

### Database (migrations and tables)

| File / object | Role |
|---|---|
| `supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql` | Creates `promptor_settings` (unique per user, ~28 config columns) and `promptor_runs` (full audit of every run incl. `heart_rules_used`/`brain_context_used` jsonb), both RLS `auth.uid() = user_id` FOR ALL, plus the `updated_at` trigger. Verbatim policy SQL: |

```sql
CREATE POLICY "Users can manage own promptor settings"
  ON public.promptor_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can manage own promptor runs"
  ON public.promptor_runs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

| File / object | Role |
|---|---|
| `supabase/migrations/20260122151744_bc9067ff-ae06-49f2-af74-b88efc3afc23.sql` | Permission column lineage: `ALTER TABLE public.user_permissions RENAME COLUMN ai_can_access_lexicon TO ai_can_access_promptor;` (Promptor was formerly "Lexicon"). |
| `supabase/migrations/20260129170041_88320516-4ce2-4e17-8e0f-09244472d794.sql` | Seeds the Brain section `('agent', 'promptor', 'Promptor Knowledge', 'Specialized knowledge for the Promptor Prompt Engineer AI')` (line 138), which backs the `/mastermind/brain/promptor` button in `PromptorHeader` (served by the dynamic route `src/app/(protected)/mastermind/brain/[sectionType]/page.tsx`). |
| Tables read/written at runtime | `promptor_settings`, `promptor_runs`, `llm_settings`, `heart_rules`, `osha_audit_logs` (shared cross-agent audit table, legacy name), `agent_settings` (client-side gate only), `knowledge_embeddings` (indirectly via `search-knowledge`). |
| `quick_prompts` | CLAUDE.md lists `quick_prompts` under the Promptor domain, but in code it is consumed exclusively by Nexus: `src/hooks/useQuickPrompts.ts` and the `src/components/nexus/QuickPrompt*.tsx` / `PromptLibrary.tsx` components plus `src/screens/NexusAgent.tsx`. No Promptor file touches it. Code wins: `quick_prompts` is a Nexus feature, not a Promptor one. |

### Promptor as data for other agents

| File | Role |
|---|---|
| `supabase/functions/osha-chat/index.ts` | Osha self-knowledge registry describes Promptor (line 239), whitelists which `promptor_settings` columns Osha may discuss (line 260), and reads the caller's `promptor_settings` row when answering config questions (`supabaseAdmin.from('promptor_settings').select('*').eq('user_id', userId).maybeSingle()`, line 1978). |
| `supabase/functions/pixel-chat/index.ts` | Comment only: documents that `osha_audit_logs` is shared by Osha/Pixel/Promptor (lines 1250-1253). |

---

## P-2. Architecture flow

All five edge actions go through one URL: `POST {NEXT_PUBLIC_SUPABASE_URL}/functions/v1/promptor` (built by `edgeFunctionUrl('promptor')` in `src/hooks/promptor/usePromptorSettings.ts:5` from `EDGE_FUNCTIONS_URL` in `src/config/api.ts:26`). Every call uses the headers from `src/lib/apiHelpers.ts:26-30`:

```ts
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  };
```

Common edge-function preamble for EVERY action (`supabase/functions/promptor/index.ts`):

1. `getCorsHeaders(req.headers.get('Origin'))` per request (line 326); `OPTIONS` preflight returns 200 with those headers (lines 328-330).
2. Requires `Authorization: Bearer ...` else 401 (lines 338-344); validates the token with a server round-trip `supabaseUser.auth.getUser()` using the anon-key client carrying the caller's header (lines 346-356). `verify_jwt = false` in `supabase/config.toml` because of this in-function check.
3. Rate limit: `rateLimiter.check(userId)` (15 req/min/user, in-memory) returns 429 with `Retry-After: 60` when exceeded (lines 360-365; limiter config line 17).
4. Creates a service-role client `supabaseAdmin` (line 367) used for ALL DB access in this function; user scoping is done manually with `.eq('user_id', userId)`, not RLS.
5. Parses `{ action }` from the JSON body (lines 369-370) and routes: `get-settings`, `save-settings`, else must be `create` | `optimize` | `optimize-draft` or 400 `Invalid action` (lines 409-414).
6. Any thrown error returns 500 `{ error: 'Internal error' }` (message intentionally generic, lines 685-691).

### Flow 1: "Create" run (Create tab)

1. `src/components/promptor/PromptorCreate.tsx` -> `handleSubmit()` (line 136). Validates the brief is non-empty (toast otherwise), clears prior output via `onUpdate({ output: null })` + `onOutputChange?.(null)`, then sets the cosmetic pipeline state: `setStep('querying_heart')` immediately, `querying_brain` at 1200 ms, `generating` at 2400 ms via `setTimeout` (lines 145-147). These timers are purely visual; there are no real progress events from the server.
2. Calls `runPromptor.mutateAsync({ action: 'create', output_type: outputType, blueprint, raw_request: brief })` (lines 150-155). `outputType`/`blueprint`/`brief` come from `usePromptorSession()` state, persisted in `sessionStorage['promptor_session']` (`src/hooks/promptor/usePromptorSession.ts:4, 56-62`).
3. `src/hooks/promptor/useRunPromptor.ts` -> `mutationFn` -> `callPromptor(params)`.
4. `src/hooks/promptor/usePromptorSettings.ts:7-20` -> `callPromptor()` does `fetch(PROMPTOR_URL, { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(payload) })`; on `!res.ok` it throws `errBody.error || 'Promptor request failed (status)'`.
5. Edge function (`supabase/functions/promptor/index.ts`): after the common preamble, destructures the body with defaults (lines 416-421) and 400s if `raw_request` is missing (lines 423-428):

```ts
    const {
      output_type = 'text',
      blueprint: blueprintKey = 'general',
      raw_request,
      existing_prompt,
    } = body;
```

6. DB read 1: `promptor_settings` for this user (`.select('*').eq('user_id', userId).single()`, lines 431-435); falls back to an inline defaults object (lines 437-450). `getDepthLimit(settings.retrieval_depth)` maps small/medium/large -> 5/10/20 (lines 153-157).
7. DB read 2: `llm_settings` (`.select('*').single()`, lines 455-458). Provider/model/key resolution (lines 460-465):

```ts
    const provider = llmSettings?.active_text_provider || 'openai';
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    const geminiKey = llmSettings?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';
    const model = provider === 'gemini'
      ? (llmSettings?.gemini_text_model || 'gemini-2.0-flash')
      : (llmSettings?.openai_text_model || 'gpt-4o');
```

8. Mandatory Heart + Brain retrieval, in parallel (lines 467-480). Heart is a direct DB fetch of ALL active global rules (no similarity filter); Brain is a semantic search via a server-to-server call to the `search-knowledge` edge function authenticated with the SERVICE ROLE key:

```ts
    const contextQuery = `${raw_request} ${output_type} ${blueprintKey}`;

    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
      // Brain: semantic search with a lower threshold for better recall
      queryKnowledge(supabaseUrl, serviceKey, contextQuery, ['brain_document', 'wishpedia_entry'], depthLimit),
    ]);
```

   `queryKnowledge()` (lines 159-189) POSTs `{ query, source_types, limit, threshold: 0.3 }` to `${supabaseUrl}/functions/v1/search-knowledge` with `Authorization: Bearer ${serviceKey}`, and degrades to `{ results: [], count: 0 }` on failure. Inside `supabase/functions/search-knowledge/index.ts` the query is embedded by calling `https://api.openai.com/v1/embeddings` with model `text-embedding-3-small` (lines 37-47) and matched via the `match_knowledge` RPC over `knowledge_embeddings` (lines 118-122).
9. Heart rule content and names are sanitized before interpolation: `sanitizeForPrompt(r.rule_content)` / `sanitizeForPrompt(r.name)` (lines 483-486, AGENT-003; implementation in `supabase/functions/_shared/sanitize.ts`).
10. Blueprint lookup from the in-code registry: `BLUEPRINTS[output_type]?.[blueprintKey] || BLUEPRINTS[output_type]?.['general'] || null` (line 492). The registry (lines 24-149) covers 5 output types: `text` (general, ad_copy, landing_page, email, blog_outline, product_description), `image` (general_scene, character_portrait, product_hero, social_square), `social_image` (announcement, quote_card, carousel_slide), `social_copy` (hook_variants, caption_variants, cta_variants), `video` (short_reel, cinematic_trailer, explainer_storyboard).
11. System prompt built by `buildSystemPrompt()` (lines 191-321). Verbatim template returned (lines 273-320), with `${...}` slots filled from settings/retrieval:

```ts
  return `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.

${langInstr}
${verbosityInstr}
${fmtInstr}
${safetyInstr}

Your operating law:
1. Heart rules are ABSOLUTE and always override everything else. Never invent Heart rules.
2. Brain context informs brand alignment. If Heart and Brain conflict, Heart wins.
3. ${strictnessInstr}
4. ${refusalInstr}
5. Never hallucinate Fortun canon, brand rules, or policies.

${heartSection}

${brainSection}

${blueprintSection}

${toneSection}

${vocabSection}

## RESPONSE CONTRACT
You MUST respond with a valid JSON object matching this exact structure:
{
  "brief_summary": "1-2 sentence summary of what was created/optimized",
  "final_prompt_short": "concise version of the prompt (1-3 sentences) or null if not applicable",
  "final_prompt_full": "complete, ready-to-use prompt",
  "variants": ["variant 1", "variant 2"],
  "negatives": "comma-separated negative prompts or null if not applicable",
  "qa_checklist": ["checklist item 1", "checklist item 2"],
  "compliance_status": "pass" | "adjusted" | "refused",
  "compliance_notes": "very brief note on any adjustments or refusals, or null if fully compliant",
  "derived_brief": {
    "output_type": "...",
    "goal": "...",
    "audience": "...",
    "key_constraints": []
  }
}

- compliance_status "pass": request fully complies with Heart rules, no changes needed
- compliance_status "adjusted": request was modified to comply; explain briefly in compliance_notes  
- compliance_status "refused": request violates Heart rules; final_prompt_full should contain a compliant alternative

Action mode: ${action}`;
```

   Key filled sections, verbatim from the same function: the Heart block header is `## MANDATORY HEART RULES (always override everything else)` with each rule as `- [${r.source?.name || 'Rule'}] ${r.content}` (lines 211-216); Brain is `## BRAND & KNOWLEDGE CONTEXT (from Fortun Brain)` (lines 218-222); the blueprint is JSON-dumped under `## BLUEPRINT GUIDE` (lines 224-226); brand tone under `## BRAND TONE (0-100 scale)` (lines 228-230); vocabulary as `Blocked vocabulary (never use): ...` / `Preferred vocabulary (prioritize): ...` (lines 232-235). Strictness/refusal/language/verbosity/safety/formatting instructions are mapped from settings at lines 237-271, e.g. the default strictness `enforce_and_propose` yields `'If any part of the request violates Heart rules, refuse that part and always propose a compliant alternative that still helps the user reach their goal.'`.
12. Style defaults are appended to the user message depending on output type (lines 509-532): image/social_image add aspect ratio + composition + camera cues; video adds duration + shot list + pacing; social_copy/social_image add platform + CTA intensity + hashtag behavior.
13. User message for `create` (lines 557-564), verbatim:

```ts
      : `Create a prompt for output type "${output_type}" (blueprint: "${blueprintKey}"):

USER BRIEF:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}

Respond ONLY with the JSON object.`;
```

14. Token budget: `TOKEN_BUDGETS.CONTENT_GENERATION` = 4096 for create/optimize (lines 567-569; `supabase/functions/_shared/token-budgets.ts:17`).
15. External LLM call (lines 572-614). If `provider === 'gemini' && geminiKey`: `POST https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}` (note: the API key is placed in the URL query string, line 575) with the system prompt and user message concatenated into a single user part, `generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }`; the JSON is extracted with a `rawText.match(/\{[\s\S]*\}/)` regex (lines 585-587). Otherwise OpenAI: `POST https://api.openai.com/v1/chat/completions` with proper system/user messages, `temperature: 0.7`, `max_tokens: maxTokens`, `response_format: { type: 'json_object' }` (lines 590-606); parse failures fall back to `{}` (lines 609-613).
16. DB write 1: persists the full run to `promptor_runs` via `supabaseAdmin.from('promptor_runs').insert(runData).select('id').single()` (lines 639-643). `runData` (lines 617-637) stores `user_id`, `mode: action`, `output_type`, `blueprint`, `raw_request`, `existing_prompt`, the FULL retrieval bundle (`heart_rules_used`, `brain_context_used`), `derived_brief`, all output fields, `compliance_status`/`notes`, `llm_provider`, `llm_model`. Insert errors are logged but non-fatal (lines 645-647).
17. DB write 2: a row into the shared `osha_audit_logs` table (legacy name, unified cross-agent audit; lines 649-665) with `compliance_notes: 'Promptor ${action}: ${output_type}/${blueprintKey}' + ...`; failure is caught and non-fatal.
18. Response 200 (lines 667-684), shape matching `PromptorOutput` (`src/hooks/promptor/types.ts:77-91`):

```ts
      JSON.stringify({
        run_id: insertedRun?.id || null,
        brief_summary: llmResponse.brief_summary || '',
        final_prompt_short: llmResponse.final_prompt_short || null,
        final_prompt_full: llmResponse.final_prompt_full || '',
        variants: llmResponse.variants || [],
        negatives: llmResponse.negatives || null,
        qa_checklist: llmResponse.qa_checklist || [],
        compliance_status: llmResponse.compliance_status || 'pass',
        compliance_notes: llmResponse.compliance_notes || null,
        retrieval_meta: {
          heart_chunks: heartResult.count,
          brain_chunks: brainResult.count,
        },
      }),
```

19. Client state update: `useRunPromptor.onSuccess` invalidates `['promptor-runs']` (`src/hooks/promptor/useRunPromptor.ts:17-19`) so the History tab refetches. Back in `PromptorCreate.handleSubmit`, the timers are cleared, the mounted guard is checked, then `onUpdate({ output: result })` (persists into sessionStorage), `onOutputChange?.(result)` (lifts to `PromptorAgent.lastOutput`, which feeds the `PromptorHeader` rules/chunks pills via `retrieval_meta`), and `setStep('done')` renders `<PromptorOutputPanel>` (lines 156-161). On error: timers cleared, `setStep('idle')`, destructive toast (lines 163-169).

### Flow 2: "Optimize" run (Optimize tab)

Identical to Flow 1 except:

1. `src/components/promptor/PromptorOptimize.tsx` -> `handleSubmit()` (line 135) requires a non-empty `existingPrompt` and sends (lines 149-155):

```ts
      const result = await runPromptor.mutateAsync({
        action: 'optimize',
        output_type: outputType,
        blueprint,
        raw_request: context || 'Optimize this prompt for clarity, compliance, and brand alignment.',
        existing_prompt: existingPrompt,
      });
```

   So an empty Optimization Goal is replaced client-side by that fixed default string.
2. The edge function takes the `optimize` branch of the user message (lines 548-556), verbatim:

```ts
      : action === 'optimize'
      ? `Optimize this existing prompt for the output type "${output_type}" (blueprint: "${blueprintKey}"):

EXISTING PROMPT:
${existing_prompt}

USER CONTEXT / GOAL:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}`
```

3. Everything else (retrieval, LLM call at 4096 tokens, `promptor_runs` insert with `mode: 'optimize'` and `existing_prompt` stored, audit log, response, client state) is the same code path. Note the optimize user message does not append `Respond ONLY with the JSON object.`; the response contract lives in the system prompt and OpenAI calls still force `response_format: json_object`.

### Flow 3: "optimize-draft" (wand button in Osha / Pixel, "Improve with AI" + bulk variants in Pulse)

1. Entry points, all funneling into the same hook:
   - Osha: `src/components/osha/OshaChat.tsx:333-345` wand button -> `src/hooks/useOshaChatController.ts:147-160` `handleOptimizeDraft()` -> `optimizeDraft(input.trim())`, result replaces the chat input and re-measures the textarea height.
   - Pixel: `src/components/pixel/PixelStudio.tsx:66-78`, identical pattern (max height 180px).
   - Pulse composer: `src/components/pulse/create/PulseComposer.tsx:50-58` `handleImprove()` -> `optimizeDraft(caption)` replaces the caption.
   - Pulse bulk: `src/components/pulse/create/PulseBulkGenerator.tsx:52-58` loops N times calling `optimizeDraft(\`${brief}\n\n(Write a distinct, ready-to-post social caption - variation ${i + 1} of ${count}, with a fresh angle and hook. Output only the caption.)\`)` (verbatim suffix), collecting variants.
2. `src/hooks/promptor/useOptimizeDraft.ts:13-22` -> `callPromptor({ action: 'optimize-draft', raw_request: draftText })`, then extracts `final_prompt_full`, throwing `'Promptor returned an empty rewrite'` if missing/blank; `onError` fires the Sonner toast `'Promptor could not optimize the prompt. Please try again.'`. No query invalidation.
3. Edge function: same preamble, same settings/llm_settings loads, same MANDATORY Heart + Brain retrieval and blueprint/system-prompt build. Because the caller sends only `raw_request`, the body defaults apply: `output_type = 'text'`, `blueprint = 'general'` (lines 416-421), so the `text/general` blueprint and no style-defaults block are used.
4. The user message is the dedicated tight rewrite block (lines 534-543), verbatim:

```ts
    // Tight user message for in-place chat-draft rewrites (Osha/Pixel wand button).
    // Skips blueprint variants and produces only a rewritten draft in final_prompt_full.
    const optimizeDraftMessage = `The user has typed a draft chat prompt and wants it rewritten for clarity, specificity, and brand alignment with the Heart rules and Brain context above.

Return a JSON object where "final_prompt_full" contains ONLY the rewritten draft as a single string. All other JSON fields may be empty strings, empty arrays, or short placeholders — they will be ignored. Do not wrap the rewrite in quotes or code fences.

DRAFT TO REWRITE:
${raw_request}

Respond ONLY with the JSON object.`;
```

5. Token budget: `TOKEN_BUDGETS.PROMPT_OPTIMIZE` = 800 (lines 567-569; `_shared/token-budgets.ts:23`).
6. Same LLM call, and notably the run IS still persisted: `promptor_runs` gets a row with `mode: 'optimize-draft'` plus an `osha_audit_logs` row (lines 616-665), so wand rewrites appear in the Promptor History tab.
7. Response is the same full `PromptorOutput` JSON; the hook uses only `final_prompt_full` and resolves the trimmed string into the caller's input state.

### Flow 4: Settings load (`get-settings`)

1. Triggered on mount of `PromptorAgent` (`src/screens/PromptorAgent.tsx:31`) and the Settings tab (`src/components/promptor/PromptorSettings.tsx:110`), both via `usePromptorSettings()`.
2. `src/hooks/promptor/usePromptorSettings.ts:24-40`: TanStack query `['promptor-settings']`, `staleTime` 5 min, `callPromptor({ action: 'get-settings' })`; ANY throw (network, 4xx/5xx, extension interference) degrades to `DEFAULT_SETTINGS` (CODE-01).
3. Edge handler (lines 373-382): `supabaseAdmin.from('promptor_settings').select('*').eq('user_id', userId).single()`, responds `{ settings: settings || null }`. The hook unwraps `result.settings || DEFAULT_SETTINGS`. Note the hook casts the `{ settings }` envelope out of the nominal `PromptorOutput` return type of `callPromptor` (`as unknown as { settings: PrompterSettings | null }`, line 32).
4. Client use: `PromptorAgent` seeds the Create tab's default output type once per fresh session (lines 40-45); `PromptorSettings` seeds its local editable state from the fetched row (lines 115-120); `PromptorCreate`/`PromptorOptimize` use `include_*` flags to control which output sections render.

### Flow 5: Settings save (`save-settings`)

1. `src/components/promptor/PromptorSettings.tsx:127-136` `handleSave()` -> `useUpsertPromptorSettings().mutateAsync(s)` with the full settings object; success/error toasts.
2. `src/hooks/promptor/usePromptorSettings.ts:42-52`: `callPromptor({ action: 'save-settings', settings })`, then invalidates `['promptor-settings']`.
3. Edge handler (lines 385-406): manual upsert with the service-role client: select `id` where `user_id = userId`; if a row exists `update({ ...settings, updated_at: new Date().toISOString() })`, else `insert({ ...settings, user_id: userId })`; responds `{ success: true }`. Note: the incoming `settings` object is spread without field-level validation or whitelisting (any column the row accepts can be set; errors from the update/insert are not checked before returning success).

### Flow 6: History load

1. `src/components/promptor/PromptorHistory.tsx:234` -> `usePromptorRuns()`.
2. `src/hooks/promptor/usePromptorRuns.ts:5-23`: this does NOT go through the edge function. It queries PostgREST directly with the browser client (`src/integrations/supabase/client.ts`): `supabase.from('promptor_runs').select('*').order('created_at', { ascending: false }).limit(100)`, scoped by the RLS policy `auth.uid() = user_id` (migration `20260217191453_...sql`). JSON columns `variants`/`qa_checklist` are normalized to arrays client-side.
3. Rendering: filter/search in memory (lines 246-254), each run expands to full/short prompt, variants, compliance notes (lines 157-225).

### Flow 7: History delete / clear

1. Single or selected delete: `PromptorHistory` confirm dialog -> `useDeletePromptorRuns().mutateAsync(ids)` -> direct `supabase.from('promptor_runs').delete().in('id', ids)` (`src/hooks/promptor/usePromptorRuns.ts:25-39`), RLS-scoped.
2. Clear all: `useClearPromptorRuns()` -> `supabase.from('promptor_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000')` (lines 41-55), i.e. "delete everything visible under RLS" via a never-matching UUID guard.
3. Both invalidate `['promptor-runs']` on success; `PromptorHistory.handleConfirmDelete` also prunes deleted ids from the selection set (lines 281-299).

### Flow 8: Agent activation gate (Nexus toggle)

1. `PromptorAgent` calls `useAgentSettings('promptor')` (`src/screens/PromptorAgent.tsx:32`), which is a direct client read of the `agent_settings` table (`src/hooks/useAgentSettings.ts:27-42`).
2. If `is_active === false`, the screen renders a blocking blur overlay with a "Go to Nexus" button to `/ai-agents/nexus?tab=agents` (lines 47-48, 110-129). This is a client-side overlay only; the promptor edge function itself does not check `agent_settings.is_active` (no `agent_settings` read anywhere in `supabase/functions/promptor/index.ts`), so direct API calls (including the Osha/Pixel/Pulse `optimize-draft` consumers) work regardless of the Nexus toggle.

### Flow 9: Quick prompts (clarification)

There is no quick-prompts feature in the Promptor UI or edge function. The `quick_prompts` table is consumed by Nexus only: `src/hooks/useQuickPrompts.ts` (select/insert/update/delete) feeding `src/screens/NexusAgent.tsx` and `src/components/nexus/QuickPrompts.tsx` / `QuickPromptEditor.tsx` / `PromptLibrary.tsx` and related files. CLAUDE.md groups `quick_prompts` under the "Promptor" domain area, but the code wires it exclusively into Nexus.

### Cross-cutting observations (code-level, verified)

- The Gemini branch sends the API key as a URL query parameter (`?key=${geminiKey}`, `supabase/functions/promptor/index.ts:575`) and concatenates system + user prompts into one user turn (line 580); only the OpenAI branch uses a true system role and enforced JSON mode.
- `mode` persisted to `promptor_runs` is the raw action string, so values are `create`, `optimize`, and `optimize-draft` even though the table default documents `'create'` (migration line 58).
- Heart retrieval is not vector-based for Promptor: it is a full fetch of `is_active` rules that are global OR have `assigned_agents` containing `"promptor"` (line 477), while Brain retrieval is semantic over `brain_document` + `wishpedia_entry` source types with threshold 0.3 and a settings-controlled limit of 5/10/20.
- The three-step Heart/Brain/Generate progress UI in both Create and Optimize tabs is timer-driven client theater (1200/2400 ms), not server progress (`PromptorCreate.tsx:145-147`, `PromptorOptimize.tsx:144-146`).
- `usage-quota.ts` defines a `'promptor-generate': 50` daily cap, but the promptor function never imports or calls it, so no daily quota is enforced on Promptor; only the 15/min in-memory rate limit applies (resets on cold start per `_shared/rate-limit.ts:5-8`).
- `citation_mode` and `include_full_prompt` exist in `promptor_settings` (migration lines 15, 39) and the client type (`src/hooks/promptor/types.ts:16, 44`) but are never read by `buildSystemPrompt` or any edge logic; they are stored-but-inert settings.

## P-3. System prompt and instructions

All fenced blocks below reproduce the source verbatim, byte for byte (including any dash characters present in the original source).

### Where Promptor's prompt text lives

- Promptor's entire system prompt is built at request time by the function `buildSystemPrompt()` in `supabase/functions/promptor/index.ts` (lines 191-321). There is exactly one system prompt builder and three per-action user-message templates (`create`, `optimize`, `optimize-draft`), all in the same file (lines 508-564).
- Promptor does NOT use the DB-backed system-prompt loader. `supabase/functions/_shared/system-prompts.ts` (`getSystemPrompt` / `getAgentPrompts`, reading the `system_prompts` table, columns `agent_id`, `prompt_key`, `content`, `version`, `is_active`) is imported only by `supabase/functions/osha-chat/index.ts:17`. `supabase/functions/promptor/index.ts` imports only `sanitizeForPrompt`, `TOKEN_BUDGETS`, `getCorsHeaders`, and `createRateLimiter` (lines 9-14). So no row of the `system_prompts` table ever reaches Promptor's prompt.
- The `quick_prompts` table is NOT used by Promptor either. Its only consumers are the Nexus prompt-library UI (`src/hooks/useQuickPrompts.ts`, used by `src/components/nexus/QuickPrompts.tsx:44`, `src/components/nexus/PromptLibrary.tsx:22`, and related Nexus components). No file under `src/components/promptor/`, `src/hooks/promptor/`, or `supabase/functions/promptor/` references it.

Dynamic content injected into the prompt comes from three DB sources: `heart_rules` (direct table read), the Brain/Wishpedia vector store (via the `search-knowledge` edge function), and `promptor_settings` (per-user settings row). Plus one hardcoded in-file `BLUEPRINTS` registry.

### The system prompt builder, verbatim

`supabase/functions/promptor/index.ts` lines 191-321 (the complete function; every hardcoded system-prompt string Promptor has is inside it):

```ts
function buildSystemPrompt(
  heartRules: object[],
  brainContext: object[],
  blueprint: object | null,
  settings: Record<string, unknown>,
  action: string,
): string {
  const tone = (settings.brand_tone as Record<string, number>) || {};
  const blockedVocab = (settings.blocked_vocabulary as string[]) || [];
  const allowedVocab = (settings.allowed_vocabulary as string[]) || [];
  const strictness = (settings.heart_strictness as string) || 'enforce_and_propose';
  const refusalStyle = (settings.refusal_style as string) || 'neutral';
  const lang = (settings.default_language as string) || 'en';
  const verbosity = (settings.default_verbosity as string) || 'standard';
  const safetyGuard = settings.safety_guard_mode !== false;
  const formattingStyle = (settings.formatting_style as string) || 'plain';

  const LANG_NAMES: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', ja: 'Japanese' };
  const langName = LANG_NAMES[lang] || 'English';

  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES (always override everything else)\n${heartRules
        .map((r: any) => `- [${r.source?.name || 'Rule'}] ${r.content}`)
        .join('\n')}`
    : `## HEART RULES\nNo specific Heart rules retrieved. Default to strict, safe, brand-respectful behavior.
Ask the user to configure Heart rules in MasterMind > Heart if specific compliance constraints are needed.`;

  const brainSection = brainContext.length > 0
    ? `## BRAND & KNOWLEDGE CONTEXT (from Fortun Brain)\n${brainContext
        .map((r: any) => `- ${r.content}`)
        .join('\n')}`
    : `## BRAND & KNOWLEDGE CONTEXT\nNo specific Brain knowledge retrieved. Use conservative brand defaults.`;

  const blueprintSection = blueprint
    ? `## BLUEPRINT GUIDE\n${JSON.stringify(blueprint, null, 2)}`
    : '';

  const toneSection = Object.keys(tone).length > 0
    ? `## BRAND TONE (0-100 scale)\n${Object.entries(tone).map(([k, v]) => `- ${k}: ${v}/100`).join('\n')}`
    : '';

  const vocabSection = [
    blockedVocab.length > 0 ? `Blocked vocabulary (never use): ${blockedVocab.join(', ')}` : '',
    allowedVocab.length > 0 ? `Preferred vocabulary (prioritize): ${allowedVocab.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const strictnessInstr = strictness === 'always_enforce'
    ? 'If any part of the request violates Heart rules, refuse that part entirely and do not propose alternatives.'
    : strictness === 'enforce_and_propose'
    ? 'If any part of the request violates Heart rules, refuse that part and always propose a compliant alternative that still helps the user reach their goal.'
    : 'If any part violates Heart rules, note the adjustment briefly and produce the safest compliant version.';

  const refusalInstr = refusalStyle === 'soft'
    ? 'When refusing, be warm and supportive.'
    : refusalStyle === 'firm'
    ? 'When refusing, be direct and unambiguous.'
    : 'When refusing, be clear but professional.';

  // Language instruction
  const langInstr = `You MUST respond in ${langName}.`;

  // Verbosity instruction
  const verbosityMap: Record<string, string> = {
    short: 'Be concise — favor brevity, only essential details.',
    standard: 'Use balanced detail — comprehensive but not verbose.',
    detailed: 'Be thorough and detailed — include every relevant nuance and explanation.',
  };
  const verbosityInstr = `Output verbosity: ${verbosityMap[verbosity] || verbosityMap.standard}`;

  // Safety guard
  const safetyInstr = safetyGuard
    ? 'When uncertain about any constraint, produce the safest compliant output and explicitly note your assumptions in compliance_notes.'
    : '';

  // Formatting style
  const fmtMap: Record<string, string> = {
    plain: 'Format the final_prompt_full as plain text.',
    structured: 'Format the final_prompt_full with clearly labeled sections and sub-headings.',
    json: 'Format the final_prompt_full as a structured JSON object with labeled keys.',
  };
  const fmtInstr = fmtMap[formattingStyle] || fmtMap.plain;

  return `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.

${langInstr}
${verbosityInstr}
${fmtInstr}
${safetyInstr}

Your operating law:
1. Heart rules are ABSOLUTE and always override everything else. Never invent Heart rules.
2. Brain context informs brand alignment. If Heart and Brain conflict, Heart wins.
3. ${strictnessInstr}
4. ${refusalInstr}
5. Never hallucinate Fortun canon, brand rules, or policies.

${heartSection}

${brainSection}

${blueprintSection}

${toneSection}

${vocabSection}

## RESPONSE CONTRACT
You MUST respond with a valid JSON object matching this exact structure:
{
  "brief_summary": "1-2 sentence summary of what was created/optimized",
  "final_prompt_short": "concise version of the prompt (1-3 sentences) or null if not applicable",
  "final_prompt_full": "complete, ready-to-use prompt",
  "variants": ["variant 1", "variant 2"],
  "negatives": "comma-separated negative prompts or null if not applicable",
  "qa_checklist": ["checklist item 1", "checklist item 2"],
  "compliance_status": "pass" | "adjusted" | "refused",
  "compliance_notes": "very brief note on any adjustments or refusals, or null if fully compliant",
  "derived_brief": {
    "output_type": "...",
    "goal": "...",
    "audience": "...",
    "key_constraints": []
  }
}

- compliance_status "pass": request fully complies with Heart rules, no changes needed
- compliance_status "adjusted": request was modified to comply; explain briefly in compliance_notes  
- compliance_status "refused": request violates Heart rules; final_prompt_full should contain a compliant alternative

Action mode: ${action}`;
}
```

Persona text: the single identity line `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.` (line 273). There is no other persona text anywhere in the function or file.

### Per-action user message templates, verbatim

`supabase/functions/promptor/index.ts` lines 508-564 (style defaults block plus all three user-message templates):

```ts
    // ── Output-type-specific defaults from settings ─────────────────────────
    const styleDefaults: string[] = [];

    if (output_type === 'image' || output_type === 'social_image') {
      const ratio = (settings.image_aspect_ratio as string) || '1:1';
      const comp = (settings.image_composition_detail as string) || 'standard';
      const cam = (settings.image_camera_cue_style as string) || 'descriptive';
      styleDefaults.push(`Default aspect ratio: ${ratio}. Composition detail level: ${comp}. Camera cue style: ${cam}.`);
    }
    if (output_type === 'video') {
      const dur = (settings.video_duration_default as string) || '30s';
      const shots = (settings.video_shot_list_style as string) || 'standard';
      const pace = (settings.video_pacing_style as string) || 'moderate';
      styleDefaults.push(`Default duration: ${dur}. Shot list style: ${shots}. Pacing: ${pace}.`);
    }
    if (output_type === 'social_copy' || output_type === 'social_image') {
      const platform = (settings.social_platform_default as string) || 'instagram';
      const cta = (settings.social_cta_intensity as string) || 'moderate';
      const hashtags = (settings.social_hashtag_behavior as string) || 'suggest';
      styleDefaults.push(`Target platform: ${platform}. CTA intensity: ${cta}. Hashtag behavior: ${hashtags}.`);
    }

    const styleDefaultsBlock = styleDefaults.length > 0
      ? `\nSTYLE DEFAULTS:\n${styleDefaults.join('\n')}\n`
      : '';

    // Tight user message for in-place chat-draft rewrites (Osha/Pixel wand button).
    // Skips blueprint variants and produces only a rewritten draft in final_prompt_full.
    const optimizeDraftMessage = `The user has typed a draft chat prompt and wants it rewritten for clarity, specificity, and brand alignment with the Heart rules and Brain context above.

Return a JSON object where "final_prompt_full" contains ONLY the rewritten draft as a single string. All other JSON fields may be empty strings, empty arrays, or short placeholders — they will be ignored. Do not wrap the rewrite in quotes or code fences.

DRAFT TO REWRITE:
${raw_request}

Respond ONLY with the JSON object.`;

    const userMessage = action === 'optimize-draft'
      ? optimizeDraftMessage
      : action === 'optimize'
      ? `Optimize this existing prompt for the output type "${output_type}" (blueprint: "${blueprintKey}"):

EXISTING PROMPT:
${existing_prompt}

USER CONTEXT / GOAL:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}`
      : `Create a prompt for output type "${output_type}" (blueprint: "${blueprintKey}"):

USER BRIEF:
${raw_request}
${styleDefaultsBlock}
Generate ${numVariants} variant(s). ${includeShort ? 'Include a short version.' : ''} ${includeNegatives ? 'Include negatives/exclusions.' : ''} ${includeQA ? 'Include a QA checklist.' : ''}

Respond ONLY with the JSON object.`;
```

Note: the `optimize` user message has no trailing `Respond ONLY with the JSON object.` line; `create` and `optimize-draft` do (as written in code above).

### Heart rules injection (DB-sourced)

- **Table and columns:** `heart_rules`, selecting `id, name, category, rule_content, priority, is_global, assigned_agents, is_active`. The fetch is a direct table read with NO similarity filter (all active global rules plus all rules assigned to `promptor` always apply). `supabase/functions/promptor/index.ts` lines 471-477:

```ts
    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
```

- **Sanitization before splice:** `rule_content` and `name` are passed through `sanitizeForPrompt` (lines 482-487):

```ts
    // AGENT-003: sanitize rule content before prompt interpolation
    const heartRules = (heartRulesData.data || []).map((r: any) => ({
      content: sanitizeForPrompt(r.rule_content),
      source: { name: sanitizeForPrompt(r.name), category: r.category, priority: r.priority },
    }));
    const heartResult = { results: heartRules, count: heartRules.length };
```

- **The sanitizer, verbatim** (`supabase/functions/_shared/sanitize.ts` lines 12-28):

```ts
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
```

- **Splice point:** `heartSection` in `buildSystemPrompt` formats each rule as a bullet `- [${r.source?.name || 'Rule'}] ${r.content}` under the heading `## MANDATORY HEART RULES (always override everything else)` (lines 211-214, quoted in the builder block above). If zero rules are retrieved, the hardcoded fallback text at lines 215-216 is used instead (also quoted above).
- The retrieved rules are also persisted to `promptor_runs.heart_rules_used` (line 624) and logged to `osha_audit_logs.heart_rules_used` (line 654).

### Brain/RAG context injection (DB-sourced)

- **Retrieval query string:** built at `supabase/functions/promptor/index.ts:469`:

```ts
    const contextQuery = `${raw_request} ${output_type} ${blueprintKey}`;
```

- **Fetch mechanism:** `queryKnowledge()` (lines 159-189) calls the `search-knowledge` edge function server-to-server with the service-role key, source types `['brain_document', 'wishpedia_entry']`, `threshold: 0.3`, and a limit derived from `promptor_settings.retrieval_depth` via `getDepthLimit()` (lines 153-157: `small` = 5, `large` = 20, default/`medium` = 10):

```ts
async function queryKnowledge(
  supabaseUrl: string,
  serviceKey: string,
  query: string,
  sourceTypes: string[],
  limit: number,
): Promise<{ results: object[]; count: number }> {
  const url = `${supabaseUrl}/functions/v1/search-knowledge`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      query,
      source_types: sourceTypes,
      limit,
      threshold: 0.3,
    }),
  });
```

  Called at line 479: `queryKnowledge(supabaseUrl, serviceKey, contextQuery, ['brain_document', 'wishpedia_entry'], depthLimit)`.
- **Underlying data:** `search-knowledge` resolves results via the `match_knowledge` RPC (`supabase/functions/search-knowledge/index.ts` lines 117-129), which selects `ke.content ... FROM public.knowledge_embeddings ke` (`supabase/migrations/20260202100601_ef4d14b2-f25b-48f0-9810-ccf93e193936.sql` lines 37-40). So the injected text is the `knowledge_embeddings.content` column (chunked Brain document / Wishpedia entry text).
- **Splice point:** each result's `.content` is formatted as a bullet `- ${r.content}` under `## BRAND & KNOWLEDGE CONTEXT (from Fortun Brain)` in `brainSection` (lines 218-221, quoted in the builder block above), with the hardcoded empty fallback at line 222.
- **Not sanitized, not fenced:** unlike Heart rules, Brain/Wishpedia chunk content is interpolated into the system prompt WITHOUT `sanitizeForPrompt` and without any untrusted-content fencing. See the next subsection.
- Retrieved chunks are persisted to `promptor_runs.brain_context_used` (line 625) and counted in `osha_audit_logs.brain_chunks_used` (line 655).

### Untrusted-content fencing: none in Promptor

There is no untrusted-content fencing clause anywhere in `supabase/functions/promptor/index.ts` (no "untrusted", no fenced-content delimiters, no injection-warning clause). The only injection mitigation is `sanitizeForPrompt` applied solely to `heart_rules.rule_content` and `heart_rules.name` (lines 482-487). The following are interpolated raw, with no sanitization or fencing:

- Brain/Wishpedia chunk content into the system prompt (`brainSection`, lines 218-221)
- `promptor_settings.allowed_vocabulary` / `blocked_vocabulary` / `brand_tone` keys into the system prompt (`vocabSection` lines 232-235, `toneSection` lines 228-230)
- `raw_request` and `existing_prompt` into the user message (lines 541, 551, 554, 560)

This contrasts with the fencing clauses added to `osha-chat` and `pulse-api` per the project's audit history; the code in `promptor/index.ts` has none. (CLAUDE.md does not claim otherwise for Promptor, but flagging for completeness: the AGENT-003 comment at line 482 only covers Heart rules.)

### Blueprint registry (hardcoded instruction data)

The full in-file registry at `supabase/functions/promptor/index.ts` lines 24-149. The selected blueprint object is serialized verbatim with `JSON.stringify(blueprint, null, 2)` under the `## BLUEPRINT GUIDE` heading (lines 224-226). Selection logic at line 492: `BLUEPRINTS[output_type]?.[blueprintKey] || BLUEPRINTS[output_type]?.['general'] || null`. Registry, verbatim:

```ts
const BLUEPRINTS: Record<string, Record<string, object>> = {
  text: {
    general: {
      required_slots: ['topic', 'audience', 'goal'],
      optional_slots: ['tone', 'length', 'format'],
      constraints_guidance: 'Keep language clear and on-brand. Avoid jargon unless requested.',
      output_format: 'prose or structured sections',
    },
    ad_copy: {
      required_slots: ['product', 'benefit', 'audience', 'cta'],
      optional_slots: ['urgency', 'offer', 'platform'],
      constraints_guidance: 'Lead with the primary benefit. CTA must be clear. Avoid superlatives without proof.',
      output_format: 'headline + body + CTA',
    },
    landing_page: {
      required_slots: ['product', 'value_proposition', 'audience', 'cta'],
      optional_slots: ['pain_points', 'social_proof', 'features'],
      constraints_guidance: 'Above fold must carry full value prop. Use benefit-first language.',
      output_format: 'hero + sections + cta',
    },
    email: {
      required_slots: ['subject', 'goal', 'audience', 'cta'],
      optional_slots: ['preview_text', 'personalization', 'tone'],
      constraints_guidance: 'Subject line under 50 chars. Single focused CTA. No spam triggers.',
      output_format: 'subject + preheader + body + cta',
    },
    blog_outline: {
      required_slots: ['topic', 'audience', 'goal'],
      optional_slots: ['seo_keywords', 'sections', 'tone'],
      constraints_guidance: 'Lead with value. Use H2/H3 structure. Include intro hook and conclusion.',
      output_format: 'title + intro + sections + conclusion',
    },
    product_description: {
      required_slots: ['product_name', 'features', 'audience', 'key_benefit'],
      optional_slots: ['price_tier', 'use_cases', 'materials'],
      constraints_guidance: 'Lead with benefit not feature. Sensory details for physical products.',
      output_format: 'short description + features + cta',
    },
  },
  image: {
    general_scene: {
      required_slots: ['subject', 'setting', 'mood', 'style'],
      optional_slots: ['lighting', 'color_palette', 'camera_angle', 'time_of_day'],
      constraints_guidance: 'Be specific about composition. Avoid ambiguous spatial terms.',
      output_format: 'subject, setting, style, lighting, mood, camera details',
    },
    character_portrait: {
      required_slots: ['character_description', 'mood', 'style'],
      optional_slots: ['background', 'clothing', 'lighting', 'camera'],
      constraints_guidance: 'Include age range, ethnicity if relevant. No real person names.',
      output_format: 'character + mood + style + technical details',
    },
    product_hero: {
      required_slots: ['product', 'background', 'mood', 'style'],
      optional_slots: ['props', 'lighting_style', 'brand_colors'],
      constraints_guidance: 'Product must be clearly identifiable. Clean composition. Studio or lifestyle.',
      output_format: 'product + background + lighting + style',
    },
    social_square: {
      required_slots: ['subject', 'mood', 'style', 'color_palette'],
      optional_slots: ['text_overlay_area', 'brand_elements'],
      constraints_guidance: '1:1 ratio. Leave space for text if needed. Bold, scroll-stopping composition.',
      output_format: 'composition + style + colors + technical specs',
    },
  },
  social_image: {
    announcement: {
      required_slots: ['announcement_topic', 'brand', 'mood'],
      optional_slots: ['visual_metaphor', 'color_scheme', 'text_area'],
      constraints_guidance: 'Announcement should be visually implied, not only text-dependent.',
      output_format: 'scene + brand alignment + mood + composition',
    },
    quote_card: {
      required_slots: ['quote_theme', 'brand_aesthetic', 'color_palette'],
      optional_slots: ['background_style', 'typography_feel'],
      constraints_guidance: 'Background should not overpower the text area. Legibility first.',
      output_format: 'background + typography area + brand colors',
    },
    carousel_slide: {
      required_slots: ['slide_topic', 'brand', 'slide_position'],
      optional_slots: ['transition_style', 'color_scheme'],
      constraints_guidance: 'Consistent visual identity across slides. Each slide must work standalone.',
      output_format: 'scene per slide + consistency notes',
    },
  },
  social_copy: {
    hook_variants: {
      required_slots: ['topic', 'platform', 'audience', 'goal'],
      optional_slots: ['tone', 'emotion', 'cta'],
      constraints_guidance: 'First line must stop the scroll. Use pattern interrupts. Platform-native length.',
      output_format: '3-5 hook variants + reasoning',
    },
    caption_variants: {
      required_slots: ['topic', 'platform', 'audience'],
      optional_slots: ['cta', 'hashtags', 'emojis', 'tone'],
      constraints_guidance: 'Match platform voice. Instagram allows longer. X/Twitter needs punchy.',
      output_format: 'caption variants by length + hashtag suggestions',
    },
    cta_variants: {
      required_slots: ['goal', 'audience', 'platform'],
      optional_slots: ['urgency', 'incentive', 'tone'],
      constraints_guidance: 'CTA must match platform norms. No deceptive urgency.',
      output_format: 'cta variants + placement suggestions',
    },
  },
  video: {
    short_reel: {
      required_slots: ['concept', 'audience', 'platform', 'duration'],
      optional_slots: ['music_vibe', 'visual_style', 'hook', 'cta'],
      constraints_guidance: 'Hook in first 2 seconds. Vertical 9:16. Fast paced. Text overlays if needed.',
      output_format: 'hook + scenes + pacing + audio + cta',
    },
    cinematic_trailer: {
      required_slots: ['subject', 'narrative_arc', 'mood', 'duration'],
      optional_slots: ['music', 'voiceover', 'color_grade'],
      constraints_guidance: 'Build tension, release, aspiration. Avoid spoiling full story.',
      output_format: 'act structure + shot list + music + color',
    },
    explainer_storyboard: {
      required_slots: ['product_or_concept', 'audience', 'key_message', 'duration'],
      optional_slots: ['animation_style', 'voiceover_tone', 'cta'],
      constraints_guidance: 'Problem → solution → benefit flow. Keep each scene under 5 seconds.',
      output_format: 'numbered scenes + duration + visuals + narration',
    },
  },
};
```

Note on fallbacks: only `text` has a `general` key, so an unknown blueprint for `image`/`social_image`/`social_copy`/`video` resolves to `null` and the `## BLUEPRINT GUIDE` section is omitted entirely (line 492 plus lines 224-226). Also, the `optimize-draft` callers send only `action` and `raw_request` (`src/hooks/promptor/useOptimizeDraft.ts` lines 14-17), so the body defaults `output_type = 'text'`, `blueprint = 'general'` apply (`supabase/functions/promptor/index.ts` lines 416-421), meaning every optimize-draft run is built with the `text/general` blueprint injected.

### promptor_settings fields spliced into the prompt (DB-sourced)

Fetched at `supabase/functions/promptor/index.ts` lines 431-435 (`.from('promptor_settings').select('*').eq('user_id', userId).single()`), with in-code defaults at lines 437-450 when no row exists. Columns consumed in prompt text (client-side mirror of the column list: `src/hooks/promptor/types.ts` lines 8-45):

| Column (promptor_settings) | Where it lands in the prompt |
|---|---|
| `default_language` | `langInstr` (system, line 250) |
| `default_verbosity` | `verbosityInstr` (system, lines 253-258) |
| `formatting_style` | `fmtInstr` (system, lines 266-271) |
| `safety_guard_mode` | `safetyInstr` (system, lines 261-263) |
| `heart_strictness` | operating law item 3 (`strictnessInstr`, lines 237-241) |
| `refusal_style` | operating law item 4 (`refusalInstr`, lines 243-247) |
| `brand_tone` (JSON object of six 0-100 sliders) | `toneSection` (system, lines 228-230) |
| `blocked_vocabulary`, `allowed_vocabulary` (string arrays) | `vocabSection` (system, lines 232-235) |
| `retrieval_depth` | Brain retrieval limit only (line 452), not prompt text |
| `default_variants`, `include_short_prompt`, `include_negatives`, `include_qa_checklist` | trailing sentence of the create/optimize user message (lines 503-506, 556, 562) |
| `image_aspect_ratio`, `image_composition_detail`, `image_camera_cue_style` | `STYLE DEFAULTS` block in user message for image/social_image (lines 511-516) |
| `video_duration_default`, `video_shot_list_style`, `video_pacing_style` | `STYLE DEFAULTS` block for video (lines 517-522) |
| `social_platform_default`, `social_cta_intensity`, `social_hashtag_behavior` | `STYLE DEFAULTS` block for social_copy/social_image (lines 523-528) |

The `styleDefaultsBlock` is appended only to `create` and `optimize` user messages, never to `optimize-draft` (lines 545-564). `citation_mode` and `include_compliance_notes` exist in settings (`src/hooks/promptor/types.ts:44,19`) but are never referenced in the edge function's prompt assembly (`include_compliance_notes` only gates client-side display in `src/components/promptor/PromptorCreate.tsx:319`).

### Assembly order of the final messages array

LLM call at `supabase/functions/promptor/index.ts` lines 571-614. Two provider paths:

OpenAI path (lines 590-605), a true two-message array:

```ts
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
```

Gemini path (lines 574-583), NO system role; system prompt and user message are concatenated into a single user-role part:

```ts
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
```

Token budget (lines 567-569): `TOKEN_BUDGETS.PROMPT_OPTIMIZE` = 800 for `optimize-draft`, `TOKEN_BUDGETS.CONTENT_GENERATION` = 4096 for `create`/`optimize` (`supabase/functions/_shared/token-budgets.ts` lines 17, 23). Model selection at lines 460-465 (`llm_settings.active_text_provider`, falling back to `gpt-4o` / `gemini-2.0-flash`).

Numbered order of pieces inside the SYSTEM message (template at lines 273-320; each separated by a blank line):

1. Identity line: `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.` (line 273)
2. `langInstr` (line 275, built at line 250)
3. `verbosityInstr` (line 276, built at lines 253-258)
4. `fmtInstr` (line 277, built at lines 266-271)
5. `safetyInstr` (line 278; empty string when `safety_guard_mode` is false)
6. `Your operating law:` items 1-5 (lines 280-285), with `strictnessInstr` as item 3 and `refusalInstr` as item 4
7. `heartSection`: `## MANDATORY HEART RULES ...` bullets from `heart_rules.rule_content` (sanitized), or the no-rules fallback (line 287, built at lines 211-216)
8. `brainSection`: `## BRAND & KNOWLEDGE CONTEXT (from Fortun Brain)` bullets from `knowledge_embeddings.content`, or the no-knowledge fallback (line 289, built at lines 218-222)
9. `blueprintSection`: `## BLUEPRINT GUIDE` + JSON of the selected `BLUEPRINTS` entry, or empty (line 291, built at lines 224-226)
10. `toneSection`: `## BRAND TONE (0-100 scale)` from `promptor_settings.brand_tone`, or empty (line 293, built at lines 228-230)
11. `vocabSection`: blocked/preferred vocabulary lines from `promptor_settings.blocked_vocabulary` / `allowed_vocabulary`, or empty (line 295, built at lines 232-235)
12. `## RESPONSE CONTRACT` JSON schema block plus compliance_status legend (lines 297-318)
13. `Action mode: ${action}` (line 320)

Numbered order of pieces inside the USER message (lines 545-564):

- `create`: 1. header `Create a prompt for output type "${output_type}" (blueprint: "${blueprintKey}"):`, 2. `USER BRIEF:` + `raw_request`, 3. optional `STYLE DEFAULTS:` block, 4. `Generate ${numVariants} variant(s).` + conditional short/negatives/QA sentences, 5. `Respond ONLY with the JSON object.`
- `optimize`: 1. header `Optimize this existing prompt for the output type ...`, 2. `EXISTING PROMPT:` + `existing_prompt`, 3. `USER CONTEXT / GOAL:` + `raw_request`, 4. optional `STYLE DEFAULTS:` block, 5. `Generate ${numVariants} variant(s).` + conditional sentences (no final JSON reminder line)
- `optimize-draft`: 1. rewrite instruction paragraph, 2. JSON-shape instruction paragraph, 3. `DRAFT TO REWRITE:` + `raw_request`, 4. `Respond ONLY with the JSON object.` (no style defaults, no variant count)

### Client-sent prompt fragments

The client sends raw user text in `raw_request`/`existing_prompt`; the edge function owns nearly all instruction text. Exceptions found (instruction text originating client-side, which lands inside the user message via `raw_request`):

1. `src/components/promptor/PromptorOptimize.tsx:153`: when the optional "context" box is empty, the client substitutes a hardcoded instruction as `raw_request`:

```ts
        raw_request: context || 'Optimize this prompt for clarity, compliance, and brand alignment.',
```

2. `src/components/pulse/create/PulseBulkGenerator.tsx` lines 54-56: the Pulse bulk generator appends an instruction suffix to the user's brief before sending it through the `optimize-draft` action:

```ts
        const text = await optimizeDraft(
          `${brief.trim()}\n\n(Write a distinct, ready-to-post social caption — variation ${i + 1} of ${count}, with a fresh angle and hook. Output only the caption.)`,
        );
```

All other callers send pure user text with no added instructions: `src/components/promptor/PromptorCreate.tsx` lines 150-155 (`raw_request: brief`), `src/hooks/useOshaChatController.ts:151` and `src/components/pixel/PixelStudio.tsx:69` (`optimizeDraft(input.trim())`), `src/components/pulse/create/PulseComposer.tsx:53` (`optimizeDraft(caption)`). The transport hook `callPromptor` (`src/hooks/promptor/usePromptorSettings.ts` lines 7-20) and `useRunPromptor` (`src/hooks/promptor/useRunPromptor.ts`) add nothing. `src/hooks/usePromptor.ts` and `src/hooks/usePromptorSession.ts` are pure backward-compatibility re-exports of `src/hooks/promptor/` (no logic). The example briefs in `src/components/promptor/briefPlaceholders.ts` are used only as `<Textarea placeholder=...>` attributes (`src/components/promptor/PromptorCreate.tsx:246`, `src/components/promptor/PromptorOptimize.tsx:247,262`) and are never transmitted.

The client-side "Heart / Brain / Generate" pipeline indicator in `src/components/promptor/PromptorCreate.tsx` lines 145-147 and `src/components/promptor/PromptorOptimize.tsx` lines 144-146 is cosmetic (fixed `setTimeout` at 1200ms/2400ms); it does not reflect or influence actual prompt assembly.

## P-4. Model usage

### Provider and model resolution (edge function)

Promptor's only LLM-calling surface is the edge function at supabase/functions/promptor/index.ts. It serves five actions (`get-settings`, `save-settings`, `create`, `optimize`, `optimize-draft`); the last three make exactly one text-LLM call each. There is no separate model for `optimize-draft`: all three generation actions share the same provider/model resolution.

The provider and model come from the global `llm_settings` table (read with `.select('*')` via the service-role client), not from `promptor_settings`. Resolution code verbatim, supabase/functions/promptor/index.ts:454-465:

```ts
    // Load LLM settings
    const { data: llmSettings } = await supabaseAdmin
      .from('llm_settings')
      .select('*')
      .single();

    const provider = llmSettings?.active_text_provider || 'openai';
    const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
    const geminiKey = llmSettings?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';
    const model = provider === 'gemini'
      ? (llmSettings?.gemini_text_model || 'gemini-2.0-flash')
      : (llmSettings?.openai_text_model || 'gpt-4o');
```

`llm_settings` columns consumed by Promptor: `active_text_provider`, `openai_api_key`, `gemini_api_key`, `openai_text_model`, `gemini_text_model` (column existence confirmed in src/integrations/supabase/types.ts:581-634). API keys resolve DB-column-first with env-var fallback (the Batch Task 6 pattern).

### The actual LLM call and generation parameters

Verbatim, supabase/functions/promptor/index.ts:571-614:

```ts
    // ── LLM Call ──────────────────────────────────────────────────────────────
    let llmResponse: Record<string, unknown>;

    if (provider === 'gemini' && geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
        }),
      });
      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      llmResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } else {
      // OpenAI
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
      });
      const openaiData = await openaiRes.json();
      const rawContent = openaiData.choices?.[0]?.message?.content || '{}';
      try {
        llmResponse = JSON.parse(rawContent);
      } catch {
        llmResponse = {};
      }
    }
```

Parameter facts:

- `temperature: 0.7` is hardcoded in BOTH branches (supabase/functions/promptor/index.ts:581 and :602). Not configurable from any settings table or UI.
- No `top_p` is set anywhere in the function.
- `max_tokens` / `maxOutputTokens` comes from `TOKEN_BUDGETS` (supabase/functions/promptor/index.ts:566-569):

```ts
    // optimize-draft runs on a tight budget for fast in-chat rewrites.
    const maxTokens = action === 'optimize-draft'
      ? TOKEN_BUDGETS.PROMPT_OPTIMIZE
      : TOKEN_BUDGETS.CONTENT_GENERATION;
```

  Budget values, supabase/functions/_shared/token-budgets.ts:16-23:

```ts
  /** Long-form content generation (Promptor create/optimize) */
  CONTENT_GENERATION: 4096,

  /** Short classification / routing decisions */
  CLASSIFICATION: 500,

  /** In-place chat prompt optimization for Osha/Pixel inputs (Promptor optimize-draft action) */
  PROMPT_OPTIMIZE: 800,
```

  So: `create`/`optimize` = 4096 max output tokens, `optimize-draft` = 800.
- OpenAI gets `response_format: { type: 'json_object' }` (index.ts:604); the Gemini branch instead concatenates system+user into a single user turn and regex-extracts the first `{...}` block (index.ts:580, :586). Gemini gets no system role and no JSON mode.
- The chosen `provider` and `model` are persisted per run into `promptor_runs.llm_provider` / `llm_model` (index.ts:635-636) and into `osha_audit_logs` (index.ts:660-661).

### Hardcoded model references (complete list for this function)

| String | Location | Role |
|---|---|---|
| `'gemini-2.0-flash'` | supabase/functions/promptor/index.ts:464 | Gemini fallback when `gemini_text_model` is null. Inconsistent with the client default `DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.5-flash'` (src/config/llmModels.ts:136) and with the Gemini card UI fallback `'gemini-2.5-pro'` (src/components/settings/LLMProvidersSettings.tsx:344). `gemini-2.0-flash` is not even in the `GEMINI_TEXT_MODELS` picker list (src/config/llmModels.ts:44-50). |
| `'gpt-4o'` | supabase/functions/promptor/index.ts:465 | OpenAI fallback when `openai_text_model` is null. Matches `DEFAULT_OPENAI_TEXT_MODEL` (src/config/llmModels.ts:132). |

No other model strings exist in the function.

### No allowlist, no fal branch, and a cross-provider routing bug

- **No model allowlist.** Unlike `ai-chat` (which gates models through `GEMINI_TEXT_CAPABLE` / `FAL_IMAGE_CAPABLE` arrays in supabase/functions/ai-chat/index.ts), Promptor sends whatever string sits in `llm_settings.openai_text_model` / `gemini_text_model` directly to the provider API. There is no validation of the model name anywhere in supabase/functions/promptor/index.ts.
- **fal.ai is selectable but ignored.** The settings UI offers `fal` as `active_text_provider` ("For General Reasoning" dropdown, src/components/settings/LLMProvidersSettings.tsx:430-443, options at :439-441) and a `fal_text_model` picker exists (LLMProvidersSettings.tsx:368-374, models `FAL_TEXT_MODELS` in src/config/llmModels.ts:86-89). But Promptor's routing is binary: `provider === 'gemini' ? ... : OpenAI`. If Sam sets `active_text_provider = 'fal'`, Promptor silently falls into the OpenAI branch (index.ts:574 condition fails, else at :588) using `openai_text_model` (index.ts:463-465, the non-gemini ternary arm). `fal_text_model` is never read by Promptor.
- **Gemini-selected-without-key mismatch.** The branch condition is `provider === 'gemini' && geminiKey` (index.ts:574), but `model` was already resolved to `gemini_text_model` at :463-465. If `active_text_provider = 'gemini'` and no Gemini key exists, execution falls into the OpenAI branch and POSTs a Gemini model string (e.g. `gemini-2.5-flash`) to `api.openai.com`. Combined with the missing `res.ok` check (see next section), this fails silently into an empty result.

### Model choices the user can set that affect Promptor

All in Settings > LLM Providers (src/components/settings/LLMProvidersSettings.tsx):

- OpenAI card text-model dropdown writes `openai_text_model` (LLMProvidersSettings.tsx:317, :322); choices = `OPENAI_TEXT_MODELS` (src/config/llmModels.ts:13-22): `gpt-5.2`, `gpt-5.1`, `gpt-5`, `gpt-4.1`, `gpt-4.1-mini`, `o4-mini`, `gpt-4o`, `gpt-4o-mini`.
- Gemini card text-model dropdown writes `gemini_text_model` (LLMProvidersSettings.tsx:344, :349); choices = `GEMINI_TEXT_MODELS` (src/config/llmModels.ts:44-50): `gemini-3.1-pro-preview`, `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`.
- "Active Provider Selection > For General Reasoning" writes `active_text_provider` (LLMProvidersSettings.tsx:430-443).

The Promptor agent's own settings panel (src/components/promptor/PromptorSettings.tsx) contains NO model or provider controls; the `PrompterSettings` interface (src/hooks/promptor/types.ts:8-45) has no model fields, and `promptor_settings` defaults inside the edge function (index.ts:437-450) contain none either. `promptor_settings` controls behavior (variants, tone, strictness, retrieval depth, style defaults), never the model.

Promptor does NOT import supabase/functions/_shared/system-prompts.ts; it builds its own system prompt inline via `buildSystemPrompt` (supabase/functions/promptor/index.ts:191-321), with imports limited to sanitize, token-budgets, cors, and rate-limit (index.ts:9-14).

## P-5. Canon and validation logic

### Summary of enforcement model

For the Promptor agent, every brand/canon control (Heart rules, brand tone, blocked vocabulary, blueprint constraints) is **prompt-level instruction only**. There is no rule-based code logic, no string matching, and no post-generation validation of the model output against any rule. The compliance verdict (`compliance_status`) is **self-reported by the LLM** inside its JSON response and is persisted verbatim. A grep of `supabase/functions/promptor/index.ts` for `validate|enforce|canon` (case-insensitive) returns only: the `heart_strictness` setting strings (lines 201, 237, 239, 444), the prompt sentence `Never hallucinate Fortun canon, brand rules, or policies.` (line 285), and an auth comment (line 349). No validation function exists.

### 1. Heart rules fetch (supabase/functions/promptor/index.ts, lines 467-489)

Heart rules are fetched **directly from the DB** (not via vector search) on every `create` / `optimize` / `optimize-draft` request, using the service-role client:

```ts
    // ── MANDATORY: Query Heart + Brain ────────────────────────────────────────
    console.log(`Promptor: querying Heart and Brain for user=${userId}, output_type=${output_type}`);
    const contextQuery = `${raw_request} ${output_type} ${blueprintKey}`;

    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
      // Brain: semantic search with a lower threshold for better recall
      queryKnowledge(supabaseUrl, serviceKey, contextQuery, ['brain_document', 'wishpedia_entry'], depthLimit),
    ]);

    // AGENT-003: sanitize rule content before prompt interpolation
    const heartRules = (heartRulesData.data || []).map((r: any) => ({
      content: sanitizeForPrompt(r.rule_content),
      source: { name: sanitizeForPrompt(r.name), category: r.category, priority: r.priority },
    }));
    const heartResult = { results: heartRules, count: heartRules.length };

    console.log(`Heart: ${heartResult.count} rules (direct DB), Brain: ${brainResult.count} chunks`);
```

Notes on this code:
- Filter: active rules that are global OR explicitly assigned to `promptor` via `assigned_agents`.
- **Silent failure mode:** `heartRulesData.error` is never checked (`heartRulesData.data || []`). If the query errors, Promptor proceeds with zero Heart rules and the prompt falls back to the "No specific Heart rules retrieved" branch (lines 215-216 below). osha-chat and pixel-chat at least log the error (see comparison section); Promptor does not.
- Heart rules are NOT part of the RAG query: `queryKnowledge` requests only `['brain_document', 'wishpedia_entry']` source types (line 479), so the `heart_rule` entries in `knowledge_embeddings` are not used by Promptor at all.
- Sanitization is the only code-level transformation, via the shared `sanitizeForPrompt` in `supabase/functions/_shared/sanitize.ts` (lines 12-28), which strips system/user/assistant tags, triple backticks, and four injection phrases:

```ts
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
```

### 2. Heart rules injection into the system prompt (supabase/functions/promptor/index.ts, lines 211-216 and 273-295)

The fetched rules are interpolated into a markdown section of the system prompt. This is the entirety of the "enforcement":

```ts
  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES (always override everything else)\n${heartRules
        .map((r: any) => `- [${r.source?.name || 'Rule'}] ${r.content}`)
        .join('\n')}`
    : `## HEART RULES\nNo specific Heart rules retrieved. Default to strict, safe, brand-respectful behavior.
Ask the user to configure Heart rules in MasterMind > Heart if specific compliance constraints are needed.`;
```

The "operating law" preamble (lines 273-295, verbatim):

```ts
  return `You are Promptor, an expert AI prompt engineer integrated into Fortun Wishnet.

${langInstr}
${verbosityInstr}
${fmtInstr}
${safetyInstr}

Your operating law:
1. Heart rules are ABSOLUTE and always override everything else. Never invent Heart rules.
2. Brain context informs brand alignment. If Heart and Brain conflict, Heart wins.
3. ${strictnessInstr}
4. ${refusalInstr}
5. Never hallucinate Fortun canon, brand rules, or policies.

${heartSection}

${brainSection}

${blueprintSection}

${toneSection}

${vocabSection}
```

### 3. User-configurable strictness, refusal style, tone, and vocabulary (all prompt-level)

These come from per-user `promptor_settings` rows and are injected as instructions, lines 228-247 of `supabase/functions/promptor/index.ts`:

```ts
  const toneSection = Object.keys(tone).length > 0
    ? `## BRAND TONE (0-100 scale)\n${Object.entries(tone).map(([k, v]) => `- ${k}: ${v}/100`).join('\n')}`
    : '';

  const vocabSection = [
    blockedVocab.length > 0 ? `Blocked vocabulary (never use): ${blockedVocab.join(', ')}` : '',
    allowedVocab.length > 0 ? `Preferred vocabulary (prioritize): ${allowedVocab.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const strictnessInstr = strictness === 'always_enforce'
    ? 'If any part of the request violates Heart rules, refuse that part entirely and do not propose alternatives.'
    : strictness === 'enforce_and_propose'
    ? 'If any part of the request violates Heart rules, refuse that part and always propose a compliant alternative that still helps the user reach their goal.'
    : 'If any part violates Heart rules, note the adjustment briefly and produce the safest compliant version.';

  const refusalInstr = refusalStyle === 'soft'
    ? 'When refusing, be warm and supportive.'
    : refusalStyle === 'firm'
    ? 'When refusing, be direct and unambiguous.'
    : 'When refusing, be clear but professional.';
```

Important honesty note: any non-admin user can set their own `heart_strictness` to the weakest branch (the fallback "note the adjustment briefly" mode) and disable `safety_guard_mode`, because `promptor_settings` is per-user and writable by its owner (RLS quoted in the Database footprint section), and the edge `save-settings` action (lines 385-406) applies `{ ...settings }` with **no field whitelist or value validation** beyond the spread.

Blueprint `constraints_guidance` strings (the static `BLUEPRINTS` registry, lines 24-149) are likewise injected as `## BLUEPRINT GUIDE` JSON (line 224-226), prompt-level only. The `blocked_vocabulary` list is never used for output scanning; no code checks whether the generated prompt actually avoids those words.

### 4. The compliance verdict is LLM self-reported and defaults to "pass"

The response contract instructs the model to grade itself (lines 297-318):

```ts
## RESPONSE CONTRACT
You MUST respond with a valid JSON object matching this exact structure:
{
  "brief_summary": "1-2 sentence summary of what was created/optimized",
  "final_prompt_short": "concise version of the prompt (1-3 sentences) or null if not applicable",
  "final_prompt_full": "complete, ready-to-use prompt",
  "variants": ["variant 1", "variant 2"],
  "negatives": "comma-separated negative prompts or null if not applicable",
  "qa_checklist": ["checklist item 1", "checklist item 2"],
  "compliance_status": "pass" | "adjusted" | "refused",
  "compliance_notes": "very brief note on any adjustments or refusals, or null if fully compliant",
  ...
```

Post-generation, the only processing is JSON parsing with empty-object fallback (Gemini path lines 585-587, OpenAI path lines 608-613), then persistence. On parse failure, `llmResponse = {}` and the run is recorded as compliant:

```ts
      compliance_status: (llmResponse.compliance_status as string) || 'pass',
```

(line 633 for `promptor_runs`, repeated at line 657 for the `osha_audit_logs` insert, and line 676 in the HTTP response). So a malformed LLM response is logged as `compliance_status: 'pass'` with empty output. **There is no post-generation validation of any kind**: no re-check of the output against `heart_rules`, no blocked-word scan, no second-model judge.

### 5. Client-side: display only, plus a client-only permission gate

- The UI renders the self-reported verdict as badges; it enforces nothing. `src/components/promptor/PromptorOutput.tsx` (compliance config lines 53-69, badge lines 86-89, "Heart Compliance Note" block lines 111-122) and `src/components/promptor/PromptorHistory.tsx` (COMPLIANCE_CONFIG lines 52-68, used at line 101, status filter lines 335-345).
- The retrieval counts shown in the UI ("N Heart rules applied / N Brain chunks used", `src/components/promptor/PromptorOutput.tsx` lines 90-99) come from `retrieval_meta` returned by the edge function (lines 678-681), i.e. counts of what was injected into the prompt, not evidence of compliance.
- The per-agent access flag `ai_can_access_promptor` is enforced **client-side only**: `src/app/(protected)/ai-agents/promptor/page.tsx` line 9 wraps the screen in `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_promptor">`, and `src/components/ToolProtectedRoute.tsx` lines 44-45 deny only when the flag is explicitly `false`. The edge function `supabase/functions/promptor/index.ts` never queries `user_permissions`; any authenticated user who calls the function directly bypasses this gate (it checks only a valid JWT, lines 338-357, plus a 15 req/min in-memory rate limit, lines 16-17 and 360-365).

### 6. Shared or duplicated? Heart-fetch comparison across agents

There is **no shared heart-rules helper**. `supabase/functions/_shared/` contains only `chunker.ts`, `sanitize.ts`, `rate-limit.ts`, `usage-quota.ts`, `system-prompts.ts`, `token-budgets.ts`, `cors.ts`. Each agent duplicates the fetch; only `sanitizeForPrompt` is shared.

`supabase/functions/pixel-chat/index.ts` lines 87-105:

```ts
async function fetchHeartRules(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ name: string; content: string; priority: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"pixel"}');

  if (error) {
    console.error('Heart rules fetch error:', error);
    return [];
  }

  // AGENT-003: sanitize rule content before prompt interpolation
  return (data || []).map((r: any) => ({
    name: sanitizeForPrompt(r.name),
    content: sanitizeForPrompt(r.rule_content),
    priority: r.priority,
  }));
}
```

`supabase/functions/osha-chat/index.ts` lines 102-120 are **line-for-line identical** to the pixel-chat version except the agent key in the `.or()` filter (`assigned_agents.cs.{"osha"}` at line 107). For reference, `supabase/functions/ai-chat/index.ts` lines 81-94 has a fourth copy (`fetchNexusHeartRules`, key `"nexus"`, selects `name, category, rule_content, priority`, returns the field `rule_content` unrenamed, and does not destructure/log `error`).

Promptor's divergences from the pixel/osha implementation:

| Aspect | promptor (supabase/functions/promptor/index.ts:471-487) | pixel-chat (87-105) / osha-chat (102-120) |
|---|---|---|
| Form | Inline inside the handler, inside a `Promise.all` | Named function `fetchHeartRules` |
| Selected columns | `id, name, category, rule_content, priority, is_global, assigned_agents, is_active` | `name, rule_content, priority, is_global, assigned_agents, is_active` |
| Agent key | `"promptor"` | `"pixel"` / `"osha"` |
| Error handling | None (`heartRulesData.data \|\| []`; error never read or logged) | `if (error) { console.error(...); return []; }` |
| Mapped shape | `{ content, source: { name, category, priority } }` | `{ name, content, priority }` |
| Sanitization | `sanitizeForPrompt` on `rule_content` and `name` | Same |

Verdict: **duplicated with divergence**, four independent copies of the same query. The filter semantics (`is_active` + global-or-assigned) are consistent across all four; the surrounding robustness and shapes are not.

## P-6. Database footprint

Promptor's edge function performs all DB access through the **service-role client** (`supabaseAdmin`, created at `supabase/functions/promptor/index.ts:367`), which **bypasses RLS**; row scoping is done in code via `.eq('user_id', userId)`. The Promptor client UI additionally touches `promptor_runs` directly from the browser under RLS.

### promptor_settings (read + write, edge only)

- **Access:** `get-settings` reads `select('*').eq('user_id', userId).single()` (lines 373-382); `save-settings` upserts manually (select id, then update or insert, lines 385-406); the generation path re-reads it with hardcoded defaults fallback (lines 431-450). The client never queries this table directly; it goes through the edge actions via `src/hooks/promptor/usePromptorSettings.ts` (lines 24-52).
- **Columns** (full list in `src/integrations/supabase/types.ts` lines 1309-1342; created in `supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql` lines 5-43) and how code uses them:
  - Used in the edge system prompt builder (lines 198-271): `brand_tone`, `blocked_vocabulary`, `allowed_vocabulary`, `heart_strictness`, `refusal_style`, `default_language`, `default_verbosity`, `safety_guard_mode`, `formatting_style`.
  - Used in the edge handler (lines 452, 503-527): `retrieval_depth`, `default_variants`, `include_short_prompt`, `include_negatives`, `include_qa_checklist`, `image_aspect_ratio`, `image_composition_detail`, `image_camera_cue_style`, `video_duration_default`, `video_shot_list_style`, `video_pacing_style`, `social_platform_default`, `social_cta_intensity`, `social_hashtag_behavior`.
  - Client-display-only: `include_compliance_notes`, plus the same `include_short_prompt`/`include_negatives`/`include_qa_checklist` flags, control which output cards render (`src/components/promptor/PromptorCreate.tsx:316-319`, `src/components/promptor/PromptorOptimize.tsx:332-335`, consumed in `src/components/promptor/PromptorOutput.tsx:111,125,199,219`). `default_output_type` is client-only (seeds the Create tab, `src/screens/PromptorAgent.tsx:41-42`).
  - **Orphaned columns:** `include_full_prompt` and `citation_mode` exist in the table, in `types.ts` (lines 1327, 1314), and in the client type/defaults (`src/hooks/promptor/types.ts:16,44,53,74`), but are never read by any logic anywhere (grep across `src/` and `supabase/functions/` finds only type declarations and defaults; the full prompt always renders unconditionally at `src/components/promptor/PromptorOutput.tsx:145`, and no citation feature exists).
- **RLS** (`supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql` lines 47-51):

```sql
CREATE POLICY "Users can manage own promptor settings"
  ON public.promptor_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### promptor_runs (write by edge, read/delete by client)

- **Write:** one insert per `create`/`optimize`/`optimize-draft` run, edge lines 617-643 (`runData` object: `user_id, mode, output_type, blueprint, raw_request, existing_prompt, heart_rules_used, brain_context_used, derived_brief, brief_summary, final_prompt_short, final_prompt_full, variants, negatives, qa_checklist, compliance_status, compliance_notes, llm_provider, llm_model`). Insert failure is logged and swallowed (lines 645-647); the response still succeeds.
- **Read/delete (client, under RLS):** `src/hooks/promptor/usePromptorRuns.ts` reads `select('*')` ordered by `created_at` desc, limit 100 (lines 9-13); `useDeletePromptorRuns` deletes by id list (lines 28-33); `useClearPromptorRuns` deletes with `.neq('id', '00000000-0000-0000-0000-000000000000')` (lines 44-48), relying entirely on RLS to scope the mass delete to the caller's own rows.
- **Columns** (`src/integrations/supabase/types.ts` lines 1237-1260; DDL in `supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql` lines 54-81). **Write-only / orphaned for reads:** `heart_rules_used`, `brain_context_used`, and `derived_brief` are written by the edge as an audit bundle but are never read back anywhere; the client `PromptorRun` interface deliberately omits them (`src/hooks/promptor/types.ts:93-111`) and `src/components/promptor/PromptorHistory.tsx` renders only `compliance_status, output_type, mode, brief_summary, raw_request, created_at, llm_model, final_prompt_full, final_prompt_short, variants, compliance_notes` (lines 101, 133-147, 159-210). `qa_checklist`, `negatives`, `llm_provider`, `existing_prompt`, and `blueprint` are stored and typed but not rendered in the History tab either (qa_checklist/negatives render only in the live `PromptorOutput`, from the HTTP response, not from the table). There is no admin viewer for the stored run audit bundles UNVERIFIED (none found in `src/`).
- **RLS** (`supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql` lines 85-89):

```sql
CREATE POLICY "Users can manage own promptor runs"
  ON public.promptor_runs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### heart_rules (read only, edge)

- **Access:** direct select per run, lines 471-477 (quoted in full above). Columns selected: `id, name, category, rule_content, priority, is_global, assigned_agents, is_active`. Columns `description` and `sort_order` (added by `supabase/migrations/20260131074352_3fcbe8cb-0c1a-4537-9790-88aa25eb54f6.sql` lines 5-6; present in `src/integrations/supabase/types.ts:485-500`) are not used by Promptor. Note `priority` is fetched and embedded in the stored `heart_rules_used` bundle, but the prompt builder renders only `[name] content` (line 213); priority has no effect on ordering or weighting.
- **RLS** (`supabase/migrations/20260129170041_88320516-4ce2-4e17-8e0f-09244472d794.sql` lines 80-86); irrelevant at runtime for Promptor because the service role bypasses RLS:

```sql
CREATE POLICY "Admins can manage heart rules"
  ON public.heart_rules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view heart rules"
  ON public.heart_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### llm_settings (read only, edge)

- **Access:** `select('*').single()` (lines 455-458), then reads `active_text_provider`, `openai_api_key`, `gemini_api_key`, `gemini_text_model`, `openai_text_model` with env-var fallback for the keys (lines 460-465). Because this is the service role, the admin-only RLS does not apply; the DB-stored provider API keys are readable to the function (by design, per the Batch Task 6 pattern). The Gemini key ends up in the request URL query string (line 575): `?key=${geminiKey}`.
- **RLS:** original policies in `supabase/migrations/20260121030721_6d13aaad-5b22-442d-94f2-b36b1a7ea69c.sql` lines 32-39, re-created with the `authenticated` role in `supabase/migrations/20260327175452_0bf4d2a2-e1f9-4640-801d-3cf02fcf067d.sql`:

```sql
CREATE POLICY "Admins can view LLM settings"
ON public.llm_settings
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
```

```sql
CREATE POLICY "Admins can update LLM settings"
ON public.llm_settings
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
```

### knowledge_embeddings (read, indirect via search-knowledge)

- **Access:** Promptor never touches this table directly. `queryKnowledge` (lines 159-189) POSTs to the `search-knowledge` edge function with the **service key as the Bearer token** (lines 167-172), requesting `source_types: ['brain_document', 'wishpedia_entry']`, `threshold: 0.3`, and a limit driven by `retrieval_depth` (`getDepthLimit`, lines 153-157: small=5, medium=10, large=20). `search-knowledge` then runs the hybrid RPC over this table (`supabase/functions/search-knowledge/index.ts` lines 117-126: `rpc('match_knowledge', { query_embedding, query_text, match_threshold, match_count, filter_source_types, filter_agent_id })`). Because Promptor passes the raw query as `query_text`, its Brain retrieval is hybrid (vector + BM25), unlike osha/pixel which call the RPC directly without `query_text`.
- **Columns:** `id, source_type, source_id, chunk_index, content, embedding vector(1536), metadata, created_at, updated_at` (`supabase/migrations/20260202100238_4fbe7b06-b577-45ec-8a4f-ea573a95a99b.sql` lines 8-20). The `knowledge_source_type` enum was originally `('brain_document', 'heart_rule')` (line 5) and `wishpedia_entry` was added later by `supabase/migrations/20260406150200_ec4a12ad-a53e-4e0f-9603-b6f33b507efe.sql` line 1. The `heart_rule` embeddings are unused by Promptor (Heart comes from the direct table fetch).
- **RLS** (`supabase/migrations/20260202100238_4fbe7b06-b577-45ec-8a4f-ea573a95a99b.sql` lines 35-44):

```sql
CREATE POLICY "Authenticated users can view knowledge embeddings"
ON public.knowledge_embeddings
FOR SELECT
USING (auth.uid() IS NOT NULL);
```

```sql
CREATE POLICY "Admins can manage knowledge embeddings"
ON public.knowledge_embeddings
FOR ALL
USING (is_admin(auth.uid()));
```

### osha_audit_logs (write only, edge)

- **Access:** after every run, Promptor inserts a row into the **shared, Osha-named** audit table (lines 649-665; the in-code comment at lines 649-651 says: "AGENT-009: Write to the shared osha_audit_logs table for unified audit trail. The table name is a legacy artefact from when Osha was the only agent."). Fields written: `user_id`, `message_id: null` (always null for Promptor), `heart_rules_used`, `brain_chunks_used` (count), `compliance_status` (LLM self-reported), `compliance_notes` prefixed `Promptor {action}: {output_type}/{blueprintKey}`, `llm_provider`, `llm_model`. Insert failure is non-fatal (lines 663-665). Promptor never writes `retrieval_ms` (column exists, used by osha/pixel).
- **RLS** (`supabase/migrations/20260217222237_398eb8aa-9018-463c-963f-ca2132702aad.sql` lines 93-101, plus a later user-read policy in `supabase/migrations/20260327175544_59246e1f-f822-4c3d-85ef-6b1bf70b3e6e.sql` lines 2-6); the service-role insert bypasses these:

```sql
CREATE POLICY "Admins can view all osha audit logs"
  ON public.osha_audit_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own osha audit logs"
  ON public.osha_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can view own osha audit logs"
ON public.osha_audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### user_permissions.ai_can_access_promptor (client-side read only)

- The column was renamed from the agent's previous name (`supabase/migrations/20260122151744_bc9067ff-ae06-49f2-af74-b88efc3afc23.sql`, verbatim):

```sql
-- Rename Lexicon permission column to Promptor
ALTER TABLE public.user_permissions 
  RENAME COLUMN ai_can_access_lexicon TO ai_can_access_promptor;
```

- Consumed only by the client route gate (`src/app/(protected)/ai-agents/promptor/page.tsx:9` via `src/components/ToolProtectedRoute.tsx:44-45`). The Promptor edge function does not read `user_permissions` at all (absent from `supabase/functions/promptor/index.ts`).

### quick_prompts: NOT a Promptor table (naming red herring)

Despite the name, `quick_prompts` has **zero connection to Promptor** in code. It is the Nexus console's quick-prompt library: created alongside `console_messages` in `supabase/migrations/20260122141343_785e27cd-766a-4e40-ac29-b2181dc5f7ba.sql` (lines 52-63; columns `id, label, prompt, mode CHECK ('text','image','research'), icon, is_default, sort_order, created_at, updated_at`, with 10 seeded defaults at lines 66-79). Its only consumer hook is `src/hooks/useQuickPrompts.ts` (CRUD at lines 14-87) and every UI consumer lives under `src/components/nexus/` (`QuickPrompts.tsx:44`, `QuickPromptEditor.tsx:167`, `QuickPromptCard.tsx`, `QuickPromptListView.tsx`, `NewQuickPromptDialog.tsx`) plus `src/screens/NexusAgent.tsx:17`. Nothing in `src/components/promptor/`, `src/hooks/promptor/`, or `supabase/functions/promptor/` references it. RLS (same migration, lines 85-102, verbatim):

```sql
CREATE POLICY "Anyone can view quick prompts" ON quick_prompts
  FOR SELECT USING (true);

-- Only admins can modify quick prompts
CREATE POLICY "Admins can insert quick prompts" ON quick_prompts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update quick prompts" ON quick_prompts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete quick prompts" ON quick_prompts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### user_usage: NOT used by Promptor

`user_usage` is touched only through `supabase/functions/_shared/usage-quota.ts`, and the only edge function importing that module is ai-chat (`supabase/functions/ai-chat/index.ts:5`: `import { checkQuota, logUsage } from '../_shared/usage-quota.ts';`). `supabase/functions/promptor/index.ts` imports only `sanitize.ts`, `token-budgets.ts`, `cors.ts`, and `rate-limit.ts` (lines 9-14). Promptor therefore has **no usage quota and no usage logging**; its only throttle is the in-memory 15 req/min limiter (lines 16-17), which resets on cold start and is per-instance.

### Footprint recap

| Table | Read | Write | Path |
|---|---|---|---|
| promptor_settings | edge (service role) | edge (service role) | supabase/functions/promptor/index.ts:373-406, 431-435 |
| promptor_runs | client (RLS) | edge insert / client delete | src/hooks/promptor/usePromptorRuns.ts; edge:617-643 |
| heart_rules | edge (service role) | no | edge:471-477 |
| llm_settings | edge (service role) | no | edge:455-465 |
| knowledge_embeddings | indirect via search-knowledge RPC | no | edge:159-189, 479; supabase/functions/search-knowledge/index.ts:117-126 |
| osha_audit_logs | no | edge insert | edge:649-665 |
| user_permissions | client only (route gate) | no | src/app/(protected)/ai-agents/promptor/page.tsx:9 |
| quick_prompts | not Promptor (Nexus only) | n/a | src/hooks/useQuickPrompts.ts |
| user_usage | not used | not used | only ai-chat imports _shared/usage-quota.ts |

## P-7. UI and UX inventory

### Visual identity

- Agent registry entry: id `promptor`, name `Promptor`, role `Prompt Engineer AI`, icon `Wand2` (Lucide), gradient `from-violet-500 to-purple-600`, card gradient `from-violet-500/10 via-purple-500/5 to-violet-600/10`, glow `bg-violet-500/30`, icon color `text-violet-500`, tags `Prompts`, `Optimization`, `Writing`, status `active`, path `/ai-agents/promptor`, model label `gpt-4o` (src/data/agents.ts:52-65). Note: the `model: 'gpt-4o'` field is static display data in the registry; the actual model is resolved server-side, so treat the registry value as cosmetic.
- Nexus gradient map: `promptor: 'linear-gradient(135deg, #8b5cf6, #9333ea)'` (src/components/nexus/agentGradients.ts:7).
- Route config: path `/ai-agents/promptor`, title `Promptor`, icon `Wand2`, `iconColor: 'text-violet-500'` (src/routes/routeConfig.ts:44-49). Header breadcrumb title `'Promptor'` (src/components/layout/Header.tsx:37).
- Accent used throughout the workspace is violet/purple: active tab `border-violet-500 text-violet-700` (src/screens/PromptorAgent.tsx:70), submit buttons `bg-gradient-to-r from-violet-600 to-purple-600` (src/components/promptor/PromptorCreate.tsx:260), header icon box `bg-gradient-to-br from-violet-500 to-purple-600` (src/components/promptor/PromptorHeader.tsx:28).

### Route entry, guards, and page shell

- Page wrapper: `src/app/(protected)/ai-agents/promptor/page.tsx` exports metadata `title: 'Promptor | Fortun Wishnet'` (line 5) and renders the screen inside `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_promptor">` (lines 8-12).
- `ToolProtectedRoute` (src/components/ToolProtectedRoute.tsx): while permissions load it shows a centered `Loader2` spinner (lines 33-39); if `ai_agents` level is below `view` or `ai_can_access_promptor === false` it renders an Access Denied state with a `ShieldX` icon, heading "Access Denied", and copy "You don't have permission to access this tool. Please contact an administrator if you believe this is an error." (lines 47-59).
- Screen shell: `src/screens/PromptorAgent.tsx` renders the app-standard card frame `flex h-full p-0` with an inner `bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden` column (lines 51-52). Content is inside a `ScrollArea` with `p-4 sm:p-6 ... max-w-5xl mx-auto` (lines 81-82).
- Inactive overlay: if `agent_settings` for `promptor` has `is_active === false` (via `useAgentSettings('promptor')`, src/hooks/useAgentSettings.ts:27-42), a full-cover `absolute inset-0 z-50 bg-background/80 backdrop-blur-sm` overlay renders a `Lock` icon, heading "Promptor is Inactive", copy "This agent has been deactivated. Go to Nexus to re-activate it.", and a "Go to Nexus" button styled with the Nexus lime/emerald gradient (`from-lime-500 to-emerald-500`) that pushes `/ai-agents/nexus?tab=agents` (src/screens/PromptorAgent.tsx:110-129). The overlay covers the UI but the panels remain mounted underneath.

### Header (always visible)

`src/components/promptor/PromptorHeader.tsx`:

- Left: 10x10 violet gradient icon box with white `Wand2`; title "Promptor"; outline badge "Prompt Engineering AI" (`text-violet-600 border-violet-200 bg-violet-50`); subtitle `Prompt Engineer · Powered by Fortun MasterMind` (hidden below `sm`) (lines 27-42).
- Retrieval stat pills: rendered only when `lastHeartChunks` or `lastBrainChunks` is defined; rose pill `<Heart/> {n} rules` and indigo pill `<Brain/> {n} chunks` (lines 43-57). These props come from `lastOutput?.retrieval_meta` in the screen (src/screens/PromptorAgent.tsx:56-57), which is set only after a run completes in the current mount; a session-restored output does NOT populate these pills (the `lastOutput` state initializes to `null`, line 33, and `onOutputChange` fires only inside the submit handlers), an inconsistency.
- Right side:
  - Status badge: "Connected to MasterMind" with a pulsing emerald dot when `isConnected` (lines 63-76). The screen passes bare `isConnected` (always `true`, src/screens/PromptorAgent.tsx:58), so the gray "not connected" styling branch is dead code; the badge is purely decorative, not a real connectivity check.
  - Icon button `BrainCircuit` (violet) with tooltip "Promptor Knowledge Base", navigates to `/mastermind/brain/promptor` (lines 79-93).
  - Icon button `Database` (emerald) with tooltip "RAG Knowledge Base", navigates to `/mastermind/vector-store` (lines 96-110).
  - Both icon buttons declare `h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px]` (lines 86, 103); the min-size utilities contradict the fixed h-8/w-8, a styling inconsistency.

### Tab bar

src/screens/PromptorAgent.tsx:22-27 and 62-78:

- 4 tabs, each a plain `<button>` with icon + label: Create (`Wand2`), Optimize (`Zap`), History (`History`), Settings (`Settings2`).
- Active tab: `border-violet-500 text-violet-700`; inactive: muted with hover border (lines 67-72).
- Tab state is plain `useState<TabValue>('create')` (line 34). There is NO URL param syncing (no `useSearchParams`/`router` involvement for tabs), unlike Pulse/Whisper which sync tabs to the URL; deep-linking to a Promptor tab is not possible. The buttons also have no `role="tab"`/`aria-selected` semantics.
- All four panels stay mounted at all times and are hidden with CSS (`className={activeTab !== 'create' ? 'hidden' : ''}` etc., lines 83-104), so in-flight generations keep running when switching tabs.
- Quirk: the tab strip container uses class `bg-muted/50/30` (line 62), a malformed Tailwind opacity modifier (double `/`) that resolves to no background; likely a leftover edit.

### Create tab

`src/components/promptor/PromptorCreate.tsx`. Inputs and controls:

1. **Expected Output Type** selector: 5 icon cards in a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` grid (lines 188-214). Options (value, label, description, icon, idle color):
   - `text` "Text" "Copy, emails, blogs, ads" `FileText` blue (lines 32-39)
   - `image` "Image" "AI image generation" `Image` emerald (lines 40-47)
   - `social_image` "Social Image" "Social media visuals" `Camera` pink (lines 48-55)
   - `social_copy` "Social Copy" "Posts, captions, hooks" `Share2` orange (lines 56-63)
   - `video` "Video" "Reels, trailers, explainers" `Video` violet (lines 64-72)
   Selecting a type resets the blueprint to that type's first blueprint (lines 132-134). Selected card gets `border-violet-400 bg-violet-50/80`. Descriptions are hidden below `sm` (line 208). Note: these cards are NOT disabled during a run (no `disabled` prop, lines 193-201), unlike the Optimize tab's identical cards.
2. **Blueprint** pill row, options depend on output type (lines 74-104):
   - text: General, Ad Copy, Landing Page, Email, Blog Outline, Product Description
   - image: General Scene, Character Portrait, Product Hero, Social Square
   - social_image: Announcement, Quote Card, Carousel Slide
   - social_copy: Hook Variants, Caption Variants, CTA Variants
   - video: Short Reel, Cinematic Trailer, Explainer Storyboard
   Pills are `disabled={isLoading}` (line 224).
3. **Your Brief** textarea: `id="brief"`, `min-h-[160px] resize-y`, violet focus ring, `disabled={isLoading}` (lines 244-251). A live character counter sits beside the label and turns orange when `brief.length > 1800` (line 242); there is no hard max or other client validation beyond non-empty. The placeholder is dynamic per output type + blueprint via `getBriefPlaceholder` (line 246; src/components/promptor/briefPlaceholders.ts:107-109). Example placeholder, quoted verbatim (src/components/promptor/briefPlaceholders.ts:7):

```
Tell Promptor what you need to write — a campaign idea, a brand story, a product narrative. Fortun Wishnet transforms every brief into words that carry wonder.

Example: 'We're launching a new collection of memory-keepers — plush companions that hold childhood wishes. Write something that makes parents feel the magic before they even see the toy.'
```

   (All 17 brief placeholders follow this pattern, one per output_type x blueprint, src/components/promptor/briefPlaceholders.ts:5-35.)
4. **Generate Prompt** button: `size="lg"`, violet-to-purple gradient, `Wand2` icon; while loading shows `Loader2` spinner + `Processing…`; `disabled={isLoading || !brief.trim()}` (lines 256-273).
5. **Pipeline indicator** (only while loading): three pills "Heart" (rose, `Heart` icon), "Brain" (indigo, `Brain` icon), "Generate" (violet, `Sparkles` icon), connected by hairlines; the active pill shows a spinner (lines 175-179, 276-300). Important: stage advancement is simulated by fixed timers, not real backend progress: `setTimeout(() => setStep('querying_brain'), 1200)` and `setTimeout(() => setStep('generating'), 2400)` (lines 145-147). The single edge call (`useRunPromptor` -> POST to the `promptor` edge function, src/hooks/promptor/useRunPromptor.ts:5-21 and src/hooks/promptor/usePromptorSettings.ts:7-20) resolves whenever it resolves; the pills are theater.
6. **Output section**: when `output` exists, an animated divider with a violet "Generated Output" pill (`Sparkles` icon) then the shared `PromptorOutputPanel` (lines 304-322), with section visibility driven by settings flags (`include_short_prompt`, `include_negatives`, `include_qa_checklist`, `include_compliance_notes`, lines 316-319).

Submit behavior: empty brief raises destructive toast `Brief required` / `Please describe what you need.` (line 138, shadcn `useToast`, not Sonner); on success the output is stored to the session and `lastOutput` (header pills) and step becomes `done`; on error a destructive toast `Error` with `err.message || 'Generation failed'` and step resets to `idle` (lines 136-170). A `mountedRef` guard (with the documented BUG-01 StrictMode reset) prevents setState after unmount (lines 120-128).

### Optimize tab

`src/components/promptor/PromptorOptimize.tsx`. Structurally a near-clone of Create (the `OUTPUT_TYPES` and `BLUEPRINTS` constants are duplicated verbatim in both files, lines 24-104 of each; a refactor candidate). Differences:

1. Output type cards ARE `disabled={isLoading}` here (line 196).
2. **Existing Prompt** textarea: `id="existing-prompt"`, `min-h-[120px] font-mono text-sm`, char counter with the same >1800 orange threshold, `disabled={isLoading}` (lines 240-253). Required field. Dynamic placeholder via `getExistingPromptPlaceholder` (line 247; briefPlaceholders.ts:111-113), e.g. verbatim (briefPlaceholders.ts:41):

```
Paste the text copy you'd like to improve — an ad, an email, a product description. Promptor will align it with Fortun's brand voice and Heart rules.
```

3. **Optimization Goal (optional)** textarea: `id="opt-context"`, `min-h-[80px]` (lines 256-268). Dynamic placeholder via `getOptimizationGoalPlaceholder` (briefPlaceholders.ts:115-117), e.g. verbatim (briefPlaceholders.ts:75):

```
What needs to change? e.g. 'Add more warmth, tone down the sales pressure, and align the CTA with Fortun's "wish, play, remember" brand promise.'
```

4. **Optimize Prompt** button: same gradient, `Zap` icon, `disabled={isLoading || !existingPrompt.trim()}` (lines 272-289). Empty prompt raises destructive toast `Existing prompt required` / `Paste the prompt you want to optimize.` (line 137).
5. The mutation payload uses `action: 'optimize'` and, when the goal is empty, a hardcoded fallback `raw_request`: `'Optimize this prompt for clarity, compliance, and brand alignment.'` (lines 149-155).
6. Pipeline pills identical to Create except the third label is "Optimize" (line 178); same simulated 1200/2400ms timers (lines 145-146). Output divider pill reads "Optimized Output" (line 326).

### Shared output panel

`src/components/promptor/PromptorOutput.tsx`:

- **Compliance + retrieval header bar**: a pill showing one of (lines 53-69, verbatim labels):

```ts
pass:     label: 'Compliant'                              (emerald, CheckCircle2)
adjusted: label: 'Adjusted'                               (amber, AlertTriangle)
refused:  label: 'Refused — Safe Alternative Provided'    (rose, XCircle)
```

  plus right-aligned meta: `{n} Heart rules applied` (rose `Heart`) and `{n} Brain chunks used` (indigo `Brain`); the " applied"/" used" suffixes hide below `sm` (lines 85-100).
- **Brief summary** callout: violet box with `Sparkles`, shows `output.brief_summary` when present (lines 103-108).
- **Heart Compliance Note** callout: only when `showComplianceNotes` AND `compliance_notes` exists AND status is not `pass`; rose tint for `refused`, amber for `adjusted`; labeled "Heart Compliance Note" (lines 111-122).
- **Short Prompt** card: gated by `showShortPrompt` + presence; monospace body, copy button (lines 125-142).
- **Full Prompt** card: violet-tinted card, monospace body, copy button (lines 145-162). Always shown when present (no toggle gates it; see Settings gap below).
- **Variants**: a full-width outline `Collapsible` trigger button labeled "Variants" with a violet count badge and chevron; expands to per-variant monospace cards ("Variant 1", "Variant 2", ...) each with a copy button (lines 165-196). Collapsed by default.
- **Negatives / Exclusions** card: gated by `showNegatives` + presence; copy button (lines 199-216).
- **QA Checklist** card: gated by `showQA` + non-empty array; bullet list with emerald `CheckCircle2` per item (lines 219-238).
- **CopyButton** (lines 31-51): ghost icon-only button; on click writes to `navigator.clipboard`, swaps `Copy` icon for an emerald `Check` for 2 seconds. No toast, no `aria-label` (icon-only, an a11y gap), no failure handling if clipboard write rejects.

### History tab

`src/components/promptor/PromptorHistory.tsx`, data from `usePromptorRuns` (direct Supabase select on `promptor_runs`, newest first, `limit(100)`, src/hooks/promptor/usePromptorRuns.ts:5-23).

- **Filter toolbar** (lines 311-347):
  - Search `Input` with `Search` icon, placeholder `Search runs…`; matches against `brief_summary` or `raw_request`, case-insensitive (lines 246-250).
  - Type `Select`: All Types / Text / Image / Social Image / Social Copy / Video (lines 322-334).
  - Status `Select`: All Status / Compliant (`pass`) / Adjusted / Refused (lines 335-345).
- **Action/count bar** (shown only when not loading and at least 1 run exists, lines 350-415):
  - No selection: a select-all `Checkbox` (selects the FILTERED set, lines 267-269, 381), count text `{n} run(s)` with `of {total}` when filters hide some (lines 385-390), a "Clear filters" ghost button with `X` icon when filters are active (lines 391-401), and a destructive-styled ghost "Clear all" button with `Trash2` icon (lines 403-411).
  - With selection: `{n} selected`, "Deselect all" ghost button, and "Delete selected" destructive ghost button (lines 352-374).
- **Run cards** (`RunCard`, lines 99-229): whole card is a `CollapsibleTrigger` (cursor-pointer); contains a selection `Checkbox` (click-stopPropagation so it doesn't toggle expansion, lines 118-126), badges for output type (violet outline), `mode` (capitalized: `create`/`optimize`), and a compliance pill (Compliant/Adjusted/Refused, lines 128-141), a one-line truncated summary (`brief_summary || raw_request`, line 143), and a `Clock` relative timestamp via `formatDistanceToNow` plus the `llm_model` when present (lines 144-148). Chevron up/down at right.
- **Expanded card body** (violet-tinted, lines 157-224): Full Prompt block + copy, Short Prompt block + copy, "{n} Variant(s)" list each with copy, italic `compliance_notes` footer, and a per-run "Delete run" ghost button (`Trash2`).
- **Delete confirmation**: one shared `AlertDialog` for all three delete paths (single / selected / clear all), title `Delete {all} run{s}?`, messages (lines 301-306, verbatim):
  - clear: `This will permanently delete all {n} runs. This cannot be undone.`
  - single: `This will permanently delete this run. This cannot be undone.`
  - selected: `This will permanently delete {n} selected run(s). This cannot be undone.`
  Cancel + destructive Delete buttons, both disabled while pending; Delete shows a spinner while pending (lines 458-476). "Clear all" executes `useClearPromptorRuns` which deletes every RLS-visible row via `.neq('id', '00000000-0000-0000-0000-000000000000')` (src/hooks/promptor/usePromptorRuns.ts:44-49); since the list fetch is capped at 100, the "all {n} runs" count in the dialog can understate what actually gets deleted when more than 100 runs exist.
- **Loading state**: centered `Loader2` spinner (lines 418-421). **Empty states**: violet `History` icon tile with either "No runs yet" / "Create your first prompt to see history here." or, when filters are active, "No matching runs" / "Try adjusting your search or filters." plus a "Clear filters" outline button (lines 422-442).

### Settings tab

`src/components/promptor/PromptorSettings.tsx`. Settings load via the edge function action `get-settings` and save via `save-settings` (src/hooks/promptor/usePromptorSettings.ts:24-52); the read degrades silently to `DEFAULT_SETTINGS` on any fetch throw (lines 30-36, the CODE-01 safe default). Local edit state seeds once from the saved settings (lines 115-120). Five collapsible `SectionCard`s (header click toggles, chevron indicator, lines 44-68); only the first is `defaultOpen`.

1. **Output Preferences** (violet `Settings2` icon, open by default, lines 149-214):
   - Default Language `Select`: English (`en`), French (`fr`), Spanish (`es`), German (`de`), Portuguese (`pt`), Japanese (`ja`).
   - Default Output Type `Select`: Text / Image / Social Image / Social Copy / Video.
   - Default Verbosity `Select`: Short / Standard / Detailed.
   - Number of Variants `Slider`: min 1, max 5, step 1, live value in the label.
   - Three `Switch` toggles: "Include short prompt version" (`include_short_prompt`), "Include negatives / exclusions (image & video)" (`include_negatives`), "Include QA checklist" (`include_qa_checklist`) (lines 200-212).
2. **Brand Lens** (`Palette` icon, lines 217-252): helper copy "Tone values guide Promptor's voice (0 = minimal, 100 = maximum)."; six `Slider`s (0-100, step 5) labeled Wonder, Warmth, Playfulness, Mystery, Clarity, Directness (`TONE_LABELS`, lines 35-42); two `TagInput`s: "Allowed Vocabulary (extend Heart rules)" with placeholder `Add preferred word…` and "Blocked Vocabulary (extend Heart rules)" with placeholder `Add blocked word…`. TagInput (lines 70-107): text input + outline `Plus` button; Enter key adds (preventDefault, line 85); duplicates ignored; tags render as secondary badges with an `X` remove button.
3. **Compliance & Heart Enforcement** (`Shield` icon, lines 255-287):
   - Heart Strictness `Select`: `always_enforce` "Always Enforce (no alternatives)", `enforce_and_propose` "Enforce & Propose Alternatives", `enforce_and_explain` "Enforce & Explain Briefly".
   - Refusal Style `Select`: `soft` "Soft & Supportive", `neutral` "Neutral & Professional", `firm` "Firm & Direct".
   - Safety Guard Mode `Switch` with description "When uncertain, produce safest output and ask for missing constraints".
4. **Prompt Style Preferences** (`Sliders` icon, lines 290-433), four sub-groups:
   - General: Formatting Style `Select` (Plain / Structured Sections / JSON).
   - Image Defaults: Aspect Ratio (1:1 Square, 16:9 Landscape, 9:16 Portrait, 4:3, 3:4), Composition Detail (Minimal/Standard/Detailed), Camera Cue Style (Descriptive/Technical/Cinematic).
   - Video Defaults: Duration (15s/30s/60s/2min), Shot List Style (Minimal/Standard/Detailed), Pacing (Slow/Moderate/Fast).
   - Social Defaults: Platform (Instagram/TikTok/LinkedIn/X / Twitter/Facebook), CTA Intensity (Soft/Moderate/Strong), Hashtag Behavior (None/Suggest/Include).
5. **Memory & Retrieval** (`Database` icon, lines 436-458): a permanently-on row "Always Retrieve Brain & Heart" with copy "Mandatory pre-step before every generation - cannot be disabled", rendered as a `Lock` icon plus `<Switch checked disabled />` (lines 437-446); and Retrieval Depth `Select`: `small` "Small (5 chunks - faster)", `medium` "Medium (10 chunks - recommended)", `large` "Large (20 chunks - most context)".
6. **Save Settings** full-width violet button; pending state `Loader2` + `Saving…`, disabled while pending (lines 461-477). Success toast "Settings saved" / "Your Promptor settings have been saved."; failure destructive toast "Error saving settings" with the raw error message (lines 127-136).
- Loading state for the whole tab: centered spinner (lines 138-144).
- Settings gap: `PrompterSettings` defines `include_full_prompt`, `include_compliance_notes`, and `citation_mode` (src/hooks/promptor/types.ts:16,19,44) but the Settings UI exposes NO control for any of them; `include_compliance_notes` is nonetheless consumed by the output panel (src/components/promptor/PromptorCreate.tsx:319), so it is user-invisible but behavior-affecting, while `include_full_prompt` and `citation_mode` appear unused by any Promptor UI surface (consumption inside the edge function UNVERIFIED in this section's scope).

### Session persistence and defaults

- Drafts and outputs for both Create and Optimize persist in `sessionStorage` under key `promptor_session` (src/hooks/promptor/usePromptorSession.ts:4, 42-62): each tab keeps `outputType`, `blueprint`, brief/prompt text, and the last `output` object. Reloading the tab in the same browser session restores everything; loading defaults are `text`/`general` with empty fields (lines 26-40). Parse failures fall back to defaults; the components show step `done` immediately when a restored output exists (`useState<Step>(session.output ? 'done' : 'idle')`, PromptorCreate.tsx:116).
- On first settings load with a fresh session (empty brief, no output), the Create tab's output type is seeded from `settings.default_output_type` (src/screens/PromptorAgent.tsx:40-45). The Optimize tab gets no such seeding, an inconsistency. Note also the seeding effect patches `outputType` without patching `blueprint`, so a default type of e.g. `image` would briefly pair with blueprint `general` (not in `image`'s list) until the user clicks a type card; the pill row would render with no pill selected for that state (BLUEPRINTS lookup falls back to rendering `image` pills while `blueprint` stays `general`, src/components/promptor/PromptorCreate.tsx:133, 173) UNVERIFIED at runtime but implied by the code paths.
- `loadSession` runs inside the `useState` initializer; `sessionStorage` is wrapped in try/catch so SSR returns defaults (usePromptorSession.ts:42-54). Potential hydration mismatch when restored session content differs from the server-rendered defaults: UNVERIFIED at runtime.

### Step-by-step user flow

1. **Arrive at `/ai-agents/promptor`.** Permission spinner, then (if allowed) the violet Promptor card: header with "Connected to MasterMind" badge and two knowledge-base shortcut buttons, the 4-tab strip, and the Create tab open. If the agent was deactivated in Nexus, a blurred lock overlay blocks everything with a "Go to Nexus" CTA (src/screens/PromptorAgent.tsx:110-129).
2. **Create flow.** Pick one of 5 output-type cards (blueprint auto-resets to the first of that type), pick a blueprint pill, type a brief into the textarea (Fortun-branded contextual placeholder guides the format), watch the char counter. Click "Generate Prompt". The button flips to a spinner + `Processing…`, the inputs and pills disable, and the three-stage Heart -> Brain -> Generate pill pipeline animates on a fixed 1.2s/2.4s timer while the single edge request runs. On success the pipeline disappears and a "Generated Output" section animates in below; the header gains the rose "{n} rules" and indigo "{n} chunks" pills. On failure everything resets to idle and a destructive toast shows the server's error message.
3. **Read and use the output.** The compliance pill tells you whether Heart rules passed, adjusted, or refused the request; an amber/rose "Heart Compliance Note" explains any adjustment/refusal. The brief summary recaps what Promptor understood. Copy the Short Prompt, the Full Prompt, the Negatives, or any individual Variant via the per-card copy buttons (icon flips to a green check for 2s). Expand "Variants" to see alternates; the QA Checklist appears only if enabled in Settings. There is no save/export/send-to-agent action here: copy to clipboard is the only output action (the run itself is auto-persisted server-side and shows up in History).
4. **Optimize flow.** Switch to Optimize, select type + blueprint, paste an existing prompt (monospace field, required), optionally state an optimization goal (otherwise the hardcoded goal `Optimize this prompt for clarity, compliance, and brand alignment.` is sent, PromptorOptimize.tsx:153), click "Optimize Prompt", same pipeline and output experience labeled "Optimized Output".
5. **History.** Switch to History: last 100 runs, searchable and filterable by type and compliance status. Click a card to expand its full/short prompts and variants, copy any of them, or delete that run. Multi-select via checkboxes to "Delete selected", or "Clear all"; every destructive action goes through the shared confirmation dialog.
6. **Settings.** Open Settings, expand the collapsible sections, adjust selects/sliders/switches/vocabulary tags, and press "Save Settings". A success toast confirms; the new defaults apply to the next runs (output-section visibility flags apply immediately to already-rendered output since they are read at render time, PromptorCreate.tsx:316-319).
7. **Leave and return.** Tab/draft/output state survives navigation within the browser session via `sessionStorage`; closing the browser tab resets it.

### Loading, error, empty, and disabled states (consolidated)

- Loading: permission gate spinner (ToolProtectedRoute.tsx:33-39); Settings tab spinner (PromptorSettings.tsx:138-144); History list spinner (PromptorHistory.tsx:418-421); Generate/Optimize buttons spinner + `Processing…`; simulated 3-stage pipeline pills; Save Settings `Saving…` spinner; delete-dialog Delete button spinner. No skeletons anywhere in Promptor (spinners only), which diverges from the project's stated skeleton preference.
- Errors: destructive toasts via shadcn `useToast` for brief/prompt validation, run failure (`err.message || 'Generation failed'` / `'Optimization failed'`), and settings save failure. `useOptimizeDraft` (consumed by Osha/Pixel inputs, not this page) uses Sonner instead (src/hooks/promptor/useOptimizeDraft.ts:24-26), so Promptor code spans two toast systems. The settings READ failure is silent by design (defaults returned, usePromptorSettings.ts:30-36): a user with a broken connection sees default settings with no indication they are not their saved ones. History fetch errors have no error UI; `useQuery` throw leaves the list in a permanent non-loading non-data state rendering the "No runs yet" empty state misleadingly (PromptorHistory.tsx:422-435 keys only off `isLoading`/`filtered.length`, never `isError`).
- Empty: History "No runs yet" / "No matching runs" states (with icon tile and optional Clear filters button). Create/Optimize have no explicit empty state; the output section simply does not render until a run completes.
- Disabled: submit buttons when input empty or loading; blueprint pills and textareas while loading; Optimize's output-type cards while loading (Create's are not, see below); delete-dialog buttons while pending; the permanently disabled "Always Retrieve Brain & Heart" switch (intentional, with Lock icon).

### Keyboard interactions

- TagInput: Enter adds the typed vocabulary word (preventDefault, PromptorSettings.tsx:85).
- Everything else relies on native semantics: tabs, type cards, pills, copy buttons, and collapsible triggers are real `<button>`s (or Radix primitives) and are focusable/Enter-activatable; the textareas have violet `focus-visible` rings (PromptorCreate.tsx:249). There is no submit shortcut (no Ctrl+Enter / Cmd+Enter handler anywhere in the Promptor components), no Escape handling beyond Radix dialog defaults, and no arrow-key tab navigation (plain buttons, not a roving-tabindex tablist).

### Unfinished, placeholder, or inconsistent items

1. No URL/tab syncing on the tab strip; tabs are local state only (src/screens/PromptorAgent.tsx:34), unlike newer agents (Pulse/Whisper).
2. Malformed Tailwind class `bg-muted/50/30` on the tab bar (src/screens/PromptorAgent.tsx:62).
3. "Connected to MasterMind" badge is hardcoded `isConnected` true; the disconnected variant is unreachable dead code (src/screens/PromptorAgent.tsx:58; src/components/promptor/PromptorHeader.tsx:63-76).
4. Create tab's output-type cards are not disabled mid-run while Optimize's are (PromptorCreate.tsx:193-201 vs PromptorOptimize.tsx:196): clicking a type during a Create run swaps blueprint/type under an in-flight request.
5. Pipeline progress is timer-simulated, not real progress (PromptorCreate.tsx:145-147; PromptorOptimize.tsx:144-146).
6. Settings fields with no UI: `include_full_prompt`, `include_compliance_notes`, `citation_mode` (src/hooks/promptor/types.ts:16,19,44); `include_compliance_notes` still gates the output panel (PromptorCreate.tsx:319).
7. Header retrieval pills ignore session-restored outputs (only populate after an in-mount run, src/screens/PromptorAgent.tsx:33, 56-57).
8. Default-output-type seeding applies to Create only and does not also seed a matching blueprint (src/screens/PromptorAgent.tsx:40-45).
9. CopyButton has no `aria-label`, no clipboard-failure handling (PromptorOutput.tsx:31-51; PromptorHistory.tsx:70-90); tab buttons lack tablist ARIA semantics (PromptorAgent.tsx:63-77).
10. `OUTPUT_TYPES` and `BLUEPRINTS` are duplicated wholesale between PromptorCreate.tsx:24-104 and PromptorOptimize.tsx:24-104.
11. History fetch caps at 100 (usePromptorRuns.ts:13) while "Clear all" deletes every row (usePromptorRuns.ts:44-49), so the confirmation count can understate the deletion.
12. History has no error state; a failed query falls through to the "No runs yet" empty state (PromptorHistory.tsx:418-442).
13. Char counters warn at >1800 chars but enforce nothing client-side (PromptorCreate.tsx:242; PromptorOptimize.tsx:243); any server-side cap is enforced only by the edge function (out of scope here).
14. Promptor mixes shadcn `useToast` (page components) and Sonner (`useOptimizeDraft`), two parallel toast stacks in the same agent's hook family.
15. Legacy compat shims `src/hooks/usePromptor.ts` and `src/hooks/usePromptorSession.ts` are pure re-exports of `src/hooks/promptor/*` (both files, lines 1-5); the screen still imports through the shims (src/screens/PromptorAgent.tsx:6, 15, 17).
16. Header icon buttons combine `h-8 w-8` with `min-h-[44px] min-w-[44px]` (PromptorHeader.tsx:86, 103), conflicting sizing utilities.

## P-8. Quotas, limits, and error handling

### Rate limiting (edge)

Promptor uses the shared in-memory limiter at 15 requests/minute/user, supabase/functions/promptor/index.ts:16-17:

```ts
// SEC-004: 15 requests per minute per user
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15 });
```

The check runs after auth and BEFORE action dispatch (index.ts:359-365), so every action, including `get-settings` and `save-settings`, consumes the same budget:

```ts
    // SEC-004: rate limit check
    if (rateLimiter.check(userId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
```

**Fail-open characteristics.** The limiter cannot "error" at check time (it is a synchronous in-memory `Map` lookup, supabase/functions/_shared/rate-limit.ts:44-60), so there is no error branch to fail open or closed on. It is structurally fail-open across instances and restarts, per its own header comment (supabase/functions/_shared/rate-limit.ts:5-8, verbatim):

```ts
 * Uses a sliding-window counter per user. State lives in the edge function
 * instance memory — it resets when the function cold-starts, which is
 * acceptable for a first layer of defense. For stricter limits, use a
 * Redis or Supabase-backed counter (Phase D).
```

### Per-user daily quotas: defined but NOT enforced for Promptor

supabase/functions/_shared/usage-quota.ts defines a Promptor entry in `DAILY_LIMITS` (line 20): `'promptor-generate': 50, // prompt generation`. However, the Promptor edge function never imports or calls `checkQuota`/`logUsage`. Grep across `supabase/functions/` for `usage-quota|checkQuota|logUsage` matches only supabase/functions/ai-chat/index.ts (lines 5, 207, 219) plus the shared module itself. The `promptor-generate` limit is dead configuration; Promptor usage is unmetered beyond the 15/min limiter, and nothing is written to `user_usage` for Promptor runs.

For completeness, the quota module itself is fail-open on DB errors (supabase/functions/_shared/usage-quota.ts:50-54, verbatim):

```ts
  if (error) {
    console.error('Usage quota check error:', error);
    // Fail open — don't block on quota check errors
    return { allowed: true, remaining: limit, limit, used: 0 };
  }
```

### Edge error behavior

- 401 `{"error":"Unauthorized"}` for missing/invalid bearer token (index.ts:339-356).
- 429 `{"error":"Rate limit exceeded. Please wait a moment and try again."}` + `Retry-After: 60` (index.ts:360-365).
- 400 `{"error":"Invalid action"}` (index.ts:409-414) and `{"error":"raw_request is required"}` (index.ts:423-428).
- 500 catch-all logs the real error server-side but returns only `{"error":"Internal error"}` (index.ts:685-691).
- **LLM provider failures are silently converted into an empty 200.** Neither fetch checks `res.ok`. On the OpenAI path, an API error body has no `choices`, so `rawContent` defaults to `'{}'` and `llmResponse = {}` (index.ts:608-613); the function then persists a run with null/empty fields and returns HTTP 200 with `final_prompt_full: ''` (index.ts:667-684). On the Gemini path, `rawText` defaults to `'{}'` (index.ts:585); if Gemini returns malformed JSON inside text, `JSON.parse(jsonMatch[0])` can throw into the outer catch and produce the 500. The user sees a "successful" empty output for OpenAI-side failures, with no error toast.
- `save-settings` never checks its DB write results: the `update`/`insert` results at index.ts:393-402 are discarded and `{ success: true }` is returned unconditionally (index.ts:403-405). A failed settings write still reports success to the UI.
- Run persistence failure is non-fatal: `console.error('Failed to insert run:', insertError)` and the response still returns 200 with `run_id: null` (index.ts:639-647, :669). Audit-log insert failure is likewise swallowed (index.ts:663-665).

### Retry logic

- Edge: none. No retry loops anywhere in supabase/functions/promptor/index.ts.
- Client: global TanStack Query defaults in src/app/providers.tsx:22-31, verbatim:

```ts
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,          // 30s — avoid refetching on every mount
        retry: 1,                    // retry once, not 3 times
        refetchOnWindowFocus: false, // admin app, no need
      },
      mutations: {
        retry: 0, // never retry mutations
      },
    },
  }));
```

  So `useRunPromptor`, `useOptimizeDraft`, `useUpsertPromptorSettings`, `useDeletePromptorRuns`, `useClearPromptorRuns` (all mutations) never retry; `usePromptorSettings` and `usePromptorRuns` (queries) retry once.

### How errors surface to the user, hook by hook

The shared transport throws the server's error string when available (src/hooks/promptor/usePromptorSettings.ts:14-17):

```ts
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Promptor request failed (${res.status})`);
  }
```

`getAuthHeaders` can additionally throw `'Not authenticated'` / `'No active session'` before the request is sent (src/lib/apiHelpers.ts:19, :24).

- **useRunPromptor** (src/hooks/promptor/useRunPromptor.ts): no `onError`; errors propagate to the calling component. PromptorCreate catches and toasts (src/components/promptor/PromptorCreate.tsx:163-168): title `Error`, description `err.message || 'Generation failed'` (destructive variant, via `useToast`). PromptorOptimize is identical but with `'Optimization failed'` (src/components/promptor/PromptorOptimize.tsx:163-168). Because the edge function's 429 body string is re-thrown by `callPromptor`, a rate-limited user in the Promptor workspace sees the actual text "Rate limit exceeded. Please wait a moment and try again." Local validation toasts before any request: `'Brief required' / 'Please describe what you need.'` (PromptorCreate.tsx:138) and `'Existing prompt required' / 'Paste the prompt you want to optimize.'` (PromptorOptimize.tsx:137).
- **useOptimizeDraft** (src/hooks/promptor/useOptimizeDraft.ts:24-26): Sonner `onError` always shows the fixed string `'Promptor could not optimize the prompt. Please try again.'`, regardless of the real cause (429, 401, network), so rate-limit specifics are masked on the wand-button path. The hook also throws `'Promptor returned an empty rewrite'` when `final_prompt_full` is missing or blank (useOptimizeDraft.ts:19-21), which triggers the same generic toast. All four consumers swallow the rethrown error with empty catch blocks, relying on the hook's toast: src/hooks/useOshaChatController.ts:148-160, src/components/pixel/PixelStudio.tsx:66-78, src/components/pulse/create/PulseComposer.tsx:50-58, and src/components/pulse/create/PulseBulkGenerator.tsx:53-61 (the bulk generator continues its loop past per-variant failures).
- **usePromptorSettings** (query): fully fail-open; any thrown fetch is caught and `DEFAULT_SETTINGS` returned (src/hooks/promptor/usePromptorSettings.ts:30-36), so a failed settings load is invisible to the user.
- **useUpsertPromptorSettings**: no `onError`; PromptorSettings.tsx catches around `mutateAsync` and toasts `'Settings saved'` on success or `'Error saving settings'` + `err.message` on failure (src/components/promptor/PromptorSettings.tsx:127-136). Note the edge-side `save-settings` always returns success (see above), so a DB-level write failure still shows the success toast.
- **usePromptorRuns / useDeletePromptorRuns / useClearPromptorRuns** (src/hooks/promptor/usePromptorRuns.ts): these go straight to Supabase (`promptor_runs` table) and `throw error` on failure, but PromptorHistory has NO error surfacing for them: the list query destructures only `{ data: runs, isLoading }` (src/components/promptor/PromptorHistory.tsx:234, no `isError` usage; a grep for `error` in the file returns zero matches), and `handleConfirmDelete` is `try { ... } finally { ... }` with no catch (PromptorHistory.tsx:281-299), so a failed delete/clear produces an unhandled promise rejection, closes the dialog, and shows the user nothing.

## P-9. Inter-agent connections

**1. Promptor is the shared "rewrite my draft" service for Osha, Pixel, and Pulse (the `optimize-draft` action)**

The Promptor edge function accepts three generation actions: `create`, `optimize`, and `optimize-draft` (supabase/functions/promptor/index.ts:409). The `optimize-draft` action was added specifically for the other agents' chat inputs. The user message it builds is (supabase/functions/promptor/index.ts:534-543, verbatim):

```ts
    // Tight user message for in-place chat-draft rewrites (Osha/Pixel wand button).
    // Skips blueprint variants and produces only a rewritten draft in final_prompt_full.
    const optimizeDraftMessage = `The user has typed a draft chat prompt and wants it rewritten for clarity, specificity, and brand alignment with the Heart rules and Brain context above.

Return a JSON object where "final_prompt_full" contains ONLY the rewritten draft as a single string. All other JSON fields may be empty strings, empty arrays, or short placeholders — they will be ignored. Do not wrap the rewrite in quotes or code fences.

DRAFT TO REWRITE:
${raw_request}

Respond ONLY with the JSON object.`;
```

It runs on a dedicated shared token budget (supabase/functions/promptor/index.ts:566-569):

```ts
    // optimize-draft runs on a tight budget for fast in-chat rewrites.
    const maxTokens = action === 'optimize-draft'
      ? TOKEN_BUDGETS.PROMPT_OPTIMIZE
      : TOKEN_BUDGETS.CONTENT_GENERATION;
```

The shared client hook is `useOptimizeDraft` (src/hooks/promptor/useOptimizeDraft.ts:11-33), which wraps `callPromptor({ action: 'optimize-draft', raw_request })` and resolves to `final_prompt_full`. The transport is `callPromptor` in src/hooks/promptor/usePromptorSettings.ts:5-22, built on `edgeFunctionUrl('promptor')` and `getAuthHeaders()` from src/lib/apiHelpers.ts:14-38. It is exported from the barrel src/hooks/promptor/index.ts:9.

Verified callsites (4 consumers across 3 other agents):

| Consumer | Import | Usage |
|---|---|---|
| Osha | src/hooks/useOshaChatController.ts:18 (`import { useOptimizeDraft } from '@/hooks/promptor';`) | Hook at line 76; `handleOptimizeDraft` at lines 148-160 rewrites `input` in place. Wand2 button rendered in src/components/osha/OshaChat.tsx:334-343, disabled when input is empty or `ctrl.isOptimizing`. |
| Pixel | src/components/pixel/PixelStudio.tsx:19 | Hook at line 64; `handleOptimizeDraft` at lines 66-78 rewrites `input` in place (same pattern as Osha, 180px textarea cap instead of 160px). |
| Pulse (Create, single composer) | src/components/pulse/create/PulseComposer.tsx:20 | Hook at line 31; `handleImprove` at lines 50-58 ("Improve with AI" on the caption field). |
| Pulse (Create, bulk generator) | src/components/pulse/create/PulseBulkGenerator.tsx:18 | Hook at line 28; `handleGenerate` at lines 44-65 calls `optimizeDraft` in a loop, once per variant, appending: `` `${brief.trim()}\n\n(Write a distinct, ready-to-post social caption — variation ${i + 1} of ${count}, with a fresh angle and hook. Output only the caption.)` `` (line 54-56). |

So every `optimize-draft` request from Osha/Pixel/Pulse runs Promptor's full pipeline: Heart rules fetch, Brain RAG, Promptor system prompt, the user's per-user `promptor_settings`, persistence to `promptor_runs` (supabase/functions/promptor/index.ts:639-643), and an `osha_audit_logs` entry (lines 649-665). A change to the Promptor edge function changes the wand-button behavior in three other agents.

**2. Promptor calls the shared `search-knowledge` edge function (server-to-server RAG)**

Promptor does not call the `match_knowledge` RPC directly. It fetches `${supabaseUrl}/functions/v1/search-knowledge` with the service-role key (supabase/functions/promptor/index.ts:159-189, invoked at line 479 with `source_types: ['brain_document', 'wishpedia_entry']` and `threshold: 0.3`). `search-knowledge` internally calls the same `match_knowledge` hybrid RPC every other agent uses (supabase/functions/search-knowledge/index.ts:119).

**3. Promptor shares the Heart rules table with all agents, with an agent-scoped filter**

supabase/functions/promptor/index.ts:471-477 (verbatim):

```ts
    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
```

Rule content is passed through the shared `sanitizeForPrompt` before prompt interpolation (lines 483-486).

**4. Promptor reads the shared `llm_settings` row (same row Nexus/Settings manage)**

supabase/functions/promptor/index.ts:454-465: reads `active_text_provider`, `openai_api_key`/`gemini_api_key` (DB-first, env fallback), `gemini_text_model` (fallback `'gemini-2.0-flash'`), `openai_text_model` (fallback `'gpt-4o'`). The API-key columns are the ones written by the `settings-keys` edge function (supabase/functions/settings-keys/index.ts:114, 163, 183).

**5. Promptor writes the shared audit table named after Osha**

supabase/functions/promptor/index.ts:649-665 (verbatim, leading comment included):

```ts
    // AGENT-009: Write to the shared osha_audit_logs table for unified audit trail.
    // The table name is a legacy artefact from when Osha was the only agent.
    try {
      await supabaseAdmin.from('osha_audit_logs').insert({
```

**6. Osha (osha-chat) embeds Promptor in its agent registry and reads `promptor_settings`**

- Registry entry (supabase/functions/osha-chat/index.ts:239, verbatim):

```ts
    promptor: { name: 'Promptor', role: 'Prompt Engineer AI', capabilities: 'Create and optimize prompts for text, image, social media copy, social media images, and video. Outputs structured briefs with full/short prompts, QA checklists, negatives, variants, and compliance notes. Uses Heart rules and Brain knowledge for brand-aware prompt engineering.' },
```

- Per-user config surfaced to Osha (supabase/functions/osha-chat/index.ts:260, verbatim):

```ts
    promptor: ['default_language', 'default_output_type', 'default_verbosity', 'heart_strictness', 'include_short_prompt', 'include_negatives', 'include_qa_checklist', 'image_aspect_ratio', 'video_duration_default', 'social_platform_default', 'retrieval_depth'],
```

- osha-chat directly queries Promptor's settings table to populate that config: `supabaseAdmin.from('promptor_settings').select('*').eq('user_id', userId).maybeSingle()` (supabase/functions/osha-chat/index.ts:1978).

**7. Nexus references Promptor**

- Default system prompt (src/components/nexus/AgentConfigPanel.tsx:24, verbatim):

```ts
  promptor: 'You are Promptor, an expert prompt engineer. You optimize and craft prompts for maximum effectiveness, ensuring clear communication between users and AI systems.',
```

These per-agent prompts are loaded/saved through `useAgentSettings`/`useUpsertAgentSettings` against the `agent_settings` table (src/components/nexus/AgentConfigPanel.tsx:16, 41, 131; src/hooks/useAgentSettings.ts:34, 50, 64). osha-chat reads the same `agent_settings` table for live status/model in its registry (supabase/functions/osha-chat/index.ts:1977).

- Prompt library entry tagged to Promptor (src/components/nexus/promptLibraryConstants.ts:186-195, verbatim):

```ts
  {
    id: '2',
    name: 'Code Reviewer',
    description: 'Technical code review specialist',
    category: 'system',
    content: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback.',
    agentIds: ['promptor'],
    isFavorite: false,
    tags: ['technical', 'code'],
  },
```

(There are no entries in promptLibraryConstants.ts mentioning `pixel`; a case-insensitive search returns zero matches.)

**8. Access gate and gradients shared with the rest of the agent system**

- Route gate: src/app/(protected)/ai-agents/promptor/page.tsx:9 wraps `PromptorAgent` in `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_promptor">`.
- Gradient key `promptor` in src/components/nexus/agentGradients.ts:7.
- Header label `'/ai-agents/promptor': 'Promptor'` in src/components/layout/Header.tsx:37.

**9. Legacy compatibility shims**

src/hooks/usePromptor.ts and src/hooks/usePromptorSession.ts are pure re-exports of `@/hooks/promptor` (both files are 5 lines, "Backward Compatibility Re-export"). They are not duplicate implementations.

## P-10. Video and media capability

Promptor has a first-class **video PROMPT** capability but performs **zero media generation** of any kind (no video, image, or audio API calls, no storage writes, no binary handling). Everything "video" in Promptor is text that describes a video.

What exists, in code:

1. **`'video'` is one of the five output types**: `export type OutputType = 'text' | 'image' | 'social_image' | 'social_copy' | 'video';` (src/hooks/promptor/types.ts:5). It is selectable in both Create and Optimize tabs as an icon card labeled "Video / Reels, trailers, explainers" (src/components/promptor/PromptorCreate.tsx:64-71 and PromptorOptimize.tsx:64-71), in the history filter (src/components/promptor/PromptorHistory.tsx:49, :332), and as a default-output-type option in settings (src/components/promptor/PromptorSettings.tsx:174).

2. **Three video blueprints in the edge-function registry**, verbatim from supabase/functions/promptor/index.ts:129-148. These are injected into the system prompt as a JSON `## BLUEPRINT GUIDE` block (index.ts:224-226) to steer the text model; they are guidance, not render instructions:

```ts
  video: {
    short_reel: {
      required_slots: ['concept', 'audience', 'platform', 'duration'],
      optional_slots: ['music_vibe', 'visual_style', 'hook', 'cta'],
      constraints_guidance: 'Hook in first 2 seconds. Vertical 9:16. Fast paced. Text overlays if needed.',
      output_format: 'hook + scenes + pacing + audio + cta',
    },
    cinematic_trailer: {
      required_slots: ['subject', 'narrative_arc', 'mood', 'duration'],
      optional_slots: ['music', 'voiceover', 'color_grade'],
      constraints_guidance: 'Build tension, release, aspiration. Avoid spoiling full story.',
      output_format: 'act structure + shot list + music + color',
    },
    explainer_storyboard: {
      required_slots: ['product_or_concept', 'audience', 'key_message', 'duration'],
      optional_slots: ['animation_style', 'voiceover_tone', 'cta'],
      constraints_guidance: 'Problem → solution → benefit flow. Keep each scene under 5 seconds.',
      output_format: 'numbered scenes + duration + visuals + narration',
    },
  },
```

   The same three blueprints are mirrored client-side for the picker (PromptorCreate.tsx:99-103, PromptorOptimize.tsx:99-103).

3. **Video style defaults appended to the LLM user message** when `output_type === 'video'`, verbatim from supabase/functions/promptor/index.ts:517-521:

```ts
    if (output_type === 'video') {
      const dur = (settings.video_duration_default as string) || '30s';
      const shots = (settings.video_shot_list_style as string) || 'standard';
      const pace = (settings.video_pacing_style as string) || 'moderate';
      styleDefaults.push(`Default duration: ${dur}. Shot list style: ${shots}. Pacing: ${pace}.`);
    }
```

   Backed by three `promptor_settings` fields (`video_duration_default`, `video_shot_list_style`, `video_pacing_style`: src/hooks/promptor/types.ts:37-39, defaults `'30s'`/`'standard'`/`'moderate'` at types.ts:67-69) and a "Video Defaults" settings UI offering Duration 15s/30s/60s/2min, Shot List Style minimal/standard/detailed, Pacing slow/moderate/fast (src/components/promptor/PromptorSettings.tsx:351-390).

4. **Video-flavored placeholder copy** for the brief/optimize textareas (src/components/promptor/briefPlaceholders.ts:30-33, :64-67, :98-101), e.g. shot-sequence and storyboard language. Pure UI hint text.

5. **Output handling is text-only.** The video prompt arrives as strings in `final_prompt_full`/`variants`/`negatives` and renders through src/components/promptor/PromptorOutput.tsx (the Negatives / Exclusions card, flagged "(image & video)" in the settings toggle label at PromptorSettings.tsx:202, renders at PromptorOutput.tsx:198-215). No player, no media URLs, no attachments.

What does NOT exist:

- No call to any video or image generation endpoint in supabase/functions/promptor/index.ts. The only outbound LLM URLs in the file are `https://api.openai.com/v1/chat/completions` (line 590) and `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (line 575); the only other outbound call is the internal `search-knowledge` edge function (line 166-179).
- No reference to `sora`, `veo`, `fal`, `images/generations`, `image_url`, storage buckets, or signed URLs anywhere in the function. Searches run: case-insensitive grep for `video|sora|veo|storyboard|scene|shot|media|image_url|generations|fal` over supabase/functions/promptor/index.ts (hits were only the blueprint registry text at lines 64-146, the style-defaults block at 517-521, and incidental substring matches like `safetyGuard`/`includeNegatives`); case-insensitive grep for `video|storyboard|scene|shot|reel|trailer` over src/components/promptor/ and src/hooks/promptor/ (hits were only the UI pickers, settings selects, types, and placeholder copy cited above). No commented-out media-generation code was found in any of these files.
- The video model registries `OPENAI_VIDEO_MODELS`, `GEMINI_VIDEO_MODELS`, `FAL_VIDEO_MODELS` and defaults like `DEFAULT_OPENAI_VIDEO_MODEL = 'sora-2'` (src/config/llmModels.ts:38-41, :60-62, :77-83, :135, :139-141) exist for other surfaces (the LLM settings cards and `ai-chat`); nothing in the Promptor edge function or Promptor client code reads `openai_video_model`, `gemini_video_model`, `fal_video_model`, or `active_video_provider`.

Bottom line: Promptor's "video" feature produces storyboards, shot lists, and scene-by-scene text prompts intended to be fed into a video model elsewhere; Promptor itself never invokes one.

## P-11. Dead code and gaps

**1. Legacy hook shims are not dead, they are still the primary import path (inverted from the stated intent)**
- `src/hooks/usePromptor.ts` and `src/hooks/usePromptorSession.ts` are 5-line back-compat re-exports whose headers say new code should import from `@/hooks/promptor` directly:
  ```ts
  /**
   * usePromptor — Backward Compatibility Re-export
   * New code should import from '@/hooks/promptor' directly.
   */
  export * from './promptor';
  ```
  (src/hooks/usePromptor.ts:1-5; same pattern in src/hooks/usePromptorSession.ts:1-5)
- In practice every Promptor screen/component imports through the shims, not the barrel: src/screens/PromptorAgent.tsx:6,15,17; src/components/promptor/PromptorSettings.tsx:31; src/components/promptor/PromptorOutput.tsx:21; src/components/promptor/PromptorOptimize.tsx:17,22; src/components/promptor/PromptorHistory.tsx:40; src/components/promptor/PromptorCreate.tsx:17,22. Only `useOptimizeDraft` consumers (src/components/pulse/create/PulseComposer.tsx:20, src/components/pulse/create/PulseBulkGenerator.tsx:18, src/hooks/useOshaChatController.ts:18, src/components/pixel/PixelStudio.tsx:19) and one type import (src/components/promptor/PromptorSettings.tsx:32) use `@/hooks/promptor` directly. Neither shim can be deleted today; the codebase has two live import paths for the same modules.

**2. Dead barrel file: `src/components/promptor/index.ts`**
- Exports all six Promptor components (src/components/promptor/index.ts:1-6) but nothing in the repo imports from `@/components/promptor` (grep for `from '@/components/promptor'` returns zero matches). `PromptorAgent.tsx` imports each component file directly (src/screens/PromptorAgent.tsx:9-13). The barrel is unreferenced.

**3. Settings fields stored in the DB but never read anywhere**
The `promptor_settings` table defines these columns (supabase/migrations/20260217191453_d1706807-0234-4029-b625-5a0384db663e.sql:14,17,39) and they exist in the client type `PrompterSettings` (src/hooks/promptor/types.ts:16,19,44) and `DEFAULT_SETTINGS` (src/hooks/promptor/types.ts:53,56,74):
- `include_full_prompt` - fully dead. No toggle in `PromptorSettings.tsx` (the boolean-toggle list at src/components/promptor/PromptorSettings.tsx:200-204 covers only `include_short_prompt`, `include_negatives`, `include_qa_checklist`), never read by the edge function (zero occurrences in supabase/functions/promptor/index.ts), and `PromptorOutput` renders the Full Prompt unconditionally with no corresponding prop (src/components/promptor/PromptorOutput.tsx:145-162).
- `citation_mode` - fully dead. No UI control, no read in the edge function, no read in any component. Exists only in the migration, the type, and the defaults.
- `include_compliance_notes` - half dead. The edge function contains it only inside the fallback defaults literal (supabase/functions/promptor/index.ts:442) and never reads it to gate generation; the client does read it as a display gate (`showComplianceNotes={settings.include_compliance_notes}` at src/components/promptor/PromptorCreate.tsx:319 and src/components/promptor/PromptorOptimize.tsx:335), but there is no UI toggle for it, so its value is frozen at the DB default (`true`) unless edited directly in the database.
For contrast, the edge function does read `include_short_prompt`, `include_negatives`, `include_qa_checklist` (supabase/functions/promptor/index.ts:504-506) plus the language/verbosity/formatting/tone/vocab/strictness/refusal/safety/retrieval and image/video/social style fields (supabase/functions/promptor/index.ts:198-206, 452, 511-527).

**4. Run data persisted but never surfaced**
- The edge function persists `heart_rules_used`, `brain_context_used`, and `derived_brief` on every run (supabase/functions/promptor/index.ts:624-626), but the client `PromptorRun` interface omits all three (src/hooks/promptor/types.ts:93-111) and no UI renders them. Stored-only data.
- `PromptorHistory` fetches runs with `.select('*')` (src/hooks/promptor/usePromptorRuns.ts:9-13) but the run card never renders `negatives`, `qa_checklist`, `existing_prompt`, `blueprint`, or `llm_provider` (the expanded card at src/components/promptor/PromptorHistory.tsx:157-225 shows only full/short prompt, variants, compliance_notes; the collapsed row shows `llm_model` at line 147). Fetched-but-undisplayed fields.

**5. Docs vs code: `quick_prompts` is not a Promptor table**
- `CLAUDE.md` Domain Areas lists `- **Promptor:** promptor_settings, promptor_runs, quick_prompts`. In code, `quick_prompts` is consumed exclusively by Nexus: src/hooks/useQuickPrompts.ts:14-79, src/components/nexus/QuickPrompts.tsx:43-44, src/components/nexus/QuickPromptListView.tsx, src/screens/NexusAgent.tsx:10,16-17,79,126-142. Zero references to `quick_prompts` exist under src/components/promptor/, src/hooks/promptor/, src/screens/PromptorAgent.tsx, or supabase/functions/promptor/index.ts.

**6. Nexus per-agent config for Promptor is stored but never consumed by the Promptor edge function**
- Nexus `AgentConfigPanel` saves per-agent `provider`, `model`, `temperature`, `max_tokens`, and `system_prompt` to `agent_settings`, including a Promptor default prompt (src/components/nexus/AgentConfigPanel.tsx:22-30, 39-80). The only edge function that reads `agent_settings` at all is osha-chat (supabase/functions/osha-chat/index.ts:1977, and only `agent_id, is_active, model, provider` for its registry). `supabase/functions/promptor/index.ts` resolves provider/model purely from `llm_settings` (lines 455-465) and hardcodes `temperature: 0.7` (lines 581, 602) and `TOKEN_BUDGETS` (lines 567-569); its system prompt is built inline by `buildSystemPrompt` (lines 191-321). Only `is_active` is enforced, and only client-side (src/screens/PromptorAgent.tsx:32,48,111-129). Everything else in the Promptor Nexus config card is write-only.
- Related: the shared prompt-versioning infrastructure (`system_prompts` table via src/hooks/useSystemPrompts.ts and supabase/functions/_shared/system-prompts.ts) is imported only by osha-chat (supabase/functions/osha-chat/index.ts:17). Promptor's prompt is not DB-managed despite the infrastructure existing.

**7. Deprecated edge action with zero callers (shared surface, named in this audit's scope)**
- `ai-chat` still ships a `check-keys` action (supabase/functions/ai-chat/index.ts:16, 188, 238-239) but the only client caller of `check-keys` goes to the `settings-keys` function instead (src/hooks/useProviderKeyStatus.ts:46-49 posts to `SETTINGS_KEYS_ENDPOINT`). The ai-chat copy is rollback-safety dead weight.
- A stale comment still claims the old architecture: src/components/settings/LLMProvidersSettings.tsx:133-136 says keys are "managed exclusively via Supabase edge function environment variables" and checked "via the 'check-keys' action in the ai-chat edge function"; the code does neither (DB-stored keys via settings-keys were reintroduced in Batch Task 6).

**8. Duplicated constants (maintenance gap, not dead)**
- `OUTPUT_TYPES` and `BLUEPRINTS` are duplicated verbatim between src/components/promptor/PromptorCreate.tsx:24-104 and src/components/promptor/PromptorOptimize.tsx:24-104, and the blueprint key list is a third, hand-synced copy of the edge registry `BLUEPRINTS` (supabase/functions/promptor/index.ts:24-149).

**9. Edge blueprint fallback can silently resolve to null for non-text types**
- supabase/functions/promptor/index.ts:492: `BLUEPRINTS[output_type]?.[blueprintKey] || BLUEPRINTS[output_type]?.['general'] || null`. Only the `text` group has a `general` key; `image`/`social_image`/`social_copy`/`video` do not, so an unknown blueprint key for those types yields no blueprint section at all rather than a sensible default.

**10. UI strictness option handled only by fall-through**
- The Settings UI offers `enforce_and_explain` (src/components/promptor/PromptorSettings.tsx:264) but the edge function's strictness ternary names only `always_enforce` and `enforce_and_propose`, with `enforce_and_explain` landing in the generic else branch (supabase/functions/promptor/index.ts:237-241). Works by accident of the else clause, not by explicit handling.

**11. Commented-out code / TODOs**
- None. Grep for `TODO|FIXME|HACK|XXX|deprecated` across src/components/promptor/, src/hooks/promptor/, src/screens/PromptorAgent.tsx, and supabase/functions/promptor/ returns zero matches. No commented-out blocks found.

## P-12. Test coverage

**Repository-wide test inventory (exhaustive):**
- Zero test files exist outside `node_modules/`: globs for `src/**/*.{spec,test}.*`, repo-level `**/*.{spec,test}.*` (all hits under node_modules), and `supabase/**/*{test,spec}*` return no project files.
- Zero test infrastructure: no `playwright.config.*`, no vitest/jest config, no `e2e/`, `tests/`, `test/`, or `__tests__/` directories anywhere in the repo.
- `package.json` declares no test script (scripts are only `dev`, `dev:webpack`, `build`, `start`, `lint`, package.json:6-12) and no testing devDependency: there is no `playwright`, `@playwright/test`, `vitest`, or `jest` entry in either dependency block (package.json:13-93).
- Docs vs code mismatch: `CLAUDE.md` lists "Testing: Playwright 1.57.0" in the tech stack, but Playwright is absent from package.json and no Playwright artifacts exist in the repo. Per CLAUDE.md's own audit-history entries, Playwright was used as an external MCP browser tool for one-off manual audit sessions (screenshots under the `audit/` directory), not as in-repo automated tests. UNVERIFIED whether Playwright is installed globally outside the repo; nothing in the codebase references it.
- The only programmatic validation gates in the repo are `tsc` strict mode (tsconfig) and `eslint` (package.json:11).

**Promptor:** No tests of any kind touch Promptor (no test file exists to grep).

**Pixel:** No tests of any kind touch Pixel (no test file exists to grep).

---

# PART 2: PIXEL



## X-1. Identity and entry points

Pixel is registered as agent id `pixel`, name "Pixel", role "Visual Creator AI", status `active`, path `/ai-agents/pixel`, pink/rose visual identity (`from-pink-500 to-rose-600`, icon `Palette`) in src/data/agents.ts:81-94. The agent is a media-first visual creator: the edge function header comment declares "Media-first: always generates images unless user explicitly asks for text-only help" and "Operating Law: Heart (mandatory, always wins) → Brain → Generate" (supabase/functions/pixel-chat/index.ts:1-10).

### Route, gating, registration

| File | Role |
|---|---|
| src/app/(protected)/ai-agents/pixel/page.tsx | Next.js App Router entry: server component, `metadata.title = 'Pixel \| Fortun Wishnet'`, wraps `<PixelAgent />` in `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pixel">` (lines 7-13) |
| src/components/ToolProtectedRoute.tsx | Permission gate: requires `ai_agents` tool permission level >= `view` and denies when `permissions.ai_can_access_pixel === false` (PERM-01 per-agent gate, lines 41-45); renders Access Denied panel otherwise (lines 47-59) |
| src/routes/routeConfig.ts:62-69 | Route metadata entry for `/ai-agents/pixel` (title "Pixel", `Palette` icon, `text-pink-500`, toolKey `ai_agents`) |
| src/data/agents.ts:81-94 | Canonical agent registry entry (id, name, role, description, icon, gradients, tags, status, path) |
| src/components/nexus/agentGradients.ts:11 | Nexus gradient: `pixel: 'linear-gradient(135deg, #ec4899, #f43f5e)'` |
| src/components/layout/Header.tsx:41 | Header title mapping `'/ai-agents/pixel': 'Pixel'` |
| src/components/nexus/AgentConfigPanel.tsx:28 | Nexus default system-prompt seed for the `pixel` key ("You are Pixel, a visual designer specialist...") |
| src/hooks/useUserPermissions.ts:85,174-181 | Admin all-true permission default includes `ai_can_access_pixel: true`; `AgentAccessKey` union includes `'ai_can_access_pixel'` |
| src/types/user.ts | `UserPermissions` shape includes the `ai_can_access_pixel` flag (file matched in pixel grep; flag threaded from here) |
| src/components/settings/EditUserSheet.tsx:100,166,215 | Admin UI toggle "Pixel (Visuals)" for the per-user `ai_can_access_pixel` flag |
| src/components/settings/SystemPromptsPanel.tsx | Settings panel that surfaces per-agent system prompts including Pixel (matched in pixel grep) |

### Screen and components (src/components/pixel/)

| File | Role |
|---|---|
| src/screens/PixelAgent.tsx | Top-level "use client" workspace screen: owns `data-pixel-theme` page-local theme state (lines 27-43, 137), mode, active blueprint, attachments, global references, Wishpedia refs, fullscreen, mobile sheets, settings/blueprints sheets, and the "Pixel is Inactive" overlay driven by `useAgentSettings('pixel')` (lines 64-67, 282-301) |
| src/components/pixel/index.ts | Barrel export for all Pixel components |
| src/components/pixel/PixelTopBar.tsx | Top bar: `PIXEL_MODES` (facebook / instagram / tiktok / cross_platform with `comingSoon`) (lines 13-18), mode tabs, nav buttons to `/mastermind/brain/pixel`, `/mastermind/vector-store`, `/wishdom`, settings, theme toggle, fullscreen (lines 87-204) |
| src/components/pixel/PixelStudio.tsx | Main chat/generation canvas: input bar, attachments, emoji popover, Promptor wand button, simulated progress UI, message pairing, `handleSend` pipeline (lines 159-247) |
| src/components/pixel/PixelControlPanel.tsx | Left panel: `PLATFORM_POST_TYPES` per-mode post-type/size registry (lines 24-76), post-type picker, hosts `WishReferencePanel` (line 137) |
| src/components/pixel/PixelContextPanel.tsx | Right panel: post-size picker from `PLATFORM_POST_TYPES`, last-audit compliance badge (`pass`/`adjusted`/`refused` config lines 15-19) |
| src/components/pixel/PixelSettings.tsx | Settings form (Behavior / Brand Lens / Visual tabs), shows globally selected text/image provider+model from `useLLMSettings` (lines 32-40), saves via `useUpsertPixelSettings` (line 47) |
| src/components/pixel/PixelBlueprintPanel.tsx | "Visual Templates" CRUD panel: list/create/delete blueprints plus "Generate with AI" (lines 40-76) |
| src/components/pixel/PixelOutputCard.tsx | Renders one user-brief + AI-output pair: markdown w/ Mermaid (lines 71-136), image/video display via re-signed URL (`useSecureImageUrl`, line 164), download (lines 171-189), fullscreen lightbox, opens `SavePixelToBrainDialog` (lines 156, 396); also exports `PixelUserBrief` |
| src/components/pixel/SavePixelToBrainDialog.tsx | Dialog that saves a generated image into the Brain knowledge base (upload + `brain_documents` insert + OCR indexing, lines 50-118) |
| src/components/pixel/WishReferencePanel.tsx | Wishpedia reference picker: search entries, multi-select, `EntryImageLoader` per entry, exports the `WishpediaImageRef` type (lines 14-20), 5-image cap (`MAX_TOTAL_IMAGES`, line 35), drag-and-drop file zone |
| src/components/pixel/pixelConstants.tsx | `EMPTY_STAGE_CARDS` starter prompts per mode and `MODE_PLACEHOLDERS` input placeholders (lines 10-38) |
| src/components/pixel/PixelMessageBubble.tsx | Legacy chat-bubble renderer (markdown + Mermaid + image). Exported from the barrel (src/components/pixel/index.ts:7) but no consumer found in src; appears unused (grep found only the barrel export and the definition) |
| src/components/pixel/PixelHeader.tsx | Legacy header showing mode/compliance/brain/heart counts. Not in the barrel export and no imports found in src; appears unused |

### Hooks

| File | Role |
|---|---|
| src/hooks/usePixel.ts | Backward-compatibility re-export: `export * from './pixel';` (lines 1-5). Not a duplicate implementation |
| src/hooks/pixel/index.ts | Barrel for types + the 4 hook files |
| src/hooks/pixel/types.ts | `PixelSettings` + `DEFAULT_PIXEL_SETTINGS` (lines 9-45), `PixelMessage` (47-62), `PixelBlueprint` (64-81), `SendPixelMessageParams`/`SendPixelMessageResult` (83-106); re-exports `AttachmentContext` from src/types/attachments.ts |
| src/hooks/pixel/usePixelSend.ts | `useSendPixelMessage` mutation: POST `action:'chat'` to the pixel-chat edge fn (lines 13-46) |
| src/hooks/pixel/usePixelMessages.ts | `usePixelMessages` (direct `pixel_messages` table SELECT via supabase client + RLS, lines 10-27), `useClearPixelHistory` (edge `clear-history`, lines 29-59), `useDeletePixelMessage` (direct table DELETE, lines 61-79) |
| src/hooks/pixel/usePixelSettings.ts | `usePixelSettings` (edge `get-settings`, degrades to defaults on failure, lines 9-35), `useUpsertPixelSettings` (edge `save-settings`, lines 37-60) |
| src/hooks/pixel/usePixelBlueprints.ts | `usePixelBlueprints` (`get-blueprints`), `useSavePixelBlueprint` (`save-blueprint`), `useDeletePixelBlueprint` (`delete-blueprint`), `useGenerateBlueprintWithAI` (`generate-blueprint`) |
| src/hooks/useAgentSettings.ts:27-42 | Reads the `agent_settings` row for `agent_id='pixel'` (drives the inactive overlay) |
| src/hooks/promptor/useOptimizeDraft.ts | Shared Osha+Pixel "optimize with Promptor" wand: calls promptor edge `optimize-draft` (lines 11-33) |
| src/hooks/files/useSecureImageUrl.ts | Re-signs private `files`-bucket references to fresh 24h signed URLs on every mount (lines 14-39) |
| src/hooks/useOcrIndexing.ts | Client-side OCR/index pipeline used by SavePixelToBrainDialog (routes images/PDFs to the process-ocr edge fn) |
| src/hooks/useWishpediaEntries.ts / src/hooks/useWishpediaImages.ts | Wishpedia data for WishReferencePanel; `getWishpediaImageUrl` builds public `wishpedia-media` bucket URLs (useWishpediaImages.ts:152-155) |
| src/hooks/useChatUtils.ts | Shared chat primitives, header comment names Pixel as a consumer (lines 1-4) |

### Shared client config / libs

| File | Role |
|---|---|
| src/config/api.ts | `EDGE_FUNCTIONS_URL = \`${SUPABASE_URL}/functions/v1\`` (line 26). NOTE: there is NO Pixel-specific constant here (grep for `pixel` in this file returns no matches); Pixel builds its URL via the helper below |
| src/lib/apiHelpers.ts | `getAuthHeaders()` (getUser round-trip + bearer access token + apikey, lines 14-31) and `edgeFunctionUrl('pixel-chat')` (lines 36-38) used by every Pixel hook |
| src/lib/fileProcessing.ts | `extractTextFromFile` + `ACCEPTED_FILE_TYPES` used for attachments (header comment names Pixel, lines 1-4) |
| src/types/attachments.ts | `PendingAttachment` (client-side) and `AttachmentContext` (wire format) shared by Osha and Pixel (lines 6-27) |
| src/app/globals.css:252-275 and 277+ | `[data-pixel-theme='light']` and `[data-pixel-theme='dark']` CSS-variable overrides scoped to the Pixel container, enabling the page-local theme toggle independent of the global app theme |

### Edge function and shared edge modules

| File | Role |
|---|---|
| supabase/functions/pixel-chat/index.ts | The single Pixel edge function (1,595 lines per `wc -l`, 1,596 in editors counting the final newline; the 1,409 figure in the task brief is stale). Actions: `'chat' \| 'get-settings' \| 'save-settings' \| 'clear-history' \| 'get-blueprints' \| 'save-blueprint' \| 'delete-blueprint' \| 'generate-blueprint'` (line 71) |
| supabase/functions/_shared/cors.ts | Origin allowlist (`localhost:3000/8000/8080` + `https://wishnet.fortunwishdom.com`, overridable via `ALLOWED_ORIGINS` env), `getCorsHeaders` (lines 9-42) |
| supabase/functions/_shared/rate-limit.ts | In-memory sliding-window limiter; pixel-chat instantiates 10 req/min/user (pixel-chat/index.ts:19) |
| supabase/functions/_shared/sanitize.ts | `sanitizeForPrompt` prompt-injection scrubber applied to Heart rules and Brain chunks (lines 12-28) |
| supabase/functions/_shared/token-budgets.ts | `CHAT_RESPONSE: 8192` (line 14), `IMAGE_PROMPT: 1024` (line 29), `PROMPT_OPTIMIZE: 800` (line 23) |
| supabase/functions/promptor/index.ts | Promptor edge fn; its `optimize-draft` action is invoked from the Pixel input wand button (lines 408-414, 536-569) |
| supabase/config.toml | pixel-chat is NOT listed among the `verify_jwt = false` functions (only ai-chat, storage-stats, serve-file, process-embeddings, search-knowledge, process-ocr, promptor, osha-chat, wishpedia-generate appear). Deployed verify_jwt state for pixel-chat: UNVERIFIED in repo (project CLAUDE.md claims it was deployed with `verify_jwt=true`) |

### Database (migrations and types)

| File | Role |
|---|---|
| supabase/migrations/20260218022637_d6a7deff-ee9d-48d9-a846-27e194c4f6c5.sql | Creates `pixel_messages` (lines 3-22, RLS `auth.uid() = user_id` FOR ALL), `trim_pixel_messages` trigger keeping last 200 messages/user (lines 25-46), `pixel_settings` (lines 49-94, one row per user, UNIQUE user_id), `pixel_blueprints` (lines 97-122), and seeds the `agent_settings` row `('pixel','gpt-4o','openai', true, 0.8, 4096, 'You are Pixel, the Visual Creator AI of Fortun Wishnet.')` (lines 125-127) |
| supabase/migrations/20260224004128_1e5b3a70-2c2d-4a43-9e88-3ce6ec3ea410.sql | Adds `is_video boolean DEFAULT false` and `video_url text` to `pixel_messages` (lines 1-2) |
| supabase/migrations/20260218022654_1a9ddb29-a440-405a-ac9c-864ec0c8ecaf.sql | Fixes `search_path` on `trim_pixel_messages` |
| supabase/migrations/20260121213655_e7f8f2d0-1730-468b-87df-e3f647c11707.sql:8 | `ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_pixel boolean DEFAULT true;` |
| supabase/migrations/20260521190000_audit_phase5_advisor_hardening.sql:23 and supabase/migrations/20260521190500_audit_phase5_revoke_anon_execute.sql:12,15 | Audit hardening passes that include `trim_pixel_messages` in their function lists |
| src/integrations/supabase/types.ts | Generated types: `pixel_blueprints` (line 991), `pixel_messages` (line 1048), `pixel_settings` (line 1093), `ai_can_access_pixel` on `user_permissions` (lines 1728, 1772, 1816) |

Note: the `pixel_settings` table contains many columns the current edge/client code no longer reads (e.g. `default_mode`, `default_variations`, `image_generation_enabled`, `image_provider`, `image_model`, `style_lock_default`, migration lines 52-83); the runtime `PixelSettings` interface (pixel-chat/index.ts:26-42, src/hooks/pixel/types.ts:9-27) uses only the behavior/brand/visual subset, and the global `llm_settings` table now decides providers/models.

### Peripheral touchpoints

- src/components/pulse/create/PulseComposer.tsx:194: Pulse references Pixel-generated image URLs in help text ("Direct Pixel generation lands here next").
- src/components/release-notes/mockData.ts and src/components/release-notes/mockPlannedData.ts: mock release-notes copy mentioning Pixel (cosmetic only).
- Shared audit sink: Pixel writes to `osha_audit_logs` (a deliberately shared cross-agent table, see comment at supabase/functions/pixel-chat/index.ts:1250-1253).

## X-2. Architecture flow

Common plumbing for every Pixel hook call: `PIXEL_URL = edgeFunctionUrl('pixel-chat')` resolves to `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pixel-chat` (src/lib/apiHelpers.ts:36-38, src/config/api.ts:26). Headers come from `getAuthHeaders()` (src/lib/apiHelpers.ts:14-31): `Content-Type: application/json`, `Authorization: Bearer <session access_token>` (validated first via `supabase.auth.getUser()` server round-trip), `apikey: <anon key>`. On the edge side every action shares this prologue: CORS headers per Origin (pixel-chat/index.ts:556), OPTIONS short-circuit (558-560), Bearer-header check (562-568), user-scoped client (`anonKey` + forwarded Authorization, 574-576) and admin client (`serviceKey`, 577), `supabase.auth.getUser()` validation (580-587), in-memory rate limit 10 req/min/user returning 429 with `Retry-After: 60` (19, 590-595), JSON body parse (597-605).

### Flow 1: send a chat/generation message (with attachments and Wishpedia refs)

1. User clicks the send button or hits Enter in src/components/pixel/PixelStudio.tsx (button lines 519-530, `handleKeyDown` 264-266). Note a code quirk: the send button's `disabled` condition (lines 521-527) checks only `input`, `pendingAttachments`, and `globalReferences`; `wishpediaImageRefs` are accepted by the `handleSend` guard (line 163) but alone do not enable the button. Code wins over the CLAUDE.md claim that "send-allowed check includes wishpediaImageRefs.length".
2. `handleSend` (PixelStudio.tsx:159-247):
   - Optimistically appends a local user `PixelMessage` (167-176), clears input, sets `isPending` (drives the simulated progress card, lines 89-110, 383-416).
   - Builds `conversationHistory` from `localMessages`, appending bracket annotations per message: `[Generated image: <url>]`, `[Generated video: <url>]`, `[Attached files: ...]`, `[Format: <postType, WxH>]` (182-189).
   - Builds `attachmentsCtx: AttachmentContext[]`: persistent `globalReferences` first, then per-message `pendingAttachments`; images and PDFs send `base64`, other files send `extractedContent` text (191-197, extraction by `extractTextFromFile` in src/lib/fileProcessing.ts via `handleFileSelect` 268-287 and PixelAgent.tsx:85-108).
   - Wishpedia refs: for each `WishpediaImageRef` it fetches `ref.publicUrl` (public `wishpedia-media` bucket URL built by `getWishpediaImageUrl`, src/hooks/useWishpediaImages.ts:152-155), skips >3MB blobs with a toast, FileReader-encodes to base64, and pushes `{ name: \`${entryName} (${angle})\`, type: 'image/jpeg', content: base64, isImage: true }` into the same attachments array (199-215).
   - If `styleLock` is true, sets `lastBlueprintSummary` from the last assistant message's first 500 chars (216-217). NOTE: PixelAgent.tsx passes `styleLock={false}` hard-coded (line 194), so this branch is currently inert; `styleLock` and `lastBlueprintSummary` are sent but the edge function never reads them (they exist on `RequestBody` lines 79-80 but have no usages in the handler).
3. `useSendPixelMessage().mutateAsync` (src/hooks/pixel/usePixelSend.ts:13-46) POSTs `{ action:'chat', message, mode, conversationHistory, attachments, blueprint, styleLock, lastBlueprintSummary, selectedPostType, selectedSize }` to the pixel-chat edge fn.
4. Edge `chat` handler (pixel-chat/index.ts:931+):
   - Loads the caller's `pixel_settings` row (user-scoped client, RLS) and merges over `DEFAULT`-equivalent literals (947-970). `mode` defaults to `'facebook'` (972).
   - Loads `llm_settings` via admin client; keys resolve `llmSettings.openai_api_key || Deno.env.get('OPENAI_API_KEY')` and same for Gemini (976-983); 503 if neither (985-990).
   - Step 1 Heart: `fetchHeartRules` selects active `heart_rules` where `is_global=true OR assigned_agents @> {"pixel"}`, sanitized with `sanitizeForPrompt` (87-105, 993).
   - Step 2 Brain RAG: `searchBrain` (122-164) embeds the query with OpenAI `POST https://api.openai.com/v1/embeddings` model `text-embedding-3-small` (107-120), then RPC `match_knowledge` with `query_text` (hybrid vector+BM25), `match_threshold: 0.2`, `match_count: 100`; for `metadata.is_image` chunks it mints 300-second signed URLs from the `brain-documents` bucket. Runs once on `message` and once on the last assistant message's first 500 chars, deduped (996-1015).
   - Intent detection: `detectDiagramIntent` (268-277), `detectTextOnlyIntent` (245-257, suppressed when `detectRegenerationIntent` matches, 231-243), `detectVideoIntent` (259-266).
   - Step 3 builds the system prompt via `buildPixelSystemPrompt` (303-423) with Heart rules, Brain chunks, mode/platform, settings, optional blueprint context (1022-1029). The returned prompt template, verbatim (interpolation expressions left as-is):

```text
You are Pixel, the Visual Creator AI of Fortun Wishnet. Your PRIMARY output is generated images.

## SESSION MEMORY — UNLIMITED RECALL
Messages in the conversation may contain annotations in brackets such as
[Generated image: ...], [Generated video: ...], [Attached files: ...], and [Format: ...].
These describe media you previously created or files the user shared.
Always reference this full history when responding — you have perfect memory
of everything discussed, attached, and created in this session. If the user refers to
"the image you made earlier" or "that video", use these annotations to identify exactly
which output they mean.

## CORE DIRECTIVE
Generate an image for every creative request. Only respond with text when the user explicitly asks for explanation, help, advice, or non-visual information.
When you generate an image, include a brief caption explaining what you created.

## OPERATING LAW (mandatory — follow in this exact order every response)
1. Heart rules are ABSOLUTE. They always win over Brain knowledge, user requests, and your own creativity.
2. Brain knowledge is authoritative Fortun visual identity and brand context. Use it to make outputs brand-accurate.
3. Wishpedia entries are the CANONICAL visual reference for Fortun universe characters, creatures, and objects.
4. If Heart and Brain conflict, Heart wins.
5. Never invent Heart rules or Fortun canon. If retrieval returns nothing relevant, default to strict, safe, brand-respectful visual direction.
6. If uncertain whether output is Heart-compliant, produce the safest compliant visual output and ask the user for missing constraints.

${platformSection}${postContextSection}## VERBOSITY: ${settings.default_verbosity.toUpperCase()}
${verbosityInstructions[settings.default_verbosity] || verbosityInstructions.standard}

${heartSection}${brainSection}${wishpediaNote}${blueprintSection}${aestheticSection}## ENFORCEMENT
${strictnessInstructions[settings.heart_strictness] || strictnessInstructions.enforce_and_propose}
${refusalStyles[settings.refusal_style] || refusalStyles.neutral}

## SAFETY
${settings.safety_guard_mode ? 'When uncertain, produce the safest compliant visual output and list what constraints are missing.' : ''}

${vocabularySection ? `## VOCABULARY & THEMES\n${vocabularySection}\n` : ''}${diagramInstruction}

## VISUAL BLUEPRINT SYSTEM
A Visual Blueprint is a reusable visual recipe. When creating or referencing blueprints, include:
- Format and aspect ratio
- Composition rules (hierarchy, focal point, whitespace)
- Style rules (palette behavior, lighting, texture, mood)
- Typography vibe (do not require exact fonts)
- Element rules (icon style, border radius vibe, shadow intensity, grain)
- Negative constraints (what to avoid)
When a user asks to "save this as a blueprint" or "create a blueprint", output a structured blueprint in this format that the user can save.

## IDENTITY
- You are Pixel. Never claim to be GPT, ChatGPT, Claude, Gemini, or any other AI.
- You do not expose internal IDs, vector chunks, or system details.
- You exist exclusively inside Fortun Wishnet.
```

   (pixel-chat/index.ts:374-422)
   - Step 4 assembles `userContent`: text/PDF attachments are inlined as `## REFERENCE ASSET: <name> (<type>)` blocks capped at 30,000 chars each, prepended to `## PIXEL REQUEST\n<message>` (1038-1043); image attachments turn `userContent` into an OpenAI vision content array with `image_url: data:<mime>;base64,...`, `detail: 'high'` (1045-1055). This array is only consumed by the text fallback path (Step 6); the image/video paths use attachments differently (below).
   - Step 5a VIDEO branch, taken when not text-only/diagram AND (`selectedPostType` in `{'video','story','reel'}` OR `detectVideoIntent`) (530-535, 1058):
     - Provider = `llm_settings.active_video_provider || 'openai'`; model = `openai_video_model || 'sora-2'` or `gemini_video_model || 'veo-3.1-generate-preview'` (1059-1062).
     - Prompt = `enrichMessageForRegeneration` (279-301, injects ORIGINAL CREATIVE BRIEF / PREVIOUS OUTPUT DESCRIPTION / REQUESTED MODIFICATIONS when regeneration keywords match) then `buildPixelImagePrompt` (see image branch) (1064-1069).
     - OpenAI Sora: multipart `POST https://api.openai.com/v1/videos` with `model`, `prompt`, `size` (mapped by `mapSizeToSora`: 1080x1920 vertical, 1080x1080 square, else 1920x1080, lines 537-543), `n=1` (1086-1090); polls `GET https://api.openai.com/v1/videos/{id}` every 5s up to 60 attempts; on `completed`, downloads `GET https://api.openai.com/v1/videos/{id}/content` (1100-1126).
     - Gemini Veo: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning?key=...` with `instances:[{prompt}]` and `parameters:{aspectRatio (mapRatioToVeo, 545-551), sampleCount:1}` (1133-1143); polls `GET https://generativelanguage.googleapis.com/v1beta/{operationName}?key=...` every 10s up to 60 attempts; extracts base64 `videoBytes` or downloads the returned `uri` (1153-1187).
     - Validates the blob is not a JSON/HTML error body and is >=1000 bytes (1195-1207).
     - Storage write: service-role upload to the PRIVATE `files` bucket at `${userId}/pixel-videos/${Date.now()}_pixel.mp4`, then `getPublicUrl` is stored as `permanentVideoUrl` (1209-1220). Note the asymmetry: the image path was bug-fixed to mint a signed URL because `getPublicUrl` on the private bucket 403s (comment at 1439-1442), but the video path still stores the public-style URL; playback works only because `useSecureImageUrl` re-signs `files`-bucket references client-side (src/hooks/files/useSecureImageUrl.ts:14-39).
     - Files Manager write: ensures/creates a `sectors` row named `'Pixel AI'` (color `#EC4899`) and inserts a `files` row (1222-1237).
     - DB writes: inserts the user message and the assistant message (`is_video: true, video_url`) into `pixel_messages` (1245-1248); if `internal_audit_logging`, inserts into the shared `osha_audit_logs` with `compliance_notes: 'Pixel: video generated via <provider>/<model>'` (1254-1266).
     - Response: `{ content, isImage:false, isVideo:true, videoUrl, audit:{heartCount, brainCount, complianceStatus:'pass'} }` (1268-1274). On error: a 200 with an apology `content` and the audit object (1276-1283).
   - Step 5b IMAGE branch (default when not text-only/diagram, 1287):
     - Provider = `llm_settings.active_image_provider || 'openai'`; model = `openai_image_model || 'gpt-image-1'` or `gemini_image_model || 'gemini-2.5-flash-image'` (1289-1292).
     - `buildPixelImagePrompt` (425-506): runs two extra parallel RAG searches: `searchBrain` with the query suffixed `" visual appearance design look character style colors brand"` (limit 100) and `searchWishpedia` (170-229: `match_knowledge` with `match_threshold: 0.3`, `match_count: 10`, `filter_source_types: ['wishpedia_entry']`, dedup by `source_id`, image URLs from chunk metadata or a fallback DB read of `wishpedia_entry_images` building public `wishpedia-media` URLs). Assembles: user message + `WISHPEDIA VISUAL REFERENCES — USE THESE AS CANONICAL CHARACTER DESIGNS` block (entry name, content, per-angle reference image URLs as text) + `BRAND VISUAL CONTEXT` (Brain chunks capped at 2,500 chars) + `VISUAL STYLE` from settings + optional `BLUEPRINT:` block + `CRITICAL TARGET FORMAT` (exact WxH, "Do NOT add black bars, padding, letterboxing, or pillarboxing") + `BRAND COMPLIANCE CONSTRAINTS` (Heart rules filtered by visual keywords, else first 5) + the verbatim trailing line: ``Style: creative, high-quality digital art, brand-consistent, appropriate for all audiences, ${settings.default_aesthetic} aesthetic.`` (505).
     - Image-to-image sources (1301-1325): up to 4 `Uint8Array` sources, 5MB cap each, taken from (a) base64 `imageAttachments` (which include the Wishpedia refs the client encoded as image attachments) and (b) deduped Brain-image signed URLs fetched server-side.
     - OpenAI: if sources exist, multipart `POST https://api.openai.com/v1/images/edits` with `model`, `prompt`, `n=1`, `size` (mapSizeToOpenAI: `1024x1024` / `1024x1536` / `1536x1024` / `auto`, lines 508-516), and repeated `image[]` File parts (1380-1394); on failure falls back to JSON `POST https://api.openai.com/v1/images/generations` (1373-1377, 1395-1401). Result handling: `url` results are host-validated (`api.openai.com`, `*.blob.core.windows.net`, `*.oaiusercontent.com`, https only) and capped at 20MB (1406-1418); `b64_json` is decoded (1419-1423).
     - Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...` with the prompt text part plus `inlineData` PNG parts for each source image unshifted in front (1332-1344); `gemini-2.5-flash-image` gets a plain body with optional `generationConfig.aspectRatio` (mapRatioToGemini: 1:1, 9:16, 4:5→3:4, 16:9, lines 518-527); other models get `responseModalities: ['TEXT','IMAGE']` (1345-1354). First `inlineData` image part is decoded (1362-1369).
     - Storage write: service-role upload to private `files` at `${userId}/pixel-images/${Date.now()}_pixel.png`, then a 24h signed URL is stored as `permanentImageUrl` (1429-1443); same `'Pixel AI'` sector + `files` row insert (1445-1460).
     - DB writes: user + assistant rows into `pixel_messages` (`is_image: true, image_url`) (1468-1471); shared `osha_audit_logs` insert with `'Pixel: image generated via <provider>/<model>'` (1474-1486).
     - Response: `{ content: "Here's the visual I created based on your brief.", isImage:true, imageUrl, audit }` (1488-1493); error path returns a 200 apology + audit (1495-1502).
   - Step 6 TEXT/DIAGRAM fallback (1505-1568): provider is `useGemini = !openaiKey && !!geminiKey` (OpenAI preferred whenever its key exists, regardless of `active_text_provider`); model `openai_text_model || 'gpt-4o'` or `gemini_text_model || 'gemini-1.5-pro'` (1510). OpenAI: `POST https://api.openai.com/v1/chat/completions` with system prompt, full `conversationHistory`, and `userContent` (which may be the vision array), `max_tokens: TOKEN_BUDGETS.CHAT_RESPONSE` (8192), `temperature: 0.8` (1543-1552). Gemini: `:generateContent` with `system_instruction` and text-only contents (image attachments are dropped on this branch: `typeof userContent === 'string' ? userContent : message`, 1516). Compliance status is scraped from the response text for `compliance: refused|adjusted` markers (1559-1563). Step 7 persists both messages to `pixel_messages` (no media flags) (1570-1574), writes `osha_audit_logs` (1576-1589), and returns `{ content, audit:{heartCount, brainCount, complianceStatus} }` (1591-1594).
5. Client render: `onSuccess` invalidates `['pixel-messages', user.id]` (usePixelSend.ts:40-42); `handleSend` pushes a local assistant `PixelMessage` from the result and calls `onMessagesChange()` → `refetch()` of `usePixelMessages` (PixelStudio.tsx:227-238, PixelAgent.tsx:190). Messages are paired user+assistant (290-300) and rendered by `PixelOutputCard`: markdown + Mermaid (`mermaid@11` loaded from jsdelivr CDN, `securityLevel:'strict'`, PixelOutputCard.tsx:71-109), media via `useSecureImageUrl` re-signing (line 164), download/fullscreen/delete/save-to-brain actions. A thrown send error appends a local fallback bubble "I'm having trouble processing your request. Please try again." (PixelStudio.tsx:239-244) plus a Sonner toast from the hook (usePixelSend.ts:43-45).

### Flow 2: clear history

1. Hook `useClearPixelHistory` (src/hooks/pixel/usePixelMessages.ts:29-59): POST `{ action: 'clear-history' }` to pixel-chat with `getAuthHeaders()`; a thrown fetch is converted to the actionable "Request was blocked before reaching the server..." message (43-47); non-OK responses surface the server's error body (48-51).
2. Edge handler (pixel-chat/index.ts:674-690): `DELETE FROM pixel_messages WHERE user_id = <caller>` via the user-scoped client (RLS policy `Users can manage own pixel messages` permits it). Returns `{ success: true }`.
3. On success the hook invalidates `['pixel-messages', user.id]` and toasts "Studio session cleared" (53-56).
4. UI wiring: NO component callsite for `useClearPixelHistory` was found anywhere in src (grep matched only the hook definition). The action is implemented end-to-end but currently appears unreachable from the Pixel UI. Per-message deletion is wired instead: `useDeletePixelMessage` does a direct supabase-js `pixel_messages` DELETE by id+user_id (usePixelMessages.ts:61-79), triggered from PixelStudio's `handleDeleteMessage` (PixelStudio.tsx:127-130).

### Flow 3: settings load / save

1. Load: `usePixelSettings` (src/hooks/pixel/usePixelSettings.ts:9-35) POSTs `{ action: 'get-settings' }`; any failure (auth, network, non-OK) degrades to `DEFAULT_PIXEL_SETTINGS` (src/hooks/pixel/types.ts:29-45). Edge handler selects the caller's `pixel_settings` row with `maybeSingle()` via the user-scoped client and returns `{ settings }` (pixel-chat/index.ts:610-627). The result is consumed by PixelAgent (line 63) and passed into the PixelSettings sheet (lines 303-315).
2. Save: PixelSettings form `handleSave` (src/components/pixel/PixelSettings.tsx:47) → `useUpsertPixelSettings` POST `{ action: 'save-settings', settings }` (usePixelSettings.ts:37-60). Edge handler checks for an existing row by `user_id` and UPDATEs (with `updated_at`) or INSERTs (`user_id` forced to the caller), both via the user-scoped client, returning `{ settings: <row> }` (pixel-chat/index.ts:630-671). Success invalidates `['pixel-settings', user.id]` and toasts "Pixel settings saved".
3. Provider/model display inside the settings sheet is read-only from `useLLMSettings` (global `llm_settings`), with Configure buttons routing to `/settings?tab=llm` (PixelSettings.tsx:29-40, 81-111); Pixel has no per-agent model override.

### Flow 4: blueprints (CRUD, AI generation, use)

1. Entry: PixelControlPanel's `onNewBlueprint` or the PixelAgent "Visual Templates" sheet open `PixelBlueprintPanel` (PixelAgent.tsx:175, 317-334).
2. List: `usePixelBlueprints` POST `{ action: 'get-blueprints' }` (usePixelBlueprints.ts:9-35); edge returns the caller's `pixel_blueprints` ordered by `created_at` desc (pixel-chat/index.ts:693-710); failures degrade to `[]`.
3. Create/update: panel `handleSave` (PixelBlueprintPanel.tsx:40-49) → `useSavePixelBlueprint` POST `{ action: 'save-blueprint', blueprint }` (usePixelBlueprints.ts:37-60); edge requires `blueprint.name`, UPDATEs when `blueprint.id` is present (scoped `eq('user_id', userId)`) else INSERTs with `user_id`, returning `{ blueprint }` (pixel-chat/index.ts:713-759).
4. Delete: `useDeletePixelBlueprint` POST `{ action: 'delete-blueprint', blueprintId }` (usePixelBlueprints.ts:62-84); edge DELETEs by id + user_id (pixel-chat/index.ts:762-787).
5. AI generation: panel `handleGenerateWithAI` (PixelBlueprintPanel.tsx:57-76) → `useGenerateBlueprintWithAI` POST `{ action: 'generate-blueprint' }` (usePixelBlueprints.ts:86-106). Edge (pixel-chat/index.ts:790-928): loads `llm_settings` keys, fetches Heart rules, runs two `searchBrain` queries (`'brand visual identity design style aesthetic'` and `'color palette typography mood lighting brand guidelines'`, limit 100 each, deduped, 810-830), then calls the text LLM (OpenAI `chat/completions` with `response_format: json_object` or Gemini `:generateContent`, `temperature: 0.85`, `max tokens TOKEN_BUDGETS.IMAGE_PROMPT` = 1024; provider is `useGemini = !openaiKeyBP && !!geminiKeyBP`, 866-909) with this generation prompt, verbatim:

```text
You are Pixel, the Visual Creator AI of Fortun Wishnet. Generate a creative, brand-accurate Visual Blueprint.

${heartSection}

${brainSection}

Generate ONE creative Visual Blueprint. It must:
- Be inspired by but not copy the brand knowledge above
- Respect ALL Heart rules strictly — they are absolute
- Feel fresh, professional, and visually distinctive
- Be immediately usable as a creative production recipe
- Be specific and actionable, not generic

Respond ONLY with valid JSON (no markdown code blocks, no explanation, just the raw JSON object):
{
  "name": "creative, specific blueprint name (3-6 words)",
  "description": "one sentence describing this blueprint's visual personality and use case",
  "format": "one of: social_post, story, carousel, deck_slide, banner, thumbnail, custom",
  "aspect_ratio": "one of: 1:1, 9:16, 16:9, 4:5, 4:3, 3:4, 21:9",
  "style_rules": "palette behavior, lighting style, texture intensity, mood, atmosphere — be specific",
  "composition_rules": "visual hierarchy approach, focal point strategy, whitespace usage, grid system",
  "typography_vibe": "type personality, weight range, hierarchy approach, pairing style — no specific font names",
  "element_rules": "icon style, border radius vibe, shadow intensity, grain overlay, decorative element approach",
  "negative_constraints": "what to never include in outputs using this blueprint — be specific"
}
```

   (pixel-chat/index.ts:840-864). The parsed JSON is returned as `{ blueprint }` WITHOUT being persisted; the panel pre-fills the create form and the user must still Save (PixelBlueprintPanel.tsx:60-75).
6. Use: applying a blueprint sets `activeBlueprint` state in PixelAgent (lines 46, 171, 326-331); on the next send it travels as `body.blueprint` and is injected into the chat system prompt as the `## ACTIVE BLUEPRINT — APPLY TO ALL OUTPUTS` section (pixel-chat/index.ts:1022-1029, 360-362) and into the image prompt as the `BLUEPRINT:` block (497-499).

### Flow 5: save generated image to Brain

1. Trigger: a button in `PixelOutputCard` opens `SavePixelToBrainDialog` with `imageUrl={secureUrl || aiMessage.image_url}` and `messageId` (PixelOutputCard.tsx:156, 396).
2. `handleSave` (src/components/pixel/SavePixelToBrainDialog.tsx:50-118), entirely client-side via supabase-js (no Pixel edge call):
   - Fetches the (re-signed) image URL into a Blob (59-61).
   - Resolves the destination `brain_sections` row: `type === 'general'` section, or the section whose `agent_id` equals the chosen agent, in which case `restricted_agents = [destination]` (63-75).
   - Uploads the blob to the `brain-documents` storage bucket at `${destination}/${timestamp}_pixel-image.png` (77-84).
   - Inserts a `brain_documents` row (section_id, name, original_name `pixel-image-<messageId>.png`, storage_path, mime_type, size, category, description, restricted_agents) (86-102).
   - Kicks off vector indexing: `runOcr({ documentId, storagePath, mimeType })` from `useOcrIndexing` (src/hooks/useOcrIndexing.ts), which drives the process-ocr edge function (image docs get the vision-describe path per the project's multimodal RAG work); fire-and-forget, toast "Image saved - now indexing to vector store…" (104-106).
   - Invalidates `['brain-documents']` and closes (108-111); errors go to Sentry + toast (112-114).
3. Net effect: the generated image becomes retrievable by `searchBrain` in future Pixel/Osha chats (including as an image-to-image source via the `is_image` signed-URL path, pixel-chat/index.ts:143-162, 1315-1322).

### Flow 6: optimize-draft (Pixel input wand → promptor edge fn)

1. Trigger: the Wand2 button left of send in PixelStudio (lines 509-517, disabled when input empty / optimizing / pending) calls `handleOptimizeDraft` (66-78).
2. `useOptimizeDraft` (src/hooks/promptor/useOptimizeDraft.ts:11-33) calls `callPromptor({ action: 'optimize-draft', raw_request: draftText })`; `callPromptor` POSTs to `edgeFunctionUrl('promptor')` with `getAuthHeaders()` (src/hooks/promptor/usePromptorSettings.ts:5-20).
3. Promptor edge fn (supabase/functions/promptor/index.ts): auth via `getUser()` (no admin gate; any authenticated user, 338-357), rate limit 15 req/min/user (17, 360-365), action allowlist includes `optimize-draft` (408-414), `raw_request` required (423-428).
4. Mandatory retrieval before generation: ALL active Heart rules where `is_global=true OR assigned_agents @> {"promptor"}` (471-477) plus Brain semantic search over `['brain_document','wishpedia_entry']` at the user's `retrieval_depth` (478-480), both sanitized (482-487).
5. LLM call: provider from `llm_settings.active_text_provider` (460-465); user message for this action is the tight rewrite instruction, verbatim:

```text
The user has typed a draft chat prompt and wants it rewritten for clarity, specificity, and brand alignment with the Heart rules and Brain context above.

Return a JSON object where "final_prompt_full" contains ONLY the rewritten draft as a single string. All other JSON fields may be empty strings, empty arrays, or short placeholders — they will be ignored. Do not wrap the rewrite in quotes or code fences.

DRAFT TO REWRITE:
${raw_request}

Respond ONLY with the JSON object.
```

   (536-543, selected at 545-546), with `max_tokens = TOKEN_BUDGETS.PROMPT_OPTIMIZE` (800) (566-569); OpenAI `chat/completions` JSON mode or Gemini `:generateContent` at `temperature: 0.7` (571-614).
6. Side effects even for this in-chat rewrite: a full `promptor_runs` row is inserted (`mode: 'optimize-draft'`, heart/brain context, outputs, 616-647) and an `osha_audit_logs` row (649-665).
7. Response `{ run_id, brief_summary, final_prompt_short, final_prompt_full, variants, negatives, qa_checklist, compliance_status, compliance_notes, retrieval_meta }` (667-684); the hook extracts only `final_prompt_full`, erroring on an empty rewrite (useOptimizeDraft.ts:18-22); PixelStudio replaces the textarea content in place and resizes it (lines 69-74). Nothing is sent to pixel-chat in this flow.

## X-3. System prompt and instructions

### Where Pixel's prompts live

Pixel's entire prompt stack is hardcoded inside the edge function supabase/functions/pixel-chat/index.ts. The shared DB-backed prompt loader (supabase/functions/_shared/system-prompts.ts, `getSystemPrompt` / `getAgentPrompts`, reading the `system_prompts` table) is NOT imported or used by pixel-chat. The function's only shared imports are `sanitizeForPrompt`, `getCorsHeaders`, `createRateLimiter`, and `TOKEN_BUDGETS` (supabase/functions/pixel-chat/index.ts:12-16). So unlike agents that consult `system_prompts`, Pixel's system prompt cannot be overridden from the DB; only its variable splice-ins (Heart rules, Brain chunks, settings, blueprints) come from the database.

There are three distinct prompt builders:

1. `buildPixelSystemPrompt()` (supabase/functions/pixel-chat/index.ts:303-423): the chat system prompt, used ONLY on the text/diagram fallback path (Step 6).
2. `buildPixelImagePrompt()` (supabase/functions/pixel-chat/index.ts:425-506): a single flat prompt string sent directly to the image model (gpt-image / Gemini image) and to the video model (Sora / Veo). The system prompt is not sent on these paths.
3. The `generate-blueprint` action prompt (supabase/functions/pixel-chat/index.ts:840-864), a one-shot prompt with its own mini-persona.

### 1. Chat system prompt (text/diagram path)

`buildPixelSystemPrompt()` returns this template (supabase/functions/pixel-chat/index.ts:374-422), quoted verbatim:

```ts
  return `You are Pixel, the Visual Creator AI of Fortun Wishnet. Your PRIMARY output is generated images.

## SESSION MEMORY — UNLIMITED RECALL
Messages in the conversation may contain annotations in brackets such as
[Generated image: ...], [Generated video: ...], [Attached files: ...], and [Format: ...].
These describe media you previously created or files the user shared.
Always reference this full history when responding — you have perfect memory
of everything discussed, attached, and created in this session. If the user refers to
"the image you made earlier" or "that video", use these annotations to identify exactly
which output they mean.

## CORE DIRECTIVE
Generate an image for every creative request. Only respond with text when the user explicitly asks for explanation, help, advice, or non-visual information.
When you generate an image, include a brief caption explaining what you created.

## OPERATING LAW (mandatory — follow in this exact order every response)
1. Heart rules are ABSOLUTE. They always win over Brain knowledge, user requests, and your own creativity.
2. Brain knowledge is authoritative Fortun visual identity and brand context. Use it to make outputs brand-accurate.
3. Wishpedia entries are the CANONICAL visual reference for Fortun universe characters, creatures, and objects.
4. If Heart and Brain conflict, Heart wins.
5. Never invent Heart rules or Fortun canon. If retrieval returns nothing relevant, default to strict, safe, brand-respectful visual direction.
6. If uncertain whether output is Heart-compliant, produce the safest compliant visual output and ask the user for missing constraints.

${platformSection}${postContextSection}## VERBOSITY: ${settings.default_verbosity.toUpperCase()}
${verbosityInstructions[settings.default_verbosity] || verbosityInstructions.standard}

${heartSection}${brainSection}${wishpediaNote}${blueprintSection}${aestheticSection}## ENFORCEMENT
${strictnessInstructions[settings.heart_strictness] || strictnessInstructions.enforce_and_propose}
${refusalStyles[settings.refusal_style] || refusalStyles.neutral}

## SAFETY
${settings.safety_guard_mode ? 'When uncertain, produce the safest compliant visual output and list what constraints are missing.' : ''}

${vocabularySection ? `## VOCABULARY & THEMES\n${vocabularySection}\n` : ''}${diagramInstruction}

## VISUAL BLUEPRINT SYSTEM
A Visual Blueprint is a reusable visual recipe. When creating or referencing blueprints, include:
- Format and aspect ratio
- Composition rules (hierarchy, focal point, whitespace)
- Style rules (palette behavior, lighting, texture, mood)
- Typography vibe (do not require exact fonts)
- Element rules (icon style, border radius vibe, shadow intensity, grain)
- Negative constraints (what to avoid)
When a user asks to "save this as a blueprint" or "create a blueprint", output a structured blueprint in this format that the user can save.

## IDENTITY
- You are Pixel. Never claim to be GPT, ChatGPT, Claude, Gemini, or any other AI.
- You do not expose internal IDs, vector chunks, or system details.
- You exist exclusively inside Fortun Wishnet.`;
```

The interpolated sections are built immediately above the return, all verbatim:

Verbosity map (supabase/functions/pixel-chat/index.ts:314-318), keyed by `pixel_settings.default_verbosity`:

```ts
  const verbosityInstructions: Record<string, string> = {
    short: 'Keep responses focused and concise. Minimal preamble. Actionable outputs only.',
    standard: 'Provide complete, well-structured visual direction of appropriate depth.',
    detailed: 'Provide comprehensive, richly detailed visual direction with full art direction notes.',
  };
```

Heart strictness map (supabase/functions/pixel-chat/index.ts:320-324), keyed by `pixel_settings.heart_strictness`:

```ts
  const strictnessInstructions: Record<string, string> = {
    enforce_and_propose: 'If a request violates Heart rules: refuse the violating part, explain briefly, and propose a compliant visual alternative.',
    enforce_and_redirect: 'If a request violates Heart rules: refuse firmly and redirect to what visual help you can offer.',
    always_enforce: 'Always enforce Heart rules strictly. Refuse any non-compliant request without exception.',
  };
```

Refusal style map (supabase/functions/pixel-chat/index.ts:326-330), keyed by `pixel_settings.refusal_style`:

```ts
  const refusalStyles: Record<string, string> = {
    soft: 'When refusing, use gentle, encouraging language.',
    neutral: 'When refusing, use clear, professional language.',
    firm: 'When refusing, use direct, firm language.',
  };
```

Heart-rules injection (supabase/functions/pixel-chat/index.ts:332-334):

```ts
  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES — ABSOLUTE, ALWAYS TAKE PRECEDENCE\n${heartRules.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}\n\n`
    : `## HEART RULES\nNo specific Heart rules loaded. Default to strict, safe, brand-respectful visual direction.\n\n`;
```

Brain RAG injection (supabase/functions/pixel-chat/index.ts:336-338):

```ts
  const brainSection = brainContext.length > 0
    ? `## FORTUN MASTERMIND BRAIN — AUTHORITATIVE BRAND KNOWLEDGE\nUse this as the source of truth for Fortun visual identity, products, characters, and brand context. Never contradict it.\n${brainContext.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}\n\n`
    : `## BRAND KNOWLEDGE\nNo specific Brain context retrieved. If the user asks about Fortun-specific visual identity or characters, say so honestly and direct them to add information to the Brain knowledge base.\n\n`;
```

Wishpedia canon note, always present (supabase/functions/pixel-chat/index.ts:340-343):

```ts
  const wishpediaNote = `## WISHPEDIA — FORTUN UNIVERSE VISUAL CANON
Wishpedia entries are the authoritative source for Fortun universe characters, creatures, and objects.
When generating images involving any Fortun character or entity, ALWAYS use Wishpedia descriptions and reference images as the canonical visual source.
If Wishpedia image URLs are provided in the prompt context, use them as the definitive visual reference for that character's appearance, proportions, colors, and design details.\n\n`;
```

Vocabulary/theme splice from `pixel_settings` arrays (supabase/functions/pixel-chat/index.ts:345-350):

```ts
  const vocabularySection = [
    settings.allowed_vocabulary?.length > 0 ? `Preferred vocabulary: ${settings.allowed_vocabulary.join(', ')}` : '',
    settings.blocked_vocabulary?.length > 0 ? `Never use these words: ${settings.blocked_vocabulary.join(', ')}` : '',
    settings.allowed_themes?.length > 0 ? `Allowed visual themes: ${settings.allowed_themes.join(', ')}` : '',
    settings.blocked_themes?.length > 0 ? `Blocked visual themes (never produce): ${settings.blocked_themes.join(', ')}` : '',
  ].filter(Boolean).join('\n');
```

Aesthetic defaults from `pixel_settings` (supabase/functions/pixel-chat/index.ts:352-358):

```ts
  const aestheticSection = `## VISUAL DEFAULTS
- Default aesthetic: ${settings.default_aesthetic}
- Palette behavior: ${settings.palette_behavior}
- Texture level: ${settings.texture_level}
- Lighting: ${settings.lighting}
- Detail level: ${settings.detail_level}
Apply these as defaults unless overridden by the user or a blueprint.\n\n`;
```

Active blueprint, target format, and platform sections (supabase/functions/pixel-chat/index.ts:360-368):

```ts
  const blueprintSection = activeBlueprintContext
    ? `## ACTIVE BLUEPRINT — APPLY TO ALL OUTPUTS\n${activeBlueprintContext}\n\n`
    : '';

  const postContextSection = selectedPostType || selectedSize
    ? `## TARGET FORMAT\n${selectedPostType ? `Post type: ${selectedPostType}` : ''}${selectedSize ? `\nDimensions: ${selectedSize.width}×${selectedSize.height} (${selectedSize.ratio})` : ''}\nGenerate the image to match this exact format and dimensions.\n\n`
    : '';

  const platformSection = `## PLATFORM: ${(mode || 'facebook').toUpperCase()}\nOptimize all visuals for ${mode || 'facebook'} platform best practices.\n\n`;
```

Note that `mode` is a client-supplied string spliced into the system prompt without an allowlist check; the server only defaults it (`const mode = body.mode || 'facebook';`, supabase/functions/pixel-chat/index.ts:972). The client constrains it to `'facebook' | 'instagram' | 'tiktok' | 'cross_platform'` via the `PixelMode` type (src/components/pixel/PixelTopBar.tsx:10), but that is a TypeScript-only constraint.

Diagram instruction, added only when `detectDiagramIntent()` fires (supabase/functions/pixel-chat/index.ts:370-372):

```ts
  const diagramInstruction = wantsDiagram
    ? `\n## DIAGRAM/STRUCTURE OUTPUT\nOutput diagrams, storyboards, timelines, and content calendars as Mermaid fenced code blocks:\n\`\`\`mermaid\n[your diagram here]\n\`\`\`\nFor tables (shot lists, scoring matrices, content calendars), use standard markdown tables.\n`
    : '';
```

The active blueprint string fed into `blueprintSection` is formatted in the handler from the client-sent `body.blueprint` (supabase/functions/pixel-chat/index.ts:1022-1024):

```ts
  const activeBlueprintStr = body.blueprint
    ? `Name: ${body.blueprint.name}\nFormat: ${body.blueprint.format || 'unspecified'}\nAspect Ratio: ${body.blueprint.aspect_ratio || '1:1'}\nComposition: ${body.blueprint.composition_rules || ''}\nStyle: ${body.blueprint.style_rules || ''}\nTypography: ${body.blueprint.typography_vibe || ''}\nElements: ${body.blueprint.element_rules || ''}\nAvoid: ${body.blueprint.negative_constraints || ''}`
    : undefined;
```

### 2. DB-sourced prompt pieces

- **Heart rules**: table `heart_rules`, columns `name`, `rule_content`, `priority`, filtered `is_active = true` AND (`is_global = true` OR `assigned_agents` contains `"pixel"`). Fetch + sanitize code (supabase/functions/pixel-chat/index.ts:87-105):

```ts
async function fetchHeartRules(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ name: string; content: string; priority: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"pixel"}');

  if (error) {
    console.error('Heart rules fetch error:', error);
    return [];
  }

  // AGENT-003: sanitize rule content before prompt interpolation
  return (data || []).map((r: any) => ({
    name: sanitizeForPrompt(r.name),
    content: sanitizeForPrompt(r.rule_content),
    priority: r.priority,
  }));
}
```

- **Brain RAG chunks**: retrieved via the `match_knowledge` RPC (hybrid vector + BM25, threshold 0.2, embeddings via OpenAI `text-embedding-3-small`); chunk `content` is sanitized with `sanitizeForPrompt` before reaching the prompt, and `is_image` chunks also get 5-minute signed URLs from the `brain-documents` bucket for image-to-image use (supabase/functions/pixel-chat/index.ts:122-164, sanitize call at line 161). For chat, two searches run with `match_count: 100` each: one on the user message, one on the last assistant message's first 500 chars (supabase/functions/pixel-chat/index.ts:996-1015).
- **Wishpedia entries**: retrieved via `match_knowledge` with `filter_source_types: ['wishpedia_entry']`, threshold 0.3, count 10; entry name from `chunk.metadata.entry_name`, image URLs from `chunk.metadata.image_urls` or fallback rows from table `wishpedia_entry_images` (columns `angle`, `original_name`), composed into public `wishpedia-media` bucket URLs (supabase/functions/pixel-chat/index.ts:170-229). Wishpedia `chunk.content` is pushed into the prompt WITHOUT `sanitizeForPrompt` (line 222-225), unlike Brain content.
- **Per-user settings**: table `pixel_settings` (columns matching the `PixelSettings` interface at supabase/functions/pixel-chat/index.ts:26-42: `default_language`, `default_verbosity`, `heart_strictness`, `refusal_style`, `safety_guard_mode`, `allowed_vocabulary`, `blocked_vocabulary`, `allowed_themes`, `blocked_themes`, `default_aesthetic`, `palette_behavior`, `texture_level`, `lighting`, `detail_level`, `internal_audit_logging`). Defaults if no row (supabase/functions/pixel-chat/index.ts:953-970): verbosity `standard`, strictness `enforce_and_propose`, refusal `neutral`, safety guard `true`, aesthetic `premium`, palette `adaptive`, texture `subtle`, lighting `soft`, detail `medium`. There is no free-text "custom instructions" column for Pixel; all settings influence the prompt only through the fixed maps and the `aestheticSection`/`vocabularySection` templates above.
- **Blueprints**: table `pixel_blueprints` (CRUD actions at supabase/functions/pixel-chat/index.ts:693-787). The ACTIVE blueprint reaches the prompt only because the client sends it back in the chat body (`body.blueprint`), not via a server-side fetch.
- **Models/keys**: table `llm_settings` (`openai_api_key`, `gemini_api_key`, `active_image_provider`, `openai_image_model`, `gemini_image_model`, `active_video_provider`, `openai_video_model`, `gemini_video_model`, `openai_text_model`, `gemini_text_model`), read at supabase/functions/pixel-chat/index.ts:976-983, 1059-1062, 1289-1292, 1510.

### 3. Image and video generation prompt

For any non-text-only, non-diagram message, Pixel skips the chat model entirely and builds a single flat prompt with `buildPixelImagePrompt()` (supabase/functions/pixel-chat/index.ts:425-506). It runs two extra retrievals in parallel: a Brain search on the user message suffixed with a hardcoded visual query expansion, and a Wishpedia search (supabase/functions/pixel-chat/index.ts:437-442):

```ts
  // Parallel searches: visual Brain chunks + Wishpedia references
  const imageQuery = `${userMessage} visual appearance design look character style colors brand`;
```

Brand visual context block, capped at 2500 chars of chunk text (supabase/functions/pixel-chat/index.ts:453-465):

```ts
      visualKnowledge = `\n\nBRAND VISUAL CONTEXT:\n${parts.join('\n---\n')}`;
```

Wishpedia references block (supabase/functions/pixel-chat/index.ts:467-482):

```ts
  let wishpediaSection = '';
  if (wishpediaResults.length > 0) {
    const entryParts = wishpediaResults.map(entry => {
      const lines = [`CHARACTER: ${entry.name}`, entry.content.trim()];
      if (entry.imageUrls.length > 0) {
        lines.push('REFERENCE IMAGES:');
        entry.imageUrls.forEach(img => {
          lines.push(`  - ${img.angle}: ${img.url}`);
        });
      }
      return lines.join('\n');
    });
    wishpediaSection = `\n\nWISHPEDIA VISUAL REFERENCES — USE THESE AS CANONICAL CHARACTER DESIGNS:\n${entryParts.join('\n---\n')}`;
```

Heart constraints for the image model: rules are first filtered by a visual-keyword heuristic, falling back to the first 5 rules (supabase/functions/pixel-chat/index.ts:484-493):

```ts
  let heartConstraints = '';
  if (heartRules.length > 0) {
    const visualKeywords = ['brand', 'visual', 'image', 'color', 'style', 'logo', 'content', 'appropriate', 'safe', 'guideline', 'identity', 'design', 'illustration', 'character', 'art'];
    const relevant = heartRules.filter(r => {
      const text = `${r.name} ${r.content}`.toLowerCase();
      return visualKeywords.some(kw => text.includes(kw));
    });
    const rulesForConstraints = relevant.length > 0 ? relevant : heartRules.slice(0, 5);
    heartConstraints = `\n\nBRAND COMPLIANCE CONSTRAINTS:\n${rulesForConstraints.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`;
  }
```

Aesthetic, blueprint, and format notes plus the final assembly (supabase/functions/pixel-chat/index.ts:495-505):

```ts
  const aestheticNote = `\n\nVISUAL STYLE: ${settings.default_aesthetic} aesthetic, ${settings.lighting} lighting, ${settings.texture_level} texture, ${settings.detail_level} detail level, ${settings.palette_behavior} palette`;

  const blueprintNote = blueprint
    ? `\n\nBLUEPRINT: ${blueprint.name}\nFormat: ${blueprint.format || 'unspecified'} | Aspect: ${blueprint.aspect_ratio || '1:1'}\nStyle: ${blueprint.style_rules || ''}\nComposition: ${blueprint.composition_rules || ''}\nTypography: ${blueprint.typography_vibe || ''}\nAvoid: ${blueprint.negative_constraints || ''}`
    : '';

  const formatNote = selectedPostType || selectedSize
    ? `\n\nCRITICAL TARGET FORMAT: ${selectedPostType || ''} ${selectedSize ? `EXACTLY ${selectedSize.width}×${selectedSize.height} pixels (${selectedSize.ratio} aspect ratio)` : ''}.\nThe ENTIRE canvas MUST be filled with content at this exact ratio. Do NOT add black bars, padding, letterboxing, or pillarboxing. The output must be a native ${selectedSize?.ratio || '1:1'} image, NOT a square with the content embedded inside it.`
    : '';

  return `${userMessage}${wishpediaSection}${visualKnowledge}${aestheticNote}${blueprintNote}${formatNote}${heartConstraints}\n\nStyle: creative, high-quality digital art, brand-consistent, appropriate for all audiences, ${settings.default_aesthetic} aesthetic.`;
```

This same prompt string is sent as-is to: OpenAI `/v1/images/generations` or `/v1/images/edits` (multipart `image[]` when image-to-image sources exist, supabase/functions/pixel-chat/index.ts:1373-1401), Gemini `:generateContent` image models (text part plus `inlineData` source images, lines 1330-1369), OpenAI Sora `/v1/videos` (`formData.append('prompt', videoPrompt)`, lines 1078-1089), and Gemini Veo `:predictLongRunning` (`instances: [{ prompt: videoPrompt }]`, lines 1133-1142). Image-to-image sources are up to 4 images (5MB each): user image attachments first, then deduped Brain image signed URLs (supabase/functions/pixel-chat/index.ts:1301-1325).

### 4. Regeneration enrichment (image/video paths)

When the message matches regeneration keywords, the user message itself is rewritten before prompt building (supabase/functions/pixel-chat/index.ts:279-301):

```ts
function enrichMessageForRegeneration(
  message: string,
  conversationHistory: ChatMessage[],
): string {
  if (!detectRegenerationIntent(message) || !conversationHistory || conversationHistory.length === 0) {
    return message;
  }

  const reversed = [...conversationHistory].reverse();
  const lastUserMsg = reversed.find(m => m.role === 'user');
  const lastAssistantMsg = reversed.find(m => m.role === 'assistant');

  if (!lastUserMsg) return message;

  const parts = [`ORIGINAL CREATIVE BRIEF: ${lastUserMsg.content}`];
  if (lastAssistantMsg) {
    parts.push(`PREVIOUS OUTPUT DESCRIPTION: ${lastAssistantMsg.content.slice(0, 300)}`);
  }
  parts.push(`REQUESTED MODIFICATIONS: ${message}`);
  parts.push('Generate a NEW image that keeps the core concept from the original brief but applies the requested modifications.');

  return parts.join('\n\n');
}
```

### 5. Intent detection (keyword lists, not LLM-based)

All routing is plain substring matching on the lowercased message; there is no LLM intent classifier and no regex beyond these keyword arrays.

Regeneration (supabase/functions/pixel-chat/index.ts:231-243):

```ts
  const regenKeywords = [
    'regenerate', 'redo', 'retry', 'change the', 'make it',
    'adjust', 'modify', 'update the', 'edit the', 'try again',
    'another version', 'new version', 'same but', 'tweak', 'redo this',
    'can you change', 'i want to change', 'different color',
    'different background', 'more vibrant', 'less', 'brighter', 'darker',
    'keep the same but', 'do it again', 'one more', 'change color',
    'change background', 'make the', 'add more', 'remove the',
  ];
```

Text-only (regeneration overrides it, supabase/functions/pixel-chat/index.ts:245-257):

```ts
  const textKeywords = [
    'explain', 'help', 'what is', 'how to', 'tell me', 'list',
    'describe in words', 'no image', 'text only', 'advice', 'suggest',
    'compare', 'analyze', 'what are', 'how do', 'why', 'when',
    'can you explain', 'what does', 'define', 'summarize', 'summary',
  ];
```

Video (supabase/functions/pixel-chat/index.ts:259-266) and the video post-type set (lines 530-535):

```ts
  const videoKeywords = [
    'video', 'reel', 'clip', 'animation', 'motion', 'footage', 'mp4',
    'animate', 'moving', 'cinematic', 'timelapse', 'time-lapse',
  ];
```

```ts
const VIDEO_POST_TYPES = new Set(['video', 'story', 'reel']);
```

Diagram (supabase/functions/pixel-chat/index.ts:268-277):

```ts
  const keywords = [
    'diagram', 'flowchart', 'flow chart', 'mindmap', 'mind map', 'roadmap',
    'road map', 'funnel', 'chart', 'decision tree', 'sequence', 'structure',
    'pipeline', 'process map', 'workflow', 'storyboard', 'shot list', 'timeline',
    'content calendar', 'layout blueprint', 'design spec',
  ];
```

Routing decision: video path when `!wantsTextOnly && !wantsDiagram && (isVideoPostType(selectedPostType) || detectVideoIntent(message))` (line 1058); image path when `!wantsTextOnly && !wantsDiagram` (line 1287); otherwise text chat (Step 6).

### 6. Attachment and reference-image instructions

Text/PDF attachments are wrapped with headers in the user message (text path only, supabase/functions/pixel-chat/index.ts:1038-1043):

```ts
  if (textAttachments.length > 0 || pdfAttachments.length > 0) {
    const attachmentText = [...pdfAttachments, ...textAttachments]
      .map((a: AttachmentContext) => `## REFERENCE ASSET: ${a.name} (${a.type})\n${a.content.slice(0, 30000)}`)
      .join('\n\n---\n\n');
    userContent = `${attachmentText}\n\n## PIXEL REQUEST\n${message}`;
  }
```

Image attachments become OpenAI vision `image_url` data-URL parts with `detail: 'high'` (supabase/functions/pixel-chat/index.ts:1045-1055); on the image path the same attachments are instead decoded into raw bytes as image-to-image sources (lines 1306-1314). Attachment content is NOT passed through `sanitizeForPrompt` and there is no "untrusted content" fence around it.

### 7. Untrusted-content fencing

The only injection defense is `sanitizeForPrompt` from supabase/functions/_shared/sanitize.ts:12-28, applied to Heart rule names/content and Brain chunk content:

```ts
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
```

Coverage gaps as implemented: Wishpedia `chunk.content` (supabase/functions/pixel-chat/index.ts:221-225), attachment content, conversation history, and the client-supplied `blueprint` fields are all interpolated unsanitized. Pixel has no fenced "the following is untrusted" delimiter blocks (the kind osha-chat gained in the SEC-03 pass per the project CLAUDE.md).

### 8. Output-format and canned response strings

- Image caption (hardcoded, the model writes no caption on the image path): `` `Here's the visual I created based on your brief.` `` (supabase/functions/pixel-chat/index.ts:1466).
- Video caption: `` `Here's the video I created based on your brief.` `` (line 1243).
- Image error: `'I encountered an error generating the image. I can provide a detailed art direction brief instead — just ask.'` (line 1497); video error equivalent at line 1278; text-chat error `'I encountered an error processing your request. Please try again.'` (line 1566).
- Compliance scan on text responses (supabase/functions/pixel-chat/index.ts:1559-1563): the code looks for `compliance: refused` / `**compliance:** refused` / `compliance: adjusted` substrings in the model output to set the audit `complianceStatus`. Notably, nothing in the hardcoded system prompt instructs the model to emit a `Compliance:` line, so this detection relies on behavior the prompt never requests (legacy artifact; reported as the code behaves).
- Token budgets: text chat uses `TOKEN_BUDGETS.CHAT_RESPONSE` = 8192, temperature 0.8 on OpenAI (lines 1529, 1546-1551); blueprint generation uses `TOKEN_BUDGETS.IMAGE_PROMPT` = 1024, temperature 0.85 (lines 882, 900-902; budget values in supabase/functions/_shared/token-budgets.ts:14,29).

### 9. Blueprint generation prompt (`generate-blueprint` action)

Triggered by the client with no parameters (`useGenerateBlueprintWithAI`, src/hooks/pixel/usePixelBlueprints.ts:86-106). The server fetches Heart rules and runs two fixed Brain searches (`'brand visual identity design style aesthetic'` and `'color palette typography mood lighting brand guidelines'`, supabase/functions/pixel-chat/index.ts:814-817), then builds (lines 832-864):

```ts
    const heartSection = heartRulesBP.length > 0
      ? `HEART RULES (mandatory — the blueprint MUST respect ALL of these):\n${heartRulesBP.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`
      : 'HEART RULES: No specific rules loaded. Default to strict, safe, brand-respectful visual direction.';

    const brainSection = brainContextBP.length > 0
      ? `BRAIN KNOWLEDGE (Fortun brand context — use this to make the blueprint brand-accurate):\n${brainContextBP.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}`
      : 'BRAIN KNOWLEDGE: No specific brand context retrieved. Generate a professional, premium, brand-appropriate visual blueprint.';

    const generationPrompt = `You are Pixel, the Visual Creator AI of Fortun Wishnet. Generate a creative, brand-accurate Visual Blueprint.

${heartSection}

${brainSection}

Generate ONE creative Visual Blueprint. It must:
- Be inspired by but not copy the brand knowledge above
- Respect ALL Heart rules strictly — they are absolute
- Feel fresh, professional, and visually distinctive
- Be immediately usable as a creative production recipe
- Be specific and actionable, not generic

Respond ONLY with valid JSON (no markdown code blocks, no explanation, just the raw JSON object):
{
  "name": "creative, specific blueprint name (3-6 words)",
  "description": "one sentence describing this blueprint's visual personality and use case",
  "format": "one of: social_post, story, carousel, deck_slide, banner, thumbnail, custom",
  "aspect_ratio": "one of: 1:1, 9:16, 16:9, 4:5, 4:3, 3:4, 21:9",
  "style_rules": "palette behavior, lighting style, texture intensity, mood, atmosphere — be specific",
  "composition_rules": "visual hierarchy approach, focal point strategy, whitespace usage, grid system",
  "typography_vibe": "type personality, weight range, hierarchy approach, pairing style — no specific font names",
  "element_rules": "icon style, border radius vibe, shadow intensity, grain overlay, decorative element approach",
  "negative_constraints": "what to never include in outputs using this blueprint — be specific"
}`;
```

On the OpenAI branch this is paired with a separate system message (supabase/functions/pixel-chat/index.ts:897):

```ts
              { role: 'system', content: 'You are a creative visual director AI. You respond only with valid JSON objects, no markdown, no code blocks.' },
```

On the Gemini branch the `generationPrompt` is sent as a single user turn with no system instruction (lines 875-889).

### 10. Assembly order

Text/diagram chat path (Step 6, supabase/functions/pixel-chat/index.ts:1505-1557):

1. `fetchHeartRules()` (line 993).
2. Brain retrieval: `searchBrain(message)` plus optional `searchBrain(lastAssistant.content.slice(0,500))`, deduped (lines 996-1015).
3. Intent flags computed (`wantsDiagram`, `wantsTextOnly`, lines 1018-1019).
4. `activeBlueprintStr` formatted from `body.blueprint` (lines 1022-1024).
5. `systemPrompt = buildPixelSystemPrompt(heartRules, brainContext, mode, settings, wantsDiagram, activeBlueprintStr, selectedPostType, selectedSize)` (lines 1026-1029). Internal section order inside the system prompt: identity line, SESSION MEMORY, CORE DIRECTIVE, OPERATING LAW, PLATFORM, TARGET FORMAT, VERBOSITY, HEART RULES, BRAIN, WISHPEDIA note, ACTIVE BLUEPRINT, VISUAL DEFAULTS, ENFORCEMENT, SAFETY, VOCABULARY & THEMES, DIAGRAM instruction, VISUAL BLUEPRINT SYSTEM, IDENTITY (lines 374-422).
6. `userContent` built: optional `## REFERENCE ASSET` blocks + `## PIXEL REQUEST` wrapper, then optional vision `image_url` parts (lines 1032-1055).
7. OpenAI message array: `[{role:'system', content: systemPrompt}, ...conversationHistory, {role:'user', content: userContent}]` (lines 1537-1541). Gemini: `system_instruction.parts[0].text = systemPrompt`, contents = history + final user text (image parts dropped on Gemini, lines 1514-1531).

Image path (Step 5b, lines 1286-1503): 1. same Heart + Brain retrieval; 2. `enrichMessageForRegeneration(message, conversationHistory)` (line 1294); 3. `buildPixelImagePrompt(...)` runs the extra `imageQuery` Brain search and `searchWishpedia`, then concatenates `userMessage + wishpediaSection + visualKnowledge + aestheticNote + blueprintNote + formatNote + heartConstraints + final Style line` (line 505); 4. source images gathered (attachments then Brain image URLs, max 4); 5. single prompt string sent to the image API. The chat system prompt is never sent here. Video path (Step 5a, lines 1057-1284) is identical through step 3, then sends the prompt to Sora/Veo.

### 11. Client-side prompt fragments

- **Request body**: `usePixelSend` posts `action:'chat'`, `message`, `mode`, `conversationHistory`, `attachments`, `blueprint`, `styleLock`, `lastBlueprintSummary`, `selectedPostType`, `selectedSize` (src/hooks/pixel/usePixelSend.ts:19-30). Note: `styleLock` and `lastBlueprintSummary` are declared in the edge function's `RequestBody` (supabase/functions/pixel-chat/index.ts:79-80) but never read anywhere in the function body; the client computes `lastBlueprintSummary` as the last assistant message sliced to 500 chars when style lock is on (src/components/pixel/PixelStudio.tsx:216-217), and the server silently discards it.
- **History annotations**: the client appends the exact bracket annotations the system prompt's SESSION MEMORY section describes (src/components/pixel/PixelStudio.tsx:182-189):

```ts
    const contextHistory = localMessages.map(m => {
      let content = m.content;
      if (m.is_image && m.image_url) content += `\n[Generated image: ${m.image_url}]`;
      if (m.is_video && m.video_url) content += `\n[Generated video: ${m.video_url}]`;
      if (m.attachments?.length) content += `\n[Attached files: ${m.attachments.map(a => a.name).join(', ')}]`;
      if (m.selected_post_type) content += `\n[Format: ${m.selected_post_type}${m.selected_size ? `, ${m.selected_size.width}x${m.selected_size.height}` : ''}]`;
      return { role: m.role as 'user' | 'assistant', content };
    });
```

- **Fallback message text**: if the user sends attachments with no text, the client substitutes `'Please analyze the attached file(s)'` as the message (src/components/pixel/PixelStudio.tsx:221) and shows `'(attached files)'` locally (line 169). Client-side error bubble: `"I'm having trouble processing your request. Please try again."` (lines 240-244).
- **Wishpedia reference images**: selected via WishReferencePanel, fetched client-side, base64-encoded, and sent as image attachments named `` `${ref.entryName}${ref.angle ? ` (${ref.angle})` : ''}` `` with `type: 'image/jpeg'` (src/components/pixel/PixelStudio.tsx:198-215), so they enter the edge function as ordinary `imageAttachments`.
- **Starter prompt templates**: the empty-state cards carry full prompt text per mode in `EMPTY_STAGE_CARDS` (src/components/pixel/pixelConstants.tsx:10-31), sent verbatim as the user message when clicked (src/components/pixel/PixelStudio.tsx:348). Quoted verbatim:

```tsx
export const EMPTY_STAGE_CARDS: Record<PixelMode, { icon: React.ReactNode; label: string; desc: string; prompt: string }[]> = {
  cross_platform: [
    { icon: <Globe className="h-5 w-5" />, label: 'Multi-Platform Pack', desc: 'Content for all platforms', prompt: 'Create a visual pack optimized for Facebook, Instagram, and TikTok for a brand launch. Adapt format and ratio per platform.' },
    { icon: <Zap className="h-5 w-5" />, label: 'Ad Creative', desc: 'Multi-format ad concepts', prompt: 'Generate 3 ad creative options for a product campaign adapted for all major social platforms.' },
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Brand Announcement', desc: 'Announce across channels', prompt: 'Create a brand announcement visual set for all platforms: Facebook post, Instagram feed, TikTok cover.' },
  ],
  facebook: [
    { icon: <Zap className="h-5 w-5" />, label: 'Facebook Ad', desc: 'Optimized ad creative', prompt: 'Create a Facebook ad visual for a product campaign. Format: 1:1 or 4:5. Include headline and CTA placement.' },
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Cover Photo', desc: 'Page cover image', prompt: 'Design a Facebook cover image for a brand page. Format: 16:9 (820×312). Professional and on-brand.' },
    { icon: <Film className="h-5 w-5" />, label: 'Facebook Story', desc: 'Engaging 9:16 story', prompt: 'Create a Facebook Story visual for a product drop. Format: 9:16. Engaging and thumb-stopping.' },
  ],
  instagram: [
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Feed Post', desc: '1:1 scroll-stopping visual', prompt: 'Create an Instagram feed post visual for a brand launch. Format: 1:1. On-brand, engaging, scroll-stopping.' },
    { icon: <Film className="h-5 w-5" />, label: 'Reel Cover', desc: 'Bold 9:16 thumbnail', prompt: 'Design a Reel cover thumbnail for a product reveal. Format: 9:16. Bold text overlay, eye-catching.' },
    { icon: <Layers className="h-5 w-5" />, label: 'Carousel', desc: '5-slide swipe story', prompt: 'Create a 5-slide Instagram carousel for a product feature. Format: 1:1. Consistent style, swipe-worthy.' },
  ],
  tiktok: [
    { icon: <Film className="h-5 w-5" />, label: 'Video Cover', desc: 'Trendy 9:16 thumbnail', prompt: 'Design a TikTok video cover for a product reveal. Format: 9:16. Bold, trendy, eye-catching thumbnail.' },
    { icon: <Zap className="h-5 w-5" />, label: 'Ad Creative', desc: 'Native-feeling ad', prompt: 'Create a TikTok ad creative for a brand campaign. Format: 9:16. Native-feeling, trend-aware.' },
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Profile Visual', desc: 'Bold brand identity', prompt: 'Design a TikTok profile banner/visual identity for a brand. Bold, modern, Gen-Z appeal.' },
  ],
};
```

- **Mode and format strings**: `mode` comes from `PixelMode` (`'facebook' | 'instagram' | 'tiktok' | 'cross_platform'`, src/components/pixel/PixelTopBar.tsx:10); `selectedPostType` ids and `selectedSize` objects come from `PLATFORM_POST_TYPES` (src/components/pixel/PixelControlPanel.tsx:24-76), e.g. ids `image_post`, `video`, `story`, `cover_photo`, `carousel`, `feed_post`, `reel`, `profile_photo`, `ad_creative` with pixel dimensions and ratios (`1.91:1`, `1:1`, `4:5`, `16:9`, `9:16`, `2.63:1`). These ids flow verbatim into the system prompt TARGET FORMAT section and the image prompt's CRITICAL TARGET FORMAT note. The server's `VIDEO_POST_TYPES` set (`video`, `story`, `reel`) routes some of these to video generation.
- **Optimize button**: the Wand2 button in PixelStudio rewrites the draft through the Promptor edge function (`useOptimizeDraft`, action `optimize-draft`) before sending; this uses Promptor's prompt stack, not Pixel's (src/components/pixel/PixelStudio.tsx:64-78, 509-517; src/hooks/promptor/useOptimizeDraft.ts UNVERIFIED in this pass, covered by the Promptor section).
- `MODE_PLACEHOLDERS` (src/components/pixel/pixelConstants.tsx:33-38) are textarea placeholders only; they are never sent to the model.

## X-4. Model usage

All model selection for Pixel happens server-side in `supabase/functions/pixel-chat/index.ts`. There is no per-user Pixel model override: the `PixelSettings` interface (supabase/functions/pixel-chat/index.ts:26-42) and the `pixel_settings` table fields it loads contain only style/behavior fields (`default_aesthetic`, `lighting`, `heart_strictness`, etc.), no model fields. The Pixel UI confirms this: `src/components/pixel/PixelSettings.tsx` only displays the globally configured models read-only:

```tsx
  const activeImageProvider = llmSettings?.active_image_provider || 'openai';
  const activeImageModel = activeImageProvider === 'gemini'
    ? (llmSettings?.gemini_image_model || 'gemini-2.5-flash-image')
    : (llmSettings?.openai_image_model || 'gpt-image-1');
```
(src/components/pixel/PixelSettings.tsx:32-35; line 100 renders the caption `Pixel always generates images by default. Configured globally in Settings.`)

### API key resolution (chat action)

DB-stored keys first, env secret fallback; 503 if neither exists (supabase/functions/pixel-chat/index.ts:982-990):

```ts
  const openaiKey = llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY') || '';
  const geminiKey = llmSettings?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';

  if (!openaiKey && !geminiKey) {
    return new Response(JSON.stringify({ error: 'No AI provider configured. Ask an admin to configure LLM settings.' }), {
      status: 503,
```

The same pattern repeats for the `generate-blueprint` action at lines 797-798 (`openaiKeyBP`/`geminiKeyBP`).

### Image model resolution and dispatch

Pixel uses the global Active Provider Selection from `llm_settings` (supabase/functions/pixel-chat/index.ts:1288-1292):

```ts
    // Use global Active Provider Selection for image generation
    const imageProvider = llmSettings?.active_image_provider || 'openai';
    const imageModel = imageProvider === 'gemini'
      ? (llmSettings?.gemini_image_model || 'gemini-2.5-flash-image')
      : (llmSettings?.openai_image_model || 'gpt-image-1');
```

Dispatch is a two-way branch only (`if (imageProvider === 'gemini') { ... } else { /* OpenAI */ }`, lines 1330 and 1370). **There is no fal branch anywhere in pixel-chat** (a grep for `fal` in the file matches only the words "fallback"/"falling back"). Consequence: if an admin sets `llm_settings.active_image_provider = 'fal'` (which the Settings UI allows, see below), Pixel silently falls into the OpenAI `else` branch, calling OpenAI endpoints with `openai_image_model` and the OpenAI key. fal is selectable globally but unreachable from Pixel.

OpenAI image dispatch, including the edits-to-generations fallback (supabase/functions/pixel-chat/index.ts:1370-1401):

```ts
      } else {
        if (!openaiKey) throw new Error('OpenAI API key not configured.');
        const openaiSize = mapSizeToOpenAI(selectedSize);
        const runGeneration = () => fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: imageModel, prompt: imagePrompt, n: 1, size: openaiSize }),
        });

        let imageRes: Response;
        if (sourceImages.length > 0) {
          // Image-to-image (recreate / combine) via /v1/images/edits — multipart, image[].
          const form = new FormData();
          form.append('model', imageModel);
          form.append('prompt', imagePrompt);
          form.append('n', '1');
          if (openaiSize) form.append('size', openaiSize);
          sourceImages.forEach((src, i) => {
            form.append('image[]', new File([src], `source_${i}.png`, { type: 'image/png' }));
          });
          imageRes = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: form,
          });
          if (!imageRes.ok) {
            console.error('Pixel image edit failed, falling back to text-to-image:', await imageRes.text());
            imageRes = await runGeneration();
          }
        } else {
          imageRes = await runGeneration();
        }
```

Gemini image dispatch (supabase/functions/pixel-chat/index.ts:1330-1369) posts to `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=...` with the prompt plus `inlineData` source images, and has a model-specific body shape with one hardcoded model string:

```ts
        if (imageModel === 'gemini-2.5-flash-image') {
          // Standard body, no responseModalities needed
          if (geminiAspect) {
            geminiBody.generationConfig = { aspectRatio: geminiAspect };
          }
        } else {
          const genConfig: any = { responseModalities: ['TEXT', 'IMAGE'] };
          if (geminiAspect) genConfig.aspectRatio = geminiAspect;
          geminiBody.generationConfig = genConfig;
        }
```
(supabase/functions/pixel-chat/index.ts:1345-1354)

### Video model resolution

Lines 1058-1062 of supabase/functions/pixel-chat/index.ts:

```ts
  if (!wantsTextOnly && !wantsDiagram && (isVideoPostType(selectedPostType) || detectVideoIntent(message))) {
    const videoProvider = llmSettings?.active_video_provider || 'openai';
    const videoModel = videoProvider === 'gemini'
      ? (llmSettings?.gemini_video_model || 'veo-3.1-generate-preview')
      : (llmSettings?.openai_video_model || 'sora-2');
```

Routing is `if (videoProvider === 'openai') ... else if (videoProvider === 'gemini') ... else { throw new Error(`Unsupported video provider: ${videoProvider}`); }` (lines 1074, 1128, 1188-1190). So `active_video_provider = 'fal'` makes every Pixel video request throw (caught and converted to a friendly text reply, see next section), even though the model fallback on line 1062 would have resolved to `openai_video_model || 'sora-2'`.

### Text-chat model resolution (Step 6 fallback path)

supabase/functions/pixel-chat/index.ts:1506-1510:

```ts
  const useGemini = !openaiKey && !!geminiKey;
  let responseContent = '';
  let complianceStatus = 'pass';
  const llmProvider = useGemini ? 'gemini' : 'openai';
  const llmModel = useGemini ? (llmSettings?.gemini_text_model || 'gemini-1.5-pro') : (llmSettings?.openai_text_model || 'gpt-4o');
```

Note: text chat ignores any `active_text_provider` style setting; OpenAI is used whenever an OpenAI key exists. The Gemini fallback default here is the stale `'gemini-1.5-pro'`, which differs from both the blueprint action's default (`'gemini-2.5-flash'`, line 869) and the client default `DEFAULT_GEMINI_TEXT_MODEL = 'gemini-2.5-flash'` (src/config/llmModels.ts:136).

### Temperature and token budgets

- Text chat (OpenAI): `max_tokens: TOKEN_BUDGETS.CHAT_RESPONSE, temperature: 0.8` (supabase/functions/pixel-chat/index.ts:1549-1550). Gemini text chat: `generationConfig: { maxOutputTokens: TOKEN_BUDGETS.CHAT_RESPONSE }` with no temperature set (line 1529).
- `generate-blueprint`: `temperature: 0.85, max_tokens: TOKEN_BUDGETS.IMAGE_PROMPT` for OpenAI plus `response_format: { type: 'json_object' }` (lines 900-902); Gemini `generationConfig: { temperature: 0.85, maxOutputTokens: TOKEN_BUDGETS.IMAGE_PROMPT }` (line 882).
- Budget values, from `supabase/functions/_shared/token-budgets.ts`:

```ts
  /** Standard chat response (Osha, Pixel text mode, ai-chat) */
  CHAT_RESPONSE: 8192,
...
  /** Image prompt generation (Pixel prompt-building step) */
  IMAGE_PROMPT: 1024,
```
(supabase/functions/_shared/token-budgets.ts:13-14, 28-29)

- Image and video calls send no temperature/quality parameters; `n` is hardcoded to `1` everywhere (lines 1083, 1376, 1385) and Veo uses `sampleCount: 1` (line 1140).

### Allowlists / capability lists

pixel-chat has **no model capability allowlists**: whatever string sits in `llm_settings.*_model` is sent to the provider. This contrasts with `supabase/functions/ai-chat/index.ts`, which gates every model (`OPENAI_VIDEO_CAPABLE = ['sora-2', 'sora-2-pro']` line 33, `GEMINI_VIDEO_CAPABLE = ['veo-3.1-generate-preview']` line 38, `FAL_IMAGE_CAPABLE`/`FAL_VIDEO_CAPABLE` lines 41-42).

### Every hardcoded model string in pixel-chat

| String | Location (supabase/functions/pixel-chat/index.ts) | Role |
|---|---|---|
| `text-embedding-3-small` | 112 | embeddings for all Brain/Wishpedia retrieval (OpenAI only) |
| `gemini-2.5-flash` | 869 | blueprint text default (Gemini) |
| `gpt-4o` | 870, 1510 | blueprint + chat text default (OpenAI) |
| `gemini-1.5-pro` | 1510 | chat text default (Gemini) |
| `veo-3.1-generate-preview` | 1061 | video default (Gemini) |
| `sora-2` | 1062 | video default (OpenAI) |
| `gemini-2.5-flash-image` | 1291, 1345 | image default (Gemini) + request-shape branch |
| `gpt-image-1` | 1292 (also size comment at 511) | image default (OpenAI) |

### User-selectable models that affect Pixel

Admins choose the models in the global LLM settings page, fed by `src/config/llmModels.ts`: `OPENAI_IMAGE_MODELS` (`gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`, lines 31-35), `GEMINI_IMAGE_MODELS` (`gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`, lines 53-57), `OPENAI_VIDEO_MODELS` (`sora-2`, `sora-2-pro`, lines 38-41), `GEMINI_VIDEO_MODELS` (`veo-3.1-generate-preview`, lines 60-62), plus text models. The active-provider selectors at `src/components/settings/LLMProvidersSettings.tsx:465-500` offer `openai`, `gemini`, **and `fal`** for both Image and Video generation; as shown above, Pixel ignores fal for images and errors on fal for video. The `llm_settings` columns involved (`active_image_provider`, `active_video_provider`, `openai_image_model`, `gemini_image_model`, `openai_video_model`, `gemini_video_model`) exist in `src/integrations/supabase/types.ts:580-595` and the client whitelist `src/hooks/useLLMSettings.ts:37-52`.

## X-5. Canon and validation logic

Scope note: the file inventory in the briefing lists `supabase/functions/pixel-chat/index.ts` as 1409 lines and `supabase/functions/promptor/index.ts` as 610 lines. The actual files on this branch are **1,595 lines** (pixel-chat) and **692 lines** (promptor) per `wc -l` (one more each in editors counting the final newline); all line numbers below refer to the actual files.

### Classification summary (honest assessment)

| Mechanism | Where | Classification |
|---|---|---|
| Heart rules (heart_rules table) | `supabase/functions/pixel-chat/index.ts:87-105`, `332-334`, `389-395`, `484-493`, `832-834` | **Prompt-level instruction only.** Rules are fetched and interpolated into LLM prompts. No code path checks an output against a rule. |
| Rule selection for image prompts | `supabase/functions/pixel-chat/index.ts:486-491` | **String matching** (keyword filter chooses WHICH rules go in the image prompt; enforcement of those rules is still prompt-level). |
| Wishpedia visual canon (server retrieval) | `supabase/functions/pixel-chat/index.ts:170-229`, `340-343`, `467-482` | **Prompt-level instruction only.** Reference image URLs are injected as plain text into the image-generation prompt; the image model cannot fetch URLs, so this is descriptive grounding at best. |
| Wishpedia visual canon (client references) | `src/components/pixel/WishReferencePanel.tsx`, `src/components/pixel/PixelStudio.tsx:198-215` | **Real pixel-level input conditioning** (actual image bytes are sent and used as image-to-image sources), but still no validation of the output. |
| Brain image references (image-to-image) | `supabase/functions/pixel-chat/index.ts:143-163`, `1301-1325`, `1380-1398` | **Real pixel-level input conditioning** (Brain images downloaded server-side and passed to `/v1/images/edits` or Gemini inline). |
| Blueprints | `supabase/functions/pixel-chat/index.ts:360-362`, `409-417`, `497-499`, `790-928`; `src/components/pixel/PixelBlueprintPanel.tsx:176-194` | **Prompt-level instruction only.** Free-text visual rules injected into prompts. |
| pixel_settings vocab/theme blocks, strictness, refusal style | `supabase/functions/pixel-chat/index.ts:320-330`, `345-358`, `400-407` | **Prompt-level instruction only**, and (see below) the vocab/theme blocks reach ONLY the text-chat path, not the image or video prompt. |
| Post-generation validation of generated images against Heart/canon | n/a | **ABSENT.** Only technical checks exist (result host allowlist, 20MB cap, video blob sanity). Compliance is hardcoded `'pass'` for every generated image and video. |
| Text-path compliance detection | `supabase/functions/pixel-chat/index.ts:1559-1563` | **String matching on the model's own self-report** (looks for "compliance: refused"/"adjusted" in the response text). |
| Route access gate | `src/app/(protected)/ai-agents/pixel/page.tsx:9` (`<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pixel">`) | Rule-based access control (permission gate, not canon enforcement). |

### 1. Heart rules fetch (pixel-chat), verbatim

`supabase/functions/pixel-chat/index.ts:87-105`:

```ts
async function fetchHeartRules(supabaseAdmin: ReturnType<typeof createClient>): Promise<{ name: string; content: string; priority: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"pixel"}');

  if (error) {
    console.error('Heart rules fetch error:', error);
    return [];
  }

  // AGENT-003: sanitize rule content before prompt interpolation
  return (data || []).map((r: any) => ({
    name: sanitizeForPrompt(r.name),
    content: sanitizeForPrompt(r.rule_content),
    priority: r.priority,
  }));
}
```

Notes:
- Uses the **service-role client** (`supabaseAdmin`, created at `supabase/functions/pixel-chat/index.ts:577`), so the read bypasses RLS.
- Fetches ALL active rules that are global or assigned to `pixel`; there is no similarity filter, no `ORDER BY` (rules are injected in default return order, not priority order), and no use of `heart_categories`.
- On error it silently returns `[]`, and the prompt then falls back to the "No specific Heart rules loaded" default (line 334), i.e. a fetch failure degrades to zero enforced rules without surfacing an error.
- Called as the mandatory Step 1 of chat at line 993 (`const heartRules = await fetchHeartRules(supabaseAdmin);`) and again for `generate-blueprint` at line 808.
- `sanitizeForPrompt` is the shared prompt-injection scrubber from `supabase/functions/_shared/sanitize.ts:12-28` (strips system/user/assistant tags, triple backticks, "ignore previous instructions"-style phrases).

### 2. Heart injection into the chat system prompt, verbatim

`supabase/functions/pixel-chat/index.ts:332-334` (inside `buildPixelSystemPrompt`):

```ts
  const heartSection = heartRules.length > 0
    ? `## MANDATORY HEART RULES — ABSOLUTE, ALWAYS TAKE PRECEDENCE\n${heartRules.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}\n\n`
    : `## HEART RULES\nNo specific Heart rules loaded. Default to strict, safe, brand-respectful visual direction.\n\n`;
```

And the operating law that frames it, `supabase/functions/pixel-chat/index.ts:389-395`:

```ts
## OPERATING LAW (mandatory — follow in this exact order every response)
1. Heart rules are ABSOLUTE. They always win over Brain knowledge, user requests, and your own creativity.
2. Brain knowledge is authoritative Fortun visual identity and brand context. Use it to make outputs brand-accurate.
3. Wishpedia entries are the CANONICAL visual reference for Fortun universe characters, creatures, and objects.
4. If Heart and Brain conflict, Heart wins.
5. Never invent Heart rules or Fortun canon. If retrieval returns nothing relevant, default to strict, safe, brand-respectful visual direction.
6. If uncertain whether output is Heart-compliant, produce the safest compliant visual output and ask the user for missing constraints.
```

Strictness/refusal behavior is also purely instructional, driven by `pixel_settings.heart_strictness` and `refusal_style`, `supabase/functions/pixel-chat/index.ts:320-330`:

```ts
  const strictnessInstructions: Record<string, string> = {
    enforce_and_propose: 'If a request violates Heart rules: refuse the violating part, explain briefly, and propose a compliant visual alternative.',
    enforce_and_redirect: 'If a request violates Heart rules: refuse firmly and redirect to what visual help you can offer.',
    always_enforce: 'Always enforce Heart rules strictly. Refuse any non-compliant request without exception.',
  };

  const refusalStyles: Record<string, string> = {
    soft: 'When refusing, use gentle, encouraging language.',
    neutral: 'When refusing, use clear, professional language.',
    firm: 'When refusing, use direct, firm language.',
  };
```

**Important gap:** this system prompt (including the vocabulary/theme blocks built at lines 345-350 and emitted at line 407) is only used in the **text-chat fallback path** (Step 6, lines 1505-1557). The image and video generation calls do not use the system prompt at all; they use only the string returned by `buildPixelImagePrompt`. Consequently `pixel_settings.blocked_vocabulary` and `blocked_themes` are never present in any image or video generation prompt (verified: `buildPixelImagePrompt`, lines 425-506, contains no reference to `allowed_vocabulary`, `blocked_vocabulary`, `allowed_themes`, or `blocked_themes`).

### 3. Heart injection into the image/video prompt, verbatim (keyword-filtered)

`supabase/functions/pixel-chat/index.ts:484-493` (inside `buildPixelImagePrompt`, used for both image and video prompts via lines 1295-1299 and 1065-1069):

```ts
  let heartConstraints = '';
  if (heartRules.length > 0) {
    const visualKeywords = ['brand', 'visual', 'image', 'color', 'style', 'logo', 'content', 'appropriate', 'safe', 'guideline', 'identity', 'design', 'illustration', 'character', 'art'];
    const relevant = heartRules.filter(r => {
      const text = `${r.name} ${r.content}`.toLowerCase();
      return visualKeywords.some(kw => text.includes(kw));
    });
    const rulesForConstraints = relevant.length > 0 ? relevant : heartRules.slice(0, 5);
    heartConstraints = `\n\nBRAND COMPLIANCE CONSTRAINTS:\n${rulesForConstraints.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`;
  }
```

This is the only "logic" applied to Heart rules anywhere in Pixel: a case-insensitive substring match over 15 keywords to pick which rules to append to the image prompt. If no rule matches, only the **first 5 rules in arbitrary order** are appended; the rest are dropped from the image prompt entirely. The final prompt assembly is line 505:

```ts
  return `${userMessage}${wishpediaSection}${visualKnowledge}${aestheticNote}${blueprintNote}${formatNote}${heartConstraints}\n\nStyle: creative, high-quality digital art, brand-consistent, appropriate for all audiences, ${settings.default_aesthetic} aesthetic.`;
```

### 4. Wishpedia visual canon

**4a. Prompt directive** (system prompt, text path only), `supabase/functions/pixel-chat/index.ts:340-343`:

```ts
  const wishpediaNote = `## WISHPEDIA — FORTUN UNIVERSE VISUAL CANON
Wishpedia entries are the authoritative source for Fortun universe characters, creatures, and objects.
When generating images involving any Fortun character or entity, ALWAYS use Wishpedia descriptions and reference images as the canonical visual source.
If Wishpedia image URLs are provided in the prompt context, use them as the definitive visual reference for that character's appearance, proportions, colors, and design details.\n\n`;
```

**4b. Server-side retrieval and injection into the image prompt**, `supabase/functions/pixel-chat/index.ts:170-229` (retrieval) and `467-482` (injection):

```ts
async function searchWishpedia(
  supabaseAdmin: ReturnType<typeof createClient>,
  query: string,
  openaiKey: string,
  supabaseUrl: string,
): Promise<{ name: string; content: string; imageUrls: { angle: string; url: string }[] }[]> {
  const embedding = await generateEmbedding(query, openaiKey);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
    filter_source_types: ['wishpedia_entry'],
  });
```

```ts
  // Build Wishpedia visual references section
  let wishpediaSection = '';
  if (wishpediaResults.length > 0) {
    const entryParts = wishpediaResults.map(entry => {
      const lines = [`CHARACTER: ${entry.name}`, entry.content.trim()];
      if (entry.imageUrls.length > 0) {
        lines.push('REFERENCE IMAGES:');
        entry.imageUrls.forEach(img => {
          lines.push(`  - ${img.angle}: ${img.url}`);
        });
      }
      return lines.join('\n');
    });
    wishpediaSection = `\n\nWISHPEDIA VISUAL REFERENCES — USE THESE AS CANONICAL CHARACTER DESIGNS:\n${entryParts.join('\n---\n')}`;
    console.log(`Injected ${wishpediaResults.length} Wishpedia reference(s) into image prompt`);
  }
```

Honest assessment of 4b: the image URLs end up as **plain text inside the prompt string sent to `/v1/images/generations`, `/v1/images/edits`, Sora, or Gemini**. None of these APIs dereference URLs in prompt text, so the server-retrieved Wishpedia images are NOT actually seen by the image model; only the text description (`entry.content`) and the URL strings are. The edge function never downloads Wishpedia images as image-to-image sources (the `sourceImages` collection at lines 1301-1325 only pulls from `imageAttachments` and Brain image chunks). Also note: unlike `searchBrain` (line 161, `sanitizeForPrompt(d.content)`), `searchWishpedia` pushes `content: chunk.content` UNSANITIZED at line 223.

The image-URL fallback at lines 208-219 builds URLs from `wishpedia_entry_images.original_name`:

```ts
      imageUrls = (images || []).map((img: any) => ({
        angle: img.angle || 'unknown',
        url: `${supabaseUrl}/storage/v1/object/public/wishpedia-media/${chunk.source_id}/${img.original_name}`,
      }));
```

This diverges from the actual upload path (`src/hooks/useWishpediaImages.ts:47`: `const storagePath = ${entryId}/${Date.now()}_${sanitized};`), so fallback URLs point at non-existent objects whenever `metadata.image_urls` is missing. The primary path uses `metadata.image_urls` written by `supabase/functions/process-embeddings/index.ts:624-630, 674-681`, which correctly uses `img.storage_path`.

**4c. Client-side WishReference flow (the path that actually delivers pixels).** `src/components/pixel/WishReferencePanel.tsx:14-20` defines `WishpediaImageRef` and the panel lets the user multi-select Wishpedia entries (cap of 5 images, line 35: `const MAX_TOTAL_IMAGES = 5;`). `src/components/pixel/PixelStudio.tsx:198-215` then converts each selected reference to base64 and ships it as an image attachment:

```ts
    // Wishpedia reference images → base64
    for (const ref of wishpediaImageRefs) {
      try {
        const resp = await fetch(ref.publicUrl);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        if (blob.size > 3 * 1024 * 1024) { toast.warning(`${ref.entryName} image too large (>3MB), skipped`); continue; }
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
          reader.readAsDataURL(blob);
        });
        const label = `${ref.entryName}${ref.angle ? ` (${ref.angle})` : ''}`;
        attachmentsCtx.push({ name: label, type: 'image/jpeg', content: base64, isImage: true });
      } catch {
        // Skip failed fetches silently
      }
    }
```

On the edge, those arrive as `imageAttachments` and become real image-to-image sources, `supabase/functions/pixel-chat/index.ts:1301-1325`:

```ts
    // Image-to-image source(s) (Fortun-owned): selected reference images + retrieved
    // Brain images. Multiple sources let Pixel combine/recreate characters and scenes.
    const sourceImages: Uint8Array[] = [];
    const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5MB per source image
    try {
      for (const att of imageAttachments) {
        if (att.content && sourceImages.length < 4) {
          const bin = atob(att.content);
          if (bin.length > MAX_SOURCE_BYTES) continue;
          const u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          sourceImages.push(u);
        }
      }
      const brainImgUrls = [...new Set((brainContext as { content: string; imageUrl?: string }[]).map(c => c.imageUrl).filter(Boolean) as string[])];
      for (const url of brainImgUrls) {
        if (sourceImages.length >= 4) break;
        const r = await fetch(url);
        if (!r.ok) continue;
        const buf = await r.arrayBuffer();
        if (buf.byteLength <= MAX_SOURCE_BYTES) sourceImages.push(new Uint8Array(buf));
      }
    } catch {
      // fall back to text-to-image
    }
```

With sources present, OpenAI goes through `/v1/images/edits` (multipart `image[]`, lines 1380-1394) with a fallback to plain `/v1/images/generations` if the edit is rejected (lines 1395-1398); Gemini gets `inlineData` parts (lines 1336-1341). So visual canon "enforcement" via Wishpedia is real conditioning only when the user manually selects references in the WishReference panel; the automatic server-side Wishpedia retrieval contributes text only.

### 5. Blueprints as visual rules

`pixel_blueprints` rows encode visual rules as free text: `composition_rules`, `style_rules`, `typography_vibe`, `element_rules`, `negative_constraints` (schema in `supabase/migrations/20260218022637_d6a7deff-ee9d-48d9-a846-27e194c4f6c5.sql:97-114`, edited via `src/components/pixel/PixelBlueprintPanel.tsx:177-183`). They are injected in two places, both purely instructional:

- System prompt (text path), `supabase/functions/pixel-chat/index.ts:1022-1024` and `360-362`:

```ts
  const activeBlueprintStr = body.blueprint
    ? `Name: ${body.blueprint.name}\nFormat: ${body.blueprint.format || 'unspecified'}\nAspect Ratio: ${body.blueprint.aspect_ratio || '1:1'}\nComposition: ${body.blueprint.composition_rules || ''}\nStyle: ${body.blueprint.style_rules || ''}\nTypography: ${body.blueprint.typography_vibe || ''}\nElements: ${body.blueprint.element_rules || ''}\nAvoid: ${body.blueprint.negative_constraints || ''}`
    : undefined;
```

- Image/video prompt, `supabase/functions/pixel-chat/index.ts:497-499`:

```ts
  const blueprintNote = blueprint
    ? `\n\nBLUEPRINT: ${blueprint.name}\nFormat: ${blueprint.format || 'unspecified'} | Aspect: ${blueprint.aspect_ratio || '1:1'}\nStyle: ${blueprint.style_rules || ''}\nComposition: ${blueprint.composition_rules || ''}\nTypography: ${blueprint.typography_vibe || ''}\nAvoid: ${blueprint.negative_constraints || ''}`
    : '';
```

Note the image-prompt injection drops `element_rules`, and both drop `palette` and `export_specs` (see orphaned columns, below). The AI blueprint generator (`generate-blueprint`, lines 790-928) does build its generation prompt with Heart rules marked mandatory, `supabase/functions/pixel-chat/index.ts:832-834`:

```ts
    const heartSection = heartRulesBP.length > 0
      ? `HEART RULES (mandatory — the blueprint MUST respect ALL of these):\n${heartRulesBP.map(r => `- [${r.priority.toUpperCase()}] ${r.name}: ${r.content}`).join('\n')}`
      : 'HEART RULES: No specific rules loaded. Default to strict, safe, brand-respectful visual direction.';
```

But the generated blueprint JSON is returned to the client as-is (line 925) with no validation of its content against the rules.

### 6. Post-generation validation: ABSENT for canon, technical-only otherwise

There is **no post-generation validation of generated images or videos against Heart rules, Brain canon, or Wishpedia canon anywhere in the codebase**. No moderation API call, no vision-model compliance check, no pixel comparison against reference images. What does exist:

- Image path technical checks only (result-host allowlist + 20MB cap), `supabase/functions/pixel-chat/index.ts:1407-1417`:

```ts
          // SEC-04: validate host + cap size before buffering the upstream image
          const u = new URL(imageResult.url);
          if (u.protocol !== 'https:' || !(u.hostname === 'api.openai.com' || u.hostname.endsWith('.blob.core.windows.net') || u.hostname.endsWith('.oaiusercontent.com'))) {
            throw new Error('Unexpected image result host');
          }
```

- Video path technical sanity check only (is it actually video bytes), lines 1194-1207:

```ts
      // Validate that the blob is actually video data, not an error response
      {
        const validationBytes = new Uint8Array(await videoBlob.arrayBuffer());
        const firstChars = new TextDecoder().decode(validationBytes.slice(0, 50)).trim();
        if (firstChars.startsWith('{') || firstChars.startsWith('<') || firstChars.startsWith('<!')) {
          console.error('Video blob contains non-video data:', firstChars.slice(0, 100));
          throw new Error('Video generation failed: received an error response instead of video data');
        }
        if (videoBlob.size < 1000) {
          throw new Error('Video generation produced an invalid or empty output');
        }
```

- Every image and video is audit-logged with a **hardcoded** `compliance_status: 'pass'`, e.g. the image path at lines 1474-1485:

```ts
      if (settings.internal_audit_logging) {
        await supabaseAdmin.from('osha_audit_logs').insert({
          user_id: userId,
          message_id: assistantMsg?.id || null,
          heart_rules_used: heartRules,
          brain_chunks_used: brainContext.length,
          compliance_status: 'pass',
          compliance_notes: `Pixel: image generated via ${imageProvider}/${imageModel}`,
          retrieval_ms: retrievalMs,
          llm_provider: imageProvider,
          llm_model: imageModel,
        });
      }
```

- The only "compliance detection" in the whole function is string matching on the text-mode model output (the model grading itself), lines 1559-1563:

```ts
    if (responseContent.toLowerCase().includes('compliance: refused') || responseContent.toLowerCase().includes('**compliance:** refused')) {
      complianceStatus = 'refused';
    } else if (responseContent.toLowerCase().includes('compliance: adjusted') || responseContent.toLowerCase().includes('**compliance:** adjusted')) {
      complianceStatus = 'adjusted';
    }
```

The client surfaces `heartCount` / `brainCount` / `complianceStatus` from the response `audit` object in `src/components/pixel/PixelContextPanel.tsx:99-105` and `src/components/pixel/PixelHeader.tsx:15,25`. These are display counters, not enforcement.

### 7. Comparison with Promptor's Heart-rules code: duplicated and divergent, not shared

There is **no shared heart-rules module**. Each edge function carries its own copy; the only shared piece is `sanitizeForPrompt` from `supabase/functions/_shared/sanitize.ts`. Promptor's fetch is inlined in the handler, `supabase/functions/promptor/index.ts:471-487`:

```ts
    const [heartRulesData, brainResult] = await Promise.all([
      // Heart: fetch ALL active global rules directly — no similarity filter, rules always apply
      supabaseAdmin
        .from('heart_rules')
        .select('id, name, category, rule_content, priority, is_global, assigned_agents, is_active')
        .eq('is_active', true)
        .or('is_global.eq.true,assigned_agents.cs.{"promptor"}'),
      // Brain: semantic search with a lower threshold for better recall
      queryKnowledge(supabaseUrl, serviceKey, contextQuery, ['brain_document', 'wishpedia_entry'], depthLimit),
    ]);

    // AGENT-003: sanitize rule content before prompt interpolation
    const heartRules = (heartRulesData.data || []).map((r: any) => ({
      content: sanitizeForPrompt(r.rule_content),
      source: { name: sanitizeForPrompt(r.name), category: r.category, priority: r.priority },
    }));
```

Diff vs Pixel's `fetchHeartRules` (`supabase/functions/pixel-chat/index.ts:87-105`):

| Aspect | pixel-chat (87-105) | promptor (471-487) | Verdict |
|---|---|---|---|
| Query filter | `.eq('is_active', true).or('is_global.eq.true,assigned_agents.cs.{"pixel"}')` | `.eq('is_active', true).or('is_global.eq.true,assigned_agents.cs.{"promptor"}')` | Same pattern, different agent key |
| Selected columns | `name, rule_content, priority, is_global, assigned_agents, is_active` | `id, name, category, rule_content, priority, is_global, assigned_agents, is_active` (adds `id`, `category`) | Divergent |
| Result shape | `{ name, content, priority }` | `{ content, source: { name, category, priority } }` | Divergent |
| Structure | Named helper function | Inline in `Promise.all` | Divergent |
| Sanitization | `sanitizeForPrompt` on name + content | `sanitizeForPrompt` on name + content | Identical |
| Prompt injection format | `- [PRIORITY] Name: content` under `## MANDATORY HEART RULES — ABSOLUTE, ALWAYS TAKE PRECEDENCE` (line 333) | `- [Name] content` under `## MANDATORY HEART RULES (always override everything else)` (promptor lines 211-216); priority is fetched but NOT rendered | Divergent |
| Downstream filtering | Keyword filter for image prompts (lines 486-491) | None | Divergent |
| Persistence of rules used | `osha_audit_logs.heart_rules_used` only | `promptor_runs.heart_rules_used` (line 624) AND `osha_audit_logs` (lines 652-662) | Divergent |

Conclusion: **duplicated logic with the same query pattern but divergent column sets, shapes, and prompt formats**. A change to Heart semantics requires touching each agent function separately.

## X-6. Database footprint

### Tables touched by the pixel-chat edge function

| Table | Access | Client used (RLS?) | Where |
|---|---|---|---|
| `heart_rules` | SELECT | service role (RLS bypassed) | `supabase/functions/pixel-chat/index.ts:88-92` |
| `knowledge_embeddings` | SELECT (via `match_knowledge` RPC) | service role | lines 131-136 (`searchBrain`), 179-184 (`searchWishpedia`) |
| `wishpedia_entry_images` | SELECT (image fallback) | service role | lines 209-213 |
| `pixel_settings` | SELECT / INSERT / UPDATE | user-scoped client (RLS enforced) | lines 610-627 (get), 630-671 (save), 947-951 (chat load) |
| `pixel_messages` | INSERT / DELETE | user-scoped client (RLS enforced) | inserts at 1245-1248 (video), 1468-1471 (image), 1571-1574 (text); delete-all at 674-690 (`clear-history`) |
| `pixel_blueprints` | SELECT / INSERT / UPDATE / DELETE | user-scoped client (RLS enforced) | 693-710 (get), 713-759 (save/update), 762-787 (delete) |
| `llm_settings` | SELECT | service role | lines 791-795 (`generate-blueprint`), 976-980 (chat). Columns read: `openai_api_key`, `gemini_api_key`, `openai_text_model`, `gemini_text_model`, `active_image_provider`, `openai_image_model`, `gemini_image_model`, `active_video_provider`, `openai_video_model`, `gemini_video_model` (lines 797-798, 868-870, 982-983, 1059-1062, 1289-1292, 1510) |
| `sectors` | SELECT + INSERT (auto-creates a "Pixel AI" sector, color `#EC4899`) | user-scoped client | lines 1222-1227 (video), 1445-1450 (image) |
| `files` | INSERT (registers generated media in the Files Manager) | user-scoped client | lines 1229-1237 (video), 1452-1460 (image). Columns: `user_id, name, original_name, storage_path, mime_type, size, sector_id` |
| `osha_audit_logs` | INSERT (shared cross-agent audit table; name is a legacy artefact, per the AGENT-008 comment at lines 1250-1253) | service role | lines 1255-1265, 1475-1485, 1578-1588. Columns written: `user_id, message_id, heart_rules_used (jsonb), brain_chunks_used, compliance_status, compliance_notes, retrieval_ms, llm_provider, llm_model` |

The chat RPC `match_knowledge` is the hybrid vector+BM25 function over `knowledge_embeddings` (called with `query_text` in `searchBrain` line 133, without it in `searchWishpedia` lines 179-184, so Wishpedia retrieval is pure vector).

### Tables touched by Pixel client code

| Table | Access | Where |
|---|---|---|
| `pixel_messages` | SELECT (full history per user), DELETE (single message) | `src/hooks/pixel/usePixelMessages.ts:17-23` (select), `66-72` (delete) |
| `pixel_settings` | via edge actions `get-settings` / `save-settings` only | `src/hooks/pixel/usePixelSettings.ts:21-31, 44-50` |
| `pixel_blueprints` | via edge actions `get-blueprints` / `save-blueprint` / `delete-blueprint` / `generate-blueprint` only | `src/hooks/pixel/usePixelBlueprints.ts` |
| `wishpedia_entries` | SELECT (entry picker, archived filtered) | `src/hooks/useWishpediaEntries.ts:32-37`, consumed by `src/components/pixel/WishReferencePanel.tsx:108` |
| `wishpedia_entry_images` | SELECT (per selected entry) | `src/hooks/useWishpediaImages.ts:18-24`, consumed via `EntryImageLoader` in `src/components/pixel/WishReferencePanel.tsx:37-90` |
| `brain_documents` | INSERT (save generated image to Brain) | `src/components/pixel/SavePixelToBrainDialog.tsx:86-100`. Columns: `section_id, name, original_name, storage_path, mime_type, size, category, description, restricted_agents` |
| `brain_sections`, `brain_categories` | SELECT (destination/category pickers) | `src/components/pixel/SavePixelToBrainDialog.tsx:29-30` via `useBrainSections` / `useBrainCategories` |
| `knowledge_embeddings` | written indirectly via the `process-ocr` edge function after save-to-brain (`runOcr({ documentId, storagePath, mimeType })`, `src/components/pixel/SavePixelToBrainDialog.tsx:106`; edge call in `src/hooks/useOcrIndexing.ts:142-149`); read directly for index-status counts in `src/hooks/useOcrIndexing.ts:355-359` |

`src/hooks/usePixel.ts` is a pure backward-compatibility re-export of `src/hooks/pixel` (`export * from './pixel';`, line 5); there is no duplicate implementation.

### Column-level notes from src/integrations/supabase/types.ts

- `pixel_settings` (types.ts lines 1093-1131): 33 columns. Only 16 are actually used by the edge `PixelSettings` interface (`supabase/functions/pixel-chat/index.ts:26-42`) and the client type (`src/hooks/pixel/types.ts:9-27`): `default_language, default_verbosity, heart_strictness, refusal_style, safety_guard_mode, allowed_vocabulary, blocked_vocabulary, allowed_themes, blocked_themes, default_aesthetic, palette_behavior, texture_level, lighting, detail_level, internal_audit_logging` plus `user_id`/`id` bookkeeping. See orphaned columns below for the other 17.
- `pixel_messages` (types.ts lines 1048-1062): `id, user_id, role, content, mode, is_image, image_url, is_video, video_url, attachments (Json), blueprint_id, created_at`. `is_video`/`video_url` were added by `supabase/migrations/20260224004128_1e5b3a70-2c2d-4a43-9e88-3ce6ec3ea410.sql:1-2`.
- `pixel_blueprints` (types.ts lines 991-1009): `id, user_id, name, description, format, aspect_ratio, composition_rules, style_rules, typography_vibe, element_rules, negative_constraints, export_specs, palette (Json), source, created_at, updated_at`.
- `heart_rules` (types.ts lines 485-500): `id, name, category, description, rule_content, priority, is_global, is_active, assigned_agents (string[]), sort_order, created_by, created_at, updated_at`. Pixel never reads `description`, `category`, `sort_order`, or `created_by`.
- `knowledge_embeddings` (types.ts lines 541-552): `id, source_type, source_id, chunk_index, content, embedding, metadata (Json), created_at, updated_at`. Pixel relies on metadata keys `is_image`, `storage_path` (Brain images, edge lines 150-158) and `entry_name`, `image_urls` (Wishpedia, edge lines 201-206; written by `supabase/functions/process-embeddings/index.ts:675-681`).
- `osha_audit_logs` (types.ts lines 769-782): `id, user_id, message_id, heart_rules_used (Json), brain_chunks_used, compliance_status, compliance_notes, retrieval_ms, llm_provider, llm_model, created_at`.
- `wishpedia_entry_images` (types.ts lines 2133-2146): `id, entry_id, storage_path, original_name, mime_type, size, angle, is_primary, sort_order, uploaded_by, created_at`.

### RLS policies on the Pixel tables, verbatim

All three from `supabase/migrations/20260218022637_d6a7deff-ee9d-48d9-a846-27e194c4f6c5.sql` (RLS enabled at lines 16, 88, 116):

```sql
CREATE POLICY "Users can manage own pixel messages"
  ON public.pixel_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can manage own pixel settings"
  ON public.pixel_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

```sql
CREATE POLICY "Users can manage own pixel blueprints"
  ON public.pixel_blueprints
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Retention is handled by a SECURITY DEFINER trim trigger keeping the last 200 messages per user (original at the same migration lines 25-46; `search_path` hardened in `supabase/migrations/20260218022654_1a9ddb29-a440-405a-ac9c-864ec0c8ecaf.sql:2-20`):

```sql
CREATE OR REPLACE FUNCTION public.trim_pixel_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pixel_messages
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM public.pixel_messages
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 200
  );
  RETURN NEW;
END;
$$;
```

Anon EXECUTE on `trim_pixel_messages` was revoked in `supabase/migrations/20260521190500_audit_phase5_revoke_anon_execute.sql:12-15`.

### Storage buckets touched

| Bucket | Operation | Where |
|---|---|---|
| `files` (private) | Upload generated images (`{userId}/pixel-images/{ts}_pixel.png`) and videos (`{userId}/pixel-videos/{ts}_pixel.mp4`); images get a **24h signed URL** (`supabase/functions/pixel-chat/index.ts:1442`), videos get **`getPublicUrl`** (line 1219) | edge, lines 1212-1237 (video), 1429-1460 (image) |
| `brain-documents` (private) | 5-min signed URLs for retrieved Brain image chunks (edge lines 152-156); client upload of Pixel images saved to Brain (`src/components/pixel/SavePixelToBrainDialog.tsx:80-82`); client download for OCR indexing (`src/hooks/useOcrIndexing.ts:100-102`) | edge + client |
| `wishpedia-media` (public) | Public URLs embedded in `knowledge_embeddings.metadata.image_urls` (`supabase/functions/process-embeddings/index.ts:625-627`) and minted client-side via `getPublicUrl` (`src/hooks/useWishpediaImages.ts:152-155`) for the WishReference panel | edge (text-only injection) + client (actual download) |

Bug worth flagging (reporting what the code does): the image path explicitly documents that `files` is private and mints a signed URL (`supabase/functions/pixel-chat/index.ts:1439-1443`, comment: `// BUGFIX: the 'files' bucket is PRIVATE — getPublicUrl returns a URL that // 403s ...`), but the **video** path at line 1219 still uses `supabaseServiceClient.storage.from('files').getPublicUrl(videoPath)`, so `pixel_messages.video_url` stores a public URL into a private bucket. By the function's own comment that URL should 403. UNVERIFIED at runtime (no live check performed), but the code paths are contradictory.

### Orphaned / unused tables and columns

- **`pixel_settings` orphaned columns (17)**: `default_mode`, `default_pack_type`, `default_variations`, `include_prompt_set`, `include_blueprint_summary`, `include_qa_notes`, `default_aspect_ratio`, `default_resolution`, `preferred_file_format`, `image_generation_enabled`, `image_provider`, `image_model`, `video_generation_enabled`, `style_lock_default`, `character_lock_default`, `reuse_last_blueprint`, `retrieval_depth`. None appear in the edge `PixelSettings` interface (`supabase/functions/pixel-chat/index.ts:26-42`), the client type (`src/hooks/pixel/types.ts:9-27`), or the settings UI (`src/components/pixel/PixelSettings.tsx` exposes only language, verbosity, audit logging, strictness, refusal style, safety guard, vocab/themes, plus the aesthetic dropdowns). In particular, `image_provider`/`image_model` defaults (`'openai'`/`'gpt-image-1'`, migration lines 76-77) are dead: provider/model selection actually comes from `llm_settings.active_image_provider` (edge line 1289). `retrieval_depth` is dead because Pixel is hardcoded to unlimited retrieval (limit 100, edge lines 1000-1003; the UI says so at `src/components/pixel/PixelSettings.tsx:143`). Caveat: 8 of these 17 columns (`default_mode`, `image_provider`, `image_model`, `default_aspect_ratio`, `default_resolution`, `image_generation_enabled`, `video_generation_enabled`, `retrieval_depth`) are not fully orphaned, because osha-chat's `agentConfigKeys` whitelist reads them from `pixel_settings` to describe Pixel's per-user config inside Osha's system prompt (`supabase/functions/osha-chat/index.ts:261` plus the select at line 1979; see X-9 item 10), so stale values in them leak into Osha's answers about Pixel even though pixel-chat itself never reads them.
- **`pixel_messages.attachments` and `pixel_messages.blueprint_id`**: never written. All three edge insert sites (lines 1245-1248, 1468-1471, 1571-1574) write only `user_id, role, content, mode` plus media flags/URLs. The client reads `m.attachments` for history annotations (`src/components/pixel/PixelStudio.tsx:186`) but it is always the column default `'[]'`.
- **Client-only phantom fields**: `PixelMessage.selected_post_type` and `selected_size` (`src/hooks/pixel/types.ts:60-61`, read at `src/components/pixel/PixelStudio.tsx:187`) have **no corresponding columns** in `pixel_messages` (types.ts lines 1048-1062), so they only exist on optimistic local messages and vanish after a reload.
- **`pixel_blueprints.export_specs` and `palette`**: present in the schema and initialized to empty defaults in the blueprint form (`src/components/pixel/PixelBlueprintPanel.tsx:23-24`) but not editable in the UI (form fields are only name/format/aspect/description plus the 5 rule textareas, lines 154-194), not injected into either prompt (edge lines 497-499 and 1022-1024 omit both), and not produced by the AI generator's JSON contract (edge lines 853-864). Effectively dead columns.
- **`agent_settings` row `agent_id='pixel'`** (seeded by `supabase/migrations/20260218022637_d6a7deff-ee9d-48d9-a846-27e194c4f6c5.sql:124-127` with `gpt-4o`, temp 0.8, and its own system prompt): never read by `pixel-chat` (the function builds its prompt and picks models from `llm_settings`/`pixel_settings` instead). It is only read by the generic `useAgentSettings` hook (`src/hooks/useAgentSettings.ts:34,50,64`) used by the Nexus config UI, so the seeded model/prompt have no effect on actual Pixel behavior.
- **Unenforced quota config**: `supabase/functions/_shared/usage-quota.ts:17-18` defines daily quotas `'pixel-chat': 50` and `'pixel-blueprint': 20`, but `pixel-chat/index.ts` never imports `usage-quota` (its imports are only `sanitize`, `cors`, `rate-limit`, `token-budgets`, lines 12-16, confirmed by a zero-match grep for `usage-quota|checkUsageQuota` in the file). The only live throttle is the in-memory 10 req/min rate limiter (lines 18-19, 590-595).

## X-7. UI and UX inventory

Scope: the Pixel agent UI as mounted at `/ai-agents/pixel`. Sources: src/screens/PixelAgent.tsx, every file in src/components/pixel/, the pixel hooks in src/hooks/pixel/ (re-exported via src/hooks/usePixel.ts), plus shared identity files.

### Route, gating, and page shell

- Page wrapper: src/app/(protected)/ai-agents/pixel/page.tsx renders `PixelAgent` inside `<ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pixel">` with `metadata.title = 'Pixel | Fortun Wishnet'` (lines 5-12). The per-agent permission column `ai_can_access_pixel` therefore gates the route.
- Screen root: src/screens/PixelAgent.tsx line 136-143. The root `<div>` carries `data-pixel-theme={pixelTheme}` and is either an inline framed panel (`h-[calc(100vh-80px)] rounded-xl`) or, in fullscreen mode, `fixed inset-0 z-50 rounded-none` (toggled by `toggleFullscreen`, line 60).
- Agent active/inactive: `useAgentSettings('pixel')` (src/screens/PixelAgent.tsx:64); when `!agentSettings.is_active`, an overlay covers the whole workspace (lines 282-301): a `Lock` icon in a muted tile, heading "Pixel is Inactive", body copy:

```
Pixel has been deactivated. Enable it in the Nexus Control Center.
```

and a gradient button "Go to Nexus" (`Palette` icon) routing to `/ai-agents/nexus?tab=agents` (src/screens/PixelAgent.tsx:293-299).

### Visual identity

- Agent registry entry (src/data/agents.ts:81-94, verbatim):

```ts
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'Visual Creator AI',
    description: 'Creates AI-generated images and videos for social media posts, presentations, and more.',
    icon: Palette,
    color: 'from-pink-500 to-rose-600',
    gradient: 'from-pink-500/10 via-rose-500/5 to-pink-600/10',
    glowColor: 'bg-pink-500/30',
    iconColor: 'text-pink-500',
    tags: ['Images', 'Videos', 'Creative'],
    status: 'active',
    path: '/ai-agents/pixel',
  },
```

- Nexus gradient (src/components/nexus/agentGradients.ts:11, verbatim): `pixel:    'linear-gradient(135deg, #ec4899, #f43f5e)',` (pink-500 to rose-500).
- Accent system throughout the workspace: pink-500/rose-500-600 gradients on the wordmark tile, send button, save buttons, active tab underline, focus rings (`focus-within:border-pink-500/50`, src/components/pixel/PixelStudio.tsx:424), selected states (`bg-pink-500/10 border-pink-500/25`), and the Promptor optimize button uses violet (PixelStudio.tsx:514). Connection dot and success states use emerald; destructive hovers use rose.

### Pixel-local theme toggle (data-pixel-theme + localStorage)

- State lives in src/screens/PixelAgent.tsx:27-43. Initial value is read lazily from `localStorage.getItem('pixel-theme')`, defaulting to `'dark'`; `togglePixelTheme` flips and persists it, and a mount effect re-writes `localStorage.setItem('pixel-theme', pixelTheme)` for SSR safety (lines 41-43).
- The attribute scopes CSS-variable overrides only inside the Pixel container. src/app/globals.css:252-297 (verbatim):

```css
/* ── Pixel page-local theme scoping ──
   data-pixel-theme overrides CSS variables ONLY within the Pixel container.
   This lets Pixel toggle light/dark independently of the global app theme. */
[data-pixel-theme='light'] {
  --background: 210 20% 98%;
  --foreground: 210 25% 15%;
  --card: 0 0% 100%;
  --card-foreground: 210 25% 15%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 25% 15%;
  --primary: 197 78% 37%;
  --primary-foreground: 0 0% 100%;
  --secondary: 197 100% 97%;
  --secondary-foreground: 197 78% 35%;
  --muted: 210 25% 96%;
  --muted-foreground: 210 15% 45%;
  --accent: 197 100% 92%;
  --accent-foreground: 197 78% 30%;
  --destructive: 9 100% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 25% 92%;
  --input: 210 25% 92%;
  --ring: 197 78% 45%;
}

[data-pixel-theme='dark'] {
  --background: 220 25% 6%;
  --foreground: 210 20% 95%;
  --card: 220 25% 8%;
  --card-foreground: 210 20% 95%;
  --popover: 220 25% 8%;
  --popover-foreground: 210 20% 95%;
  --primary: 197 78% 55%;
  --primary-foreground: 0 0% 100%;
  --secondary: 197 40% 15%;
  --secondary-foreground: 197 78% 80%;
  --muted: 220 25% 12%;
  --muted-foreground: 210 15% 55%;
  --accent: 197 40% 18%;
  --accent-foreground: 197 78% 85%;
  --destructive: 9 100% 55%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 25% 14%;
  --input: 220 25% 14%;
  --ring: 197 78% 55%;
}
```

Note: portal-rendered overlays (Sheets, Dialogs, Popovers, Tooltips) mount outside the `data-pixel-theme` container, so they follow the global app theme, not the Pixel-local one. UNVERIFIED at runtime, but structurally implied by Radix portals.

### Overall layout

Desktop (src/screens/PixelAgent.tsx:155-217):
1. `PixelTopBar` (52px, full width).
2. A 3-column flex row: left `PixelControlPanel` (220px, `hidden md:flex`, line 167), center `PixelStudio` (flex-1), right `PixelContextPanel` (220px, `hidden lg:flex`, line 208).

Mobile (breakpoint < 768px via `useIsMobile`, src/hooks/use-mobile.tsx:3-16):
- Both side panels are hidden; two floating circular FABs appear bottom-left (`absolute bottom-5 left-3`, only when `!isInactive && isMobile`, src/screens/PixelAgent.tsx:220-235): a `SlidersHorizontal` button opening a left Sheet titled "Controls" containing `PixelControlPanel` (lines 238-262), and a `BarChart3` button opening a right Sheet titled "Context & Sizes" containing `PixelContextPanel` (lines 265-280). Selecting a post type or size from a mobile sheet closes that sheet (lines 249, 274).
- Two more Sheets exist at screen level: "Pixel Settings" (right side, `sm:max-w-2xl`, lines 303-315, rendering `PixelSettings` only when `!loadingSettings`) and "Visual Templates" (right side, `sm:max-w-2xl`, lines 317-334, rendering `PixelBlueprintPanel`; see the dead-UI finding below).
- A hidden global file input (`multiple`, `accept={ACCEPTED_FILE_TYPES}`) is wired at lines 146-153 for "global references".

### Top bar (src/components/pixel/PixelTopBar.tsx)

Left (lines 37-48): pink-to-rose gradient tile with white `Palette` icon, "Pixel" wordmark (hidden below `sm`), and a connection dot: emerald with `animate-ping` halo when connected, muted gray otherwise (`isConnected` = agent not inactive, src/screens/PixelAgent.tsx:159).

Center, mode tabs (lines 13-18, 51-84). `PIXEL_MODES` verbatim:

```tsx
export const PIXEL_MODES: { value: PixelMode; label: string; icon: React.ReactNode; description: string; comingSoon?: boolean }[] = [
  { value: 'facebook',       label: 'Facebook',       icon: <Facebook className="h-3.5 w-3.5" />,  description: 'Optimized visuals for Facebook posts, ads, and stories' },
  { value: 'instagram',      label: 'Instagram',      icon: <Instagram className="h-3.5 w-3.5" />, description: 'Feed posts, stories, reels, and carousel visuals' },
  { value: 'tiktok',         label: 'TikTok',         icon: <Music className="h-3.5 w-3.5" />,     description: 'Vertical video covers, thumbnails, and ad creatives' },
  { value: 'cross_platform', label: 'Cross Platform', icon: <Globe className="h-3.5 w-3.5" />,     description: 'Create content optimized for multiple platforms at once', comingSoon: true },
];
```

Each tab: icon + label (label hidden below `sm`), active state `border-pink-500 bg-pink-500/8`, tooltip with label + description. The Cross Platform tab is `disabled`, rendered at 50% opacity with `cursor-not-allowed` and a "Soon" pill badge (lines 57-74). Switching modes resets the selected post type and size (src/screens/PixelAgent.tsx:69-73).

Right actions, desktop `sm+` (lines 89-163), all 32px icon buttons with tooltips:

| Button | Icon | Tooltip | Action |
|---|---|---|---|
| Knowledge base | `BrainCircuit` (violet hover) | "Pixel Knowledge Base" | `router.push('/mastermind/brain/pixel')` (line 94) |
| Vector store | `Database` (emerald hover) | "RAG Vector Store" | `router.push('/mastermind/vector-store')` (line 105) |
| Wishdom nav | `Package` (amber hover) | "Wishdom" | `router.push('/wishdom')` (line 116) |
| Settings | `Settings2` (pink hover) | "Pixel Settings" | opens settings Sheet (line 127) |
| Theme toggle | `Sun` when dark / `Moon` when light | "Toggle Page Theme" | `onTogglePixelTheme` (lines 135-147) |
| Fullscreen | `Maximize2` / `Minimize2` | "Fullscreen Mode" / "Exit Fullscreen" | `onToggleFullscreen` (lines 148-162) |

Right actions, mobile `< sm` (lines 167-204): a Settings2 button plus a `MoreVertical` overflow `DropdownMenu` containing "Knowledge Base", "Vector Store", "Wishdom", "Light Mode"/"Dark Mode", and "Fullscreen"/"Exit Fullscreen" items; both triggers use 44px min tap targets (`min-h-[44px] min-w-[44px]`).

### Left control panel (src/components/pixel/PixelControlPanel.tsx)

Fixed 220px column (line 108) with two sections:

1. "Post Type" (lines 110-133): one button per type from `PLATFORM_POST_TYPES[mode]` (lines 24-76). Facebook: Image Post, Video, Story, Cover Photo, Carousel. Instagram: Feed Post, Story, Reel, Carousel. TikTok: Video, Profile Photo, Ad Creative. `cross_platform: []` (line 75). Each button shows a Lucide icon + label; selected state `text-pink-300 bg-pink-500/10 border-pink-500/25`; `disabled={isPending}` (line 117), but see the dead-prop finding: `isPending` is hardcoded `false` by the parent (src/screens/PixelAgent.tsx:176, 252), so these are never actually disabled.
2. "WishReference" section: renders `WishReferencePanel` (lines 136-147).

The props interface also declares `activeBlueprint`, `onBlueprintSelect`, and `onNewBlueprint` (lines 80-85), but the component body never destructures or renders them (lines 95-104): there is no blueprint button in this panel. Dead props.

Each post type carries exact pixel sizes, e.g. Facebook Image Post sizes (lines 27-29, verbatim):

```tsx
      { label: 'Landscape', width: 1200, height: 630, ratio: '1.91:1' },
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
      { label: 'Portrait', width: 1080, height: 1350, ratio: '4:5' },
```

(plus Video 16:9/1:1/9:16, Story 1080x1920, Cover 820x312 '2.63:1', Carousel 1080x1080; Instagram feed 1:1/4:5/1.91:1, story/reel 9:16, carousel 1:1/4:5; TikTok video 9:16, profile 200x200, ad creative 9:16/1:1; lines 24-76).

### WishReferencePanel flow (src/components/pixel/WishReferencePanel.tsx)

Purpose: attach Wishpedia character images and ad-hoc files as visual references for generation.

- Section header "WishReference" (lines 163-166).
- Search input: `Input` with a `Search` icon, placeholder "Search entries...", pink focus ring (lines 169-177). Feeds `useWishpediaEntries({ search })` which does a Supabase `ilike` on name/description (src/hooks/useWishpediaEntries.ts:42-45).
- Entry picker (lines 180-216): a max-height 140px scrollable list. States: loading spinner; error row "Could not load entries" with `AlertCircle`; empty rows "No entries found" (when searching) or "No Wishpedia entries yet"; otherwise one toggle button per entry. Selected entries get `text-pink-300 bg-pink-500/10` and a tiny "Selected" label (line 210).
- Multi-select + 5-image cap: `MAX_TOTAL_IMAGES = 5` (line 35). Toggling an entry on is refused with `toast.warning('Maximum 5 reference images allowed')` if the cap is already reached (lines 120-123). Toggling off calls `onRemoveWishpediaImage(entryId)`, which the parent uses to drop all refs for that entry (src/screens/PixelAgent.tsx:122-126).
- Image loading uses the `EntryImageLoader` data-only child pattern (one mounted per selected entry, avoiding hook-rule violations, lines 37-90): it runs `useWishpediaImages(entryId)` and pushes `WishpediaImageRef` objects (`{ wishpediaImageId, entryId, entryName, angle, publicUrl }`, lines 14-20) up via `onImagesLoaded`. Public URLs come from the `wishpedia-media` bucket via `getWishpediaImageUrl` (src/hooks/useWishpediaImages.ts:152-155). Loader states: "Loading {entryName} images..." spinner, "Failed to load images" error, "No images for {entryName}" empty (lines 62-88). `handleImagesLoaded` re-enforces the cap and warns `Only {allowed} of {refs.length} images added (max 5 total)` (lines 130-139).
- Thumbnail chips: a 2-column grid of square image tiles, each with a bottom black/60 strip showing the angle (or entry name) and a hover-revealed X remove button (always visible on mobile, `sm:opacity-0 sm:group-hover:opacity-100`) (lines 233-256).
- Global (ad-hoc) reference chips: a second 2-column grid for files picked via the attach button or drag-drop; image files show an `img` preview, non-images a generic `ImageIcon` + name tile; processing files get a spinning overlay; X removes (lines 259-289).
- Drag-and-drop zone + attach button (lines 292-311): dashed-border box that highlights pink on dragover; label flips between "Attach reference" and "Drop images here". Drops are filtered to `image/*` only with `toast.error('Only image files are accepted')` otherwise (lines 149-153), then routed through `onDropFiles` to the parent's `handleGlobalRefSelect`. The attach button is `disabled={isPending}` (hardcoded false at the call site, same caveat as above).
- File guards for global references (src/screens/PixelAgent.tsx:85-108): type must be in `ACCEPTED_FILE_TYPES` (pdf, txt, md, csv, json, docx, xlsx, png, jpeg, webp, gif; src/lib/fileProcessing.ts:9-21) with `toast.error('{name}: unsupported file type')`, size cap 10MB with `toast.error('{name}: exceeds 10MB limit')`; text is extracted client-side via `extractTextFromFile`.
- The 3MB guard for Wishpedia images is enforced at SEND time, not selection time: src/components/pixel/PixelStudio.tsx:199-215 fetches each `publicUrl`, skips blobs over `3 * 1024 * 1024` with `toast.warning('{entryName} image too large (>3MB), skipped')`, base64-encodes the rest, and pushes them into the attachments payload labeled `"{entryName} ({angle})"` with `type: 'image/jpeg'`. Failed fetches are skipped silently (lines 212-214).
- Cross-entry replace semantics: adding refs for an entry replaces any prior refs from the same entry (src/screens/PixelAgent.tsx:114-120).

### Right context panel (src/components/pixel/PixelContextPanel.tsx)

220px right column with:
1. "Post Size" picker (lines 44-79): if a post type is selected, lists that type's sizes; each row shows a proportional `RatioPreview` rectangle (scaled to max 28px, lines 21-31), the size label, and `{width}×{height} · {ratio}`. Active row gets pink border/background. Empty state when no post type is chosen: dashed box with `RectangleHorizontal` icon and copy "Select a post type from the left panel to see available sizes." (lines 73-78).
2. "Last Retrieval" block, shown only after a generation returns an audit (lines 82-110): a compliance pill mapped by `COMPLIANCE_CONFIG` (lines 15-19): `pass` = "Compliant" (emerald `ShieldCheck`), `adjusted` = "Adjusted" (amber `AlertTriangle`), `refused` = "Refused" (rose `XCircle`); plus "Brain chunks" (violet `BrainCircuit`) and "Heart rules" (pink `ShieldCheck`) counters when > 0. Data comes from `onAuditUpdate` fed by the `pixel-chat` response audit (src/components/pixel/PixelStudio.tsx:227, src/screens/PixelAgent.tsx:51, 198).

### Studio canvas (src/components/pixel/PixelStudio.tsx)

Messages loading state: centered `Loader2` spinner (lines 326-329).

Empty state (lines 330-362): a 80px pink/rose gradient tile with `Palette` and an emerald "online" dot, heading "What shall we create?", and intro copy (verbatim):

```
I'm Pixel — your visual director. Describe a creative goal below, or start with one of these:
```

followed by a 2/3-column grid of three starter cards per mode from `EMPTY_STAGE_CARDS` (src/components/pixel/pixelConstants.tsx:10-31, prompts verbatim):

```tsx
  facebook: [
    { icon: <Zap className="h-5 w-5" />, label: 'Facebook Ad', desc: 'Optimized ad creative', prompt: 'Create a Facebook ad visual for a product campaign. Format: 1:1 or 4:5. Include headline and CTA placement.' },
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Cover Photo', desc: 'Page cover image', prompt: 'Design a Facebook cover image for a brand page. Format: 16:9 (820×312). Professional and on-brand.' },
    { icon: <Film className="h-5 w-5" />, label: 'Facebook Story', desc: 'Engaging 9:16 story', prompt: 'Create a Facebook Story visual for a product drop. Format: 9:16. Engaging and thumb-stopping.' },
  ],
  instagram: [
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Feed Post', desc: '1:1 scroll-stopping visual', prompt: 'Create an Instagram feed post visual for a brand launch. Format: 1:1. On-brand, engaging, scroll-stopping.' },
    { icon: <Film className="h-5 w-5" />, label: 'Reel Cover', desc: 'Bold 9:16 thumbnail', prompt: 'Design a Reel cover thumbnail for a product reveal. Format: 9:16. Bold text overlay, eye-catching.' },
    { icon: <Layers className="h-5 w-5" />, label: 'Carousel', desc: '5-slide swipe story', prompt: 'Create a 5-slide Instagram carousel for a product feature. Format: 1:1. Consistent style, swipe-worthy.' },
  ],
  tiktok: [
    { icon: <Film className="h-5 w-5" />, label: 'Video Cover', desc: 'Trendy 9:16 thumbnail', prompt: 'Design a TikTok video cover for a product reveal. Format: 9:16. Bold, trendy, eye-catching thumbnail.' },
    { icon: <Zap className="h-5 w-5" />, label: 'Ad Creative', desc: 'Native-feeling ad', prompt: 'Create a TikTok ad creative for a brand campaign. Format: 9:16. Native-feeling, trend-aware.' },
    { icon: <ImageIcon className="h-5 w-5" />, label: 'Profile Visual', desc: 'Bold brand identity', prompt: 'Design a TikTok profile banner/visual identity for a brand. Bold, modern, Gen-Z appeal.' },
  ],
```

(`cross_platform` cards also exist at lines 11-15 but are unreachable since the mode tab is disabled.) Clicking a card injects the prompt into the textarea (it does NOT auto-send): `onSendStarterPrompt` bumps a trigger ref in PixelAgent (src/screens/PixelAgent.tsx:80-83, 132-133), and PixelStudio's effect sets the input value, resizes, and focuses the textarea (lines 120-125, 249-262).

Message list (lines 364-417): messages are paired user-then-assistant (lines 290-300); each pair renders a `PixelOutputCard`; orphaned user messages render `PixelUserBrief`. Server messages come from `usePixelMessages` (direct Supabase select on `pixel_messages` ordered ascending, src/hooks/pixel/usePixelMessages.ts:10-27) and are mirrored into `localMessages` for optimistic appends (lines 115, 176, 237). Auto-scroll to bottom on every message/pending change (lines 116-118).

Generation progress card (lines 383-416), shown while `isPending`: pink-gradient header with "Creating…" (or "Done!" at 100%), a `Progress` bar with pink-to-rose indicator, an elapsed-seconds counter, and simulated progress (`95 * (1 - e^(-t/(0.4*expected)))`, expected 60s for video-ish post types, 15s otherwise; `isVideoGeneration` checks the selected post type for 'video'/'reel'/'story'/'tiktok', lines 83-110). Time-bucketed stage labels (lines 398-406, verbatim):

```
'Analyzing your brief…'   (< 3s)
'Composing layout…'       (< 8s)
'Rendering visuals…'      (< 15s)
'Applying style & detail…' (< 30s)
'Refining output…'        (< 60s)
'Almost there…'           (else)
```

Input bar (lines 421-534), a rounded-2xl framed composer with pink focus ring:
- Pending attachment strip (lines 425-458): image attachments show 48px thumbnails (`next/image`, `unoptimized`) with a processing spinner overlay; non-images show a `FileText` tile with name and "Reading…" / "Error" / file size; each has an X remove button.
- Textarea (lines 460-469): auto-grows to 180px max, `disabled={isPending}`, per-mode placeholder from `MODE_PLACEHOLDERS` (src/components/pixel/pixelConstants.tsx:33-38, verbatim):

```ts
export const MODE_PLACEHOLDERS: Record<PixelMode, string> = {
  cross_platform: 'Describe your goal — Pixel will create visuals optimized for all platforms…',
  facebook: 'Describe your Facebook visual — ads, covers, stories, posts…',
  instagram: 'Describe your Instagram visual — feed posts, reels, carousels, stories…',
  tiktok: 'Describe your TikTok visual — video covers, ad creatives, thumbnails…',
};
```

- Buttons (left cluster, all 44px min tap targets):
  - Paperclip, `title="Attach file (temporary)"`, opens the per-message file input (lines 472-479). Same type/10MB guards as global refs (lines 268-287).
  - Smile emoji `Popover` (lines 480-508): an 8-column grid of 32 hardcoded emojis (`'😀','😂','🔥','❤️','✨','👏','🎨','💡','🚀','💪','🎯','⭐','👀','💯','🙌','✅','📸','🎬','🖼️','📐','🎭','💎','🌟','⚡','🏆','💫','🎉','🤩','😍','👌','✌️','🤘'`) inserted at the caret position.
  - Wand2 optimize-draft button (lines 509-517): `title`/`aria-label` "Optimize with Promptor", violet hover, disabled when input empty or while optimizing/pending, `Loader2` spinner while running. It calls `useOptimizeDraft` from `@/hooks/promptor` (line 19, 64-78), which hits the `promptor` edge function's `optimize-draft` action and replaces the textarea content in place (it does not send). Errors surface via the hook's own Sonner toast (comment at line 76).
- Send button (lines 519-530): 36px rounded-xl; disabled (gray) when pending OR when there is no text, no ready per-message attachment, and no ready global reference; enabled state is the pink-to-rose gradient with glow + `hover:scale-105`; shows `Loader2` while pending. Inconsistency: the disabled check (lines 521-526) does NOT count `wishpediaImageRefs`, while `handleSend`'s internal guard does (line 163), so a brief consisting only of Wishpedia references cannot be sent by clicking the button, yet pressing Enter would send it (keyboard handler at lines 264-266 calls `handleSend` directly). Enter sends, Shift+Enter inserts a newline, and the helper line below reads `↵ Enter to send · Shift+Enter for new line` (line 533).

Send pipeline UX details (lines 159-247): the optimistic user message uses `content: text || '(attached files)'` and records `selected_post_type`/`selected_size`; conversation history is summarized with inline markers like `[Generated image: …]`, `[Attached files: …]`, `[Format: …]`; the actual message sent when text is empty is `'Please analyze the attached file(s)'` (line 221). On failure a fallback assistant bubble is appended: "I'm having trouble processing your request. Please try again." (lines 240-244), and `useSendPixelMessage` additionally toasts `'Pixel error: ' + error.message` (src/hooks/pixel/usePixelSend.ts:43-45).

### Output cards (src/components/pixel/PixelOutputCard.tsx)

Each exchange renders as a "Brief" + "AI Output card" pair:
- User brief (lines 194-214): a small "U" avatar circle, uppercase "Brief" label, attachment chips (icon + truncated name), and the brief text. `PixelUserBrief` (lines 404-427) is the same layout for user messages with no AI reply yet.
- Card header (lines 218-251): mini Palette gradient tile; a title built as `Platform — Post Type Label` via `buildCardTitle` (lines 26-39, e.g. "Instagram - Feed Post", falling back to "Pixel"); when media + size exist, `{w}×{h}` and ratio chips (hidden below `sm`); a purple `Layers` chip with the active blueprint name when set (lines 237-242); and a hover-revealed `Maximize2` "View fullscreen" button for media (lines 245-249).
- Card content (lines 254-316), three branches:
  - Video: optional markdown caption + `VideoPlayer` (click opens fullscreen) (lines 255-269).
  - Image: optional markdown caption + the image with a skeleton until `onLoad`/`onError`, plus a hover dark overlay with a centered Maximize2 icon; click opens the lightbox (lines 270-297).
  - Text: full prose-styled `ReactMarkdown` with `remark-gfm`; fenced ```mermaid blocks render via a `MermaidDiagram` component that lazy-loads `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`, `theme: 'dark'`, `securityLevel: 'strict'`; loading shows a skeleton and errors fall back to showing the raw chart source (lines 71-109, 111-136).
  - Media URLs are re-signed on every mount via `useSecureImageUrl` (line 164), which converts a stored private `files`-bucket reference into a fresh 24h signed URL and passes non-bucket URLs through unchanged (src/hooks/files/useSecureImageUrl.ts:14-39).
- Card footer (lines 320-363):
  - "Copy" (Copy icon, flips to emerald Check + "Copied!" for 2s; copies the AI text content) - handled by PixelStudio `handleCopy` with a cleaned-up timer (src/components/pixel/PixelStudio.tsx:132-139, 81).
  - "Save to Brain" (`BrainCircuit`, pink hover) - image outputs only; opens `SavePixelToBrainDialog` (lines 329-334, 394-398).
  - "Download" (`Download`) - any media; fetches the blob and triggers an anchor download named `pixel-{messageId}.png` or `.mp4`, falling back to `window.open` on failure (lines 171-189, 335-343).
  - "Delete" (`Trash2`, rose hover) - inline two-step confirm: clicking swaps to emerald "Confirm" + "Cancel"; confirm deletes BOTH the user and the AI message (`onDelete(userMessage.id); onDelete(aiMessage.id)`, line 346), optimistically removing them and calling `useDeletePixelMessage` (direct Supabase delete, src/hooks/pixel/usePixelMessages.ts:61-79; failure toast "Failed to delete message").
  - Timestamp `h:mm a` on the right (lines 167, 362).
- Fullscreen lightboxes (lines 366-392): full-viewport black/95 overlay; image variant closes on backdrop click, X button, or Escape (lines 42-67); video variant uses `VideoPlayer` with `autoPlay`.

### Save to Brain dialog (src/components/pixel/SavePixelToBrainDialog.tsx)

Dialog titled "Save Image to Brain" (`BrainCircuit`, pink). Fields: Name (`Input`, prefilled `Pixel Image - {MMM d, yyyy HH:mm}`, lines 39-46, 131-134), Description optional (`Textarea`, placeholder "What does this image contain?"), Destination `Select` ("General Knowledge" or any active agent as `{name} — {role}`, defaulting to `pixel`, lines 141-152), Category `Select` (active brain categories, lines 154-164). Footer: Cancel + a gradient "Save to Brain" button showing `Loader2` "Saving…" while busy. On save it fetches the image blob, uploads to the `brain-documents` bucket at `{destination}/{timestamp}_pixel-image.png`, inserts a `brain_documents` row (with `restricted_agents: [destination]` for agent destinations), toasts "Image saved - now indexing to vector store…", fires `useOcrIndexing` in the background, invalidates `brain-documents`, toasts "Image saved to Brain knowledge base", and closes (lines 50-118). Errors go to Sentry + a toast with the specific message. Empty name is blocked with `toast.error('Please enter a name')`.

### Blueprints panel, "Visual Templates" (src/components/pixel/PixelBlueprintPanel.tsx)

Rendered inside the screen-level "Visual Templates" Sheet (src/screens/PixelAgent.tsx:317-334). Contents:
- Header: `Layers` icon, title "Visual Templates", subtitle (verbatim): `Reusable visual recipes — define once, apply consistently across all outputs.` (lines 88-95).
- "Generate with AI" outline button (`Wand2`, "Generating..." spinner state) - calls the `generate-blueprint` edge action and pre-fills the create form, flagging it `wasAiGenerated` (lines 57-76, 97-115; hook src/hooks/pixel/usePixelBlueprints.ts:86-106).
- "New Template" gradient button opens the inline create form (lines 116-123).
- Create form (lines 127-205): heading "AI-Generated Template" or "New Visual Template"; inline busy hint "AI is crafting your template..."; AI badge (verbatim): `✦ AI-generated from your Brain & Heart — review and edit before saving.`; fields: Template Name * (placeholder "e.g. Premium Social 2024"), Format select (Social Post, Story, Carousel, Deck Slide, Banner, Thumbnail, Custom), Aspect Ratio select (1:1, 9:16, 16:9, 4:5, 4:3, 3:4, 21:9), Description, and five 2-row textareas: Style Rules, Composition Rules, Typography Vibe, Element Rules, Negative Constraints (Avoid). While generating, the form dims and becomes `pointer-events-none`. Save Template (disabled until name present) / Cancel. Note: the `export_specs` and `palette` fields exist in the type and `EMPTY_BLUEPRINT` (lines 13-26; src/hooks/pixel/types.ts:76-77) but have no form inputs.
- List (lines 207-292): loading text "Loading templates..."; empty state with Palette tile, "No templates yet", and copy "Templates are reusable visual recipes. Create one manually, or click **Generate with AI** to auto-fill all fields from your Brain & Heart."; each card shows name, an "AI" sparkles badge for `source === 'ai'`, format + aspect-ratio badges, description, an "Apply" outline button (sets the active blueprint and closes the sheet, src/screens/PixelAgent.tsx:327-330), a chevron expand toggle revealing the rule fields, and a two-step delete (Trash2 then Check/X confirm).

CRITICAL dead-UI finding: the Visual Templates sheet has no reachable trigger. The only calls to `setBlueprintsOpen(true)` are the `onNewBlueprint` props passed to `PixelControlPanel` (src/screens/PixelAgent.tsx:175, 251), and `PixelControlPanel` never destructures or renders `onNewBlueprint` (src/components/pixel/PixelControlPanel.tsx:95-104). Grep across `src/` confirms no other trigger. Consequently the entire blueprint workflow (create, AI-generate, apply) is unreachable from the current UI, `activeBlueprint` can never become non-null, the blueprint chip on output cards never renders, and the `blueprint`/`styleLock`/`lastBlueprintSummary` send parameters are effectively inert. This contradicts the project CLAUDE.md claim "Templates accessible via: Settings Sheet → Visual Templates (PixelBlueprintPanel)"; `PixelSettings.tsx` contains no such link (its tabs are Behavior / Brand Lens / Visual only). Reporting what the code does.

### Settings sheet (src/components/pixel/PixelSettings.tsx)

Opened from the top bar; Sheet title "Pixel Settings" with pink Palette icon (src/screens/PixelAgent.tsx:303-315; content rendered only after `loadingSettings` is false, so the sheet body is blank while settings load). Three underline tabs (lines 17-23): Behavior, Brand Lens, Visual. All values persist via `useUpsertPixelSettings` (edge action `save-settings`; success toast "Pixel settings saved", failure toast "Failed to save settings: …", src/hooks/pixel/usePixelSettings.ts:37-60). Defaults come from `DEFAULT_PIXEL_SETTINGS` (src/hooks/pixel/types.ts:29-45) and the read hook silently degrades to defaults on any network/HTTP failure (src/hooks/pixel/usePixelSettings.ts:14-31).

Behavior tab (lines 68-155):
- Two read-only provider info cards showing the globally configured Text Generation and Image Generation provider/model (from `useLLMSettings`, lines 32-40), each with an `ExternalLink` "Configure" button routing to `/settings?tab=llm`. The image card carries the copy (verbatim): `Pixel always generates images by default. Configured globally in Settings.`
- "Output Behavior": Default Language select (English, French, Spanish, Portuguese, German) and Verbosity select (Short, Standard, Detailed).
- An info card (verbatim): `Pixel has full unrestricted access to the entire Brain knowledge base and all Heart rules. Retrieval is always at maximum depth.` titled "Unlimited Knowledge Access".
- "Internal Audit Logging" `Switch` with helper "Store retrieval references and Heart check results per response".

Brand Lens tab (lines 159-207): Heart Strictness select (Enforce & Propose Alternative / Enforce & Redirect / Always Enforce Strictly), Refusal Style select (Soft / Neutral / Firm), "Safety Guard Mode" Switch ("When uncertain, produce safest compliant output and ask for constraints"), and four comma-separated `Input`s: Allowed Vocabulary, Blocked Vocabulary, Allowed Visual Themes, Blocked Visual Themes.

Visual tab (lines 211-232): five selects: Default Aesthetic (Minimal/Dreamy/Premium/Playful/Cinematic), Palette Behavior (Locked/Adaptive/Seasonal), Texture Level (None/Subtle/Medium), Lighting (Soft/Dramatic/Neon/Natural), Detail Level (Low/Medium/High), plus footnote "These visual defaults are applied to all generated images unless overridden by a blueprint or user request."

Save: gradient "Save Settings" button with `Loader2` "Saving..." pending state (lines 236-240).

### Clear history

`useClearPixelHistory` exists (src/hooks/pixel/usePixelMessages.ts:29-59): it POSTs `{ action: 'clear-history' }` to `pixel-chat`, surfaces a specific blocked-before-server error message for extension/network interception, and toasts "Studio session cleared" on success. However, grep across `src/` finds NO component invoking it: there is no clear-history button anywhere in the Pixel UI (the only `clearHistory` call sites are Osha's, src/components/osha/OshaChat.tsx:127 and src/components/osha/OshaFloatingBubble.tsx:215). Clear history for Pixel is currently backend-and-hook only, unreachable from the UI.

### Step-by-step user flow (as experienced)

1. Navigate to `/ai-agents/pixel`; `ToolProtectedRoute` checks `ai_agents` tool access plus the `ai_can_access_pixel` permission (src/app/(protected)/ai-agents/pixel/page.tsx:9). If the agent is deactivated in Nexus, the locked overlay blocks everything.
2. The workspace opens in the persisted Pixel-local theme (dark by default). Pick a platform tab: Facebook, Instagram, or TikTok (Cross Platform is disabled "Soon").
3. Optionally pick a Post Type in the left panel; the right panel then offers exact Post Sizes with ratio previews. Switching platform resets both.
4. Optionally build a reference set in WishReference: search Wishpedia entries, toggle entries to pull in their character images (max 5 total, with cap toasts), and/or attach or drag-drop ad-hoc reference files (images only via drop; 10MB cap; non-image text files get client-side text extraction).
5. Type a brief (or click a starter card to pre-fill one), optionally polish it with the violet Wand2 "Optimize with Promptor" button, optionally attach per-message files via the Paperclip or insert emojis, then press Enter or the gradient send button.
6. While generating, a progress card shows a simulated bar, stage messages, and elapsed seconds (15s expected for images, 60s for video-type post types).
7. The result arrives as an output card titled "{Platform} - {Post Type}" with size/ratio chips; images/videos can be viewed fullscreen, copied (text), downloaded, saved to the Brain knowledge base (images, via the dialog), or deleted (two-step confirm removes the whole exchange). The right panel updates "Last Retrieval" with compliance status and Brain/Heart counts.
8. Settings (top bar gear) adjust language, verbosity, Heart enforcement, vocab/theme lists, and visual defaults; provider/model is read-only here and configured globally.
9. On mobile (< 768px) the same flow runs through the two floating buttons that open the Controls and "Context & Sizes" sheets.

### Loading, error, empty, and disabled states (consolidated)

- Messages loading: centered spinner (PixelStudio.tsx:326-329). Messages empty: "What shall we create?" starter screen (330-362).
- Generation pending: progress card; textarea, paperclip, emoji, Wand2, send, and starter cards all disabled (PixelStudio.tsx:349, 465, 474, 482, 511, 521).
- Send failures: fallback assistant bubble + "Pixel error: …" toast; copy failure: "Failed to copy" toast (PixelStudio.tsx:138).
- Attachment states: `processing` spinner overlay / "Reading…", `error` / "Error" label, ready shows size; unsupported-type and >10MB toasts (PixelStudio.tsx:272-273, 432-445; PixelAgent.tsx:89-90).
- WishReference: entries loading spinner / "Could not load entries" / "No entries found" / "No Wishpedia entries yet"; per-entry image loading/error/empty rows; cap warnings; ">3MB skipped" warning at send; "Only image files are accepted" on bad drops (WishReferencePanel.tsx:181-194, 62-88, 121, 136, 151; PixelStudio.tsx:204).
- Post Size: dashed "Select a post type..." placeholder until a type is chosen (PixelContextPanel.tsx:73-78).
- Blueprints: "Loading templates..." / "No templates yet" empty state / "Generating..." and dimmed form / Save disabled until named; save/delete/generate failure toasts (PixelBlueprintPanel.tsx:208-219, 104-114, 151, 197; usePixelBlueprints.ts:56-58, 80-82, 102-104).
- Settings: hooks degrade silently to defaults on fetch failure (usePixelSettings.ts:17-29); save button "Saving..." pending state; sheet body empty while settings load (PixelAgent.tsx:312).
- Save-to-Brain: "Saving…" button state, name-required toast, info/success/error toasts (SavePixelToBrainDialog.tsx:51-114, 170-174).
- Images: skeleton until load, `onError` also clears the skeleton (PixelOutputCard.tsx:283-290). Mermaid: skeleton / raw-source fallback (104-107).
- Inactive agent: full-screen lock overlay (PixelAgent.tsx:282-301). Connection dot gray when inactive (PixelTopBar.tsx:42-47).

### Unfinished, placeholder, or dead UI

1. Visual Templates sheet unreachable (detailed above): no live trigger for `setBlueprintsOpen(true)`; the whole blueprint create/AI-generate/apply flow plus the output-card blueprint chip and `styleLock`/`lastBlueprintSummary` plumbing are dead in practice (src/screens/PixelAgent.tsx:175, 251; src/components/pixel/PixelControlPanel.tsx:95-104).
2. `styleLock` is hardcoded `false` at the only PixelStudio call site (src/screens/PixelAgent.tsx:194), so `lastBlueprintSummary` (PixelStudio.tsx:216-217) is never sent. The "style lock" feature has no UI control.
3. `isPending={false}` hardcoded for both PixelControlPanel instances (src/screens/PixelAgent.tsx:176, 252), so post-type buttons and the attach-reference button are never disabled during generation despite their `disabled={isPending}` wiring.
4. Cross Platform mode: permanently disabled tab with "Soon" badge (PixelTopBar.tsx:17, 57-74); its starter cards (pixelConstants.tsx:11-15), placeholder (pixelConstants.tsx:34), and empty post-type list (PixelControlPanel.tsx:75) are unreachable.
5. Send-button/handleSend mismatch on Wishpedia-only briefs (PixelStudio.tsx:163 vs 521-526): button disabled, Enter key works. This contradicts the CLAUDE.md note that the "send-allowed check includes wishpediaImageRefs.length"; the internal guard does, the button-disabled check does not.
6. Clear history hook with no UI caller (src/hooks/pixel/usePixelMessages.ts:29-59).
7. Dead components: `PixelHeader.tsx` is imported nowhere and is not even exported from src/components/pixel/index.ts; it contains a broken fallback (`MODE_CONFIG[mode] || MODE_CONFIG.quick_create` at PixelHeader.tsx:27, where `quick_create` is not a key, so an unknown mode would crash), emoji-decorated mode badges (📘 📸 🎵 🌐, lines 18-23), an unused `heartCount` prop, and the legacy `Connected&nbsp;to MasterMind` badge (the `&nbsp;` entity is verbatim from PixelHeader.tsx:73). `PixelMessageBubble.tsx` is exported from the barrel (index.ts:7) but has no importers; it is the legacy chat-bubble renderer (with its own Copy Image / Download / delete-confirm actions and "Template"/"QA Pass" badges keyed off literal `**Blueprint:**` / `**QA Status:**` markers in message content, lines 183-184) superseded by `PixelOutputCard`.
8. Blueprint fields `export_specs` and `palette` exist in the data model (src/hooks/pixel/types.ts:76-77) and `EMPTY_BLUEPRINT` (PixelBlueprintPanel.tsx:23-24) but have no inputs in the create form and are never displayed.
9. Video in the UI is real, not placeholder: `PixelMessage` carries `is_video`/`video_url` (types.ts:54-55), `PixelOutputCard` renders a `VideoPlayer` with fullscreen support, and the `pixel-chat` edge function does return `isVideo: true` / `videoUrl` responses (supabase/functions/pixel-chat/index.ts:1247, 1271-1272). The 60-second progress estimate for video post types (PixelStudio.tsx:97) is the matching client-side affordance.
10. Minor: the emoji picker uses raw emoji characters as button content (PixelStudio.tsx:488), and `WishReferencePanel` creates object URLs in render without revoking them (`URL.createObjectURL(ref.file)` at WishReferencePanel.tsx:265), a small leak per re-render. The Mermaid renderer loads its library from a third-party CDN at runtime (PixelOutputCard.tsx:83).

## X-8. Quotas, limits, and error handling

### Rate limiting (edge)

pixel-chat uses the shared in-memory sliding-window limiter at 10 requests/minute/user (supabase/functions/pixel-chat/index.ts:18-19):

```ts
// SEC-004: 10 requests per minute per user (image generation, expensive)
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
```

The check runs after auth and **before action dispatch**, so it covers every action (`chat`, `get-settings`, `save-settings`, `clear-history`, blueprint CRUD, `generate-blueprint`), returning 429 with `Retry-After: 60` (lines 589-595). The limiter itself (`supabase/functions/_shared/rate-limit.ts`) is per-instance memory, documented as a first-layer defense:

```ts
 * Uses a sliding-window counter per user. State lives in the edge function
 * instance memory — it resets when the function cold-starts, which is
 * acceptable for a first layer of defense. For stricter limits, use a
 * Redis or Supabase-backed counter (Phase D).
```
(supabase/functions/_shared/rate-limit.ts:5-8)

### Daily usage quotas: defined but NOT enforced for Pixel

`supabase/functions/_shared/usage-quota.ts` declares Pixel limits:

```ts
  'pixel-chat': 50,        // image generation via Pixel
  'pixel-blueprint': 20,   // blueprint generation
```
(supabase/functions/_shared/usage-quota.ts:17-18)

However, pixel-chat never imports `checkQuota`/`logUsage`. The only importer in the repo is ai-chat (`supabase/functions/ai-chat/index.ts:5` and :207). So Pixel users are bounded only by the 10/min limiter; the 50/day and 20/day numbers are dead configuration as far as Pixel is concerned. Where the quota IS used (ai-chat), it fails open:

```ts
  if (error) {
    console.error('Usage quota check error:', error);
    // Fail open — don't block on quota check errors
    return { allowed: true, remaining: limit, limit, used: 0 };
  }
```
(supabase/functions/_shared/usage-quota.ts:50-54)

### Retry / fallback logic in pixel-chat

1. **Image edit fallback**: a failed `/v1/images/edits` call falls back to `/v1/images/generations` (lines 1395-1398, quoted in full in the Model usage section).
2. **Source-image collection fallback**: any error while decoding attachments or fetching Brain images abandons image-to-image and proceeds text-to-image (lines 1323-1325: `} catch { // fall back to text-to-image }`).
3. **No vision text-only retry exists in pixel-chat.** The project CLAUDE.md claims a "text-only retry fail-safe" for vision calls in both osha-chat and pixel-chat; in the current pixel-chat code there is no retry anywhere in the text-chat path (verified by grep: the only `retry`/fallback hits are the regen keyword list at line 233 and the two image fallbacks above). A vision failure in the Step 6 text path lands in the generic catch (lines 1564-1568) and becomes a canned error message. Additionally, the Gemini text branch silently **drops image attachments** entirely: it sends only `parts: [{ text: m.content }]` and `typeof userContent === 'string' ? userContent : message` (lines 1514-1528), whereas the OpenAI branch passes the multimodal `userContent` array with `image_url` parts built at lines 1045-1055.
4. **Generation errors return HTTP 200, not error statuses.** Both media catch blocks convert failures to a friendly assistant message with `complianceStatus: 'pass'`:

```ts
    } catch (e: any) {
      console.error('Image generation error:', e);
      const errMsg = 'I encountered an error generating the image. I can provide a detailed art direction brief instead — just ask.';
      return new Response(JSON.stringify({
        content: errMsg,
        audit: { heartCount: heartRules.length, brainCount: brainContext.length, complianceStatus: 'pass' },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
```
(supabase/functions/pixel-chat/index.ts:1495-1502; the video equivalent at 1276-1283 says "generating the video"). Note these error replies are NOT persisted to `pixel_messages` (the insert happens only on success), and the text-chat catch (1564-1568) sets `responseContent = 'I encountered an error processing your request. Please try again.'` which IS persisted (lines 1571-1574).
5. **Persistence failures are non-fatal**: storage upload / `files` insert errors are swallowed with `console.error('Video persistence error', ...)` / `('Image persistence error', ...)` (lines 1239-1241, 1462-1464), leaving `permanentVideoUrl`/`permanentImageUrl` as `''`.
6. **Retrieval failures degrade silently**: `generateEmbedding` returns `null` on any failure (lines 107-120), `searchBrain`/`searchWishpedia` return `[]` on RPC error (lines 138-141, 186-189), and Heart-rule fetch errors return `[]` (lines 94-97).

### Size and count guards (edge)

- Source images for image-to-image: max 4 images, 5MB each (supabase/functions/pixel-chat/index.ts:1303-1304): `const sourceImages: Uint8Array[] = []; const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5MB per source image`, enforced at lines 1307-1321 (`sourceImages.length < 4`, `if (bin.length > MAX_SOURCE_BYTES) continue;`).
- Generated-image download (SEC-04): https-only host allowlist plus a 20MB cap (lines 1407-1417): hosts `api.openai.com`, `*.blob.core.windows.net`, `*.oaiusercontent.com`; both `content-length` and actual buffer checked against `20 * 1024 * 1024`.
- Video blob validation: rejects JSON/HTML payloads and blobs under 1000 bytes (lines 1195-1207).
- Text/PDF attachment content truncated to 30,000 chars each in the prompt (line 1040: `a.content.slice(0, 30000)`).
- Image prompt brand-context capped at 2,500 chars (lines 455-461).

### Client-side error surfacing

- `src/hooks/pixel/usePixelSend.ts`: parses the server error body and toasts it (lines 33-36 `throw new Error(err.error || 'Failed to send message')`; lines 43-45 `onError: (error) => { toast.error('Pixel error: ' + error.message); }`).
- `src/components/pixel/PixelStudio.tsx` `handleSend`: a thrown send error appends a generic assistant error bubble instead of crashing (lines 239-245): `content: "I'm having trouble processing your request. Please try again."`.
- `src/hooks/pixel/usePixelMessages.ts` `useClearPixelHistory`: distinguishes a fetch-level failure (browser extension / network) from a server error and surfaces the real server body (lines 37-51, including the message `'Request was blocked before reaching the server — check your connection or disable browser extensions for this site, then try again.'`); `useDeletePixelMessage` toasts `'Failed to delete message'` (line 77).
- Read-on-load hooks degrade to safe defaults rather than crash: `src/hooks/pixel/usePixelSettings.ts:16-31` returns `DEFAULT_PIXEL_SETTINGS` on auth-header failure, fetch throw, or non-OK; `src/hooks/pixel/usePixelBlueprints.ts:14-31` returns `[]` the same way (both annotated `// network/extension failure — degrade, don't crash`).

### Client-side attachment guards

- File picker (src/components/pixel/PixelStudio.tsx:272-273): type allowlist plus a **10MB** per-file cap: `if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: exceeds 10MB limit`); continue; }`.
- Wishpedia reference images converted to base64 at send time have a **3MB** per-image skip guard (src/components/pixel/PixelStudio.tsx:204): `if (blob.size > 3 * 1024 * 1024) { toast.warning(`${ref.entryName} image too large (>3MB), skipped`); continue; }`; failed fetches are skipped silently (lines 212-214).
- WishReference picker caps total reference images at 5 (`const MAX_TOTAL_IMAGES = 5;`, src/components/pixel/WishReferencePanel.tsx:35) with toasts at lines 120-138, and the drop zone filters to image files only (lines 149-152).
- Mismatch worth noting: the client allows 5 reference images at up to 3MB (and ordinary attachments up to 10MB), but the edge image-to-image collector only takes the first 4 images at up to 5MB each (supabase/functions/pixel-chat/index.ts:1307), so a 5th image is silently ignored as an i2i source (it still reaches the model only in the text-chat path's `image_url` parts, not in the image-generation path).

## X-9. Inter-agent connections

**1. Pixel calls Promptor (client side)**

Covered above: src/components/pixel/PixelStudio.tsx:19, 64, 66-78 (Wand2 button on the Pixel chat input fires Promptor's `optimize-draft`).

**2. pixel-chat uses the shared `match_knowledge` hybrid RPC directly (same RPC as Osha, Nexus ai-chat, and search-knowledge)**

- Brain search (supabase/functions/pixel-chat/index.ts:131-136):

```ts
  const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
    query_embedding: JSON.stringify(embedding),
    query_text: query, // hybrid vector+BM25 (single overload)
    match_threshold: 0.2,
    match_count: limit,
  });
```

- Wishpedia-only search (supabase/functions/pixel-chat/index.ts:179-184) calls the same RPC with `filter_source_types: ['wishpedia_entry']` and notably does NOT pass `query_text` (pure vector for that call).
- Other callers of the identical RPC: supabase/functions/osha-chat/index.ts:149, supabase/functions/ai-chat/index.ts:117, supabase/functions/search-knowledge/index.ts:119. Promptor reaches it indirectly via search-knowledge. Any change to the `match_knowledge` Postgres function affects Pixel, Osha, Nexus chat, search-knowledge, and (transitively) Promptor.

**3. pixel-chat shares Heart with the pixel-scoped filter**

supabase/functions/pixel-chat/index.ts:87-92:

```ts
  const { data, error } = await supabaseAdmin
    .from('heart_rules')
    .select('name, rule_content, priority, is_global, assigned_agents, is_active')
    .eq('is_active', true)
    .or('is_global.eq.true,assigned_agents.cs.{"pixel"}');
```

Sanitized via shared `sanitizeForPrompt` (lines 100-104) and Brain content too (line 161).

**4. pixel-chat reads the shared `llm_settings` row at three dispatch points**

- API keys: `llmSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY')`, same for Gemini (supabase/functions/pixel-chat/index.ts:982-983; also 797-798 in `generate-blueprint`).
- Image dispatch (lines 1289-1292): `active_image_provider` selects `gemini_image_model` (default `'gemini-2.5-flash-image'`) or `openai_image_model` (default `'gpt-image-1'`).
- Video dispatch (lines 1059-1062): `active_video_provider` selects `gemini_video_model` (default `'veo-3.1-generate-preview'`) or `openai_video_model` (default `'sora-2'`).
- Text fallback (line 1510): `openai_text_model`/`gemini_text_model`.

**5. pixel-chat consumes Wishpedia data directly**

It reads the `wishpedia_entry_images` table and builds public `wishpedia-media` bucket URLs as canonical character references (supabase/functions/pixel-chat/index.ts:209-218), and injects them into the image prompt as `WISHPEDIA VISUAL REFERENCES — USE THESE AS CANONICAL CHARACTER DESIGNS` (lines 468-481).

**6. pixel-chat consumes Brain storage as image-to-image sources**

Brain image chunks get 300-second signed URLs from the `brain-documents` bucket (lines 151-158), and those URLs are fetched back as multi-image edit sources (up to 4, 5MB each) for OpenAI `/v1/images/edits` or Gemini inline images (lines 1301-1325, 1380-1398).

**7. pixel-chat writes into the Files module's tables and bucket**

Generated images/videos are uploaded to the `files` storage bucket, registered in the `files` table, and filed under an auto-created `sectors` row named `'Pixel AI'` with color `#EC4899` (videos: lines 1210-1241; images: lines 1429-1464). Images get 24h signed URLs because the bucket is private (lines 1439-1443).

**8. pixel-chat writes the shared audit table**

supabase/functions/pixel-chat/index.ts:1250-1266 (verbatim comment):

```ts
      // AGENT-008: Pixel writes to the shared osha_audit_logs table.
      // The table is shared across all agents (Osha, Pixel, Promptor) as a
      // unified audit log. Renaming it would require a migration; the name
      // is a legacy artefact from when Osha was the only agent.
```

Also at lines 1475 (image path) and 1578 (text path), gated by `settings.internal_audit_logging`.

**9. Pixel client consumes Wishpedia and Brain client hooks**

- src/components/pixel/WishReferencePanel.tsx:7-8 imports `useWishpediaEntries` and `useWishpediaImages`/`getWishpediaImageUrl`; selected reference images flow through `PixelAgent` state into PixelStudio, which converts them to base64 attachments for pixel-chat (src/components/pixel/PixelStudio.tsx:198-247).
- src/components/pixel/SavePixelToBrainDialog.tsx pushes a generated Pixel image INTO the Brain: uploads to the `brain-documents` bucket (lines 80-82), inserts a `brain_documents` row with optional `restricted_agents` (lines 86-100), then indexes via `useOcrIndexing` (line 31, fired at line 106). It also imports `AI_AGENTS` from src/data/agents.ts (line 16) to list active agents as save destinations (line 48), so Pixel's UI directly depends on the global agent metadata file.

**10. Osha (osha-chat) embeds Pixel in its agent registry and reads `pixel_settings`**

- Registry entry (supabase/functions/osha-chat/index.ts:241, verbatim):

```ts
    pixel: { name: 'Pixel', role: 'Visual Creator AI', capabilities: 'AI image and video generation for social media, presentations, and marketing. Blueprint system for reusable visual styles (palette, composition, typography, style rules). Brand-aware visuals using Heart rules and Brain knowledge. Multiple modes: Quick Create, Campaign Pack, Brand Suite, Editorial.' },
```

- Config keys surfaced (line 261) and direct table read `supabaseAdmin.from('pixel_settings').select('*').eq('user_id', userId).maybeSingle()` (line 1979).

**11. Nexus references Pixel**

Default system prompt (src/components/nexus/AgentConfigPanel.tsx:28, verbatim):

```ts
  pixel:    'You are Pixel, a visual designer specialist. You create stunning visuals, optimize image generation prompts, and ensure visual consistency across projects.',
```

Gradient key `pixel` at src/components/nexus/agentGradients.ts:11; Header label at src/components/layout/Header.tsx:41; route gate `agentKey="ai_can_access_pixel"` at src/app/(protected)/ai-agents/pixel/page.tsx:9; legacy shim src/hooks/usePixel.ts re-exports `./pixel`.

**12. Code-vs-data discrepancy worth flagging**

osha-chat's registry hardcodes Pulse and Whisper as inactive: `pulse: { ... '(Coming Soon — not yet active)' }`, `whisper: { ... '(Coming Soon — not yet active)' }` and the status fallback treats `'whisper' || 'pulse' || 'atlas'` as Coming Soon (supabase/functions/osha-chat/index.ts:242-243, 268), while src/data/agents.ts marks both `status: 'active'` (lines 106, 120). The code is the registry shown above; Promptor and Pixel entries are unaffected, but any CINEMA-style addition would need to touch both places to stay consistent.

## X-10. Video and media capability

### What Pixel itself can generate (supabase/functions/pixel-chat/index.ts)

Pixel's `chat` action has four output paths, decided in this order:

1. **Video** (Step 5a, line 1058) when not text-only, not diagram, and either the selected post type is a video type or the message contains video keywords.
2. **Image** (Step 5b, line 1287) for everything else that is not text-only/diagram (media-first design).
3. **Text / Mermaid diagram** (Step 6, line 1505) when `detectTextOnlyIntent` or `detectDiagramIntent` fires; diagrams are Mermaid fenced code blocks from the text model (system-prompt instruction at lines 370-372), not rendered media.
4. `generate-blueprint` produces JSON (text model), no media.

**Yes, pixel-chat has a real video path** (this is its own implementation, fully independent of ai-chat). Triggers:

```ts
// ─── Video post type detection ────────────────────────────────────────────────
const VIDEO_POST_TYPES = new Set(['video', 'story', 'reel']);
```
(supabase/functions/pixel-chat/index.ts:530)

```ts
function detectVideoIntent(message: string): boolean {
  const videoKeywords = [
    'video', 'reel', 'clip', 'animation', 'motion', 'footage', 'mp4',
    'animate', 'moving', 'cinematic', 'timelapse', 'time-lapse',
  ];
  const lower = message.toLowerCase().trim();
  return videoKeywords.some(k => lower.includes(k));
}
```
(supabase/functions/pixel-chat/index.ts:259-266)

The client supplies matching post-type ids: `'video'` (Facebook line 31, TikTok line 64 of src/components/pixel/PixelControlPanel.tsx), `'story'` (Facebook line 36, Instagram line 52), `'reel'` (Instagram line 55). Note the code reality: selecting a "Story" post type always routes to video generation, and any prompt containing words like "cinematic" or "motion" also forces the video path. The client mirrors this heuristic for its progress UI (src/components/pixel/PixelStudio.tsx:83-86).

**Video provider endpoints in pixel-chat:**

- **OpenAI Sora**: `POST https://api.openai.com/v1/videos` with multipart `FormData` carrying `model`, `prompt`, `size` (via `mapSizeToSora`), `n='1'` (lines 1078-1090); then polls `GET https://api.openai.com/v1/videos/{id}` every 5s for max 60 attempts ("timed out after 5 minutes", lines 1100-1126); on `completed`, downloads bytes from `GET /v1/videos/{id}/content` (lines 1113-1117).
- **Gemini Veo**: `POST https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:predictLongRunning?key=...` with `instances: [{ prompt: videoPrompt }], parameters: { aspectRatio: veoAspect, sampleCount: 1 }` (lines 1133-1142); polls the operation every 10s for max 60 attempts ("timed out after 10 minutes", lines 1153-1187); accepts inline base64 `videoBytes` or downloads a returned `uri` with the API key appended (lines 1165-1181).
- **fal: absent.** Any other provider value hits `throw new Error(`Unsupported video provider: ${videoProvider}`);` (line 1189).

**Video parameters exposed:** only size/aspect, derived from the UI-selected post size: `mapSizeToSora` returns `'1920x1080'` default, `'1080x1920'` for 9:16/4:5, `'1080x1080'` for 1:1 (lines 537-543); `mapRatioToVeo` returns `'16:9'`/`'9:16'`/`'1:1'` (lines 545-551). No duration, fps, audio, seed, or n>1 controls exist.

**Video persistence bug (code contradiction):** the video is uploaded to the **private** `files` bucket and then exposed via `getPublicUrl` (supabase/functions/pixel-chat/index.ts:1213-1220):

```ts
        const videoPath = `${userId}/pixel-videos/${Date.now()}_pixel.mp4`;
        const { error: uploadErr } = await supabaseServiceClient.storage
          .from('files')
          .upload(videoPath, videoBlob, { contentType: 'video/mp4', upsert: false });

        if (!uploadErr) {
          const { data: publicData } = supabaseServiceClient.storage.from('files').getPublicUrl(videoPath);
          permanentVideoUrl = publicData.publicUrl;
```

The image path in the same file was explicitly bug-fixed away from this exact pattern because the bucket is private (lines 1439-1443):

```ts
          // BUGFIX: the 'files' bucket is PRIVATE — getPublicUrl returns a URL that
          // 403s, so the generated image couldn't be viewed/downloaded/copied.
          // Mint a signed URL instead (mirrors osha-chat, 24h TTL).
          const { data: signedData } = await supabaseServiceClient.storage.from('files').createSignedUrl(imagePath, 60 * 60 * 24);
```

By the code's own comment, the video `video_url` stored in `pixel_messages` (line 1247) and returned as `videoUrl` (line 1272) should 403 when fetched by the browser. Whether playback actually fails at runtime is UNVERIFIED, but the inconsistency between the two paths is in the code.

**Image endpoints in pixel-chat:**

- OpenAI text-to-image: `POST https://api.openai.com/v1/images/generations`, JSON body `{ model, prompt, n: 1, size }` (lines 1373-1377).
- OpenAI image-to-image (recreate/combine): `POST https://api.openai.com/v1/images/edits`, multipart with multiple `image[]` PNG files, falling back to generations on failure (lines 1380-1398, quoted in the Model usage section). Sources are user image attachments plus Brain-retrieved images via 300s signed URLs (lines 151-158, 1301-1322), capped at 4 total / 5MB each. Wishpedia reference images arrive as ordinary base64 attachments from the client (src/components/pixel/PixelStudio.tsx:199-215) and their URLs are also injected into the prompt text (supabase/functions/pixel-chat/index.ts:468-482).
- Gemini image: `POST https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=...` with `inlineData` source images prepended to the text part, i.e. Gemini also gets image-to-image (lines 1332-1360). Result extracted from `candidates[0].content.parts` `inlineData` (lines 1363-1369).
- Result handling for OpenAI: either an https `url` (host-allowlisted, 20MB cap) or `b64_json` (lines 1404-1426).

**Image parameters exposed:** size only, mapped from the selected post size: `mapSizeToOpenAI` (lines 508-516, `// gpt-image-1 valid sizes: 1024x1024, 1536x1024, 1024x1536, auto`) and `mapRatioToGemini` (lines 518-527, `// Gemini supports: 1:1, 3:4, 4:3, 9:16, 16:9`; `4:5` is coerced to `3:4`). `n` is hardcoded to 1; there is no `quality`, `style`, `background`, or output-format parameter.

**Absent from Pixel:** fal.ai (images and video), any model-capability allowlist, n>1, quality settings, audio, video editing/extension, and daily usage quotas (see previous section).

### What ai-chat / Nexus can do that Pixel cannot

`supabase/functions/ai-chat/index.ts` is a separate function with `generate-image` and `generate-video` actions supporting **three** providers, each gated by capability allowlists (lines 33-42). It adds the fal.ai branches Pixel lacks:

```ts
      // ── fal.ai image generation via fal.run ─────────────────────────────
      if (provider === 'fal') {
        const selectedModel = model || settings.fal_image_model || 'fal-ai/flux-pro/v1.1-ultra';
```
(supabase/functions/ai-chat/index.ts:987-989; POST `https://fal.run/${selectedModel}` with `Authorization: Key ...`, body `{ prompt: message }`, `AbortSignal.timeout(45000)`, lines 1003-1011)

```ts
      // ── fal.ai video generation via fal.run ──────────────────────────────
      if (provider === 'fal') {
        const selectedModel = model || settings.fal_video_model || 'fal-ai/kling-video/v3/pro/text-to-video';
```
(supabase/functions/ai-chat/index.ts:1243-1245; same `fal.run` POST with `AbortSignal.timeout(300000)`, returns `data.video?.url || data.videos?.[0]?.url`, lines 1259-1277)

ai-chat's Sora flow differs from Pixel's: it returns `{ videoUrl: 'https://api.openai.com/v1/videos/{id}/content', requiresAuth: true, openaiVideoId }` for the client to fetch (lines 1096-1097, 1119-1120) instead of downloading and persisting server-side; its Veo flow returns a `data:video/mp4;base64,...` URL or the raw `uri` (lines 1221, 1231-1232). ai-chat also enforces the daily quotas (`generate-image: 30`, `generate-video: 10` in supabase/functions/_shared/usage-quota.ts:14-15, gated at supabase/functions/ai-chat/index.ts:204-220).

**Pixel cannot reach any of this.** The Pixel client posts exclusively to the pixel-chat function (`const PIXEL_URL = edgeFunctionUrl('pixel-chat');`, src/hooks/pixel/usePixelSend.ts:7, used at line 16; same constant in src/hooks/pixel/usePixelMessages.ts:8, src/hooks/pixel/usePixelSettings.ts:7, src/hooks/pixel/usePixelBlueprints.ts:7). A repo-wide search shows the only `generate-video`/`generate-image` caller in `src/` is `useAIChat` in src/hooks/useLLMSettings.ts:127-152 (action chosen from `mode === 'image' | 'video'`), and `useAIChat`/`AI_CHAT_ENDPOINT` are consumed only by Nexus (src/hooks/useNexusConsoleController.ts:59, src/components/nexus/AgentConfigPanel.tsx:43) and the Settings test surfaces (src/components/settings/LLMProvidersSettings.tsx:73, src/components/settings/AITestConsole.tsx:56, src/components/settings/ProviderCard.tsx:82). No Pixel screen, component, or hook imports any of them. Therefore: fal.ai image/video generation exists in this codebase only via Nexus/ai-chat; Pixel's media surface is exactly OpenAI (gpt-image via generations/edits, Sora via /v1/videos) and Gemini (generateContent images, Veo predictLongRunning), as quoted above.

## X-11. Dead code and gaps

**1. The entire client-side blueprint feature is unreachable from the current UI (critical scaffolded-but-unwired finding)**
Evidence chain:
- The Visual Templates Sheet containing `PixelBlueprintPanel` opens only when `blueprintsOpen` is true (src/screens/PixelAgent.tsx:317-334), and `setBlueprintsOpen(true)` is called only inside the `onNewBlueprint` callbacks passed to `PixelControlPanel` (src/screens/PixelAgent.tsx:175, 251).
- `PixelControlPanel` declares `onNewBlueprint` in its props interface (src/components/pixel/PixelControlPanel.tsx:85) but never destructures or calls it; the destructure list (src/components/pixel/PixelControlPanel.tsx:95-104) omits `onNewBlueprint`, `activeBlueprint`, and `onBlueprintSelect`. Nothing else in src/ references `blueprintsOpen` (grep confirms only PixelAgent.tsx:48,175,251,317,329 and the prop declaration at PixelControlPanel.tsx:85).
- Consequently: the sheet never opens, `PixelBlueprintPanel` (including its "Generate with AI" flow, src/components/pixel/PixelBlueprintPanel.tsx:57-76) never mounts, `usePixelBlueprints`/`useSavePixelBlueprint`/`useDeletePixelBlueprint`/`useGenerateBlueprintWithAI` (src/hooks/pixel/usePixelBlueprints.ts) never run, and the four pixel-chat edge actions `get-blueprints`/`save-blueprint`/`delete-blueprint`/`generate-blueprint` (supabase/functions/pixel-chat/index.ts:693-928) have no reachable caller.
- `activeBlueprint` can therefore never become non-null (its only setters are the unused `onBlueprintSelect` props and the unreachable sheet's `onApply`, src/screens/PixelAgent.tsx:171,192,327-330), so `blueprint` is never sent to the edge (src/components/pixel/PixelStudio.tsx:223), the `ACTIVE BLUEPRINT` system-prompt section never activates (supabase/functions/pixel-chat/index.ts:360-362, 1022-1024), and `blueprintName` never renders on output cards (src/components/pixel/PixelOutputCard.tsx:237-240).
- This contradicts `CLAUDE.md` (Batch Task 8: "Templates accessible via: Settings Sheet -> Visual Templates (PixelBlueprintPanel). No UX regression from sidebar removal."). The code shows the Settings sheet renders `PixelSettings` only (src/screens/PixelAgent.tsx:303-315); the Templates sheet is separate and orphaned.

**2. Dead component: `src/components/pixel/PixelHeader.tsx`**
- `PixelHeader` (src/components/pixel/PixelHeader.tsx:25) is imported nowhere (grep for `PixelHeader` finds only the file itself); it is not even exported by the pixel barrel (src/components/pixel/index.ts:1-11). It was superseded by `PixelTopBar` (used at src/screens/PixelAgent.tsx:10,155). It also contains a stale internal bug proving rot: `const modeInfo = MODE_CONFIG[mode] || MODE_CONFIG.quick_create;` (src/components/pixel/PixelHeader.tsx:27) falls back to a `quick_create` key that does not exist in its own `MODE_CONFIG` (src/components/pixel/PixelHeader.tsx:18-23), and it uses emoji mode badges that violate the project UI rules.

**3. Dead component: `src/components/pixel/PixelMessageBubble.tsx`**
- `PixelMessageBubble` (src/components/pixel/PixelMessageBubble.tsx:142) is referenced only by the dead barrel (src/components/pixel/index.ts:7). The live chat renders `PixelOutputCard` / `PixelUserBrief` instead (src/components/pixel/PixelStudio.tsx:7, 367-381). The dead file carries a complete duplicate Mermaid CDN renderer (`MermaidDiagram`, src/components/pixel/PixelMessageBubble.tsx:29-60+) alongside the live copy in PixelOutputCard.tsx (`window.mermaid` usage at src/components/pixel/PixelOutputCard.tsx:80,89), so the diagram-rendering logic exists twice, once unreachable.

**4. Dead barrel file: `src/components/pixel/index.ts`**
- Exports 11 symbols (src/components/pixel/index.ts:1-11) but no file imports from `@/components/pixel` or a relative pixel barrel path (grep returns zero importers). `PixelAgent.tsx` and `PixelStudio.tsx` import per-file (src/screens/PixelAgent.tsx:10-16,20; src/components/pixel/PixelStudio.tsx:7,16-18).

**5. Orphaned hook + edge action: clear-history**
- `useClearPixelHistory` (src/hooks/pixel/usePixelMessages.ts:29-59) is exported (via src/hooks/pixel/index.ts:6 and the `usePixel` shim) but consumed by nothing; grep finds only the definition. There is no clear-history button anywhere in the Pixel UI (none in PixelTopBar.tsx, PixelSettings.tsx, PixelStudio.tsx). The pixel-chat `clear-history` edge action (supabase/functions/pixel-chat/index.ts:674-690) therefore has no reachable UI caller. Notably this hook received dedicated error-message hardening in the 2026-05-21 fix (src/hooks/pixel/usePixelMessages.ts:43-47) while remaining unmounted.

**6. `styleLock` / `lastBlueprintSummary`: dead end-to-end in three layers**
- PixelAgent hardcodes the flag off: `styleLock={false}` (src/screens/PixelAgent.tsx:194); no toggle UI exists.
- PixelStudio computes `lastBlueprintSummary` only when `styleLock` is truthy, so it is always `undefined` (src/components/pixel/PixelStudio.tsx:217), and both are sent anyway (src/components/pixel/PixelStudio.tsx:223; src/hooks/pixel/usePixelSend.ts:26-27; types at src/hooks/pixel/types.ts:89-90).
- The edge function accepts both in `RequestBody` (supabase/functions/pixel-chat/index.ts:79-80) and never reads either one in the handler (grep over the file finds only the two interface lines).

**7. Dead/vestigial props on live components (the RuleCard onDuplicate pattern)**
- `PixelStudio`: declares and receives `settings` (src/components/pixel/PixelStudio.tsx:23, passed at src/screens/PixelAgent.tsx:188) and `onBlueprintSelect` (src/components/pixel/PixelStudio.tsx:27, passed at src/screens/PixelAgent.tsx:192); `settings` is destructured but never used in the body (only occurrences are lines 23 and 44), and `onBlueprintSelect` is never destructured at all (destructure list, src/components/pixel/PixelStudio.tsx:43-51).
- `PixelControlPanel`: `activeBlueprint`, `onBlueprintSelect`, `onNewBlueprint` declared (src/components/pixel/PixelControlPanel.tsx:80-81,85) and passed from both desktop and mobile call sites (src/screens/PixelAgent.tsx:170-171,175,246-247,251) but never destructured (src/components/pixel/PixelControlPanel.tsx:95-104). These are the vestiges of the blueprint section removed in Batch Task 8.
- `isPending` on `PixelControlPanel` is hardcoded `false` at both call sites (src/screens/PixelAgent.tsx:176, 252), so its `disabled={isPending}` logic (src/components/pixel/PixelControlPanel.tsx:117) and the `isPending` forwarded into `WishReferencePanel` (src/components/pixel/PixelControlPanel.tsx:145) can never activate; the real pending state lives privately inside PixelStudio (src/components/pixel/PixelStudio.tsx:55).

**8. Setting stored and editable but never read: `pixel_settings.default_language`**
- Editable in the UI (Default Language select, src/components/pixel/PixelSettings.tsx:118-125), present in the client type/defaults (src/hooks/pixel/types.ts:12,30) and the edge interface/defaults (supabase/functions/pixel-chat/index.ts:27,954), but `buildPixelSystemPrompt` injects no language instruction anywhere (supabase/functions/pixel-chat/index.ts:303-423); grep confirms `default_language` appears only at lines 27 and 954 of the edge file. Pixel always responds per model default regardless of this setting. (Contrast: Promptor's edge does enforce its language setting, supabase/functions/promptor/index.ts:208-209,250.)

**9. `pixel_messages` schema vs what is actually written (stored-but-never-written and shown-but-never-stored)**
- DB columns `attachments` and `blueprint_id` exist (src/integrations/supabase/types.ts:1048-1062) but the edge function's inserts never write them; the three insert sites write only `user_id, role, content, mode` plus image/video fields (supabase/functions/pixel-chat/index.ts:1245-1248 video, 1468-1471 image, 1571-1574 text). `blueprint_id` is also never read or written anywhere in src/ (grep: only the type declarations). Both columns are permanently null.
- Conversely, the client `PixelMessage` type carries `selected_post_type` and `selected_size` (src/hooks/pixel/types.ts:60-61) which have no DB columns at all; they are set only on optimistic local messages (src/components/pixel/PixelStudio.tsx:172-173, 234-235) and rendered as the output-card format chip (src/components/pixel/PixelStudio.tsx:375-376), so the format metadata silently disappears on page reload. The same applies to the client-side `attachments` annotation set at src/components/pixel/PixelStudio.tsx:170.

**10. Blueprint fields scaffolded but unwired: `export_specs` and `palette`**
- Present in the client type (src/hooks/pixel/types.ts:76-77), the edge `BlueprintContext` (supabase/functions/pixel-chat/index.ts:66-67), and the blank-form literal (src/components/pixel/PixelBlueprintPanel.tsx:23-24), but: no form field edits them (editable field list, src/components/pixel/PixelBlueprintPanel.tsx:177-183), no list view displays them (display field list, src/components/pixel/PixelBlueprintPanel.tsx:275-281), the AI generate-blueprint JSON schema omits them (supabase/functions/pixel-chat/index.ts:853-864), and neither prompt builder injects them (`blueprintNote` at supabase/functions/pixel-chat/index.ts:497-499 and `activeBlueprintStr` at line 1023 use name/format/aspect_ratio/composition/style/typography/element/negative fields only).

**11. Unreachable cross_platform UI content**
- The Cross Platform mode tab is disabled with a "Soon" badge (`comingSoon: true`, src/components/pixel/PixelTopBar.tsx:17, disabled at lines 57-66), yet full content exists for it: starter cards `EMPTY_STAGE_CARDS.cross_platform` and placeholder `MODE_PLACEHOLDERS.cross_platform` (src/components/pixel/pixelConstants.tsx:11-15, 34) plus an empty `PLATFORM_POST_TYPES.cross_platform: []` (src/components/pixel/PixelControlPanel.tsx:75). The only path to the cards is the fallback `EMPTY_STAGE_CARDS[mode] || EMPTY_STAGE_CARDS.cross_platform` (src/components/pixel/PixelStudio.tsx:302), which cannot trigger for any selectable mode. Forward-scaffolding, currently unreachable.

**12. Vestigial compliance detection in the text-chat path**
- After a text completion, the edge scans the response for literal markers `compliance: refused` / `compliance: adjusted` (supabase/functions/pixel-chat/index.ts:1559-1563), but nothing in `buildPixelSystemPrompt` (supabase/functions/pixel-chat/index.ts:303-423, quoted prompt body at 374-422) instructs the model to emit a "Compliance:" line. The detector can only fire if the model spontaneously produces that exact string; `complianceStatus` is effectively always `'pass'` for text responses, and is hardcoded `'pass'` for all image/video responses (lines 1260, 1273, 1480, 1492).

**13. Nexus per-agent config for Pixel is stored but never consumed by pixel-chat**
- Same pattern as Promptor: `AgentConfigPanel` persists provider/model/temperature/max_tokens/system_prompt for `pixel` (src/components/nexus/AgentConfigPanel.tsx:28, 39-80) into `agent_settings`, but `supabase/functions/pixel-chat/index.ts` never queries `agent_settings` (grep over supabase/functions finds `agent_settings` only in osha-chat at supabase/functions/osha-chat/index.ts:1977). pixel-chat resolves models from `llm_settings` only (lines 976-983, 1059-1062, 1289-1292, 1510) with hardcoded `temperature: 0.8` (line 1550) and `TOKEN_BUDGETS` (lines 1529, 1549). Only `is_active` is enforced, client-side (src/screens/PixelAgent.tsx:64,67,282-301).

**14. Misleading deps-suppression comment in PixelStudio (code contradicts comment)**
- src/components/pixel/PixelStudio.tsx:246 suppresses exhaustive-deps with the claim "selectedPostType and selectedSize are read from refs at call time"; they are plain props, not refs, used inside `handleSend` (lines 172-173, 224-225) and excluded from the deps array (line 247). The callback can close over stale format selections.

**15. Commented-out code / TODOs**
- None. Grep for `TODO|FIXME|HACK|XXX|deprecated` across src/components/pixel/, src/hooks/pixel/, src/screens/PixelAgent.tsx, and supabase/functions/pixel-chat/ returns zero matches.

## X-12. Test coverage

**Repository-wide test inventory (exhaustive):**
- Zero test files exist outside `node_modules/`: globs for `src/**/*.{spec,test}.*`, repo-level `**/*.{spec,test}.*` (all hits under node_modules), and `supabase/**/*{test,spec}*` return no project files.
- Zero test infrastructure: no `playwright.config.*`, no vitest/jest config, no `e2e/`, `tests/`, `test/`, or `__tests__/` directories anywhere in the repo.
- `package.json` declares no test script (scripts are only `dev`, `dev:webpack`, `build`, `start`, `lint`, package.json:6-12) and no testing devDependency: there is no `playwright`, `@playwright/test`, `vitest`, or `jest` entry in either dependency block (package.json:13-93).
- Docs vs code mismatch: `CLAUDE.md` lists "Testing: Playwright 1.57.0" in the tech stack, but Playwright is absent from package.json and no Playwright artifacts exist in the repo. Per CLAUDE.md's own audit-history entries, Playwright was used as an external MCP browser tool for one-off manual audit sessions (screenshots under the `audit/` directory), not as in-repo automated tests. UNVERIFIED whether Playwright is installed globally outside the repo; nothing in the codebase references it.
- The only programmatic validation gates in the repo are `tsc` strict mode (tsconfig) and `eslint` (package.json:11).

**Promptor:** No tests of any kind touch Promptor (no test file exists to grep).

**Pixel:** No tests of any kind touch Pixel (no test file exists to grep).

---

# PART 3: SHARED INFRASTRUCTURE MAP

## 13. Shared infrastructure map

Each item lists who uses it and how, so the blast radius of changing it is explicit.

### Edge-side shared modules (supabase/functions/_shared/)

| Module | Promptor usage | Pixel usage | Other users | Blast radius of a change |
|---|---|---|---|---|
| `cors.ts` (`getCorsHeaders`, `ALLOWED_ORIGINS` env override, `DEFAULT_ORIGINS` allowlist at lines 9-14) | promptor/index.ts:13, applied per request at line 326 | pixel-chat/index.ts:14, applied at line 556 | ai-chat:3, osha-chat:14, search-knowledge:11, settings-keys:22, manage-users:2, process-embeddings:26, process-ocr:16, pulse-api:30, whisper-api:16, wishpedia-generate:12, serve-file:3, storage-stats:3, update-bucket-settings:2 | Every edge function. Note `getCorsHeaders` reads the `ALLOWED_ORIGINS` secret at request time; setting it replaces `DEFAULT_ORIGINS` entirely. |
| `rate-limit.ts` (`createRateLimiter`, in-memory sliding window) | promptor/index.ts:14, 17: `createRateLimiter({ windowMs: 60_000, maxRequests: 15 })` | pixel-chat/index.ts:15, 19: `createRateLimiter({ windowMs: 60_000, maxRequests: 10 })` | ai-chat:4, osha-chat:15, settings-keys:23, manage-users:3, process-ocr:17, pulse-api:31, whisper-api:17, wishpedia-generate:13 | All rate-limited functions; limiter state is per-instance memory (resets on cold start). |
| `sanitize.ts` (`sanitizeForPrompt`, prompt-injection scrubber) | promptor/index.ts:10; applied to Heart rule name/content at 483-486 | pixel-chat/index.ts:13; Heart rules at 100-104, Brain chunk content at 161 | ai-chat:2, osha-chat:13 | The four LLM-prompting agents. Changing its regexes changes what reaches every system prompt. |
| `token-budgets.ts` (`TOKEN_BUDGETS`) | promptor/index.ts:11; `CONTENT_GENERATION` (4096) for create/optimize, `PROMPT_OPTIMIZE` (800) for optimize-draft (567-569) | pixel-chat/index.ts:16; `IMAGE_PROMPT` (1024) in generate-blueprint (882, 901), `CHAT_RESPONSE` (8192) in text fallback (1529, 1549) | ai-chat:6, osha-chat:16, process-ocr:15 | One constant change shifts max-token caps in five functions. Full registry quoted in the CINEMA section below. |
| `system-prompts.ts` (`getSystemPrompt`, `getAgentPrompts`, DB table `system_prompts`) | NOT imported | NOT imported | osha-chat:17 only (used at line 1994 for mode-instruction overrides) | Today only Osha. It is the only DB-backed prompt-override mechanism in the edge layer. |
| `usage-quota.ts` (`checkQuota`, `logUsage`, `DAILY_LIMITS`) | NOT imported | NOT imported | ai-chat:5 only | `DAILY_LIMITS` declares `'pixel-chat': 50`, `'promptor-generate': 50`, `'osha-chat': 100` (usage-quota.ts:17-20), but neither pixel-chat nor promptor imports the module, so those limits are dead configuration today; only ai-chat enforces quotas. |
| `chunker.ts` (`chunkText`) | NOT imported | NOT imported | process-embeddings:24, process-ocr:14 | Indexing pipeline only; affects what both agents later retrieve. |

### Database tables / RPC shared by both agents

| Item | Promptor | Pixel | Others | Notes / blast radius |
|---|---|---|---|---|
| `heart_rules` table | promptor/index.ts:474 (`assigned_agents.cs.{"promptor"}`) | pixel-chat/index.ts:89 (`assigned_agents.cs.{"pixel"}`) | osha-chat:104, ai-chat:83, pulse-api:592, whisper-api:243, process-embeddings:517, search-knowledge:143 | The single compliance source. Schema change hits 8 edge functions. Note pulse-api/whisper-api select `title, content` while promptor/pixel select `name, rule_content`. |
| `match_knowledge` RPC (hybrid vector+BM25) | Indirect via search-knowledge (promptor/index.ts:166; search-knowledge/index.ts:119) | Direct: pixel-chat/index.ts:131 (with `query_text`) and 179 (without) | osha-chat:149, ai-chat:117 | The whole RAG layer. The 2026-05-21 duplicate-overload incident broke all 4-5-arg callers at once (see project CLAUDE.md); signature changes must drop old overloads. |
| `llm_settings` table | promptor/index.ts:456 (active_text_provider, keys, text models) | pixel-chat/index.ts:792, 977 (keys, active_image_provider, active_video_provider, all model columns) | ai-chat:226, osha-chat:1268+ (7 reads), settings-keys:114/163/183 (writes keys), pulse-api:41/595, whisper-api:237/365/400, wishpedia-generate:269 | The global provider/model/key switchboard. Client reads go through the `LLM_SETTINGS_CLIENT_COLUMNS` whitelist in src/hooks/useLLMSettings.ts (key columns deliberately excluded). Flipping `active_image_provider` instantly reroutes Pixel image generation. |
| `osha_audit_logs` table | promptor/index.ts:652 | pixel-chat/index.ts:1255, 1475, 1578 | osha-chat (10 insert sites, e.g. 1458, 2485), manage-users:123/184/228 | Unified audit trail despite the Osha-specific name (per the AGENT-008/AGENT-009 comments quoted above). Schema change touches 4 functions. |
| `promptor_settings` | Owner: promptor/index.ts:374-401 (get/save), 431-435 (load for generation) | n/a | osha-chat:1978 reads it to describe Promptor's per-user config in Osha's system prompt | Renaming a column silently changes what Osha reports about Promptor. |
| `pixel_settings` | n/a | Owner: pixel-chat/index.ts:611-670 (get/save), 947-951 (load); client via src/hooks/pixel/usePixelSettings.ts | osha-chat:1979 reads it for the same registry purpose | Same cross-read hazard as above. |
| `agent_settings` | Read for Promptor's registry status | Read for Pixel's registry status | Written by Nexus (src/hooks/useAgentSettings.ts:34/50/64 via src/components/nexus/AgentConfigPanel.tsx); read by osha-chat:1977 | Nexus is the writer, Osha the prompt-time reader. |
| `user_permissions` (`ai_can_access_promptor`, `ai_can_access_pixel`) | Gate at src/app/(protected)/ai-agents/promptor/page.tsx:9 | Gate at src/app/(protected)/ai-agents/pixel/page.tsx:9 | All agent pages (nexus/osha/pulse/whisper too); EditUserSheet writes them | Route-level only (PERM-01); the edge functions do not re-check these flags. |
| `promptor_runs` | Edge inserts (promptor/index.ts:639-643); client reads/deletes directly via supabase-js under RLS (src/hooks/promptor/usePromptorRuns.ts:9-13, 29-33, 45-49) | n/a | n/a | Every optimize-draft from Osha/Pixel/Pulse also lands a row here (mode `optimize-draft`). |
| `pixel_messages`, `pixel_blueprints` | n/a | Edge owns writes/clear (pixel-chat/index.ts:674-690, 693-787, 1245-1248, 1468-1471, 1571-1574); client reads `pixel_messages` directly (src/hooks/pixel/usePixelMessages.ts:17-21) and deletes single messages directly (lines 67-71) | n/a | Mixed edge/direct access pattern; RLS is the real boundary. |
| Storage: `files` bucket + `files`/`sectors` tables | n/a | pixel-chat uploads outputs, mints 24h signed URLs, auto-creates the `'Pixel AI'` sector (1210-1241, 1429-1464) | Files Manager UI owns these tables | Bucket policy changes break Pixel output viewing (this already happened once, see the BUGFIX comment at pixel-chat/index.ts:1439-1441). |
| Storage: `brain-documents` bucket | n/a (Promptor sees Brain only as text via search-knowledge) | pixel-chat signed reads (151-158); SavePixelToBrainDialog writes (src/components/pixel/SavePixelToBrainDialog.tsx:80-82) | Brain upload/indexing pipeline (process-ocr, process-embeddings) | |
| Storage: `wishpedia-media` bucket + `wishpedia_entry_images` table | n/a | pixel-chat/index.ts:209-218 (public URLs as canonical references) | Wishpedia module, wishpedia-generate | |

### Client-side shared infrastructure

| Item | Used by Promptor | Used by Pixel | Others | Notes |
|---|---|---|---|---|
| src/lib/apiHelpers.ts (`getAuthHeaders`, `edgeFunctionUrl`) | callPromptor (src/hooks/promptor/usePromptorSettings.ts:2, 5) | All 4 pixel hooks (usePixelSend.ts:3/7, usePixelMessages.ts:4/8, usePixelSettings.ts:3/7, usePixelBlueprints.ts:3/7) | Osha, Pulse, Whisper hooks | `getAuthHeaders` does a `getUser()` server round-trip before every call (apiHelpers.ts:14-24); a change here affects every authenticated edge call in the app. |
| src/config/api.ts | Via `EDGE_FUNCTIONS_URL` only | Via `EDGE_FUNCTIONS_URL` only | `AI_CHAT_ENDPOINT`, `MANAGE_USERS_ENDPOINT`, `SETTINGS_KEYS_ENDPOINT`, `PULSE_API_ENDPOINT`, `WHISPER_API_ENDPOINT` named constants (lines 27-31) | There is no `PROMPTOR_ENDPOINT` or `PIXEL_ENDPOINT` constant; both agents build URLs with `edgeFunctionUrl('promptor')` / `edgeFunctionUrl('pixel-chat')`. |
| `@/hooks/promptor` barrel (src/hooks/promptor/index.ts) | Owner | Imports `useOptimizeDraft` (PixelStudio.tsx:19) | Osha (useOshaChatController.ts:18), Pulse (PulseComposer.tsx:20, PulseBulkGenerator.tsx:18) | Breaking the barrel exports breaks three other agents' compile. |
| src/data/agents.ts (`AI_AGENTS`) | Its own entry (lines 51-65) | Its own entry (lines 81-94) plus SavePixelToBrainDialog.tsx:16, 48 uses the full list as Brain save destinations | Navigation (`getAgentForNavigation`), agent grid, Header | Single source of truth for agent metadata. |
| src/components/ToolProtectedRoute.tsx + src/hooks/useUserPermissions.ts | promptor page | pixel page | nexus/osha/pulse/whisper pages | Deny only when the flag is explicitly `false`; admins get an all-true permissions object (useUserPermissions.ts:62-86, ToolProtectedRoute.tsx:42-45). |
| Auth chain: middleware.ts + src/app/(protected)/layout.tsx | Sits in front of the promptor page | Sits in front of the pixel page | Every protected route | middleware.ts:8-10 refreshes the Supabase session on every request via `updateSession` (src/lib/supabase/middleware.ts); the (protected) layout runs a server-side `supabase.auth.getUser()` and `redirect('/login')` before any client JS (src/app/(protected)/layout.tsx:19-24, SEC-019/UI-026). Both agents' pages exist only behind this chain. |
| settings-keys edge fn + `useProviderKeyStatus`/`useProviderKeyActions` | Not imported by any Promptor client file | Not imported by any Pixel client file | Nexus (NexusHeader, ProviderStatus, useNexusConsoleController), Settings (LLMProvidersSettings, ApiKeyEditor, PulseSettings), Pulse overview | Indirect coupling only: the `llm_settings.openai_api_key`/`gemini_api_key` columns settings-keys writes are read by both promptor (461-462) and pixel-chat (982-983) edge functions with env fallback. |
| src/config/llmModels.ts | Not imported by Promptor components | Not imported by Pixel components | useLLMSettings, OshaSettings, WhisperSettingsTab, PulseReplyModel | Model pickers; Promptor/Pixel inherit models purely from `llm_settings` server-side. |
| TanStack Query cache keys | `['promptor-settings']`, `['promptor-runs']` | `['pixel-settings', userId]`, `['pixel-messages', userId]` | n/a | `useRunPromptor` invalidates `promptor-runs` (useRunPromptor.ts:18); a wand-button `optimize-draft` deliberately invalidates nothing (useOptimizeDraft.ts:8-9 comment). |

---

# PART 4: EXTENSION SURFACE FOR A FUTURE CINEMA LAYER

## 14. Extension surface for a future CINEMA layer

What exists today, strictly the plug-in points a new agent/mode would occupy.

**1. Agent metadata entry: src/data/agents.ts**

New agents are one `AgentMetadata` object appended to `AI_AGENTS` (interface at lines 19-33). Full existing entry for reference (lines 81-94, verbatim):

```ts
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'Visual Creator AI',
    description: 'Creates AI-generated images and videos for social media posts, presentations, and more.',
    icon: Palette,
    color: 'from-pink-500 to-rose-600',
    gradient: 'from-pink-500/10 via-rose-500/5 to-pink-600/10',
    glowColor: 'bg-pink-500/30',
    iconColor: 'text-pink-500',
    tags: ['Images', 'Videos', 'Creative'],
    status: 'active',
    path: '/ai-agents/pixel',
  },
```

`status` is `'active' | 'inactive' | 'coming_soon'` (line 17). Helpers `getAgentById`, `getActiveAgents`, `getAgentForNavigation` (lines 140-155) drive navigation and the SavePixelToBrainDialog destination list automatically.

**2. Route registry: src/routes/routeConfig.ts**

One `RouteConfig` entry in `AI_AGENT_ROUTES` (lines 43-98). Existing pattern (lines 62-70, verbatim):

```ts
  {
    path: '/ai-agents/pixel',
    title: 'Pixel',
    description: 'Creates AI-generated images and videos for social media posts, presentations, and more.',
    icon: Palette,
    iconColor: 'text-pink-500',
    toolKey: 'ai_agents',
    isComingSoon: false,
  },
```

`isComingSoon: true` routes feed `ALL_COMING_SOON_ROUTES` (lines 244-251), which powers the generic coming-soon page (this is how ATLAS exists today, lines 90-97).

**3. Route folder: `src/app/(protected)/ai-agents/<id>/page.tsx`**

Current folders: `atlas`, `nexus`, `osha`, `pixel`, `promptor`, `pulse`, `whisper` (plus the index `page.tsx`). The whole page wrapper pattern (src/app/(protected)/ai-agents/pixel/page.tsx, verbatim, complete file):

```tsx
import type { Metadata } from 'next';
import { ToolProtectedRoute } from "@/components/ToolProtectedRoute";
import PixelAgent from "@/screens/PixelAgent";

export const metadata: Metadata = { title: 'Pixel | Fortun Wishnet' };

export default function Page() {
  return (
    <ToolProtectedRoute toolKey="ai_agents" agentKey="ai_can_access_pixel">
      <PixelAgent />
    </ToolProtectedRoute>
  );
}
```

The screen component lives in src/screens/ (e.g. src/screens/PixelAgent.tsx, src/screens/PromptorAgent.tsx), with feature components under `src/components/<agent>/` and hooks under `src/hooks/<agent>/` plus a root-level back-compat shim (src/hooks/usePixel.ts pattern).

**4. Nexus gradient key: src/components/nexus/agentGradients.ts (full map, verbatim)**

```ts
export const AGENT_GRADIENTS: Record<string, string> = {
  nexus:    'linear-gradient(135deg, #84cc16, #16a34a)',
  promptor: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
  osha:     'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  whisper:  'linear-gradient(135deg, #3b82f6, #4f46e5)',
  pulse:    'linear-gradient(135deg, #ec4899, #d946ef)',
  pixel:    'linear-gradient(135deg, #ec4899, #f43f5e)',
  atlas:    'linear-gradient(135deg, #14b8a6, #059669)',
};

export const AGENT_GRADIENT_FALLBACK = 'linear-gradient(135deg, #6b7280, #4b5563)';
```

**5. Header breadcrumb title: src/components/layout/Header.tsx**

`routeLabels` map, lines 35-43, contains one line per agent, e.g. `'/ai-agents/pixel': 'Pixel',` (line 41). A missing entry means a missing breadcrumb label, nothing else.

**6. Permission gate: agentKey + `user_permissions.ai_can_access_*`**

- `ToolProtectedRoute` accepts optional `agentKey?: AgentAccessKey`; access is denied only when the flag is explicitly `false` (src/components/ToolProtectedRoute.tsx:12-15, 42-45). Admins bypass via the hardcoded all-true object in src/hooks/useUserPermissions.ts:62-86 (a new column must be added there too, or admins would fall through to `undefined`, which still passes since only `=== false` denies).
- The key union (src/hooks/useUserPermissions.ts:173-182, verbatim):

```ts
// Per-agent boolean access flags (PERM-01: enforced at the route level)
export type AgentAccessKey =
  | 'ai_can_access_nexus'
  | 'ai_can_access_promptor'
  | 'ai_can_access_osha'
  | 'ai_can_access_pixel'
  | 'ai_can_access_pulse'
  | 'ai_can_access_whisper'
  | 'ai_can_access_muse'
  | 'ai_can_access_atlas';
```

- DB columns exist on `user_permissions` (src/integrations/supabase/types.ts:1723-1730: `ai_can_access_atlas`, `ai_can_access_whisper`, `ai_can_access_muse`, `ai_can_access_nexus`, `ai_can_access_osha`, `ai_can_access_pixel`, `ai_can_access_promptor`, `ai_can_access_pulse`; all `boolean | null`, DB default true per the ToolProtectedRoute comment). Mirrored in src/types/user.ts:54-61. Note `ai_can_access_muse` exists in types and the admin object but has no route, page, or agents.ts entry. Muse is an abandoned sibling agent and the codebase's clearest precedent for an orphaned agent footprint: migration supabase/migrations/20260218014246_e8945415-408a-4ea3-a962-fc2436c213a9.sql creates `muse_settings` and `muse_messages` with per-user RLS plus a `trim_muse_messages` trigger (lines 2-83), and supabase/migrations/20260219155757_d7b3aff4-4921-4191-9441-a7ae9bc8ea60.sql:5-6 seeds an `agent_settings` row `('muse', true, 'openai', 'gpt-4o', 0.9, 4096, 'You are Muse, a creative director. ...')`. Today the only `muse_*` reference in src/ is the generated types file; no screen, hook, component, or edge function touches the tables. A CINEMA layer that gets abandoned would leave exactly this residue.
- Adding a column historically required an `ALTER TABLE user_permissions` migration plus hand-editing types.ts (per the ATLAS precedent, the column `ai_can_access_atlas` already existed with default true).

**7. Admin toggle UI: src/components/settings/EditUserSheet.tsx**

The AI Agents advanced options block (lines 88-103, verbatim):

```tsx
  { 
    key: 'ai_agents' as const, 
    label: 'AI Agents', 
    icon: Bot, 
    color: 'text-cyan-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'ai_can_access_nexus', label: 'Nexus (Control Center)', icon: Settings2 },
      { key: 'ai_can_access_promptor', label: 'Promptor (Prompts)', icon: Wand2 },
      { key: 'ai_can_access_osha', label: 'Osha (Assistant)', icon: Bot },
      { key: 'ai_can_access_whisper', label: 'Whisper (Podcast)', icon: Mic },
      { key: 'ai_can_access_pulse', label: 'Pulse (Social)', icon: Share2 },
      { key: 'ai_can_access_pixel', label: 'Pixel (Visuals)', icon: Palette },
      { key: 'ai_can_access_atlas', label: 'ATLAS (Operations)', icon: Boxes },
    ]
  },
```

The same key must also be added to the defaults object (lines 161-167) and the save payload (lines 210-216).

**8. Osha's agent registry: supabase/functions/osha-chat/index.ts**

Three places per agent:
- `agentMeta` entry (lines 237-245). Shape of one entry (line 242, verbatim):

```ts
    whisper: { name: 'Whisper', role: 'Podcast Generator AI', capabilities: 'Generates podcast scripts with AI and produces studio-quality audio narration using the ElevenLabs API. (Coming Soon — not yet active)' },
```

- Optional `agentConfigKeys` entry if Osha should report the agent's per-user settings (lines 259-263), backed by a direct table read in the Promise.all at lines 1976-1981.
- Status resolution: live row from `agent_settings`, else a hardcoded coming-soon list: `(agentId === 'whisper' || agentId === 'pulse' || agentId === 'atlas' ? '🔜 Coming Soon' : '⚪ Not configured')` (line 268). A CINEMA agent not in `agent_settings` and not in this list renders as "Not configured" in Osha's platform knowledge.

**9. Nexus config surface**

- `defaultSystemPrompts` map keyed by agent id in src/components/nexus/AgentConfigPanel.tsx:22-30 (Promptor/Pixel entries quoted in the inter-agent section; the panel persists overrides to `agent_settings` via `useUpsertAgentSettings`, lines 16, 110-131).
- Prompt library templates carry `agentIds: string[]` (src/components/nexus/promptLibraryConstants.ts, e.g. lines 186-195).

**10. Edge function creation pattern (as implemented by promptor and pixel-chat)**

Standard skeleton, from supabase/functions/promptor/index.ts:9-20 (verbatim):

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0';
import { sanitizeForPrompt } from '../_shared/sanitize.ts';
import { TOKEN_BUDGETS } from '../_shared/token-budgets.ts';

import { getCorsHeaders } from '../_shared/cors.ts';
import { createRateLimiter } from '../_shared/rate-limit.ts';

// SEC-004: 15 requests per minute per user
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15 });

// SEC-003: CORS tightened from wildcard to allowed origins list
let corsHeaders: Record<string, string> = getCorsHeaders(null);
```

Then inside `Deno.serve`: per-request `corsHeaders = getCorsHeaders(req.headers.get('Origin'))` and OPTIONS short-circuit (promptor/index.ts:326-330); Bearer-token check; anon-key client with the caller's Authorization header; `supabaseUser.auth.getUser()` validation returning 401 on failure (lines 338-357); `rateLimiter.check(userId)` returning 429 with `Retry-After: 60` (lines 360-365); a service-role `supabaseAdmin` client (line 367); single JSON body with an `action` string dispatching all sub-operations (line 369-370). pixel-chat follows the identical sequence (lines 555-605) with a `RequestBody` action union (lines 70-83). Admin-gated functions additionally call the `is_admin` RPC (pattern in pulse-api/whisper-api/wishpedia-generate; UNVERIFIED line numbers here, not read in this pass). Deployment lesson recorded in project CLAUDE.md: MCP deploys need the `<name>/index.ts` plus sibling `_shared/` bundle layout.

**11. llm_settings model dispatch points**

- Columns on the single `llm_settings` row: `active_text_provider`, `active_image_provider`, `active_video_provider` (src/integrations/supabase/types.ts:580-582), plus per-provider model columns (`openai_text_model`, `openai_image_model`, `openai_video_model`, `gemini_*`, `fal_*`). Client edits go through the Active Provider Selection selects in src/components/settings/LLMProvidersSettings.tsx:431-469+ and the `LLM_SETTINGS_CLIENT_COLUMNS` whitelist (src/hooks/useLLMSettings.ts:49-52).
- Dispatch in agent edge functions: promptor reads `active_text_provider` (promptor/index.ts:460-465); pixel-chat reads `active_image_provider` (1289-1292) and `active_video_provider` (1059-1062). A CINEMA-style media agent would read the same columns.
- ai-chat (Nexus console) does NOT read the `active_*` columns; provider and model arrive in the request body (`const selectedModel = model || (provider === 'openai' ? settings.openai_text_model : settings.gemini_text_model);`, ai-chat/index.ts:500) and are validated against hardcoded capability allowlists (ai-chat/index.ts:30-42, verbatim):

```ts
const OPENAI_TEXT_CAPABLE = ['gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'gpt-4o', 'gpt-4o-mini'];
const OPENAI_DEEP_RESEARCH_CAPABLE = ['o3-deep-research', 'o4-mini-deep-research'];
const OPENAI_IMAGE_CAPABLE = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'];
const OPENAI_VIDEO_CAPABLE = ['sora-2', 'sora-2-pro'];
```

```ts
const GEMINI_TEXT_CAPABLE = ['gemini-3.1-pro-preview', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
const GEMINI_IMAGE_CAPABLE = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
const GEMINI_VIDEO_CAPABLE = ['veo-3.1-generate-preview'];
```

```ts
const FAL_IMAGE_CAPABLE = ['fal-ai/flux-pro/v1.1-ultra', 'fal-ai/flux-pro/v1.1', 'fal-ai/flux/dev', 'fal-ai/flux/schnell', 'fal-ai/flux-2-max', 'fal-ai/ideogram/v3', 'fal-ai/recraft/v4/text-to-image', 'fal-ai/imagen4/preview'];
const FAL_VIDEO_CAPABLE = ['fal-ai/kling-video/v3/pro/text-to-video', 'fal-ai/veo3.1', 'fal-ai/veo3.1/fast', 'fal-ai/wan/v2.7/text-to-video', 'bytedance/seedance-2.0/text-to-video'];
```

Enforcement is strict for image/video (hard error, lines 792, 861, 992, 1052, 1143, 1248) but warn-and-proceed for text (lines 505-510). The client-side model registry mirror lives in src/config/llmModels.ts (consumed by useLLMSettings, OshaSettings, WhisperSettingsTab, PulseReplyModel; not by Promptor/Pixel components).

**12. Token budget registration: supabase/functions/_shared/token-budgets.ts (full registry, verbatim)**

```ts
export const TOKEN_BUDGETS = {
  /** Standard chat response (Osha, Pixel text mode, ai-chat) */
  CHAT_RESPONSE: 8192,

  /** Long-form content generation (Promptor create/optimize) */
  CONTENT_GENERATION: 4096,

  /** Short classification / routing decisions */
  CLASSIFICATION: 500,

  /** In-place chat prompt optimization for Osha/Pixel inputs (Promptor optimize-draft action) */
  PROMPT_OPTIMIZE: 800,

  /** Ultra-short: intent detection, yes/no, single-label */
  INTENT: 200,

  /** Image prompt generation (Pixel prompt-building step) */
  IMAGE_PROMPT: 1024,

  /** OCR text extraction from images */
  OCR_EXTRACTION: 4096,

  /** General-purpose default when no specific budget applies */
  DEFAULT: 2048,
} as const;

export type TokenBudgetKey = keyof typeof TOKEN_BUDGETS;
```

A new agent adds a named constant here rather than hardcoding `max_tokens` (the AGENT-011 convention stated in the file header).

**13. Prompt assembly hooks: supabase/functions/_shared/system-prompts.ts**

The complete export surface is two functions backed by the `system_prompts` table (`agent_id`, `prompt_key`, `content`, `version`, `is_active` per the local interface at lines 9-14). Signatures (verbatim):

```ts
export async function getSystemPrompt(
  supabaseAdmin: ReturnType<typeof createClient>,
  agentId: string,
  promptKey: string,
  fallback: string,
): Promise<string> {
```

```ts
export async function getAgentPrompts(
  supabaseAdmin: ReturnType<typeof createClient>,
  agentId: string,
  fallbacks: Record<string, string>,
): Promise<Record<string, string>> {
```

Both fall back to the hardcoded defaults on any error or empty result; `getAgentPrompts` deduplicates to the highest `version` per `prompt_key` (lines 62-72). Only osha-chat consumes this today (osha-chat/index.ts:17, 1994); promptor and pixel-chat build their system prompts entirely in code (`buildSystemPrompt` at promptor/index.ts:191-321, `buildPixelSystemPrompt` at pixel-chat/index.ts:303-423), so a CINEMA agent could use either pattern, both exist.

**14. Usage quota registration (currently ai-chat only)**

supabase/functions/_shared/usage-quota.ts:12-21 declares per-action daily limits including agent-named keys (`'pixel-chat': 50`, `'promptor-generate': 50`, `'osha-chat': 100`); a new action key defaults to 100/day (`DAILY_LIMITS[action] ?? 100`, line 39). As noted above, only ai-chat imports `checkQuota`/`logUsage`, so registering a key has no effect unless the new function also imports the module.
