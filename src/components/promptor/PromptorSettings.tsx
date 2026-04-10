import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Loader2,
  Lock,
  Plus,
  X,
  Settings2,
  Shield,
  Palette,
  Sliders,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePromptorSettings, useUpsertPromptorSettings, DEFAULT_SETTINGS, type PrompterSettings } from '@/hooks/usePromptor';
import type { OutputType } from '@/hooks/promptor/types';
import { useToast } from '@/hooks/use-toast';

const TONE_LABELS: Record<string, string> = {
  wonder: 'Wonder',
  warmth: 'Warmth',
  playfulness: 'Playfulness',
  mystery: 'Mystery',
  clarity: 'Clarity',
  directness: 'Directness',
};

function SectionCard({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 rounded-t-xl transition-colors py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {icon}
                {title}
              </CardTitle>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput('');
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-destructive ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function PromptorSettings() {
  const { data: savedSettings, isLoading } = usePromptorSettings();
  const upsert = useUpsertPromptorSettings();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrompterSettings | null>(null);

  React.useEffect(() => {
    if (savedSettings && !settings) {
      setSettings(savedSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings is intentionally excluded to only seed state on initial load
  }, [savedSettings]);

  const s = settings || savedSettings || DEFAULT_SETTINGS;
  const update = (patch: Partial<PrompterSettings>) => setSettings((prev) => ({ ...(prev || DEFAULT_SETTINGS), ...patch }));
  const updateTone = (key: string, value: number) =>
    setSettings((prev) => ({ ...(prev || DEFAULT_SETTINGS), brand_tone: { ...(prev || DEFAULT_SETTINGS).brand_tone, [key]: value } }));

  const handleSave = async () => {
    if (!s) return;
    try {
      await upsert.mutateAsync(s);
      toast({ title: 'Settings saved', description: 'Your Promptor settings have been saved.' });
    } catch (err: any) {
      toast({ title: 'Error saving settings', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Output Preferences */}
      <SectionCard title="Output Preferences" icon={<Settings2 className="h-4 w-4 text-violet-500" />} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Default Language</Label>
            <Select value={s.default_language} onValueChange={(v) => update({ default_language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Default Output Type</Label>
            <Select value={s.default_output_type} onValueChange={(v) => update({ default_output_type: v as OutputType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="social_image">Social Image</SelectItem>
                <SelectItem value="social_copy">Social Copy</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Default Verbosity</Label>
            <Select value={s.default_verbosity} onValueChange={(v) => update({ default_verbosity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Number of Variants ({s.default_variants})</Label>
            <Slider
              value={[s.default_variants]}
              onValueChange={([v]) => update({ default_variants: v })}
              min={1} max={5} step={1}
              className="mt-3"
            />
          </div>
        </div>
        <div className="space-y-3 pt-2 border-t border-border">
          {[
            { key: 'include_short_prompt', label: 'Include short prompt version' },
            { key: 'include_negatives', label: 'Include negatives / exclusions (image & video)' },
            { key: 'include_qa_checklist', label: 'Include QA checklist' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch
                checked={s[key as keyof PrompterSettings] as boolean}
                onCheckedChange={(v) => update({ [key]: v } as Partial<PrompterSettings>)}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2. Brand Lens */}
      <SectionCard title="Brand Lens" icon={<Palette className="h-4 w-4 text-violet-500" />}>
        <p className="text-xs text-muted-foreground">Tone values guide Promptor's voice (0 = minimal, 100 = maximum).</p>
        <div className="space-y-4">
          {Object.entries(s.brand_tone).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm">{TONE_LABELS[key] || key}</Label>
                <span className="text-xs text-muted-foreground">{value}/100</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([v]) => updateTone(key, v)}
                min={0} max={100} step={5}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 pt-2 border-t border-border">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Allowed Vocabulary (extend Heart rules)</Label>
            <TagInput
              tags={s.allowed_vocabulary}
              onChange={(v) => update({ allowed_vocabulary: v })}
              placeholder="Add preferred word…"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Blocked Vocabulary (extend Heart rules)</Label>
            <TagInput
              tags={s.blocked_vocabulary}
              onChange={(v) => update({ blocked_vocabulary: v })}
              placeholder="Add blocked word…"
            />
          </div>
        </div>
      </SectionCard>

      {/* 3. Compliance & Heart Enforcement */}
      <SectionCard title="Compliance & Heart Enforcement" icon={<Shield className="h-4 w-4 text-violet-500" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Heart Strictness</Label>
            <Select value={s.heart_strictness} onValueChange={(v) => update({ heart_strictness: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="always_enforce">Always Enforce (no alternatives)</SelectItem>
                <SelectItem value="enforce_and_propose">Enforce & Propose Alternatives</SelectItem>
                <SelectItem value="enforce_and_explain">Enforce & Explain Briefly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Refusal Style</Label>
            <Select value={s.refusal_style} onValueChange={(v) => update({ refusal_style: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Soft & Supportive</SelectItem>
                <SelectItem value="neutral">Neutral & Professional</SelectItem>
                <SelectItem value="firm">Firm & Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Safety Guard Mode</Label>
            <p className="text-xs text-muted-foreground mt-0.5">When uncertain, produce safest output and ask for missing constraints</p>
          </div>
          <Switch checked={s.safety_guard_mode} onCheckedChange={(v) => update({ safety_guard_mode: v })} />
        </div>
      </SectionCard>

      {/* 4. Prompt Style */}
      <SectionCard title="Prompt Style Preferences" icon={<Sliders className="h-4 w-4 text-violet-500" />}>
        {/* General */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">General</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Formatting Style</Label>
              <Select value={s.formatting_style} onValueChange={(v) => update({ formatting_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain</SelectItem>
                  <SelectItem value="structured">Structured Sections</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Image Defaults */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Image Defaults</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Aspect Ratio</Label>
              <Select value={s.image_aspect_ratio} onValueChange={(v) => update({ image_aspect_ratio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 Square</SelectItem>
                  <SelectItem value="16:9">16:9 Landscape</SelectItem>
                  <SelectItem value="9:16">9:16 Portrait</SelectItem>
                  <SelectItem value="4:3">4:3</SelectItem>
                  <SelectItem value="3:4">3:4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Composition Detail</Label>
              <Select value={s.image_composition_detail} onValueChange={(v) => update({ image_composition_detail: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Camera Cue Style</Label>
              <Select value={s.image_camera_cue_style} onValueChange={(v) => update({ image_camera_cue_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Video Defaults */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Video Defaults</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Duration</Label>
              <Select value={s.video_duration_default} onValueChange={(v) => update({ video_duration_default: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15s">15 seconds</SelectItem>
                  <SelectItem value="30s">30 seconds</SelectItem>
                  <SelectItem value="60s">60 seconds</SelectItem>
                  <SelectItem value="2min">2 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Shot List Style</Label>
              <Select value={s.video_shot_list_style} onValueChange={(v) => update({ video_shot_list_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Pacing</Label>
              <Select value={s.video_pacing_style} onValueChange={(v) => update({ video_pacing_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Social Defaults */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Social Defaults</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Platform</Label>
              <Select value={s.social_platform_default} onValueChange={(v) => update({ social_platform_default: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="x">X / Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">CTA Intensity</Label>
              <Select value={s.social_cta_intensity} onValueChange={(v) => update({ social_cta_intensity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Hashtag Behavior</Label>
              <Select value={s.social_hashtag_behavior} onValueChange={(v) => update({ social_hashtag_behavior: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="suggest">Suggest</SelectItem>
                  <SelectItem value="include">Include</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 5. Memory & Retrieval */}
      <SectionCard title="Memory & Retrieval" icon={<Database className="h-4 w-4 text-violet-500" />}>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <Label className="text-sm font-medium">Always Retrieve Brain & Heart</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Mandatory pre-step before every generation — cannot be disabled</p>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <Switch checked disabled />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Retrieval Depth</Label>
          <Select value={s.retrieval_depth} onValueChange={(v) => update({ retrieval_depth: v })}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (5 chunks — faster)</SelectItem>
              <SelectItem value="medium">Medium (10 chunks — recommended)</SelectItem>
              <SelectItem value="large">Large (20 chunks — most context)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
      >
        {upsert.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
