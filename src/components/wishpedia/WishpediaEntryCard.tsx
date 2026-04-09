"use client";

/**
 * WishpediaEntryCard
 * Premium card for displaying a Wishpedia entry in the index grid.
 * Refined glass-border effect, vignette overlay, subtle hover animations.
 */

import { useRouter } from 'next/navigation';
import { ImageOff, Images, Database } from 'lucide-react';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { useEntryIndexStatus } from '@/hooks/useOcrIndexing';
import type { WishpediaEntry, WishpediaCategory } from '@/types/wishpedia';
import { cn } from '@/lib/utils';

interface Props {
  entry: WishpediaEntry;
  category?: WishpediaCategory;
}

export function WishpediaEntryCard({ entry, category }: Props) {
  const router = useRouter();
  const { data: images = [] } = useWishpediaImages(entry.id);
  const { data: indexStatus } = useEntryIndexStatus(entry.id);
  const primaryImage = images.find(i => i.is_primary) || images[0];

  return (
    <button
      onClick={() => router.push(`/mastermind/wishpedia/${entry.slug}`)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl bg-card text-left w-full",
        "border border-border/40",
        "transition-all duration-500 ease-out active:scale-[0.97]",
        "hover:shadow-2xl hover:shadow-amber-500/[0.08] hover:border-amber-500/20 hover:-translate-y-1.5"
      )}
    >
      {/* Image area */}
      <div className="relative aspect-[3/4] bg-muted/20 overflow-hidden">
        {primaryImage ? (
          <img
            src={getWishpediaImageUrl(primaryImage.storage_path)}
            alt={entry.name}
            className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40">
            <ImageOff className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/10" />
          </div>
        )}

        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent pointer-events-none" />

        {/* Top-left: indexed indicator */}
        {indexStatus?.isIndexed && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-[2]">
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white backdrop-blur-sm shadow-sm"
              title={`Indexed: ${indexStatus.chunkCount} chunks`}
            >
              <Database className="w-2.5 h-2.5" />
              Indexed
            </span>
          </div>
        )}

        {/* Top-right: image count */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-[2]">
            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-black/30 text-white/80 backdrop-blur-sm">
              <Images className="w-2.5 h-2.5" />
              {images.length}
            </span>
          </div>
        )}

        {/* Bottom overlay: name + category */}
        <div className="absolute bottom-0 inset-x-0 z-[2] px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-8 sm:pt-10">
          <h3 className="font-semibold text-[13px] sm:text-sm text-white leading-tight line-clamp-2 drop-shadow-md">
            {entry.name}
          </h3>
          {category && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 shadow-sm shadow-amber-400/40" />
              <span className="text-[10px] sm:text-[11px] font-medium text-white/60">
                {category.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description bar */}
      {entry.description && (
        <div className="px-3 sm:px-3.5 py-2 sm:py-2.5 border-t border-border/15 bg-card">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
            {entry.description}
          </p>
        </div>
      )}

      {/* Hover border glow ring */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/[0.04] group-hover:ring-amber-500/15 transition-all duration-500 pointer-events-none" />
    </button>
  );
}
