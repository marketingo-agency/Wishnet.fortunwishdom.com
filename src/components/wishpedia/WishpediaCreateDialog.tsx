"use client";

/**
 * WishpediaCreateDialog
 * Premium dialog to create a new Wishpedia entry
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWishpediaCategories } from '@/hooks/useWishpediaCategories';
import { useCreateWishpediaEntry } from '@/hooks/useWishpediaEntries';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WishpediaCreateDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { data: categories = [] } = useWishpediaCategories();
  const createEntry = useCreateWishpediaEntry();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const activeCategories = categories.filter(c => c.is_active);
  const selectedCategory = activeCategories.find(c => c.id === categoryId);

  const handleCreate = async () => {
    if (!name.trim() || !categoryId) return;

    const entry = await createEntry.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      category_id: categoryId,
    });

    onOpenChange(false);
    setName('');
    setDescription('');
    setCategoryId('');
    router.push(`/mastermind/wishpedia/${entry.slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-border/50 shadow-2xl w-[calc(100%-2rem)] sm:w-full rounded-xl sm:rounded-2xl">
        {/* Premium header with gradient */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-orange-500/5" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 shadow-sm">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Create New Entry
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Add a new entry to your Wishpedia encyclopedia
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2 space-y-5">
          {/* Category selector — visual card grid */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 min-h-[44px] text-left transition-all duration-200 border",
                      isSelected
                        ? "border-amber-500/40 shadow-md shadow-amber-500/10"
                        : "border-border/60 hover:border-border hover:shadow-sm bg-card/50 hover:bg-card"
                    )}
                    style={undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm font-medium truncate transition-colors",
                        isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {cat.name}
                      </p>
                    </div>
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full shrink-0 animate-in zoom-in-50 duration-200 bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
            {activeCategories.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-6 justify-center">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No categories available</p>
              </div>
            )}
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="wp-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input
              id="wp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wishu Prime"
              className="h-11 rounded-xl border-border/60 bg-card/50 focus-visible:border-amber-500/50 focus-visible:shadow-amber-500/10 focus-visible:shadow-sm transition-all"
              autoFocus
            />
          </div>

          {/* Description textarea */}
          <div className="space-y-2">
            <Label htmlFor="wp-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
              <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">optional</span>
            </Label>
            <Textarea
              id="wp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this entry…"
              rows={3}
              className="rounded-xl border-border/60 bg-card/50 focus-visible:border-amber-500/50 focus-visible:shadow-amber-500/10 focus-visible:shadow-sm transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer with selected category preview */}
        <DialogFooter className="px-4 sm:px-6 py-4 mt-2 border-t border-border/40 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
            {/* Selected category mini-preview — hidden on narrow screens */}
            <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
              {selectedCategory ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-50 slide-in-from-left-2 duration-200">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {selectedCategory.icon}
                  </span>
                  <span className="truncate font-medium">{selectedCategory.name}</span>
                  {name.trim() && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      <span className="truncate text-foreground/80">{name.trim()}</span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/50">Select a category to begin</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!name.trim() || !categoryId || createEntry.isPending}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 disabled:shadow-none rounded-lg px-5 flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
              >
                {createEntry.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
