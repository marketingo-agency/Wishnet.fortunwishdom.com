-- Remove the schema of the six retired AI agents (Nexus, Promptor, Pixel,
-- Pulse, Whisper, ATLAS) + the dormant Muse ghost. Only Osha and Omni remain.
--
-- APPLIED AFTER the client is deployed (code-first, DB-last): the retired
-- permission columns are no longer written by EditUserSheet, so dropping them
-- cannot 400 a live permission save (PGRST204).
--
-- KEPT deliberately (shared with the surviving pipeline, despite their names):
--   pulse_connections  - Omni auto-dispatch + Metricool live here
--   agent_settings     - osha-chat reads the agent status registry
--   content_library_*  - written by omni / omni-video / omni-podcast / content-library
--   llm_settings       - shared LLM provider config (incl. the test-connection path)
--   osha_* / omni_*     - the two surviving agents

-- 1) Retired per-agent permission columns (RLS on user_permissions is
--    column-agnostic / is_admin-based, so the drops are invisible to policies).
alter table public.user_permissions
  drop column if exists ai_can_access_nexus,
  drop column if exists ai_can_access_promptor,
  drop column if exists ai_can_access_pixel,
  drop column if exists ai_can_access_pulse,
  drop column if exists ai_can_access_whisper,
  drop column if exists ai_can_access_atlas,
  drop column if exists ai_can_access_muse;

-- 2) Agent-exclusive tables (leaf tables; CASCADE clears their own RLS
--    policies/indexes/constraints, nothing kept references them).
drop table if exists public.pixel_blueprints cascade;
drop table if exists public.pixel_messages cascade;
drop table if exists public.pixel_settings cascade;
drop table if exists public.promptor_runs cascade;
drop table if exists public.promptor_settings cascade;
drop table if exists public.whisper_episodes cascade;
drop table if exists public.whisper_settings cascade;
drop table if exists public.whisper_shows cascade;
drop table if exists public.whisper_voices cascade;
drop table if exists public.pulse_drafts cascade;
drop table if exists public.pulse_reply_queue cascade;
drop table if exists public.pulse_settings cascade;
drop table if exists public.console_messages cascade;
drop table if exists public.quick_prompts cascade;
drop table if exists public.muse_messages cascade;
drop table if exists public.muse_settings cascade;
