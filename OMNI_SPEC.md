# OMNI BUILD SPEC (reference copy)

> This file is the canonical reference for the Omni build. It reproduces Sam's original
> instruction prompt verbatim (below the "ORIGINAL PROMPT" line), plus the decisions
> approved at Phase 0 kickoff. If a fresh session picks up this work, read this file,
> MEMORY.md, and AGENT_RECON_PROMPTOR_PIXEL.md before writing any code.

## APPROVED DECISIONS (Phase 0 kickoff, 2026-06-12)

1. Conflict resolution (rule 3 vs Phase 0 touchpoints): additive ONE-LINE data entries in
   shared registration surfaces are sanctioned: osha-chat agentMeta line, agentGradients.ts
   line, Header.tsx label, AgentConfigPanel defaultSystemPrompts line, EditUserSheet toggle.
   No behavioral changes to other agents. The osha-chat edit is staged in Phase 0 but its
   CLI byte-exact redeploy is DEFERRED to Phase 8.
2. RLS: omni_settings / omni_runs / omni_assets are owner-scoped (auth.uid() = user_id).
   content_library_items / content_library_posts are ADMIN-ONLY shared (is_admin pattern),
   consistent with the surrounding Pulse workspace tables.
3. Visual identity: id `omni`, role "Multimodal Creation AI", icon `Orbit` (lucide),
   gradient cyan-500 to violet-600.
4. fal integration: no npm client; the edge runner uses raw fetch against the fal queue
   REST API (queue.fal.run), key from llm_settings.fal_api_key with FAL_KEY env fallback
   (plumbing already exists from Batch Tasks 6/10; verified live).
5. framer-motion: new dependency, latest stable, installed in Phase 0.
6. Omni media outputs reuse the private `files` bucket under {userId}/omni-images/ plus an
   auto-created "Omni AI" sector; signed URLs only (24h), never getPublicUrl.
7. Branch: feat/omni off fix/vercel-install HEAD. One descriptive commit per phase.
8. Edge function `omni`: deployed with default verify_jwt plus full in-function bearer auth
   (getUser), per-user rate limit 30/min (client polling in later phases needs headroom),
   service-role client for DB work, single action-dispatch body.
9. Heart rules for Omni: one clean fetchHeartRules, agent key "omni", error-checked (log
   and surface, never silently degrade to zero rules), sorted high priority first in code
   (rank map critical > high > medium > low, sort_order tiebreaker) because priority is a
   text column.
10. An agent_settings row is seeded for omni so the Nexus toggle and Osha status resolution
    work like other active agents.

## REQUIRES HUMAN (running list, updated each phase)

- fal.ai API key (Settings > ApiKeyEditor for fal, or FAL_KEY edge secret). Needed for the
  Phase 1 live end-to-end test generation. Without it the fal layer fails gracefully.
- Social platform credentials and app review (Facebook, Instagram, X, TikTok) for real
  publishing in Phase 4. Connectors stop honestly at the credential gate with status Queued.

---

# ORIGINAL PROMPT (verbatim)

You are building a new AI agent named Omni inside the WishNet codebase. This is a large, delicate build. Read this entire spec before planning. Then execute it phase by phase under the operating rules below.

═══════════════════════════════════════════
OPERATING RULES (apply to the whole build)
═══════════════════════════════════════════

