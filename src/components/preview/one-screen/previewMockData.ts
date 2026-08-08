/**
 * Mock data for the One-Screen Preview. Hand-crafted, realistic Fortun
 * content per Sam's "hybrid" ruling: the shell shows the REAL logged-in user,
 * but every run, thread, and tile here is fiction. Nothing queries the DB.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Image as ImageIcon,
  Clapperboard,
  AudioLines,
  CalendarClock,
  Sparkles,
} from 'lucide-react';

export type PreviewTrack = 'images' | 'videos' | 'audios' | 'content' | 'brainstorm';
export type PreviewGroup = 'today' | 'yesterday' | 'week';

export interface PreviewRun {
  id: string;
  title: string;
  track: PreviewTrack;
  /** chat entries open a conversation; run entries open a wizard run card */
  kind: 'chat' | 'run';
  group: PreviewGroup;
  time: string;
  status: 'completed' | 'in_progress' | 'draft';
  /** wizard-run snapshot for kind === 'run' */
  progress?: { done: number; steps: string[] };
}

export interface PreviewTile {
  label: string;
  ratio: string;
  gradient: string;
}

export interface PreviewMessage {
  role: 'user' | 'omni';
  text: string;
  tiles?: PreviewTile[];
}

export const TRACK_META: Record<
  PreviewTrack,
  { label: string; icon: LucideIcon; iconClass: string; badgeClass: string }
> = {
  images: {
    label: 'Images',
    icon: ImageIcon,
    iconClass: 'text-cyan-400 [[data-preview-theme=light]_&]:text-cyan-600',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 [[data-preview-theme=light]_&]:bg-cyan-500/10 [[data-preview-theme=light]_&]:text-cyan-700',
  },
  videos: {
    label: 'Videos',
    icon: Clapperboard,
    iconClass: 'text-violet-400 [[data-preview-theme=light]_&]:text-violet-600',
    badgeClass: 'bg-violet-500/15 text-violet-300 [[data-preview-theme=light]_&]:bg-violet-500/10 [[data-preview-theme=light]_&]:text-violet-700',
  },
  audios: {
    label: 'Audios',
    icon: AudioLines,
    iconClass: 'text-emerald-400 [[data-preview-theme=light]_&]:text-emerald-600',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 [[data-preview-theme=light]_&]:bg-emerald-500/10 [[data-preview-theme=light]_&]:text-emerald-700',
  },
  content: {
    label: 'Content',
    icon: CalendarClock,
    iconClass: 'text-amber-400 [[data-preview-theme=light]_&]:text-amber-600',
    badgeClass: 'bg-amber-500/15 text-amber-300 [[data-preview-theme=light]_&]:bg-amber-500/10 [[data-preview-theme=light]_&]:text-amber-700',
  },
  brainstorm: {
    label: 'Brainstorm',
    icon: Sparkles,
    iconClass: 'text-rose-400 [[data-preview-theme=light]_&]:text-rose-600',
    badgeClass: 'bg-rose-500/15 text-rose-300 [[data-preview-theme=light]_&]:bg-rose-500/10 [[data-preview-theme=light]_&]:text-rose-700',
  },
};

export const GROUP_LABELS: Record<PreviewGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Previous 7 days',
};

