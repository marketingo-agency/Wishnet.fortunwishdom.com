/**
 * WishpediaFreeGallery
 * Premium free-form image gallery with drag-and-drop + Files Manager selection
 * Responsive: always-visible actions on mobile, proper touch targets.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Star, ImagePlus, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WishpediaEntryImage } from '@/types/wishpedia';
import { getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { SelectFromFilesDialog } from './SelectFromFilesDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Props {
  images: WishpediaEntryImage[];
  onUpload: (file: File) => void;
  onDelete: (image: WishpediaEntryImage) => void;
  onSetPrimary: (imageId: string) => void;
  uploading: boolean;
}

export function WishpediaFreeGallery({ images, onUpload, onDelete, onSetPrimary, uploading }: Props) {
  const isMobile = useIsMobile();
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach((f) => onUpload(f));
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    disabled: uploading,
    noClick: true,
    noKeyboard: true,
  });

  const handleFileSelected = async (selected: { url: string; name: string; mime_type: string }) => {
    try {
      const response = await fetch(selected.url);
      const blob = await response.blob();
      const file = new File([blob], selected.name, { type: selected.mime_type });
      onUpload(file);
    } catch (err) {
      console.error('Failed to fetch file from Files Manager:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Images
        </h3>
        <span className="text-xs text-muted-foreground/60">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group aspect-square rounded-2xl border border-border/30 bg-muted/10 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-amber-500/[0.04] transition-all duration-300"
          >
            {/* Checkerboard hint */}
            <div className="absolute inset-0 opacity-[0.03] bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]" />

            <img
              src={getWishpediaImageUrl(img.storage_path)}
              alt={img.original_name}
              className="relative w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />

            {/* Primary badge */}
            {img.is_primary && (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-amber-500/90 text-white border-0 backdrop-blur-md text-[9px] px-2 py-0.5 font-semibold shadow-sm shadow-amber-500/20">
                  <Star className="w-2.5 h-2.5 mr-1 fill-white" />
                  Primary
                </Badge>
              </div>
            )}

            {/* File name frosted label */}
            <div className="absolute bottom-0 inset-x-0 py-1.5 px-2.5 bg-background/70 backdrop-blur-md border-t border-border/20">
              <span className="text-[10px] text-muted-foreground/70 truncate block">
                {img.original_name}
              </span>
            </div>

            {/* Action overlay */}
            <div className={cn(
              "absolute transition-all duration-200 flex items-center justify-center gap-1.5",
              isMobile
                ? "inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1 px-1"
                : "inset-0 bg-background/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100"
            )}>
              {!img.is_primary && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-amber-500/20 hover:text-amber-600 transition-all"
                  onClick={() => onSetPrimary(img.id)}
                  title="Set as primary"
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                onClick={() => onDelete(img)}
                title="Delete"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload slot — dual action */}
        <div
          {...getRootProps()}
          className={cn(
            "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/[0.02]",
            isDragActive
              ? 'border-amber-500/60 bg-amber-500/5 shadow-inner shadow-amber-500/10 scale-[1.02]'
              : 'border-border/30 bg-muted/[0.04]'
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-muted-foreground/40 animate-spin" />
              <span className="text-xs text-muted-foreground/50 font-medium">Uploading…</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-muted-foreground/25" />
              </div>
              <span className="text-xs font-medium text-muted-foreground/40">Add Image</span>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
                  className="text-[10px] text-muted-foreground/40 hover:text-amber-500 transition-colors flex items-center gap-1 p-1.5 min-h-[44px] rounded-lg hover:bg-amber-500/[0.06]"
                >
                  <ImagePlus className="w-3 h-3" /> Upload
                </button>
                <span className="text-[8px] text-muted-foreground/15">|</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFilesDialogOpen(true); }}
                  className="text-[10px] text-muted-foreground/40 hover:text-amber-500 transition-colors flex items-center gap-1 p-1.5 min-h-[44px] rounded-lg hover:bg-amber-500/[0.06]"
                >
                  <FolderOpen className="w-3 h-3" /> Files
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SelectFromFilesDialog
        open={filesDialogOpen}
        onOpenChange={setFilesDialogOpen}
        onSelect={handleFileSelected}
      />
    </div>
  );
}