1. PHASED EXECUTION. Work strictly in the phases defined at the end of this spec. At the start of each phase, present a short written plan (files to create or modify, tables, risks) and STOP. Wait for explicit approval before writing code. After approval, execute, then commit with a descriptive message, then stop and report before the next phase.
2. READ FIRST. Before Phase 0 planning, read AGENT_RECON_PROMPTOR_PIXEL.md at the repo root in full. It documents the exact extension surface for a new agent (agents.ts entry, routeConfig, page wrapper, permission column, EditUserSheet, Osha registry, gradients, Header labels, edge function skeleton, token budgets, system-prompts mechanism). Follow those documented patterns exactly. When this spec and the recon conflict, say so in the phase plan instead of guessing.
3. DO NOT TOUCH other agents. Never modify the Promptor, Pixel, Osha, Nexus, or Whisper edge functions, screens, components, or hooks. Pulse may be modified ONLY to add the Content Library section defined below. Reusing existing hooks (for example useOptimizeDraft) by importing them is allowed and encouraged; changing them is not.
4. REUSE SHARED MODULES. cors.ts, rate-limit.ts, sanitize.ts, token-budgets.ts, system-prompts.ts from supabase/functions/_shared/. New token budgets get named constants in token-budgets.ts, never hardcoded numbers.
5. SECURITY BASELINE. Every edge action: bearer auth, getUser validation, per-user rate limiting, service-role client for DB work, sanitizeForPrompt on all retrieved content before prompt interpolation. All new tables get owner-scoped RLS (auth.uid() = user_id pattern). All private-bucket outputs use createSignedUrl, never getPublicUrl (the recon documents why: the files bucket is private and getPublicUrl 403s).
6. HEART RULES, CORRECT PATTERN. Omni must obey all Heart rules. Implement the fetch with error checking (log and surface, never silently degrade to zero rules) and ORDER BY priority so high-priority rules are injected first and never dropped. Do not copy the legacy divergent fetch patterns the recon flags; write one clean fetchHeartRules for Omni with agent key "omni".
7. RAG, FULL ACCESS. Omni has full access to the entire vector store: match_knowledge over brain_document AND wishpedia_entry source types with generous limits, plus the direct heart_rules fetch above. Brain image chunks resolve through short-lived signed URLs as the recon documents.
8. CREDENTIALS ARE HUMAN-GATED. Anything requiring external credentials (fal.ai API key, Meta, Instagram, X, TikTok publishing APIs) is implemented behind a clean interface and listed under REQUIRES HUMAN in the phase report. Never invent, hardcode, or fake credentials. Verify whether llm_settings already has a fal API key column; if absent, add it by migration plus settings-keys and ApiKeyEditor support, and flag it in the Phase 0 plan.
9. STYLE. TypeScript strict, Tailwind + shadcn, TanStack Query, framer-motion for transitions, lucide-react icons. All UI copy in English. No em dash character anywhere in code, comments, UI copy, or docs.
10. NEW DEPENDENCIES. List any new npm package in the phase plan before installing. Expected: @fal-ai/client (or @fal-ai/serverless-client) and an image processing library for the repurposing pipeline (sharp on the edge is not available in Deno; use a Deno-compatible image library or do client-side canvas processing; decide and justify in the Phase 4 plan).

═══════════════════════════════════════════
OBJECTIVE
═══════════════════════════════════════════

Ship Omni: a premium full-screen multimodal creation agent with a four-tile entry screen (Brainstorming, Images, Audios, Videos), a complete Images track with six modes, full fal.ai integration through a dynamic model catalog, full RAG and Heart compliance, Promptor optimization on every text input, and a new Content Library section in Pulse with instant and scheduled posting.

═══════════════════════════════════════════
PRODUCT SPEC
═══════════════════════════════════════════

── ENTRY AND SHELL ──
- Route /ai-agents/omni following the page wrapper pattern in the recon, gated by a new ai_can_access_omni permission column (migration + types.ts + useUserPermissions admin object + EditUserSheet advanced options + save payload + defaults, exactly as the recon documents for existing agents).
- First screen: four large tiles: Brainstorming, Images, Audios, Videos. Audios and Videos render as elegant Coming Soon tiles for now (specs arrive later); their routes and state slots must exist so they plug in without rework.
- Full-screen capability and a dark mode toggle exactly like Pixel: replicate the data-pixel-theme + localStorage pattern as data-omni-theme.
- Visual quality bar: at or above the Pixel screen. Smooth framer-motion transitions between wizard steps, premium icons, polished loading, empty, error, and disabled states on every screen. The design must feel like a flagship feature of WishNet.

── FAL.AI INTEGRATION LAYER (global, used by all modes) ──
- Full integration with fal.ai and ALL of its models, no exceptions, all invocable and working.
- Mechanism: a dynamic model catalog module that fetches or maintains the complete fal model registry with capability metadata per model (text-to-image, image-to-image, upscale, and later audio and video), input schema notes, and display info. Plus one generic invocation runner that submits any catalog model through the fal queue API, handles polling or webhooks, normalizes results, and fails gracefully with a clear user-facing message when a model has an unsupported input schema. New fal models must become available without code changes wherever the catalog can be fetched dynamically; where a static registry is unavoidable, structure it as one data module that is trivial to update and say so in the phase plan.
- All fal calls run server-side in the omni edge function; the key never reaches the client.

── PROMPTOR EVERYWHERE ──
- Every place the user types a message, prompt, description, or change request offers one-click Promptor optimization, reusing the existing optimize-draft action through the existing useOptimizeDraft hook, exactly like Pixel's wand button.

── MEDIA AND LIBRARIES ──
- "Media assets library" means the existing Files system (files bucket + sectors). Omni outputs save under an auto-created "Omni AI" sector, mirroring Pixel's save pattern with 24h signed URLs.
- "Content Library" is the NEW section built inside Pulse (spec below). Finalized workflow outputs save there.

