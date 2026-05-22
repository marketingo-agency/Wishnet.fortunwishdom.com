"use client";

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Save, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOptimizeDraft } from '@/hooks/promptor';
import { useCreatePulseDraft } from '@/hooks/usePulseDrafts';
import { platformLabel, platformColor } from '@/components/settings/pulsePlatforms';
import { PULSE_PLATFORMS } from '@/components/pulse/pulseStatus';
import type { PulsePostType } from '@/types/pulse';

const POST_TYPES: PulsePostType[] = ['text', 'photo', 'video'];
const COUNTS = [3, 5, 8, 10];

export function PulseBulkGenerator() {
  const { optimizeDraft } = useOptimizeDraft();
  const createDraft = useCreatePulseDraft();

  const [brief, setBrief] = useState('');
  const [count, setCount] = useState(5);
  const [postType, setPostType] = useState<PulsePostType>('text');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const cancelRef = useRef(false);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleGenerate = async () => {
    if (!brief.trim()) return;
    setGenerating(true);
    setProgress(0);
    setVariants([]);
    cancelRef.current = false;
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      if (cancelRef.current) break;
      try {
        const text = await optimizeDraft(
          `${brief.trim()}\n\n(Write a distinct, ready-to-post social caption — variation ${i + 1} of ${count}, with a fresh angle and hook. Output only the caption.)`,
        );
        out.push(text);
        setVariants([...out]);
      } catch {
        /* per-call error toasts handled in hook; continue */
      }
      setProgress(i + 1);
    }
    setGenerating(false);
  };

  const handleSaveAll = async () => {
    if (variants.length === 0) return;
    setSaving(true);
    const campaignId = crypto.randomUUID();
    for (const caption of variants) {
      await createDraft.mutateAsync({
        caption,
        platforms,
        post_type: postType,
        status: 'draft',
        generated_by: 'bulk',
        campaign_id: campaignId,
      }).catch(() => null);
    }
    setSaving(false);
    toast.success(`Saved ${variants.length} drafts`, { description: 'Find them in Posts or schedule them on the Calendar.' });
    setVariants([]);
    setBrief('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base">Bulk generate</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Turn one brief into multiple caption variants, then save them as drafts to schedule on the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-brief" className="text-xs font-medium">Campaign brief</Label>
            <Textarea id="bulk-brief" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Launch week for our new plush line — playful, collectible, limited drop." className="min-h-[90px] text-sm" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">How many</Label>
              <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTS.map((c) => <SelectItem key={c} value={String(c)} className="text-sm">{c} variants</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as PulsePostType)}>
                <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => <SelectItem key={t} value={t} className="text-sm capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {PULSE_PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button key={p} type="button" onClick={() => togglePlatform(p)} aria-pressed={active}
                    className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                      active ? cn('border-transparent text-white', platformColor(p)) : 'border-border text-muted-foreground hover:bg-muted')}>
                    {platformLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {generating ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { cancelRef.current = true; }} className="gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cancel ({progress}/{count})
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleGenerate} disabled={!brief.trim()} className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Generate {count} variants
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">{variants.length} variants</CardTitle>
            <Button size="sm" onClick={handleSaveAll} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save all as drafts
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-2">
                <Textarea
                  value={v}
                  onChange={(e) => setVariants((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  className="min-h-[60px] flex-1 border-0 bg-transparent text-sm focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Discard variant">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
