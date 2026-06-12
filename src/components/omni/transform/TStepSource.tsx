"use client";

/**
 * Transform step 1: upload an image or choose one from the Files media
 * library (images only). Creates the run's source asset.
 */

import { useRef, useState } from 'react';
import { FolderOpen, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLibraryImages, uploadSourceAsset, referenceLibraryImage, getAssetSignedUrl, type LibraryImage } from '@/hooks/omni';

interface TStepSourceProps {
  createRunIfNeeded: () => Promise<string>;
  onSourceReady: (runId: string, assetId: string) => void;
}

export function TStepSource({ createRunIfNeeded, onSourceReady }: TStepSourceProps) {
  const [tab, setTab] = useState<'upload' | 'library'>('upload');
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const library = useLibraryImages(tab === 'library');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handleFile = async (file: File | undefined) => {
    if (!file || isBusy) return;
    setIsBusy(true);
    try {
      const runId = await createRunIfNeeded();
      const assetId = await uploadSourceAsset(runId, file);
      onSourceReady(runId, assetId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLibraryPick = async (row: LibraryImage) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const runId = await createRunIfNeeded();
      const assetId = await referenceLibraryImage(runId, row);
      onSourceReady(runId, assetId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not use this image');
    } finally {
      setIsBusy(false);
    }
  };

  const loadPreview = async (row: LibraryImage) => {
    if (previews[row.id]) return;
    const url = await getAssetSignedUrl(row.storage_path);
    if (url) setPreviews((prev) => ({ ...prev, [row.id]: url }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label="Image source">
        {([['upload', 'Upload', Upload], ['library', 'Media library', FolderOpen]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === id ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); void handleFile(e.dataTransfer.files?.[0]); }}
          className={cn(
            'flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200',
            isDragging ? 'border-blue-500/70 bg-blue-500/5' : 'border-border',
          )}
        >
          {isBusy ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop an image here or browse</p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 20MB</p>
              </div>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer transition-colors duration-200"
              >
                Browse files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-label="Upload source image"
                onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </>
          )}
        </div>
      ) : library.isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : library.isError ? (
        <p className="py-8 text-center text-sm text-destructive">Could not load the media library.</p>
      ) : (library.data?.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No images in the Files library yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {library.data!.map((row) => {
            void loadPreview(row);
            return (
              <button
                key={row.id}
                onClick={() => void handleLibraryPick(row)}
                disabled={isBusy}
                aria-label={`Use ${row.name}`}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40 transition-all duration-200 hover:border-blue-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
              >
                {previews[row.id] ? (
                  <img src={previews[row.id]} alt={row.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-muted" />
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {row.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
