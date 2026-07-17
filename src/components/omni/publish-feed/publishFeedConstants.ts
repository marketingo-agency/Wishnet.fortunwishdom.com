/**
 * Publish & Feed constants (Plan 3 Phase 9).
 */

/** Apple-required AI disclosure (D-A6) - default ON, editable, never removable. */
export const DEFAULT_DISCLOSURE = 'This episode was produced with AI generated voices.';

/** One-time directory submissions (HUMAN actions - accounts required). */
export const PODCAST_DIRECTORIES: { name: string; url: string }[] = [
  { name: 'Spotify for Creators', url: 'https://creators.spotify.com/' },
  { name: 'Apple Podcasts Connect', url: 'https://podcastsconnect.apple.com/' },
  { name: 'Amazon Music for Podcasters', url: 'https://podcasters.amazon.com/' },
  { name: 'YouTube (RSS ingest)', url: 'https://studio.youtube.com/' },
  { name: 'iHeartRadio', url: 'https://podcasters.iheart.com/' },
  { name: 'Pocket Casts', url: 'https://pocketcasts.com/submit/' },
];
