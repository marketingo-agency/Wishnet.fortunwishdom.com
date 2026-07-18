/**
 * Publishing Desk constants: the network list (the six repurposing networks +
 * a free-text "Other"), the per-network POST TYPES (an Instagram Story is not
 * an Instagram Feed post), and the status metadata for cards and pills.
 */

import type { ComponentType } from 'react';
import { Globe } from 'lucide-react';
import { OMNI_NETWORKS } from '../omniNetworkPresets';

export type DeskNetworkId = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'pinterest' | 'other';

export interface DeskNetworkDef {
  id: DeskNetworkId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  /** Post types offered for this network ('other' takes free text instead). */
  postTypes: string[];
}

export const DESK_NETWORKS: DeskNetworkDef[] = [
  ...OMNI_NETWORKS.map((n) => ({
    id: n.id as DeskNetworkId,
    label: n.label,
    icon: n.icon,
    accent: n.accent,
    postTypes:
      n.id === 'facebook' ? ['Feed post', 'Story', 'Reel']
      : n.id === 'instagram' ? ['Feed post', 'Story', 'Reel', 'Carousel']
      : n.id === 'x' ? ['Post']
      : n.id === 'tiktok' ? ['Video', 'Photo carousel']
      : n.id === 'youtube' ? ['Video', 'Short', 'Community post']
      : ['Pin', 'Idea Pin'],
  })),
  {
    id: 'other',
    label: 'Other',
    icon: Globe,
    accent: 'text-emerald-400',
    postTypes: [],
  },
];

export function getDeskNetwork(id: string): DeskNetworkDef {
  return DESK_NETWORKS.find((n) => n.id === id) ?? DESK_NETWORKS[DESK_NETWORKS.length - 1];
}

/** Post status metadata (derived server-side from the per-network targets). */
export const POST_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 [[data-omni-theme=dark]_&]:text-violet-300',
  },
  partially_published: {
    label: 'Partially published',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 [[data-omni-theme=dark]_&]:text-amber-300',
  },
  published: {
    label: 'Published',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300',
  },
  archived: {
    label: 'Archived',
    className: 'border-border bg-muted/40 text-muted-foreground/70',
  },
};

/** Uploads accepted by the Desk (mirrors the bucket + edge allowlists). */
export const DESK_UPLOAD_MIMES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];
export const DESK_UPLOAD_MAX_BYTES = 500 * 1024 * 1024;
export const DESK_UPLOAD_MAX_FILES = 10;

export interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
}

/** Validate + wrap picked files as local pending uploads (with previews). */
export function filesToPending(
  files: FileList | File[],
  existingCount: number,
  onReject: (message: string) => void,
): PendingFile[] {
  const out: PendingFile[] = [];
  for (const file of Array.from(files)) {
    if (existingCount + out.length >= DESK_UPLOAD_MAX_FILES) {
      onReject(`Up to ${DESK_UPLOAD_MAX_FILES} files per post.`);
      break;
    }
    if (!DESK_UPLOAD_MIMES.includes(file.type)) {
      onReject(`${file.name}: images or MP4/WebM video only`);
      continue;
    }
    if (file.size > DESK_UPLOAD_MAX_BYTES) {
      onReject(`${file.name} is over the 500MB limit`);
      continue;
    }
    out.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
    });
  }
  return out;
}

export function formatScheduled(iso: string | null): string {
  if (!iso) return 'Unscheduled';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unscheduled';
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
