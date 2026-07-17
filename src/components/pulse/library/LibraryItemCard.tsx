"use client";

/**
 * One Content Library item in the grid: cover image, title, network pills,
 * and a compact per-status post count summary.
 */

import { ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/settings/pulsePlatforms';
import { NETWORK_META, POST_STATUS_META, isLibraryNetwork, type LibraryPostStatus } from './libraryStatus';
import { itemCoverAssetId, type ContentLibraryItem } from './useContentLibrary';

interface LibraryItemCardProps {
  item: ContentLibraryItem;
  coverUrl: string | undefined;
  onOpen: () => void;
}

export function LibraryItemCard({ item, coverUrl, onOpen }: LibraryItemCardProps) {
  const statusCounts = item.content_library_posts.reduce<Partial<Record<LibraryPostStatus, number>>>(
    (acc, post) => {
      acc[post.status] = (acc[post.status] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const hasCoverAsset = itemCoverAssetId(item) !== null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      className={cn(
        'flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {item.media_type === 'video' && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Video</span>
        )}
        {coverUrl ? (
          // Signed Supabase storage URL: plain img matches the rest of the app's storage rendering.
          <img src={coverUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {hasCoverAsset ? (
              <div className="h-full w-full animate-pulse bg-muted" />
            ) : (
              <ImageOff className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">{item.title}</p>

        {item.networks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.networks.filter(isLibraryNetwork).map((n) => (
              <span key={n} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white', NETWORK_META[n].pill)}>
                {NETWORK_META[n].label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
          <div className="flex flex-wrap gap-1">
            {(Object.entries(statusCounts) as Array<[LibraryPostStatus, number]>).map(([status, count]) => (
              <Badge key={status} className={cn('border-0 px-1.5 py-0 text-[9px] font-semibold', POST_STATUS_META[status].badge)}>
                {count} {POST_STATUS_META[status].label}
              </Badge>
            ))}
            {item.content_library_posts.length === 0 && (
              <span className="text-[10px] text-muted-foreground">Saved item only</span>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </button>
  );
}