── IMAGES TRACK: SIX MODES ──
Selecting Images smoothly transitions to a mode chooser with: Brainstorming, Omni Images, Surprise Me, Transform and Upscale Images, Images Repurposing, History. Each mode is its own sequence.

MODE 1: OMNI IMAGES (build first)
Wizard, every step persisted (see WORKFLOW ENGINE):
1. Describe what to generate or define the images objective.
2. Promptor optimizes the request into a well-structured prompt; user reviews and locks it.
3. Model selection: full list of fal text-to-image models from the catalog. User picks one OR MULTIPLE models. Per selected model, set the number of variants, 1 to 10. Multi-model selection exists to compare results across models.
4. Recap screen of everything about to be generated.
5. Live generation screen: generates one selected model at a time, images appearing one by one as each variant completes (progressive rendering, per-variant job records, client polling).
6. Per generated image: Regenerate a variation (ask the user what to change, regenerate live with the image's ORIGINAL model), Discard, Download, Save to library, or Select to continue.
7. For selected image(s): Promptor suggests several social media descriptions. User can proceed with one, discard, or regenerate with change notes. Lock to continue.
8. Choose target social networks, one or more: Facebook, Instagram, X, TikTok.
9. Per selected network, choose the proper dimension presets (stories, square posts, 16:9 posts, etc.). Presets are network-specific; build a per-network dimension registry covering the standard formats of each platform.
10. Generate the repurposed image set in every selected size and dimension for every selected image. Primary implementation: deterministic resize and crop pipeline, with fal image-to-image or outpainting models for aspect-ratio extension where cropping would damage the subject. Structure this behind a repurposing interface so a Canva API integration can be added later without rework; do not block on Canva now.
11. Approval screen for the repurposed selection.
12. Finalize: save the approved set (images + chosen description + per-network variants) into the Pulse Content Library.

MODE 2: TRANSFORM AND UPSCALE IMAGES
1. Upload an image or choose one from the media assets library (images only).
2. On upload or selection, the selected analysis provider (OpenAI or Gemini vision, with model choice) analyzes and describes the image, concludes how it relates or does not relate to the Fortun universe using the RAG knowledge base, and suggests improvements: upscale resolution, or tweak elements to make it more aligned with the universe.
3. User describes the transformation (Promptor optimizes the message).
4. Choose one or many fal image-to-image or upscale models, with variant count per selected model.
5. Generate (same live screen pattern), review, lock.
6. Save to the Pulse Content Library, with the option to continue into the same repurposing workflow as Omni Images (steps 7 to 12 above).

MODE 3: IMAGES REPURPOSING
1. Select one or more images from the media assets library, upload new image(s), or select from the Content Library.
2. Run the Omni Images repurposing workflow (descriptions, networks, dimensions, generation, approval).
3. Finalize by saving everything to the Pulse Content Library.

MODE 4: HISTORY
- Full history of all image-mode runs and uses, every mode.
- Advanced control: retake any history entry to work on it again, or RESUME a workflow at ANY step of its sequence (this is why every step persists state).
- Clear the whole history or delete selected entries, with confirmation.

MODE 5: SURPRISE ME (build after modes 1 to 4)
- Omni mines the RAG knowledge base (Brain + Wishpedia, Heart-compliant) and proposes concrete creation ideas.
- The user picks an idea; Omni routes them into the proper mode with its fields prefilled from the idea.

MODE 6: BRAINSTORMING (build last)
- Chat interface with file attachments and one-click Promptor optimization on messages, like Pixel.
- Provider and model picker: OpenAI, Gemini, or any other available provider, with model-level selection (for example gpt-4.1 or gemini-3.1), driven by the existing llm model registries.
- The user shares an idea; Omni discusses and develops it with them, grounded in RAG.
- When the user locks the idea, Omni redirects them to the proper mode with fields prefilled.
- From Brainstorming the user can switch to Surprise Me mode.

── WORKFLOW ENGINE (cross-cutting, built in Phase 0) ──
- Every wizard run is a persisted state machine: an omni_runs row storing mode, current step, full step payload snapshots (prompt, locked prompt, model selections, variant counts, generated asset refs, chosen descriptions, network and dimension selections, approvals), status, timestamps.
- Generated assets get per-variant records (omni_assets) linking storage paths, model id, parent run, parent image for variations.
- This engine is what makes History retake and resume-at-any-step real. Design the step schema once, use it for all modes.

── PULSE CONTENT LIBRARY (new section inside Pulse) ──
- A new "Content Library" section in the Pulse agent where finalized Omni outputs land and can be consulted later: items with their images, descriptions, target networks, and per-network dimension variants. Browsing, filtering, search, preview. Best possible UI and UX; treat it as a flagship feature.
- Posting system on top of the library: for any item, instantly post it to its destined social network, or schedule it for future posting.
- Implementation: content_library_items and content_library_posts tables (network, scheduled_at, status: draft, queued, posted, failed), a dispatch edge function, and Supabase scheduled execution (pg_cron or scheduled functions) that fires due posts.
- Network publishing goes through a connector interface per platform (Facebook, Instagram, X, TikTok). Actual publishing requires platform credentials and app review; build the connectors, the queue, and honest UI states (Not Connected, Queued, Scheduled, Posted, Failed), and list the credential setup steps under REQUIRES HUMAN. Do not fake posting.

═══════════════════════════════════════════
BUILD PHASES (stop for approval before each)
═══════════════════════════════════════════

PHASE 0, SCAFFOLDING: read the recon; register Omni across every documented touchpoint (agents.ts, routeConfig, page wrapper + screen shell, gradients map, Header labels, Osha agentMeta, permission column migration + types + admin object + EditUserSheet); omni edge function skeleton with action dispatch; fal key plumbing verification; core tables with RLS (omni_runs, omni_assets, omni_settings, content_library_items, content_library_posts); entry screen with the four tiles (Audios and Videos as Coming Soon); full-screen + dark mode shell.
PHASE 1, FAL LAYER: model catalog module + generic invocation runner + capability metadata + a verified end-to-end test generation through the queue API.
PHASE 2, OMNI IMAGES: the complete 12-step wizard end to end, including live progressive generation, per-image actions, descriptions, networks, dimensions, repurposing pipeline, approval, and save to Content Library tables.
PHASE 3, TRANSFORM AND UPSCALE: vision analysis with universe-relation conclusion, transformation flow, multi-model variants, save + optional repurposing handoff.
PHASE 4, PULSE CONTENT LIBRARY + REPURPOSING MODE: the full Pulse section UI, browsing and consultation, the posting and scheduling system with dispatch + cron + connector interfaces, plus Mode 3 (Images Repurposing) wired through it.
PHASE 5, HISTORY: registry views, retake, resume-at-any-step on top of the workflow engine, clear and selective delete.
PHASE 6, SURPRISE ME: RAG-mined idea suggestions routing into modes with prefilled fields.
PHASE 7, BRAINSTORMING: the chat mode with provider and model pickers, attachments, Promptor optimization, lock-and-redirect with prefill, switch to Surprise Me.
PHASE 8, POLISH + QA: full pass on transitions, states, responsiveness, dark mode, error paths; lint + build green; final report.

═══════════════════════════════════════════
ACCEPTANCE CRITERIA
═══════════════════════════════════════════

- Build and lint pass at the end of every phase; one descriptive commit per phase.
- Omni appears correctly in navigation, the agent grid, permissions UI, and Osha's registry, per the recon touchpoints.
- Every fal model in the catalog is invocable through the generic runner; unsupported schemas fail gracefully with a clear message, never a silent empty success.
- Heart rules are fetched with error handling and priority ordering and injected into every Omni prompt; RAG retrieval over Brain and Wishpedia works in every mode that uses it.
- The Omni Images wizard runs end to end: multi-model multi-variant live generation, per-image actions, descriptions, network and dimension selection, repurposed set generation, approval, and items landing in the Content Library.
- A workflow interrupted at any step can be resumed from History at that exact step.
- A scheduled post fires through the dispatch function in a test run (connector may stop at the credential gate with status Queued and an honest message).
- No getPublicUrl on private buckets anywhere in new code; signed URLs only.
- Zero modifications to Promptor, Pixel, Osha, Nexus, Whisper code; Pulse modified only for the Content Library section.
- Final OMNI_BUILD_REPORT.md at repo root: what shipped per phase, schema overview, the complete REQUIRES HUMAN list (fal key if missing, social platform credentials and app approvals), known limitations, and seams left for the Audios and Videos modes.

═══════════════════════════════════════════
DELIVERABLES
═══════════════════════════════════════════

- src/app/(protected)/ai-agents/omni/ + src/screens/OmniAgent.tsx + src/components/omni/ + src/hooks/omni/
- supabase/functions/omni/ (+ content-library dispatch function), migrations for all new tables, columns, and RLS
- Updated Pulse with the Content Library section
- The fal catalog + runner modules
- OMNI_BUILD_REPORT.md
