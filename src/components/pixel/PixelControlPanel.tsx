import React from 'react';
import { ImageIcon, Film, LayoutGrid, RectangleHorizontal, CircleUser, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PixelBlueprint } from '@/hooks/usePixel';
import type { PixelMode } from './PixelTopBar';
import type { PendingAttachment } from '@/types/attachments';
import { WishReferencePanel, type WishpediaImageRef } from './WishReferencePanel';

export interface PostSize {
  label: string;
  width: number;
  height: number;
  ratio: string;
}

export interface PostType {
  id: string;
  label: string;
  icon: React.ReactNode;
  sizes: PostSize[];
}

// eslint-disable-next-line react-refresh/only-export-components -- config data co-located with panel component
export const PLATFORM_POST_TYPES: Record<PixelMode, PostType[]> = {
  facebook: [
    { id: 'image_post', label: 'Image Post', icon: <ImageIcon className="h-3.5 w-3.5" />, sizes: [
      { label: 'Landscape', width: 1200, height: 630, ratio: '1.91:1' },
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
      { label: 'Portrait', width: 1080, height: 1350, ratio: '4:5' },
    ]},
    { id: 'video', label: 'Video', icon: <Film className="h-3.5 w-3.5" />, sizes: [
      { label: 'Landscape', width: 1280, height: 720, ratio: '16:9' },
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
      { label: 'Vertical', width: 1080, height: 1920, ratio: '9:16' },
    ]},
    { id: 'story', label: 'Story', icon: <RectangleHorizontal className="h-3.5 w-3.5 rotate-90" />, sizes: [
      { label: 'Story', width: 1080, height: 1920, ratio: '9:16' },
    ]},
    { id: 'cover_photo', label: 'Cover Photo', icon: <RectangleHorizontal className="h-3.5 w-3.5" />, sizes: [
      { label: 'Cover', width: 820, height: 312, ratio: '2.63:1' },
    ]},
    { id: 'carousel', label: 'Carousel', icon: <LayoutGrid className="h-3.5 w-3.5" />, sizes: [
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
    ]},
  ],
  instagram: [
    { id: 'feed_post', label: 'Feed Post', icon: <ImageIcon className="h-3.5 w-3.5" />, sizes: [
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
      { label: 'Portrait', width: 1080, height: 1350, ratio: '4:5' },
      { label: 'Landscape', width: 1080, height: 566, ratio: '1.91:1' },
    ]},
    { id: 'story', label: 'Story', icon: <RectangleHorizontal className="h-3.5 w-3.5 rotate-90" />, sizes: [
      { label: 'Story', width: 1080, height: 1920, ratio: '9:16' },
    ]},
    { id: 'reel', label: 'Reel', icon: <Film className="h-3.5 w-3.5" />, sizes: [
      { label: 'Vertical', width: 1080, height: 1920, ratio: '9:16' },
    ]},
    { id: 'carousel', label: 'Carousel', icon: <LayoutGrid className="h-3.5 w-3.5" />, sizes: [
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
      { label: 'Portrait', width: 1080, height: 1350, ratio: '4:5' },
    ]},
  ],
  tiktok: [
    { id: 'video', label: 'Video', icon: <Film className="h-3.5 w-3.5" />, sizes: [
      { label: 'Vertical', width: 1080, height: 1920, ratio: '9:16' },
    ]},
    { id: 'profile_photo', label: 'Profile Photo', icon: <CircleUser className="h-3.5 w-3.5" />, sizes: [
      { label: 'Square', width: 200, height: 200, ratio: '1:1' },
    ]},
    { id: 'ad_creative', label: 'Ad Creative', icon: <Megaphone className="h-3.5 w-3.5" />, sizes: [
      { label: 'Vertical', width: 1080, height: 1920, ratio: '9:16' },
      { label: 'Square', width: 1080, height: 1080, ratio: '1:1' },
    ]},
  ],
  cross_platform: [],
};

interface PixelControlPanelProps {
  mode: PixelMode;
  activeBlueprint: PixelBlueprint | null;
  onBlueprintSelect: (bp: PixelBlueprint | null) => void;
  selectedPostType: string | null;
  onPostTypeSelect: (id: string) => void;
  onAttachFile: () => void;
  onNewBlueprint: () => void;
  isPending: boolean;
  globalReferences?: PendingAttachment[];
  onRemoveReference?: (id: string) => void;
  wishpediaImageRefs?: WishpediaImageRef[];
  onAddWishpediaImages?: (refs: WishpediaImageRef[]) => void;
  onRemoveWishpediaImage?: (imageId: string) => void;
  onDropFiles?: (files: FileList) => void;
}

export function PixelControlPanel({
  mode,
  selectedPostType, onPostTypeSelect,
  onAttachFile, isPending,
  globalReferences = [], onRemoveReference,
  wishpediaImageRefs = [],
  onAddWishpediaImages,
  onRemoveWishpediaImage,
  onDropFiles,
}: PixelControlPanelProps) {
  const postTypes = PLATFORM_POST_TYPES[mode] || [];

  return (
    <div className="w-[220px] shrink-0 flex flex-col border-r border-border bg-background overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:transparent">
      {/* Post Types */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Post Type</p>
        <div className="space-y-1">
          {postTypes.map((pt) => (
            <button
              key={pt.id}
              onClick={() => onPostTypeSelect(pt.id)}
              disabled={isPending}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all text-left group',
                selectedPostType === pt.id
                  ? 'text-pink-300 bg-pink-500/10 border border-pink-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
              )}
            >
              <span className={cn(
                'transition-colors',
                selectedPostType === pt.id ? 'text-pink-400' : 'text-pink-500/70 group-hover:text-pink-400'
              )}>{pt.icon}</span>
              <span className="truncate">{pt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* WishReference */}
      <div className="p-3 flex-1">
        <WishReferencePanel
          globalReferences={globalReferences}
          onRemoveReference={onRemoveReference ?? (() => {})}
          onAttachFile={onAttachFile}
          wishpediaImageRefs={wishpediaImageRefs}
          onAddWishpediaImages={onAddWishpediaImages ?? (() => {})}
          onRemoveWishpediaImage={onRemoveWishpediaImage ?? (() => {})}
          onDropFiles={onDropFiles ?? (() => {})}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
