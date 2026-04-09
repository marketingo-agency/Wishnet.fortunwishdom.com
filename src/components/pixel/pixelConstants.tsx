/**
 * Pixel Studio Constants
 * Extracted from PixelStudio.tsx for separation of concerns.
 */

import React from 'react';
import { Globe, Zap, Image as ImageIcon, Film, Layers } from 'lucide-react';
import type { PixelMode } from '@/components/pixel/PixelTopBar';

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

export const MODE_PLACEHOLDERS: Record<PixelMode, string> = {
  cross_platform: 'Describe your goal — Pixel will create visuals optimized for all platforms…',
  facebook: 'Describe your Facebook visual — ads, covers, stories, posts…',
  instagram: 'Describe your Instagram visual — feed posts, reels, carousels, stories…',
  tiktok: 'Describe your TikTok visual — video covers, ad creatives, thumbnails…',
};
