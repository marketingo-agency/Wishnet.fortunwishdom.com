"use client";

/**
 * Multi-source picker for Images Repurposing: Upload (multi-file),
 * Files media library, and Content Library assets. Selection is additive;
 * the wizard's tray owns removal.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Library, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLibraryImages, getAssetSignedUrl, type LibraryImage } from '@/hooks/omni';
import {
  useContentLibraryPickerItems,
  useLibraryPickerUrls,
  type PendingSource,
} from './useRepurposeSources';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

type PickerTab = 'upload' | 'files' | 'content_library';

interface RepurposeSourcePickerProps {
  selectedKeys: Set<string>;
  onAdd: (sources: PendingSource[]) => void;
  onToggleOff: (key: string) => void;
}

export function RepurposeSourcePicker({ selectedKeys, onAdd, onToggleOff }: RepurposeSourcePickerProps) {
  const [tab, setTab] = useState<PickerTab>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const files = useLibraryImages(tab === 'files');
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});

  const libraryItems = useContentLibraryPickerItems(tab === 'content_library');
  const libraryAssetIds = useMemo(
    () => (libraryItems.data ?? []).flatMap((i) => i.assets.map((a) => a.id)),
    [libraryItems.data],
  );
  const { data: libraryUrls } = useLibraryPickerUrls(libraryAssetIds);

  const addUploads = (fileList: FileList | null) => {
    if (!fileList) return;
    const sources: PendingSource[] = [];
    for (const file of Array.from(fileList)) {
      if (!IMAGE_MIMES.has(file.type)) {
        toast.error(`${file.name}: only PNG, JPEG, and WebP are supported`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} exceeds the 20MB limit`);
        continue;
      }
      sources.push({
        key: `upload:${file.name}:${file.size}:${file.lastModified}`,
        kind: 'upload',
        label: file.name,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (sources.length > 0) onAdd(sources.filter((s) => !selectedKeys.has(s.key)));
  };

  const toggleFileRow = (row: LibraryImage) => {
    const key = `files:${row.id}`;
    if (selectedKeys.has(key)) onToggleOff(key);
    else onAdd([{ key, kind: 'files', label: row.name, row, previewUrl: filePreviews[row.id] ?? null }]);
  };

  // SIB-10: previews sign in an effect as rows arrive — signing during render
  // re-fired on every re-render while loads were in flight (setState → render
  // → resign), issuing duplicate signed-URL round-trips per tile.
  const signingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const row of files.data ?? []) {
      if (signingRef.current.has(row.id)) continue;
      signingRef.current.add(row.id);
      void getAssetSignedUrl(row.storage_path).then((url) => {
        if (url) setFilePreviews((prev) => ({ ...prev, [row.id]: url }));
      });
    }
  }, [files.data]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label="Image sources">
        {([
          ['upload', 'Upload', Upload],
          ['files', 'Media library', FolderOpen],
          ['content_library', 'Content Library', Library],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === id
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addUploads(e.dataTransfer.files); }}
          className={cn(
            'flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200',
            isDragging ? 'border-emerald-500/70 bg-emerald-500/5' : 'border-border',
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">Drop images here or browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 20MB each · multiple allowed</p>
          </div>
          <Button variant="outline" onClick={() => inputRef.current?.click()} className="cursor-pointer transition-colors duration-200">
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            aria-label="Upload source images"
            onChange={(e) => { addUploads(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {tab === 'files' && (
        files.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        ) : (files.data?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No images in the Files library yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.data!.map((row) => {
              const selected = selectedKeys.has(`files:${row.id}`);
              return (
                <SourceTile
                  key={row.id}
                  label={row.name}
                  previewUrl={filePreviews[row.id]}
                  selected={selected}
                  onToggle={() => toggleFileRow(row)}
                />
              );
            })}
          </div>
        )
      )}

      {tab === 'content_library' && (
        libraryItems.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        ) : (libraryItems.data ?? []).every((i) => i.assets.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No Content Library images available. Finalize an Omni run first (admin access required).
          </p>
        ) : (
          <div className="space-y-4">
            {libraryItems.data!.filter((item) => item.assets.length > 0).map((item) => (
              <div key={item.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {item.assets.map((asset) => {
                    const key = `content_library:${asset.id}`;
                    const selected = selectedKeys.has(key);
                    return (
                      <SourceTile
                        key={asset.id}
                        label={item.title}
                        previewUrl={libraryUrls?.[asset.id]}
                        selected={selected}
                        onToggle={() =>
                          selected
                            ? onToggleOff(key)
                            : onAdd([{ key, kind: 'content_library', label: item.title, asset, previewUrl: libraryUrls?.[asset.id] ?? null }])
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function SourceTile({ label, previewUrl, selected, onToggle }: {
  label: string;
  previewUrl: string | undefined;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={`${selected ? 'Remove' : 'Add'} ${label}`}
      aria-pressed={selected}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted/40 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-border hover:border-emerald-500/50',
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
      {selected && (
        <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
          Added
        </span>
      )}
    </button>
  );
}
