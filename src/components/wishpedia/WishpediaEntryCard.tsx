"use client";

/**
 * WishpediaEntryCard
 * Clean card-framed entry card for the index grid — inspired by AgentCard.
 * Image hero + name + category badge, with indexed / image-count overlays.
 */

import Link from 'next/link';
import { ImageOff, Images, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWishpediaImages, getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { useEntryIndexStatus } from '@/hooks/useOcrIndexing';
import type { WishpediaEntry, WishpediaCategory } from '@/types/wishpedia';

interface Props {
  entry: WishpediaEntry;
  category?: WishpediaCategory;
}

export function WishpediaEntryCard({ entry, category }: Props) {
  const { data: images = [] } = useWishpediaImages(entry.id);
  const { data: indexStatus } = useEntryIndexStatus(entry.id);
  const primaryImage = images.find(i => i.is_primary) || images[0];

  return (
    <Link
      href={`/mastermind/wishpedia/${entry.slug}`}
      aria-label={`Open ${entry.name}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="flex h-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
        {/* Image hero */}
        <div className="relative aspect-[3/4] bg-muted/40 overflow-hidden">
          {primaryImage ? (
            <img
              src={getWishpediaImageUrl(primaryImage.storage_path)}
              alt={entry.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          {indexStatus?.isIndexed && (
            <Badge
              className="absolute left-2 top-2 gap-1 border-0 bg-emerald-500 text-[10px] text-white shadow-sm"
              title={`Indexed: ${indexStatus.chunkCount} chunks`}
            >
              <Database className="h-2.5 w-2.5" />
              Indexed
            </Badge>
          )}

          {images.length > 1 && (
            <Badge className="absolute right-2 top-2 gap-1 border-0 bg-foreground/70 text-[10px] text-background">
              <Images className="h-2.5 w-2.5" />
              {images.length}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
            {entry.name}
          </h3>
          {category && (
            <Badge
              variant="outline"
              className="self-start gap-1.5 bg-amber-50 text-[10px] text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
            >
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              {category.name}
            </Badge>
          )}
          {entry.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {entry.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
