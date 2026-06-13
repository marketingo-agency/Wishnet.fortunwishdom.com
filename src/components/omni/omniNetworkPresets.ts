/**
 * Per-network dimension preset registry for the Omni repurposing pipeline.
 * Standard formats per platform; each preset is deterministic resize/crop
 * by default, with AI extension available where cropping would damage the
 * subject (large aspect-ratio jumps).
 */

import type { ComponentType } from 'react';
import { Facebook, Instagram, Twitter, Music, Youtube } from 'lucide-react';
import { PinterestIcon } from './PinterestIcon';

export type OmniNetworkId = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'pinterest';

export interface OmniDimensionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
}

export interface OmniNetworkDef {
  id: OmniNetworkId;
  label: string;
  // className-accepting component: lucide icons and the inline PinterestIcon
  // both satisfy this (lucide lacks a Pinterest glyph in this version).
  icon: ComponentType<{ className?: string }>;
  accent: string;
  presets: OmniDimensionPreset[];
}

export const OMNI_NETWORKS: OmniNetworkDef[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    accent: 'text-blue-400',
    presets: [
      { id: 'fb_square', label: 'Square Post', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'fb_landscape', label: 'Feed Landscape', width: 1200, height: 630, ratio: '1.91:1' },
      { id: 'fb_portrait', label: 'Feed Portrait', width: 1080, height: 1350, ratio: '4:5' },
      { id: 'fb_story', label: 'Story', width: 1080, height: 1920, ratio: '9:16' },
      { id: 'fb_cover', label: 'Cover Photo', width: 1640, height: 624, ratio: '2.63:1' },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    accent: 'text-pink-400',
    presets: [
      { id: 'ig_square', label: 'Feed Square', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'ig_portrait', label: 'Feed Portrait', width: 1080, height: 1350, ratio: '4:5' },
      { id: 'ig_landscape', label: 'Feed Landscape', width: 1080, height: 566, ratio: '1.91:1' },
      { id: 'ig_story', label: 'Story / Reel', width: 1080, height: 1920, ratio: '9:16' },
    ],
  },
  {
    id: 'x',
    label: 'X',
    icon: Twitter,
    accent: 'text-sky-400',
    presets: [
      { id: 'x_landscape', label: 'Post 16:9', width: 1200, height: 675, ratio: '16:9' },
      { id: 'x_square', label: 'Post Square', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'x_header', label: 'Header', width: 1500, height: 500, ratio: '3:1' },
    ],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: Music,
    accent: 'text-rose-400',
    presets: [
      { id: 'tt_vertical', label: 'Video Cover', width: 1080, height: 1920, ratio: '9:16' },
      { id: 'tt_square', label: 'Square Visual', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'tt_profile', label: 'Profile Visual', width: 400, height: 400, ratio: '1:1' },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    accent: 'text-red-500',
    // Images only (no video). Dimensions from YouTube Help + 2024-2025 guides.
    presets: [
      { id: 'yt_thumbnail', label: 'Thumbnail', width: 1280, height: 720, ratio: '16:9' },
      { id: 'yt_community_square', label: 'Community Square', width: 1080, height: 1080, ratio: '1:1' },
      { id: 'yt_community_landscape', label: 'Community Landscape', width: 1920, height: 1080, ratio: '16:9' },
      { id: 'yt_banner', label: 'Channel Banner', width: 2560, height: 1440, ratio: '16:9' },
    ],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: PinterestIcon,
    accent: 'text-red-500',
    // Pin dimensions from Pinterest Business creative best practices.
    presets: [
      { id: 'pin_standard', label: 'Standard Pin', width: 1000, height: 1500, ratio: '2:3' },
      { id: 'pin_square', label: 'Square Pin', width: 1000, height: 1000, ratio: '1:1' },
      { id: 'pin_long', label: 'Long Pin', width: 1000, height: 2100, ratio: '1:2.1' },
    ],
  },
];

export function getNetwork(id: OmniNetworkId): OmniNetworkDef {
  return OMNI_NETWORKS.find((n) => n.id === id)!;
}

export function getPreset(networkId: OmniNetworkId, presetId: string): OmniDimensionPreset | undefined {
  return getNetwork(networkId).presets.find((p) => p.id === presetId);
}

/**
 * Heuristic: when source and target aspect ratios diverge beyond this factor,
 * a plain cover-crop loses too much of the subject and AI extension is
 * suggested instead.
 */
export function cropDamageRisk(srcW: number, srcH: number, dstW: number, dstH: number): boolean {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  const factor = srcRatio > dstRatio ? srcRatio / dstRatio : dstRatio / srcRatio;
  return factor > 1.6;
}
