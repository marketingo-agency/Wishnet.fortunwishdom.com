-- Global, critical-priority Heart rule forbidding em/en dashes and horizontal bars.
-- Propagates to every Heart-aware agent (Osha, Pixel, Promptor, Omni, Nexus, Wishpedia)
-- as a soft instruction; a deterministic stripDashes() pass is the hard guarantee.
-- Idempotent: only inserts if a rule with this name does not already exist.
insert into public.heart_rules (name, description, rule_content, category, priority, is_global, is_active)
select
  'No em dashes or en dashes',
  'Typography rule: forbid em dashes, en dashes, and horizontal bars in all generated text.',
  'Never use em dashes (—), en dashes (–), or horizontal bars (―) in any generated text. Use commas, periods, parentheses, or a simple hyphen (-) instead. This applies to every output: chat replies, captions, prompts, scripts, titles, and descriptions.',
  'communication',
  'critical',
  true,
  true
where not exists (
  select 1 from public.heart_rules where name = 'No em dashes or en dashes'
);
