"use client";

/**
 * Shared per-model generation-quality controls (size / aspect / quality),
 * extracted from the old step-4 StepSpecs so the Stage 2 "Models & quality"
 * accordion can reuse them. Controls adapt to each model's fal sizing
 * convention (see src/config/falSpecs).
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { FalOption, FalSpecSchema } from '@/config/falSpecs';
import type { OmniVariantSpec } from '@/hooks/omni';
import { clampDim } from './specHelpers';

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

export function SpecControls({
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
