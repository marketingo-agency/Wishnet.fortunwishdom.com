"use client";

/**
 * Upload-your-own reference images for the scenario (drag-drop or file picker).
 * Held as base64 in the wizard until materialized into owned omni_assets at
 * storyboard time; these anchor the keyframe generation alongside Wishpedia
 * references.
 */

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ScenarioUploadedRef } from '@/hooks/omni/useScenario';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_UPLOADS = 6;
const MAX_BYTES = 8 * 1024 * 1024;

interface ScenarioReferenceUploaderProps {
  value: ScenarioUploadedRef[];
  onChange: (refs: ScenarioUploadedRef[]) => void;
  disabled?: boolean;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('read failed'));
    fr.readAsDataURL(file);
  });
}

export function ScenarioReferenceUploader({ value, onChange, disabled }: ScenarioReferenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    let current = value;
    for (const file of Array.from(files)) {
      if (current.length >= MAX_UPLOADS) {
        toast.warning(`Up to ${MAX_UPLOADS} uploaded references. Remove one to add another.`);
        break;
      }
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: PNG, JPEG, or WebP only`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 8MB`);
        continue;
      }
      try {
        const dataUrl = await readAsDataURL(file);
        current = [...current, { id: crypto.randomUUID(), name: file.name, mime: file.type, dataUrl }];
        onChange(current);
      } catch {
        toast.error(`Could not read ${file.name}`);
      }
    }
  };

  const remove = (id: string) => onChange(value.filter((r) => r.id !== id));

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) void addFiles(e.dataTransfer.files); }}
        className={cn(
          'rounded-xl border border-dashed transition-colors duration-200',
          dragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-border bg-muted/20',
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full cursor-pointer flex-col items-center gap-1.5 p-3 text-center transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Drag &amp; drop or click to upload reference images</span>
          <span className="text-[10px] text-muted-foreground">PNG, JPEG, WebP · up to {MAX_UPLOADS}, 8MB each</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          aria-label="Upload reference images"
          onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {value.map((r) => (
            <div key={r.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {/* Local data URL preview. */}
              <img src={r.dataUrl} alt={r.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={disabled}
                aria-label={`Remove ${r.name}`}
                className="absolute right-0.5 top-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-100 transition-opacity hover:bg-background hover:text-rose-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
