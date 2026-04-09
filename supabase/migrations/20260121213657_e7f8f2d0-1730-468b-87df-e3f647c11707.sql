-- AI Agents per-agent access (8 agents)
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_nexus boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_lexicon boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_osha boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_echo boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_pulse boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_muse boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_pixel boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN ai_can_access_atlas boolean DEFAULT true;

-- Wishdom per-section access (5 sections)
ALTER TABLE public.user_permissions ADD COLUMN wishdom_can_access_main boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishdom_can_access_plushes boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishdom_can_access_figurines boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishdom_can_access_cards boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishdom_can_access_stocks boolean DEFAULT true;

-- Wishnetrium per-feature access (3 features)
ALTER TABLE public.user_permissions ADD COLUMN wishnetrium_can_access_wishfeed boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishnetrium_can_access_wishper boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN wishnetrium_can_access_wishprint boolean DEFAULT true;

-- MasterMind action permissions
ALTER TABLE public.user_permissions ADD COLUMN mastermind_can_create boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN mastermind_can_edit boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN mastermind_can_delete boolean DEFAULT true;

-- Taskforce action permissions
ALTER TABLE public.user_permissions ADD COLUMN taskforce_can_create boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN taskforce_can_edit boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN taskforce_can_delete boolean DEFAULT true;