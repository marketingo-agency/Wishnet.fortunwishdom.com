"use client";

/**
 * WishpediaEntry — Full entry detail page with view/edit toggle.
 * Edit mode reuses the same split-panel layout as view mode,
 * swapping static text for inline inputs for visual continuity.
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, BookOpen, Save, Trash2,
  ImageOff, Loader2, Pencil, Eye, ChevronRight,
  Images, Calendar, RefreshCw, Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useWishpediaEntryBySlug,
  useUpdateWishpediaEntry,
  useDeleteWishpediaEntry,
} from '@/hooks/useWishpediaEntries';
import { useEntryIndexStatus } from '@/hooks/useOcrIndexing';
import { useProcessWishpediaEntryEmbedding } from '@/hooks/useKnowledgeEmbeddings';
import { useWishpediaCategories } from '@/hooks/useWishpediaCategories';
import {
  useWishpediaImages,
  useUploadWishpediaImage,
  useDeleteWishpediaImage,
  useSetPrimaryImage,
  getWishpediaImageUrl,
} from '@/hooks/useWishpediaImages';
import { WishpediaAngleGrid } from '@/components/wishpedia/WishpediaAngleGrid';
import { WishpediaFreeGallery } from '@/components/wishpedia/WishpediaFreeGallery';
import { WishpediaCharacterView } from '@/components/wishpedia/WishpediaCharacterView';
import { cn } from '@/lib/utils';
import { ANGLE_VIEWS } from '@/types/wishpedia';

/* ── Angle labels ── */
const ANGLE_LABELS: Record<string, string> = {
  front: 'Front', back: 'Back', left: 'Left',
  right: 'Right', top: 'Top', bottom: 'Bottom',
};

