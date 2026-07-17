"use client";

/**
 * Item detail Sheet: full description, gallery of saved assets, and the
 * per-network post variants with their publish / schedule actions.
 */

import { useMemo } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/settings/pulsePlatforms';
import { NETWORK_META, isLibraryNetwork } from './libraryStatus';
import { LibraryPostRow } from './LibraryPostRow';
import { useDeleteLibraryItem, useLibraryAssetUrls, type ContentLibraryItem } from './useContentLibrary';

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

  const { data: assetUrls } = useLibraryAssetUrls(assetIds);
  const urls = assetUrls?.urls;
  const thumbs = assetUrls?.thumbs;

  const itemOnlyAssetIds = useMemo(() => {
    if (!item) return [];
    const postAssetIds = new Set(item.content_library_posts.map((p) => p.asset_id).filter(Boolean));
    return (item.metadata.asset_ids ?? []).filter((id) => !postAssetIds.has(id));
  }, [item]);

  const deleteItem = useDeleteLibraryItem();
  const posts = item?.content_library_posts ?? [];
  const publishedCount = posts.filter((p) => p.status === 'posted').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

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
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.media_type === 'video' ? 'Saved videos' : 'Saved images'}
                  </h3>
                  <div className={cn('grid gap-2', itemOnlyAssetIds.length > 1 && item.media_type !== 'video' ? 'grid-cols-2' : 'grid-cols-1')}>
                    {itemOnlyAssetIds.map((id) => (
                      <div key={id} className="overflow-hidden rounded-lg border bg-muted">
                        {urls?.[id] ? (
                          item.media_type === 'video' ? (
                            <video src={urls[id]} poster={thumbs?.[id]} controls preload="metadata" className="max-h-64 w-full object-contain" aria-label="Saved library video" />
                          ) : (
                            <img src={urls[id]} alt="Saved library asset" className="h-full w-full object-cover" loading="lazy" />
                          )
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
                        thumbUrl={post.asset_id ? thumbs?.[post.asset_id] : undefined}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  This item was saved without network posts. Run it through Images Repurposing to create per-network variants.
                </p>
              )}

              <div className="border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer gap-2 border-destructive/30 text-destructive transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete library entry
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this library entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-medium text-foreground">{item.title}</span>
                        {posts.length > 0 ? ` and its ${posts.length} post${posts.length === 1 ? '' : 's'}` : ''} will be removed from the Content Library. The source Omni run and its media are not affected.
                        {publishedCount > 0 && ` ${publishedCount} already-published post${publishedCount === 1 ? '' : 's'} will stay live on the network — only the local record is removed.`}
                        {scheduledCount > 0 && ` ${scheduledCount} scheduled post${scheduledCount === 1 ? '' : 's'} will no longer be published.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          // Keep the dialog open while the delete runs so the spinner
                          // shows; the Sheet closes on success (unmounting the dialog).
                          e.preventDefault();
                          if (!deleteItem.isPending) deleteItem.mutate(item.id, { onSuccess: () => onOpenChange(false) });
                        }}
                        disabled={deleteItem.isPending}
                        className="cursor-pointer gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete entry'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
