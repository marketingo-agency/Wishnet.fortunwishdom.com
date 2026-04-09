/**
 * WishpediaCharacterView
 * Premium split-panel showcase: hero image left, info panel right, filmstrip + gallery below.
 * Responsive: stacked on mobile, side-by-side on lg+.
 */

import { useState } from 'react';
import { ImageOff, Eye, Images, Calendar, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

export function WishpediaCharacterView({ entry, category, images }: Props) {
  const primaryImage = images.find((i) => i.is_primary) || images.find((i) => i.angle === 'front') || images[0];
  const [activeImage, setActiveImage] = useState<WishpediaEntryImage | null>(null);
  const heroImage = activeImage || primaryImage;

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
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-10 wp-animate-in">

      {/* ── Split Panel: Hero + Info ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-10">

        {/* Hero Image — 60% on desktop */}
        <div className="w-full lg:w-[58%] shrink-0">
          <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] rounded-xl sm:rounded-2xl border border-border/30 bg-muted/10 overflow-hidden shadow-md shadow-black/[0.04] group">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {heroImage ? (
              <img
                src={getWishpediaImageUrl(heroImage.storage_path)}
                alt={entry.name}
                className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/20">
                <ImageOff className="w-16 h-16" />
                <span className="text-xs font-medium text-muted-foreground/30">No images</span>
              </div>
            )}

            {/* Angle indicator pill */}
            {heroImage?.angle && (
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur-xl border border-border/30 text-[10px] font-semibold uppercase tracking-wider text-foreground/80 shadow-sm">
                  <Eye className="w-3 h-3 text-amber-500" />
                  {ANGLE_LABELS[heroImage.angle]}
                </span>
              </div>
            )}

            {/* Primary badge */}
            {heroImage?.is_primary && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-amber-500/90 text-white border-0 text-[9px] px-2 py-0.5 rounded-md shadow-sm">
                  Primary
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel — 40% on desktop */}
        <div className="w-full lg:w-[42%] flex flex-col justify-between gap-6">
          {/* Top: Name + Category + Description */}
          <div className="space-y-5">
            <div className="space-y-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
                {entry.name}
              </h1>

              {category && (
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500 shadow-sm shadow-amber-500/30" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {category.name}
                  </span>
                  {category.has_angle_views && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">
                      6-Angle
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {entry.description && (
              <>
                <Separator className="opacity-30" />
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {entry.description}
                </p>
              </>
            )}
          </div>

          {/* Bottom: Metadata */}
          <div className="space-y-4 pt-2">
            <Separator className="opacity-30" />

            <div className="grid grid-cols-2 gap-4">
              <MetaStat
                label="Images"
                icon={<Images className="w-3.5 h-3.5" />}
                value={
                  <>
                    {images.length}
                    {category?.has_angle_views && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({filledAngles}/6)
                      </span>
                    )}
                  </>
                }
              />
              <MetaStat
                label="Created"
                icon={<Calendar className="w-3.5 h-3.5" />}
                value={formatDate(entry.created_at)}
              />
              {entry.updated_at !== entry.created_at && (
                <MetaStat
                  label="Updated"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  value={formatDate(entry.updated_at)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Angle Filmstrip ── */}
      {category?.has_angle_views && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Angle Views
            </h3>
            <span className="text-[10px] text-muted-foreground/50 font-medium tabular-nums">
              {filledAngles}/6
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
            {angleImages.map(({ angle, label, image }) => {
              const isActive = heroImage?.id === image?.id && !!image;
              return (
                <button
                  key={angle}
                  onClick={() => image && setActiveImage(image)}
                  disabled={!image}
                  className={cn(
                    "relative shrink-0 w-20 sm:w-[100px] aspect-square rounded-xl overflow-hidden transition-all duration-200 touch-manipulation",
                    "min-h-[72px] min-w-[72px]",
                    isActive
                      ? "ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.03]"
                      : image
                        ? "border-2 border-border/40 hover:border-amber-500/30 hover:shadow-md cursor-pointer active:scale-95"
                        : "border-2 border-dashed border-border/20 cursor-default opacity-40"
                  )}
                >
                  {image ? (
                    <img
                      src={getWishpediaImageUrl(image.storage_path)}
                      alt={label}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/5">
                      <ImageOff className="w-3.5 h-3.5 text-muted-foreground/15" />
                    </div>
                  )}
                  <div className={cn(
                    "absolute bottom-0 inset-x-0 py-1 text-center text-[8px] font-bold uppercase tracking-[0.12em]",
                    "bg-background/70 backdrop-blur-md",
                    isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60"
                  )}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Free Gallery ── */}
      {freeImages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1">
            Gallery
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {freeImages.map((img) => {
              const isActive = heroImage?.id === img.id;
              return (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden transition-all duration-200 active:scale-95 touch-manipulation",
                    isActive
                      ? "ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.02]"
                      : "border-2 border-border/30 hover:border-amber-500/30 hover:shadow-md"
                  )}
                >
                  <img
                    src={getWishpediaImageUrl(img.storage_path)}
                    alt={img.original_name}
                    className="w-full h-full object-contain"
                  />
                  {img.is_primary && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="bg-amber-500/90 text-white border-0 text-[7px] px-1.5 py-0 leading-tight rounded-md">
                        Primary
                      </Badge>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small metadata stat component ── */
function MetaStat({ label, icon, value }: { label: string; icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </span>
      <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
        <span className="text-muted-foreground/40">{icon}</span>
        {value}
      </div>
    </div>
  );
}
