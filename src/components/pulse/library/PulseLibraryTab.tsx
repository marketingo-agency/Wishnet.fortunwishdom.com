"use client";

/**
 * Pulse Content Library tab: the admin-shared gallery of finalized Omni
 * outputs with per-network posting controls. Reads through admin RLS,
 * signs media through the content-library edge function.
 */

import { useMemo, useState } from 'react';
import { Library, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LIBRARY_NETWORKS, NETWORK_META, POST_STATUS_META, type LibraryPostStatus } from './libraryStatus';
import { LibraryConnections } from './LibraryConnections';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryItemSheet } from './LibraryItemSheet';
import { itemCoverAssetId, useLibraryAssetUrls, useLibraryItems, type ContentLibraryItem } from './useContentLibrary';

const STATUS_FILTERS: Array<LibraryPostStatus | 'all'> = ['all', 'draft', 'queued', 'scheduled', 'posted', 'failed'];

export function PulseLibraryTab() {
  const { data: items, isLoading } = useLibraryItems();

  const [search, setSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<LibraryPostStatus | 'all'>('all');
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (term && !item.title.toLowerCase().includes(term) && !(item.description ?? '').toLowerCase().includes(term)) {
        return false;
      }
      if (networkFilter !== 'all' && !item.content_library_posts.some((p) => p.network === networkFilter)) {
        return false;
      }
      if (statusFilter !== 'all' && !item.content_library_posts.some((p) => p.status === statusFilter)) {
        return false;
      }
      return true;
    });
  }, [items, search, networkFilter, statusFilter]);

  const coverAssetIds = useMemo(
    () => filtered.map(itemCoverAssetId).filter((id): id is string => id !== null),
    [filtered],
  );
  const { data: coverAssets } = useLibraryAssetUrls(coverAssetIds);

  // The Sheet reads from the live items query so post status changes reflect immediately.
  const openItem: ContentLibraryItem | null = useMemo(
    () => (openItemId ? (items ?? []).find((i) => i.id === openItemId) ?? null : null),
    [items, openItemId],
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <LibraryConnections />

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the library"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="h-9 w-[140px] text-sm" aria-label="Filter by network"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All networks</SelectItem>
              {LIBRARY_NETWORKS.map((n) => (
                <SelectItem key={n} value={n} className="text-sm">{NETWORK_META[n].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LibraryPostStatus | 'all')}>
            <SelectTrigger className="h-9 w-[140px] text-sm" aria-label="Filter by post status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s} className="text-sm">{s === 'all' ? 'All statuses' : POST_STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const coverId = itemCoverAssetId(item);
            return (
              <LibraryItemCard
                key={item.id}
                item={item}
                coverUrl={coverId ? (coverAssets?.thumbs[coverId] ?? (item.media_type === 'video' ? undefined : coverAssets?.urls[coverId])) : undefined}
                onOpen={() => setOpenItemId(item.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Library className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{items && items.length > 0 ? 'No items match the filters' : 'The library is empty'}</p>
            <p className="text-xs text-muted-foreground">
              {items && items.length > 0
                ? 'Adjust the search or filters to see more.'
                : 'Finalize an Omni Studio run to fill the Content Library.'}
            </p>
          </div>
        </div>
      )}

      <LibraryItemSheet item={openItem} onOpenChange={(open) => !open && setOpenItemId(null)} />
    </div>
  );
}
