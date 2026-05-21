/**
 * WishpediaCharacterView
 * Clean detail layout: framed hero image + info panel, with angle filmstrip and
 * gallery below. Card-framed and neutral to match the app pattern (no cinematic overlay).
 */

import { useState } from 'react';
import { ImageOff, Eye, Images, Calendar, RefreshCw, Expand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WishpediaLightbox } from './WishpediaLightbox';
import { ANGLE_VIEWS } from '@/types/wishpedia';
import type { WishpediaEntryImage } from '@/types/wishpedia';
import type { WishpediaCategory } from '@/hooks/useWishpediaCategories';
import { getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { cn } from '@/lib/utils';

interface Props {
  entry: {
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
  };
  category?: WishpediaCategory;
  images: WishpediaEntryImage[];
}

const ANGLE_LABELS: Record<string, string> = {
  front: 'Front', back: 'Back', left: 'Left',
  right: 'Right', top: 'Top', bottom: 'Bottom',
};

export function WishpediaCharacterView({ entry, category, images }: Props) {
  const primaryImage = images.find((i) => i.is_primary) || images.find((i) => i.angle === 'front') || images[0];
  const [activeImage, setActiveImage] = useState<WishpediaEntryImage | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const heroImage = activeImage || primaryImage;

  const openLightbox = (index: number) => {
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const angleImages = ANGLE_VIEWS.map((angle) => ({
    angle,
    label: ANGLE_LABELS[angle],
    image: images.find((i) => i.angle === angle),
  }));
  const freeImages = images.filter((i) => !i.angle);
  const filledAngles = angleImages.filter((a) => a.image).length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="w-full px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">

      {/* ── Hero + Info ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
        {/* Framed hero */}
        <div className="w-full lg:w-[58%] shrink-0">
          <div className="group relative aspect-[4/5] rounded-2xl border border-border/40 bg-muted/20 overflow-hidden">
            {heroImage ? (
              <img
                src={getWishpediaImageUrl(heroImage.storage_path)}
                alt={entry.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/30">
                <ImageOff className="h-12 w-12" />
                <span className="text-xs font-medium">No images yet</span>
              </div>
            )}

            {heroImage && (
              <button
                onClick={() => openLightbox(images.indexOf(heroImage))}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-background/70 text-foreground/70 backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open fullscreen"
              >
                <Expand className="h-4 w-4" />
              </button>
            )}
            {heroImage?.is_primary && (
              <Badge className="absolute left-3 top-3 border-0 bg-amber-500 text-[10px] text-amber-950">Primary</Badge>
            )}
            {heroImage?.angle && (
              <Badge variant="secondary" className="absolute bottom-3 left-3 gap-1 text-[10px] uppercase tracking-wider">
                <Eye className="h-3 w-3 text-amber-500" />
                {ANGLE_LABELS[heroImage.angle]}
              </Badge>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex w-full flex-col gap-5 lg:w-[42%]">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{entry.name}</h1>
            {category && (
              <Badge
                variant="outline"
                className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {category.name}
                {category.has_angle_views && <span className="opacity-60">· 6-angle</span>}
              </Badge>
            )}
          </div>

          {entry.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">
              {entry.description}
            </p>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <MetaStat
              label="Images"
              icon={<Images className="h-3.5 w-3.5" />}
              value={
                <>
                  {images.length}
                  {category?.has_angle_views && (
                    <span className="ml-1 text-xs text-muted-foreground">({filledAngles}/6)</span>
                  )}
                </>
              }
            />
            <MetaStat label="Created" icon={<Calendar className="h-3.5 w-3.5" />} value={formatDate(entry.created_at)} />
            {entry.updated_at !== entry.created_at && (
              <MetaStat label="Updated" icon={<RefreshCw className="h-3.5 w-3.5" />} value={formatDate(entry.updated_at)} />
            )}
          </div>
        </div>
      </div>

      {/* ── Angle views ── */}
      {category?.has_angle_views && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Angle Views</h3>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground/60">{filledAngles}/6</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {angleImages.map(({ angle, label, image }) => {
              const isActive = !!image && heroImage?.id === image.id;
              return (
                <button
                  key={angle}
                  onClick={() => image && setActiveImage(image)}
                  disabled={!image}
                  aria-label={label}
                  className={cn(
                    'relative aspect-[3/4] overflow-hidden rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-amber-500 ring-2 ring-amber-500/40'
                      : image
                        ? 'border-border/60 hover:border-amber-500/40 cursor-pointer'
                        : 'border-dashed border-border/50 cursor-default opacity-50',
                  )}
                >
                  {image ? (
                    <img src={getWishpediaImageUrl(image.storage_path)} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/30">
                      <ImageOff className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-background/80 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gallery ── */}
      {freeImages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gallery</h3>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {freeImages.map((img) => {
              const isActive = heroImage?.id === img.id;
              return (
                <button
                  key={img.id}
                  onClick={() => { setActiveImage(img); openLightbox(images.indexOf(img)); }}
                  aria-label={img.original_name}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-border/60 hover:border-amber-500/40',
                  )}
                >
                  <img src={getWishpediaImageUrl(img.storage_path)} alt={img.original_name} className="h-full w-full object-cover" />
                  {img.is_primary && (
                    <Badge className="absolute right-1.5 top-1.5 border-0 bg-amber-500 px-1.5 py-0 text-[8px] leading-tight text-amber-950">Primary</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <WishpediaLightbox
        images={images}
        activeIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}

function MetaStat({ label, icon, value }: { label: string; icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted-foreground/50">{icon}</span>
        {value}
      </div>
    </div>
  );
}
