"use client";

/**
 * WishpediaIndex — encyclopedia listing
 * Rebuilt to the app's standard card-framed pattern (inspired by the AI Agents page):
 * bg-card shell → standard header (icon box + title) → search/filter → ScrollArea → responsive grid.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, ArrowLeft, Search, Settings, Database, Loader2, Library } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useWishpediaEntries } from '@/hooks/useWishpediaEntries';
import { useWishpediaCategories } from '@/hooks/useWishpediaCategories';
import { WishpediaEntryCard } from '@/components/wishpedia/WishpediaEntryCard';
import { WishpediaCreateDialog } from '@/components/wishpedia/WishpediaCreateDialog';
import { useBulkWishpediaIndex, useUnindexedEntryCount } from '@/hooks/useBulkWishpediaIndex';
import { cn } from '@/lib/utils';

export default function WishpediaIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const bulkIndex = useBulkWishpediaIndex();
  const { data: unindexedCount = 0 } = useUnindexedEntryCount();

  const { data: categories = [] } = useWishpediaCategories();
  const { data: entries = [], isLoading } = useWishpediaEntries({ search, categoryId: categoryFilter });
  const { data: allEntries = [] } = useWishpediaEntries({ search });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((e) => { counts[e.category_id] = (counts[e.category_id] || 0) + 1; });
    return counts;
  }, [allEntries]);

  const activeCategories = categories.filter(c => c.is_active);
  const isFiltered = !!search || categoryFilter !== 'all';

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* ── Header ── */}
        <div className="border-b px-4 sm:px-6 py-4 sm:py-5">
          {/* Top row: back + utility actions */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
              onClick={() => router.push('/mastermind')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs hidden sm:inline">MasterMind</span>
            </Button>

            <div className="flex items-center gap-1.5">
              {unindexedCount > 0 && !bulkIndex.isRunning && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bulkIndex.start()}
                        className="gap-1.5 text-xs h-8 px-2.5"
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Index All</span>
                        <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unindexedCount}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Index {unindexedCount} entries for AI knowledge</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {bulkIndex.isRunning && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border bg-emerald-500/5">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 font-medium tabular-nums">{bulkIndex.progress}/{bulkIndex.total}</span>
                  <button onClick={() => bulkIndex.cancel()} className="text-[10px] text-muted-foreground hover:text-foreground ml-1 cursor-pointer">Cancel</button>
                </div>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/mastermind/vector-store')} className="h-8 w-8">
                      <Database className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vector Store</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/settings?tab=mastermind')} className="h-8 w-8">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Title block */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 shrink-0">
                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Wishpedia</h1>
                <p className="text-muted-foreground text-sm">
                  Encyclopedia of the Fortun Wishdom universe · {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5 self-start sm:self-auto">
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* ── Search + Category filter ── */}
        <div className="border-b px-4 sm:px-6 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
              className="shrink-0 text-xs h-8 gap-1.5"
            >
              All
              <span className="opacity-60 tabular-nums">{allEntries.length}</span>
            </Button>
            {activeCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
                className="shrink-0 text-xs h-8 gap-1.5"
              >
                {cat.name}
                <span className="opacity-60 tabular-nums">{categoryCounts[cat.id] || 0}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* ── Content grid ── */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 px-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Library className="w-8 h-8 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1.5">
                  {isFiltered ? 'No entries found' : 'Start your encyclopedia'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
                  {isFiltered
                    ? 'Try adjusting your filters or search terms.'
                    : 'Create your first entry to begin building the Fortun Wishdom universe.'}
                </p>
                {!isFiltered && (
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4')}>
                {entries.map((entry) => {
                  const cat = categories.find(c => c.id === entry.category_id);
                  return <WishpediaEntryCard key={entry.id} entry={entry} category={cat} />;
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <WishpediaCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}
