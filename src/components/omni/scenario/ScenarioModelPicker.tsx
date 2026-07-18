"use client";

/**
 * Scenario Studio stage 3: the image-model picker. A curated shortlist plus a
 * "browse all" expander over the live fal catalog. When reference images are
 * attached, only edit-capable models are offered (they consume image inputs).
 */

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useFalCatalog } from '@/hooks/omni/useFalCatalog';
import { KEYFRAME_MODEL_OPTIONS } from '@/hooks/omni/useScenario';
import type { FalModel } from '@/hooks/omni';

interface ScenarioModelPickerProps {
  modelId: string;
  onChange: (modelId: string, isEdit: boolean) => void;
  /** References are attached — only edit-capable models can consume them. */
  needsEdit: boolean;
  disabled?: boolean;
}

const CUSTOM = '__custom__';

export function ScenarioModelPicker({ modelId, onChange, needsEdit, disabled }: ScenarioModelPickerProps) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [search, setSearch] = useState('');

  const curated = needsEdit ? KEYFRAME_MODEL_OPTIONS.filter((m) => m.edit) : KEYFRAME_MODEL_OPTIONS;
  const capability = needsEdit ? 'image-to-image' : 'text-to-image';
  const catalog = useFalCatalog({ capability, q: search.trim() || undefined, enabled: browseOpen });

  // A browse-all pick is not in the curated list — represent it with a sentinel
  // so the Select still shows the current choice.
  const known = curated.find((m) => m.id === modelId);
  const selectValue = known ? modelId : CUSTOM;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">
          Image model <span className="font-normal text-muted-foreground">for the storyboard keyframes</span>
        </p>
        {needsEdit && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 [[data-omni-theme=dark]_&]:text-amber-300">
            references need an edit model
          </span>
        )}
      </div>

      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM) return;
          const o = curated.find((m) => m.id === v);
          onChange(v, o?.edit ?? needsEdit);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="cursor-pointer text-sm" aria-label="Storyboard image model">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {selectValue === CUSTOM && (
            <SelectItem value={CUSTOM} className="text-sm">{modelId} <span className="text-muted-foreground">(from catalog)</span></SelectItem>
          )}
          {curated.map((m) => (
            <SelectItem key={m.id} value={m.id} className="text-sm">{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() => setBrowseOpen((o) => !o)}
        disabled={disabled}
        className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {browseOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Browse all fal models
      </button>

      {browseOpen && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${needsEdit ? 'edit' : 'text-to-image'} models...`}
              className="h-8 pl-8 text-xs"
              aria-label="Search fal models"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border bg-background/40">
            {catalog.isLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : catalog.isError ? (
              <div className="flex items-center gap-1.5 px-2.5 py-3 text-xs text-muted-foreground"><AlertCircle className="h-3 w-3" /> Could not load the catalog</div>
            ) : (catalog.data?.models ?? []).length === 0 ? (
              <div className="px-2.5 py-3 text-xs text-muted-foreground">No models found</div>
            ) : (
              <div className="py-0.5">
                {(catalog.data?.models ?? []).map((m: FalModel) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChange(m.id, m.category === 'image-to-image')}
                    className={cn(
                      'flex w-full cursor-pointer flex-col items-start gap-0.5 px-2.5 py-1.5 text-left transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      m.id === modelId && 'bg-violet-500/10',
                    )}
                  >
                    <span className="text-xs font-medium">{m.name}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{m.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
