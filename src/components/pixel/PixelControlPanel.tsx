import React, { useMemo } from 'react';
import { Layers, Plus, Paperclip, Image as ImageIcon, Film, LayoutGrid, RectangleHorizontal, CircleUser, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePixelBlueprints, type PixelBlueprint } from '@/hooks/usePixel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import type { PixelMode } from './PixelTopBar';
import type { PendingAttachment } from '@/types/attachments';

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
}

export function PixelControlPanel({
  mode, activeBlueprint, onBlueprintSelect,
  selectedPostType, onPostTypeSelect,
  onAttachFile, onNewBlueprint, isPending,
  globalReferences = [], onRemoveReference,
}: PixelControlPanelProps) {
  const { data: blueprints = [] } = usePixelBlueprints();
  const postTypes = PLATFORM_POST_TYPES[mode] || [];

  // Create object URLs for image previews
  const refPreviews = useMemo(() => {
    return globalReferences.map(ref => ({
      ...ref,
      previewUrl: ref.type.startsWith('image/') ? URL.createObjectURL(ref.file) : undefined,
    }));
  }, [globalReferences]);

  // Cleanup object URLs
  React.useEffect(() => {
    return () => {
      refPreviews.forEach(r => { if (r.previewUrl) URL.revokeObjectURL(r.previewUrl); });
    };
  }, [refPreviews]);

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

      {/* Templates */}
      <div className="p-3 flex-1 border-b border-border">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
          <button
            onClick={onNewBlueprint}
            className="h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition-all"
            title="New Template"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {blueprints.length === 0 ? (
          <button
            onClick={onNewBlueprint}
            className="w-full flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border border-dashed border-border text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition-all text-center"
          >
            <Layers className="h-4 w-4" />
            <span className="text-[10px] leading-tight">Create your first visual template</span>
          </button>
        ) : (
          <Select
            value={activeBlueprint?.id ?? '_none'}
            onValueChange={(val) => {
              if (val === '_none') onBlueprintSelect(null);
              else {
                const bp = blueprints.find(b => b.id === val);
                if (bp) onBlueprintSelect(bp);
              }
            }}
          >
            <SelectTrigger className="w-full h-8 bg-muted border-border text-xs text-foreground focus:ring-pink-500/30">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectGroup>
                <SelectItem value="_none" className="text-xs text-muted-foreground">None</SelectItem>
                {blueprints.map(bp => (
                  <SelectItem key={bp.id} value={bp.id} className="text-xs text-foreground">{bp.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* References */}
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">References</p>

        {/* Reference preview gallery */}
        {refPreviews.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {refPreviews.map((ref) => (
              <div key={ref.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                {ref.previewUrl ? (
                  <img
                    src={ref.previewUrl}
                    alt={ref.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center">{ref.name}</span>
                  </div>
                )}
                {/* Remove button */}
                <button
                  onClick={() => onRemoveReference?.(ref.id)}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 text-muted-foreground hover:text-rose-400 hover:bg-background flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {/* Processing indicator */}
                {ref.status === 'processing' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="h-3 w-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onAttachFile}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all"
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="text-xs">Attach reference</span>
        </button>
      </div>
    </div>
  );
}