export const MOCK_RUNS: PreviewRun[] = [
  { id: 'wishu-birthday', title: 'Wishu birthday post set', track: 'images', kind: 'run', group: 'today', time: '14:32', status: 'in_progress', progress: { done: 5, steps: ['Brief', 'Engine', 'Generate', 'Distribution', 'Adapt', 'Captions', 'Finalize'] } },
  { id: 'q3-giveaway', title: 'Q3 giveaway brainstorm', track: 'brainstorm', kind: 'chat', group: 'today', time: '11:08', status: 'completed' },
  { id: 'lore-podcast-12', title: 'Podcast ep. 12, Wishdom lore', track: 'audios', kind: 'run', group: 'today', time: '09:41', status: 'completed', progress: { done: 8, steps: ['Scenario', 'Cast', 'Render', 'Jingles', 'Assembly', 'Show notes', 'Cover', 'Finalize'] } },
  { id: 'teaser-reel', title: '15s teaser reel, bag charms', track: 'videos', kind: 'run', group: 'yesterday', time: '18:20', status: 'completed', progress: { done: 8, steps: ['Scenario', 'Storyboard', 'Scenes', 'Audio', 'Assembly', 'Captions', 'Distribution', 'Finalize'] } },
  { id: 'sept-calendar', title: 'September content calendar', track: 'content', kind: 'run', group: 'yesterday', time: '16:02', status: 'draft', progress: { done: 2, steps: ['Compose', 'Targets', 'Approval', 'Publish'] } },
  { id: 'plushie-visuals', title: 'Wishu plushie launch visuals', track: 'images', kind: 'run', group: 'yesterday', time: '10:55', status: 'completed', progress: { done: 7, steps: ['Brief', 'Engine', 'Generate', 'Distribution', 'Adapt', 'Captions', 'Finalize'] } },
  { id: 'caption-pass', title: 'Caption polish for IG carousel', track: 'brainstorm', kind: 'chat', group: 'yesterday', time: '09:12', status: 'completed' },
  { id: 'ks-update-video', title: 'Kickstarter update video', track: 'videos', kind: 'run', group: 'week', time: 'Tue', status: 'completed', progress: { done: 8, steps: ['Scenario', 'Storyboard', 'Scenes', 'Audio', 'Assembly', 'Captions', 'Distribution', 'Finalize'] } },
  { id: 'unboxing-audiogram', title: 'Unboxing audiogram', track: 'audios', kind: 'run', group: 'week', time: 'Tue', status: 'completed', progress: { done: 3, steps: ['Compose', 'Trim', 'Finalize'] } },
  { id: 'pinterest-refresh', title: 'Pinterest pin refresh', track: 'images', kind: 'run', group: 'week', time: 'Mon', status: 'completed', progress: { done: 7, steps: ['Brief', 'Engine', 'Generate', 'Distribution', 'Adapt', 'Captions', 'Finalize'] } },
  { id: 'keychain-stills', title: 'Wishu keychain teaser stills', track: 'images', kind: 'run', group: 'week', time: 'Mon', status: 'draft', progress: { done: 3, steps: ['Brief', 'Engine', 'Generate', 'Distribution', 'Adapt', 'Captions', 'Finalize'] } },
  { id: 'oct-plan', title: 'October content plan draft', track: 'content', kind: 'run', group: 'week', time: 'Sun', status: 'draft', progress: { done: 1, steps: ['Compose', 'Targets', 'Approval', 'Publish'] } },
  { id: 'voice-cast-ember', title: 'Voice cast test, Ember', track: 'audios', kind: 'run', group: 'week', time: 'Sat', status: 'completed', progress: { done: 2, steps: ['Persona', 'Preview'] } },
  { id: 'reels-hooks', title: 'Reels hook ideas', track: 'brainstorm', kind: 'chat', group: 'week', time: 'Sat', status: 'completed' },
];

const TILE_GRADIENTS = [
  'from-cyan-500/70 via-sky-400/50 to-violet-500/70',
  'from-violet-500/70 via-fuchsia-400/50 to-rose-400/60',
  'from-amber-400/70 via-orange-400/50 to-rose-500/60',
  'from-emerald-400/70 via-teal-400/50 to-cyan-500/60',
];

export const MOCK_THREADS: Record<string, PreviewMessage[]> = {
  'q3-giveaway': [
    { role: 'user', text: 'I need giveaway ideas for Q3 that push the Wishu bag charm without discounting it.' },
    { role: 'omni', text: 'Grounded in your Heart rules and the Wishpedia canon, here are three directions: a "Wish upon Wishu" UGC contest where followers post their charm in the wild, a collector bundle raffle tied to newsletter signups, and a collab drop with two Kickstarter backers as guest judges. The UGC route feeds the most reusable content back into the library.' },
    { role: 'user', text: 'Show me what the UGC announcement visuals could look like.' },
    { role: 'omni', text: 'Here is a first visual pass for the announcement set, sized for the four placements you usually run:', tiles: [
      { label: 'IG Feed', ratio: '1080x1350', gradient: TILE_GRADIENTS[0] },
      { label: 'IG Story', ratio: '1080x1920', gradient: TILE_GRADIENTS[1] },
      { label: 'Facebook', ratio: '1200x630', gradient: TILE_GRADIENTS[2] },
      { label: 'Pinterest', ratio: '1000x1500', gradient: TILE_GRADIENTS[3] },
    ] },
  ],
  'caption-pass': [
    { role: 'user', text: 'Polish the captions for the 5-slide IG carousel about the plushie pre-order.' },
    { role: 'omni', text: 'Three options per slide, ranked. Slide 1 leads with the wish motif per your brand voice rules: "Every wish starts small. This one fits in your hand." The full set keeps under 125 characters before the fold and ends with the pre-order CTA your Heart rules require.' },
  ],
  'reels-hooks': [
    { role: 'user', text: 'Give me 10 hook lines for the plushie reveal reel.' },
    { role: 'omni', text: 'Ten hooks, strongest first: 1. "We heard your wishes. Literally." 2. "POV: your wish just shipped." 3. "The charm you loved is now huggable." The remaining seven trade reach for niche appeal, ask and I will expand any of them into a full 15-second script.' },
  ],
};

/** Canned reply for ad-hoc composer sends (the mock "new creation" flow). */
export const ADHOC_REPLY: PreviewMessage = {
  role: 'omni',
  text: 'On it. I pulled your Heart rules and the relevant Brain knowledge for this one. Here is a first pass, tell me which direction to push and I will iterate, or open the matching studio track for the full wizard.',
};

export const SUGGESTIONS: string[] = [
  'Generate 4 Instagram posts introducing the new Wishu bag charm',
  'Cut a 15-second vertical teaser from the launch video',
  'Draft next week’s content calendar for IG and TikTok',
  'Brainstorm 10 hook lines for the plushie reveal reel',
];

export const RUN_THUMB_GRADIENTS = TILE_GRADIENTS;
