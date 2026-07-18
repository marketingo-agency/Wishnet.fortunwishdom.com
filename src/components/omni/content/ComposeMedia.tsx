"use client";

/**
 * Compose - media section: drag-drop / file-picker upload of one or many
 * images or videos, with previews. Files queue locally (with object-URL
 * previews) and upload on save in BOTH create and edit mode. Videos render
 * as real inline players (signed URLs).
 */

import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeskMedia } from '@/hooks/omni/useContentDesk';
import { DESK_UPLOAD_MAX_FILES, DESK_UPLOAD_MIMES, type PendingFile } from './contentConstants';

interface ComposeMediaProps {
  media: DeskMedia[];
  pending: PendingFile[];
  uploadingIds: Set<string>;
  disabled?: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemovePending: (id: string) => void;
  onDeleteMedia: (mediaId: string) => void;
}

export function ComposeMedia({ media, pending, uploadingIds, disabled, onAddFiles, onRemovePending, onDeleteMedia }: ComposeMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const total = media.length + pending.length;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Media</p>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) onAddFiles(e.dataTransfer.files); }}
        className={cn(
          'rounded-xl border border-dashed transition-colors duration-200',
          dragOver ? 'border-fuchsia-500 bg-fuchsia-500/5' : 'border-border bg-muted/20',
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full cursor-pointer flex-col items-center gap-1.5 p-4 text-center transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Drag &amp; drop or click to upload images or videos</span>
          <span className="text-[10px] text-muted-foreground">
            PNG, JPEG, WebP, GIF, MP4, WebM · up to {DESK_UPLOAD_MAX_FILES} files, 500MB each
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={DESK_UPLOAD_MIMES.join(',')}
          multiple
          className="hidden"
          aria-label="Upload media"
          onChange={(e) => { if (e.target.files) onAddFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {total > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {media.map((m) => (
            <div key={m.id} className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/40">
              {m.url ? (
                m.kind === 'video' ? (
                  <video src={m.url} controls muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Preview unavailable</div>
              )}
              <button
                type="button"
                onClick={() => onDeleteMedia(m.id)}
                disabled={disabled}
                aria-label="Remove this media"
                className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {pending.map((p) => (
            <div key={p.id} className="group relative aspect-video overflow-hidden rounded-lg border border-dashed border-fuchsia-500/40 bg-muted/40">
              {p.kind === 'video' ? (
                <video src={p.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
              )}
              {uploadingIds.has(p.id) ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40" aria-label={`Uploading ${p.file.name}`}>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </span>
              ) : (
                <>
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                    Uploads on save
                  </span>
                  <button
                    type="button"
                    onClick={() => { URL.revokeObjectURL(p.previewUrl); onRemovePending(p.id); }}
                    disabled={disabled}
                    aria-label={`Remove ${p.file.name}`}
                    className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
