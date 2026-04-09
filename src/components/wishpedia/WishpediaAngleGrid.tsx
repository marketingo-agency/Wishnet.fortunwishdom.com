/**
 * WishpediaAngleGrid
 * Premium 6-slot structured upload grid for entries with angle views
 * Clean typographic labels, no emojis. Dual upload: computer + Files Manager.
 * Responsive: always-visible actions on mobile, proper touch targets.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, Star, RotateCw, Loader2, FolderOpen,
  MoveUp, MoveDown, MoveLeft, MoveRight, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANGLE_VIEWS, type AngleView } from '@/types/wishpedia';
import type { WishpediaEntryImage } from '@/types/wishpedia';
import { getWishpediaImageUrl } from '@/hooks/useWishpediaImages';
import { SelectFromFilesDialog } from './SelectFromFilesDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Props {
  images: WishpediaEntryImage[];
  onUpload: (file: File, angle: string) => void;
  onDelete: (image: WishpediaEntryImage) => void;
  onSetPrimary: (imageId: string) => void;
  uploading: boolean;
}

const ANGLE_LABELS: Record<AngleView, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

const ANGLE_ICON_MAP: Record<AngleView, React.ComponentType<{ className?: string }>> = {
  front: ArrowUp,
  back: ArrowDown,
  left: MoveLeft,
  right: MoveRight,
  top: MoveUp,
  bottom: MoveDown,
};

function AngleSlot({
  angle,
  image,
  onUpload,
  onDelete,
  onSetPrimary,
  uploading,
  onSelectFromFiles,
  isMobile,
}: {
  angle: AngleView;
  image?: WishpediaEntryImage;
  onUpload: (file: File, angle: string) => void;
  onDelete: (image: WishpediaEntryImage) => void;
  onSetPrimary: (imageId: string) => void;
  uploading: boolean;
  onSelectFromFiles: (angle: AngleView) => void;
  isMobile: boolean;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onUpload(accepted[0], angle);
    },
    [angle, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'] },
    maxFiles: 1,
    disabled: uploading,
    noClick: true,
    noKeyboard: true,
  });

  const IconComp = ANGLE_ICON_MAP[angle];

  if (image) {
    return (
      <div
        {...getRootProps()}
        className="relative group aspect-square rounded-2xl border border-border/30 bg-muted/10 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-amber-500/[0.04] transition-all duration-300"
      >
        <input {...getInputProps()} />
        {/* Checkerboard hint */}
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]" />

        <img
          src={getWishpediaImageUrl(image.storage_path)}
          alt={`${angle} view`}
          className="relative w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Frosted label */}
        <div className="absolute bottom-0 inset-x-0 py-1.5 px-2.5 bg-background/70 backdrop-blur-md border-t border-border/20 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {ANGLE_LABELS[angle]}
          </span>
          {image.is_primary && (
            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-500">
              <Star className="w-2.5 h-2.5 fill-amber-500" />
              <span className="hidden sm:inline">Primary</span>
            </span>
          )}
        </div>

        {/* Action overlay */}
        <div className={cn(
          "absolute transition-all duration-200 flex items-center justify-center gap-1",
          isMobile
            ? "inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1 px-1"
            : "inset-0 bg-background/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100"
        )}>
          {!image.is_primary && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-amber-500/20 hover:text-amber-600 transition-all"
              onClick={() => onSetPrimary(image.id)}
              title="Set as primary"
            >
              <Star className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-muted/60 transition-all"
            onClick={openFilePicker}
            title="Replace from computer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-muted/60 transition-all"
            onClick={() => onSelectFromFiles(angle)}
            title="Replace from Files Manager"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-xl text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={() => onDelete(image)}
            title="Delete"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Empty slot — two actions: upload from computer or select from files
  return (
    <div
      {...getRootProps()}
      className={cn(
        "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/[0.02]",
        isDragActive
          ? 'border-amber-500/60 bg-amber-500/5 shadow-inner shadow-amber-500/10 scale-[1.02]'
          : 'border-border/30 bg-muted/[0.04]'
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <Loader2 className="w-5 h-5 text-muted-foreground/40 animate-spin" />
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
            <IconComp className="w-4 h-4 text-muted-foreground/30" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            {ANGLE_LABELS[angle]}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
              className="text-[9px] text-muted-foreground/40 hover:text-amber-500 transition-colors p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/[0.06]"
              title="Upload from computer"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <span className="text-[8px] text-muted-foreground/15">|</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectFromFiles(angle); }}
              className="text-[9px] text-muted-foreground/40 hover:text-amber-500 transition-colors p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/[0.06]"
              title="Select from Files Manager"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function WishpediaAngleGrid({ images, onUpload, onDelete, onSetPrimary, uploading }: Props) {
  const isMobile = useIsMobile();
  const imageByAngle = (angle: string) => images.find((i) => i.angle === angle);
  const filledCount = ANGLE_VIEWS.filter((a) => imageByAngle(a)).length;

  // Files Manager dialog state
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [filesDialogAngle, setFilesDialogAngle] = useState<AngleView>('front');

  const handleSelectFromFiles = (angle: AngleView) => {
    setFilesDialogAngle(angle);
    setFilesDialogOpen(true);
  };

  const handleFileSelected = async (selected: { url: string; name: string; mime_type: string }) => {
    try {
      const response = await fetch(selected.url);
      const blob = await response.blob();
      const file = new File([blob], selected.name, { type: selected.mime_type });
      onUpload(file, filesDialogAngle);
    } catch (err) {
      console.error('Failed to fetch file from Files Manager:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Angle Views
        </h3>
        <span className="text-xs text-muted-foreground/60">
          {filledCount}/6 filled
        </span>
      </div>

      {/* Progress bar — refined */}
      <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 ease-out"
          style={{ width: `${(filledCount / 6) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ANGLE_VIEWS.map((angle) => (
          <AngleSlot
            key={angle}
            angle={angle}
            image={imageByAngle(angle)}
            onUpload={onUpload}
            onDelete={onDelete}
            onSetPrimary={onSetPrimary}
            uploading={uploading}
            onSelectFromFiles={handleSelectFromFiles}
            isMobile={isMobile}
          />
        ))}
      </div>

      <SelectFromFilesDialog
        open={filesDialogOpen}
        onOpenChange={setFilesDialogOpen}
        onSelect={handleFileSelected}
        title={`Select image for ${ANGLE_LABELS[filesDialogAngle]} view`}
      />
    </div>
  );
}
