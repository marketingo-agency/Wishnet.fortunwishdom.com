"use client";

/**
 * WishpediaIndex — Premium encyclopedia listing
 * Redesigned with hero header, glass-morphism search, refined grid
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, ArrowLeft, Search, Settings, Database, Loader2, Sparkles, Library } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const { data: entries = [], isLoading } = useWishpediaEntries({
    search,
    categoryId: categoryFilter,
  });

  const { data: allEntries = [] } = useWishpediaEntries({ search });
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((e) => {
      counts[e.category_id] = (counts[e.category_id] || 0) + 1;
    });
    return counts;
  }, [allEntries]);

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden">
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-amber-400/[0.02] to-orange-500/[0.04]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/[0.03] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5">
            {/* Top row: back + actions */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
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
                {/* Bulk Index */}
                {unindexedCount > 0 && !bulkIndex.isRunning && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bulkIndex.start()}
                          className="gap-1.5 text-xs h-8 px-2.5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 hover:border-emerald-500/30"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Index All</span>
                          <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unindexedCount}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Index {unindexedCount} entries for AI knowledge</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {bulkIndex.isRunning && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    <span className="text-[11px] text-emerald-600 font-medium tabular-nums">{bulkIndex.progress}/{bulkIndex.total}</span>
                    <button onClick={() => bulkIndex.cancel()} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">Cancel</button>
                  </div>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => router.push('/mastermind/vector-store')} className="h-8 w-8">
                        <Database className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vector Store</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => router.push('/settings?tab=mastermind')} className="h-8 w-8">
                        <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Title block */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-xl scale-150" />
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/20">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Wishpedia</h1>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" />
                      {allEntries.length} entries
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Encyclopedia of the Fortun Wishdom universe</p>
                </div>
              </div>

              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 text-sm h-10 px-4 rounded-xl font-medium self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Entry</span>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* ── Search + Category Chips ── */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className={cn(
                "w-full pl-9 pr-4 h-10 rounded-xl text-sm",
                "bg-muted/30 border border-border/50",
                "placeholder:text-muted-foreground/40",
                "focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                categoryFilter === 'all'
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              All
              <span className={cn("ml-1.5 tabular-nums", categoryFilter === 'all' ? "text-white/70" : "opacity-40")}>{allEntries.length}</span>
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                  categoryFilter === cat.id
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {categoryFilter !== cat.id && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500/50" />
                )}
                {cat.name}
                <span className={cn("tabular-nums", categoryFilter === cat.id ? "text-white/70" : "opacity-40")}>{categoryCounts[cat.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/40" />

        {/* ── Content Grid ── */}
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div
                    key={i}
                    className="flex flex-col rounded-xl sm:rounded-2xl border border-border/20 overflow-hidden bg-card animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="aspect-[3/4] bg-muted/40" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 w-3/4 bg-muted/40 rounded" />
                      <div className="h-2.5 w-1/2 bg-muted/30 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20 sm:py-28 px-4">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-amber-500/8 rounded-3xl blur-2xl scale-[2]" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-900/15 dark:to-amber-800/5 flex items-center justify-center border border-amber-200/20 dark:border-amber-700/10">
                    <Library className="w-7 h-7 sm:w-9 sm:h-9 text-amber-400/30" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                  {search || categoryFilter !== 'all' ? 'No entries found' : 'Start your encyclopedia'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                  {search || categoryFilter !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'Create your first entry to begin building the Fortun Wishdom universe.'}
                </p>
                {!search && categoryFilter === 'all' && (
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20 text-sm h-10 px-5 rounded-xl font-medium"
                  >
                    <Plus className="w-4 h-4" /> Create First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                {entries.map((entry, idx) => {
                  const cat = categories.find(c => c.id === entry.category_id);
                  return (
                    <div
                      key={entry.id}
                      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                      style={{ animationDelay: `${Math.min(idx, 12) * 50}ms`, animationDuration: '400ms' }}
                    >
                      <WishpediaEntryCard entry={entry} category={cat} />
                    </div>
                  );
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
