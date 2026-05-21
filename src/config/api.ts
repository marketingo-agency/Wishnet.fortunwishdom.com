/**
 * API Configuration
 * Centralized API endpoints and URLs.
 *
 * Phase 4: values now come from NEXT_PUBLIC_* env vars (see ENV_MIGRATION.md).
 * Throws at module-init if either Supabase var is missing — fail loud, not silent.
 */

const URL_FROM_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_FROM_ENV = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID_FROM_ENV = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;

if (!URL_FROM_ENV || !KEY_FROM_ENV) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in env. ' +
      'See ENV_MIGRATION.md for the Vite → Next.js mapping.',
  );
}

// Supabase project configuration
export const SUPABASE_PROJECT_ID = PROJECT_ID_FROM_ENV ?? '';
export const SUPABASE_URL = URL_FROM_ENV;
export const SUPABASE_ANON_KEY = KEY_FROM_ENV;

// Edge Functions
export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const AI_CHAT_ENDPOINT = `${EDGE_FUNCTIONS_URL}/ai-chat`;
export const MANAGE_USERS_ENDPOINT = `${EDGE_FUNCTIONS_URL}/manage-users`;
export const SETTINGS_KEYS_ENDPOINT = `${EDGE_FUNCTIONS_URL}/settings-keys`;
export const PULSE_API_ENDPOINT = `${EDGE_FUNCTIONS_URL}/pulse-api`;

// Storage
export const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
export const FILES_BUCKET = 'files';

// External API endpoints
export const OPENAI_API_URL = 'https://api.openai.com/v1';
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