export default function WishpediaEntry() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();

  const { data: entry, isLoading: loadingEntry } = useWishpediaEntryBySlug(slug);
  const { data: categories = [] } = useWishpediaCategories();
  const { data: images = [] } = useWishpediaImages(entry?.id);

  const updateEntry = useUpdateWishpediaEntry();
  const deleteEntry = useDeleteWishpediaEntry();
  const uploadImage = useUploadWishpediaImage();
  const deleteImage = useDeleteWishpediaImage();
  const setPrimary = useSetPrimaryImage();
  const { data: indexStatus } = useEntryIndexStatus(entry?.id);
  const processEmbedding = useProcessWishpediaEntryEmbedding();

  const category = categories.find((c) => c.id === entry?.category_id);
  const isIndexed = (indexStatus?.chunkCount ?? 0) > 0;
  const isIndexing = processEmbedding.isPending;

  const [isViewMode, setIsViewMode] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setDescription(entry.description || '');
      setDirty(false);
    }
  }, [entry]);

  const handleNameChange = (v: string) => { setName(v); setDirty(true); };
  const handleDescChange = (v: string) => { setDescription(v); setDirty(true); };

  const handleSave = () => {
    if (!entry) return;
    updateEntry.mutate(
      { id: entry.id, updates: { name, description: description || null } },
      {
        onSuccess: (updated) => {
          setDirty(false);
          if (updated.slug !== slug) {
            router.replace(`/mastermind/wishpedia/${updated.slug}`);
          }
        },
      }
    );
  };

  const handleDeleteEntry = () => {
    if (!entry) return;
    deleteEntry.mutate(entry.id, {
      onSuccess: () => router.push('/mastermind/wishpedia'),
    });
  };

  const handleUpload = (file: File, angle?: string) => {
    if (!entry) return;
    uploadImage.mutate({ entryId: entry.id, file, angle });
  };

  const handleDelete = (image: Parameters<typeof deleteImage.mutate>[0]['image']) => {
    deleteImage.mutate({ image });
  };

  const handleSetPrimary = (imageId: string) => {
    if (!entry) return;
    setPrimary.mutate({ imageId, entryId: entry.id });
  };

  const primaryImage = images.find((i) => i.is_primary) || images[0];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  /* ── Loading / Not Found ── */
  if (loadingEntry) {
    return (
      <div className="flex h-full p-0">
        <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="p-4 sm:p-8 flex flex-col lg:flex-row gap-5 lg:gap-8">
            <Skeleton className="w-full lg:w-[58%] aspect-[4/5] rounded-2xl" />
            <div className="w-full lg:w-[42%] space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground px-4">
        <BookOpen className="w-12 h-12" />
        <p className="text-lg font-medium">Entry not found</p>
        <Button variant="outline" onClick={() => router.push('/mastermind/wishpedia')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Wishpedia
        </Button>
      </div>
    );
  }

  /* ── Angle helpers for edit mode filmstrip ── */
  const angleImages = ANGLE_VIEWS.map((angle) => ({
    angle,
    label: ANGLE_LABELS[angle],
    image: images.find((i) => i.angle === angle),
  }));
  const filledAngles = angleImages.filter((a) => a.image).length;

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">

        {/* ── Header ── */}
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4">
            {/* Left: Back + Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 rounded-xl hover:bg-amber-500/10 transition-colors"
                onClick={() => router.push('/mastermind/wishpedia')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {/* Breadcrumb trail */}
              <nav className="flex items-center gap-1.5 min-w-0 text-xs sm:text-sm">
                <button
                  onClick={() => router.push('/mastermind/wishpedia')}
                  className="text-muted-foreground/70 hover:text-foreground transition-colors shrink-0 hidden sm:inline font-medium"
                >
                  Wishpedia
                </button>
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0 hidden sm:inline" />
                {category && (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 shrink-0 font-medium hidden md:inline">
                      {category.name}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                  </>
                )}
                <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[240px]">
                  {isViewMode ? entry.name : (name || entry.name)}
                </span>
              </nav>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Index button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-1.5 text-xs h-9 min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all duration-200",
                        isIndexing && "animate-pulse border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
                        isIndexed && !isIndexing && "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300",
                        !isIndexed && !isIndexing && "hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-200"
                      )}
                      onClick={() => entry && processEmbedding.mutate(entry.id)}
                      disabled={isIndexing}
                    >
                      {isIndexing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Database className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isIndexing ? 'Indexing…' : isIndexed ? 'Re-index' : 'Index'}
                      </span>
                      {isIndexed && !isIndexing && (
                        <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-0 rounded-md">
                          {indexStatus?.chunkCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isIndexing
                      ? 'Processing embeddings…'
                      : isIndexed
                        ? `Indexed: ${indexStatus?.chunkCount} chunks in RAG knowledge base`
                        : 'Index this entry for AI knowledge base'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Separator dot */}
              <div className="w-px h-5 bg-border/50 mx-0.5 hidden sm:block" />

              {/* View/Edit toggle */}
              <Button
                variant={isViewMode ? 'outline' : 'default'}
                size="sm"
                className={cn(
                  "gap-1.5 text-xs h-9 min-h-[44px] px-2.5 sm:px-3 rounded-xl transition-all duration-200",
                  !isViewMode && "bg-amber-500 hover:bg-amber-600 text-amber-950"
                )}
                onClick={() => setIsViewMode(!isViewMode)}
              >
                {isViewMode ? (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </>
                )}
              </Button>

              {!isViewMode && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-9 min-h-[44px] px-2.5 sm:px-3 rounded-xl"
                        disabled={deleteEntry.isPending}
                      >
                        {deleteEntry.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-xl sm:rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{entry.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this entry and all its images. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteEntry}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {dirty && (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 h-9 min-h-[44px] px-3 sm:px-4"
                      onClick={handleSave}
                      disabled={updateEntry.isPending || !name.trim()}
                    >
                      {updateEntry.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <ScrollArea className="flex-1">
          {isViewMode ? (
            <WishpediaCharacterView
              entry={entry}
              category={category}
              images={images}
            />
          ) : (
            /* ─── Edit Mode: Premium split-panel layout ─── */
            <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 wp-animate-in">

              {/* Split Panel: Hero + Inline Edit Info */}
              <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">

                {/* Hero Image — same position as view mode */}
                <div className="w-full lg:w-[58%] shrink-0">
                  <div className="group relative aspect-[4/5] rounded-2xl border border-border/40 bg-muted/20 overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={getWishpediaImageUrl(primaryImage.storage_path)}
                        alt={entry.name}
                        className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground/20">
                        <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center">
                          <ImageOff className="w-10 h-10" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground/30">No images yet</span>
                        <span className="text-[10px] text-muted-foreground/20">Upload images below</span>
                      </div>
                    )}

                    {primaryImage?.is_primary && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-amber-500/90 text-white border-0 text-[9px] px-2 py-0.5 rounded-md shadow-sm shadow-amber-500/20 backdrop-blur-sm">
                          Primary
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail reel — refined */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mt-3 -mx-3 px-3 sm:mx-0 sm:px-0">
                      {images.map((img) => (
                        <button
                          key={img.id}
                          className={cn(
                            "shrink-0 w-14 h-14 min-w-[56px] min-h-[56px] rounded-xl overflow-hidden transition-all duration-200 active:scale-95 touch-manipulation",
                            img.id === primaryImage?.id
                              ? "ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background shadow-md shadow-amber-500/10"
                              : "border border-border/30 hover:border-border/60 hover:shadow-sm opacity-70 hover:opacity-100"
                          )}
                          onClick={() => handleSetPrimary(img.id)}
                        >
                          <img
                            src={getWishpediaImageUrl(img.storage_path)}
                            alt={img.original_name}
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Panel — premium inline editing */}
                <div className="w-full lg:w-[42%] flex flex-col justify-between gap-5">
                  <div className="space-y-5">
                    {/* Name input — large, premium */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                        <Pencil className="w-2.5 h-2.5" />
                        Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="text-xl sm:text-2xl lg:text-3xl font-bold h-auto py-2.5 px-3.5"
                        placeholder="Entry name"
                      />
                    </div>

                    {/* Category indicator */}
                    {category && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500 shadow-sm shadow-amber-500/30" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          {category.name}
                        </span>
                        {category.has_angle_views && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md ml-auto">
                            6-Angle
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Description input — refined */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                        <BookOpen className="w-2.5 h-2.5" />
                        Description
                        <span className="font-normal normal-case tracking-normal text-muted-foreground/30 ml-1">optional</span>
                      </label>
                      <Textarea
                        value={description}
                        onChange={(e) => handleDescChange(e.target.value)}
                        placeholder="Add a description…"
                        rows={4}
                        className="resize-none text-sm leading-relaxed min-h-[100px]"
                      />
                    </div>
                  </div>

                  {/* Bottom: Metadata (read-only) — frosted card */}
                  <div className="rounded-xl border border-border/30 bg-muted/[0.04] p-4 space-y-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                      Entry Info
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Images
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                          <Images className="w-3.5 h-3.5 text-muted-foreground/40" />
                          {images.length}
                          {category?.has_angle_views && (
                            <span className="text-muted-foreground/60 text-xs">
                              ({filledAngles}/6 angles)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Created
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                          {formatDate(entry.created_at)}
                        </div>
                      </div>

                      {entry.updated_at !== entry.created_at && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                            Updated
                          </span>
                          <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/40" />
                            {formatDate(entry.updated_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Image Management Section — refined container ── */}
              <div className="rounded-xl border border-border/30 bg-muted/[0.02] p-4 sm:p-6 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Images className="w-4 h-4 text-muted-foreground/40" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Image Management
                  </h3>
                </div>
                {category?.has_angle_views ? (
                  <WishpediaAngleGrid
                    images={images}
                    onUpload={(file, angle) => handleUpload(file, angle)}
                    onDelete={handleDelete}
                    onSetPrimary={handleSetPrimary}
                    uploading={uploadImage.isPending}
                  />
                ) : (
                  <WishpediaFreeGallery
                    images={images}
                    onUpload={(file) => handleUpload(file)}
                    onDelete={handleDelete}
                    onSetPrimary={handleSetPrimary}
                    uploading={uploadImage.isPending}
                  />
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
