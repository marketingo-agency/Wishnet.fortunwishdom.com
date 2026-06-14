"use client";

/**
 * Step 4: technical image specs (size, aspect ratio, quality) per model and variant.
 * Controls adapt to each model's fal sizing convention (see src/config/falSpecs).
 * Each model has a "same for all variants" toggle, or set every variant independently.
 */

import { useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getFalSpecSchema, defaultSpecForModel, type FalOption, type FalSpecSchema } from '@/config/falSpecs';
import type { OmniModelSelection, OmniVariantSpec } from '@/hooks/omni';

interface StepSpecsProps {
  selections: OmniModelSelection[];
  initialSpecs: Record<string, OmniVariantSpec[]>;
  onNext: (specs: Record<string, OmniVariantSpec[]>) => void;
}

const clampDim = (v: string) => Math.min(4096, Math.max(64, Math.round(Number(v) || 1024)));

/** Build a per-model spec array of exactly `variants` length, reusing prior specs. */
function reconcile(
  selections: OmniModelSelection[],
  initial: Record<string, OmniVariantSpec[]>,
): Record<string, OmniVariantSpec[]> {
  const out: Record<string, OmniVariantSpec[]> = {};
  for (const sel of selections) {
    const existing = initial[sel.model_id] ?? [];
    out[sel.model_id] = Array.from({ length: sel.variants }, (_, i) =>
      existing[i] ? { ...existing[i] } : defaultSpecForModel(sel.model_id),
    );
  }
  return out;
}

const allEqual = (arr: OmniVariantSpec[]) =>
  arr.length <= 1 || arr.every((s) => JSON.stringify(s) === JSON.stringify(arr[0]));

function SelectField({
  id, label, value, options, onChange,
}: { id: string; label: string; value: string; options: FalOption[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8 cursor-pointer text-xs focus:ring-cyan-500/40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="cursor-pointer text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SpecControls({
  schema, spec, onChange, idPrefix,
}: { schema: FalSpecSchema; spec: OmniVariantSpec; onChange: (patch: Partial<OmniVariantSpec>) => void; idPrefix: string }) {
  if (schema.convention === 'aspect_resolution') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <SelectField id={`${idPrefix}-ar`} label="Aspect ratio" value={spec.aspectRatio ?? schema.aspectRatios?.[0]?.value ?? '1:1'} options={schema.aspectRatios ?? []} onChange={(v) => onChange({ aspectRatio: v })} />
        {schema.resolutions && (
          <SelectField id={`${idPrefix}-res`} label="Resolution" value={spec.resolution ?? schema.resolutions[0].value} options={schema.resolutions} onChange={(v) => onChange({ resolution: v })} />
        )}
      </div>
    );
  }

  const sizeOptions: FalOption[] = schema.convention === 'pixel_enum'
    ? schema.pixelSizes ?? []
    : [...(schema.imageSizePresets ?? []), ...(schema.allowCustom ? [{ value: 'custom', label: 'Custom size…' }] : [])];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <SelectField id={`${idPrefix}-size`} label="Size" value={spec.imageSize ?? sizeOptions[0]?.value ?? ''} options={sizeOptions} onChange={(v) => onChange({ imageSize: v })} />
      {schema.convention === 'image_size' && spec.imageSize === 'custom' && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-w`} className="text-[11px] text-muted-foreground">Width</Label>
            <Input id={`${idPrefix}-w`} type="number" min={64} max={4096} value={spec.width ?? 1024} onChange={(e) => onChange({ width: clampDim(e.target.value) })} className="h-8 text-xs focus-visible:ring-cyan-500/40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-h`} className="text-[11px] text-muted-foreground">Height</Label>
            <Input id={`${idPrefix}-h`} type="number" min={64} max={4096} value={spec.height ?? 1024} onChange={(e) => onChange({ height: clampDim(e.target.value) })} className="h-8 text-xs focus-visible:ring-cyan-500/40" />
          </div>
        </>
      )}
      {schema.quality && (
        <SelectField id={`${idPrefix}-q`} label={schema.quality.label} value={spec.quality ?? schema.quality.options[0].value} options={schema.quality.options} onChange={(v) => onChange({ quality: v })} />
      )}
      {schema.inputFidelity && (
        <SelectField id={`${idPrefix}-fid`} label={schema.inputFidelity.label} value={spec.inputFidelity ?? schema.inputFidelity.options[0].value} options={schema.inputFidelity.options} onChange={(v) => onChange({ inputFidelity: v })} />
      )}
    </div>
  );
}

export function StepSpecs({ selections, initialSpecs, onNext }: StepSpecsProps) {
  const [specs, setSpecs] = useState<Record<string, OmniVariantSpec[]>>(() => reconcile(selections, initialSpecs));
  const [uniform, setUniform] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(selections.map((s) => [s.model_id, allEqual(specs[s.model_id] ?? [])])),
  );

  const updateUniform = (modelId: string, patch: Partial<OmniVariantSpec>) => {
    setSpecs((prev) => {
      const arr = prev[modelId] ?? [];
      const base = { ...(arr[0] ?? defaultSpecForModel(modelId)), ...patch };
      return { ...prev, [modelId]: arr.map(() => ({ ...base })) };
    });
  };

  const updateVariant = (modelId: string, index: number, patch: Partial<OmniVariantSpec>) => {
    setSpecs((prev) => {
      const arr = [...(prev[modelId] ?? [])];
      arr[index] = { ...arr[index], ...patch };
      return { ...prev, [modelId]: arr };
    });
  };

  const toggleUniform = (modelId: string, checked: boolean) => {
    setUniform((prev) => ({ ...prev, [modelId]: checked }));
    if (checked) {
      setSpecs((prev) => {
        const arr = prev[modelId] ?? [];
        const base = arr[0] ?? defaultSpecForModel(modelId);
        return { ...prev, [modelId]: arr.map(() => ({ ...base })) };
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
        <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <p className="text-xs text-muted-foreground">
          Set the size, aspect ratio, and quality for each model. Controls match what each model
          supports. Apply the same specs to every variant, or tune each one.
        </p>
      </div>

      {selections.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No models selected.</p>
      ) : (
        selections.map((sel) => {
          const schema = getFalSpecSchema(sel.model_id);
          const arr = specs[sel.model_id] ?? [];
          const isUniform = uniform[sel.model_id] ?? true;
          return (
            <section key={sel.model_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold">{sel.name}</h3>
                <span className="shrink-0 text-xs text-muted-foreground">{sel.variants} variant{sel.variants === 1 ? '' : 's'}</span>
              </div>

              {sel.variants > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <Switch id={`uniform-${sel.model_id}`} checked={isUniform} onCheckedChange={(c) => toggleUniform(sel.model_id, c)} />
                  <Label htmlFor={`uniform-${sel.model_id}`} className="cursor-pointer text-xs text-muted-foreground">
                    Same specs for all {sel.variants} variants
                  </Label>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {isUniform ? (
                  <SpecControls
                    schema={schema}
                    spec={arr[0] ?? defaultSpecForModel(sel.model_id)}
                    onChange={(patch) => updateUniform(sel.model_id, patch)}
                    idPrefix={`${sel.model_id}-u`}
                  />
                ) : (
                  arr.map((spec, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2">
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Variant {i + 1}</p>
                      <SpecControls
                        schema={schema}
                        spec={spec}
                        onChange={(patch) => updateVariant(sel.model_id, i, patch)}
                        idPrefix={`${sel.model_id}-${i}`}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => onNext(specs)}
          className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
