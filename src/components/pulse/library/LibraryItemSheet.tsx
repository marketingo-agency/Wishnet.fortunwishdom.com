"use client";

/**
 * Item detail Sheet: full description, gallery of saved assets, and the
 * per-network post variants with their publish / schedule actions.
 */

import { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/settings/pulsePlatforms';
import { NETWORK_META, isLibraryNetwork } from './libraryStatus';
import { LibraryPostRow } from './LibraryPostRow';
import { useLibraryAssetUrls, type ContentLibraryItem } from './useContentLibrary';

interface LibraryItemSheetProps {
  item: ContentLibraryItem | null;
  onOpenChange: (open: boolean) => void;
}

export function LibraryItemSheet({ item, onOpenChange }: LibraryItemSheetProps) {
  const assetIds = useMemo(() => {
    if (!item) return [];
    const ids = new Set<string>();
    for (const post of item.content_library_posts) {
      if (post.asset_id) ids.add(post.asset_id);
    }
    for (const id of item.metadata.asset_ids ?? []) ids.add(id);
    return [...ids];
  }, [item]);

  const { data: urls } = useLibraryAssetUrls(assetIds);

  const itemOnlyAssetIds = useMemo(() => {
    if (!item) return [];
    const postAssetIds = new Set(item.content_library_posts.map((p) => p.asset_id).filter(Boolean));
    return (item.metadata.asset_ids ?? []).filter((id) => !postAssetIds.has(id));
  }, [item]);

  return (
    <Sheet open={item !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {item && (
          <>
            <SheetHeader className="pb-3 text-left">
              <SheetTitle className="pr-8">{item.title}</SheetTitle>
              <SheetDescription>
                Saved {formatDate(item.created_at)}
                {item.networks.length > 0 && ` for ${item.networks.filter(isLibraryNetwork).map((n) => NETWORK_META[n].label).join(', ')}`}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pb-6">
              {item.description && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
              )}

              {itemOnlyAssetIds.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved images</h3>
                  <div className={cn('grid gap-2', itemOnlyAssetIds.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {itemOnlyAssetIds.map((id) => (
                      <div key={id} className="overflow-hidden rounded-lg border bg-muted">
                        {urls?.[id] ? (
                          <img src={urls[id]} alt="Saved library asset" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="aspect-video w-full animate-pulse bg-muted" />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {item.content_library_posts.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Posts ({item.content_library_posts.length})
                  </h3>
                  <div className="space-y-2.5">
                    {item.content_library_posts.map((post) => (
                      <LibraryPostRow
                        key={post.id}
                        post={post}
                        imageUrl={post.asset_id ? urls?.[post.asset_id] : undefined}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  This item was saved without network posts. Run it through Images Repurposing to create per-network variants.
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
