"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ExternalLink, Cpu, ImageIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpsertPixelSettings, type PixelSettings as PixelSettingsType } from '@/hooks/usePixel';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useRouter } from 'next/navigation';
interface PixelSettingsProps {
  settings: PixelSettingsType;
}

type Tab = 'behavior' | 'brand' | 'visual';

const TABS: { value: Tab; label: string }[] = [
  { value: 'behavior', label: 'Behavior' },
  { value: 'brand',    label: 'Brand Lens' },
  { value: 'visual',  label: 'Visual' },
];

export function PixelSettings({ settings }: PixelSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('behavior');
  const [form, setForm] = useState<PixelSettingsType>({ ...settings });
  const { mutate: saveSettings, isPending } = useUpsertPixelSettings();
  const { data: llmSettings } = useLLMSettings();
  const router = useRouter();

  const activeImageProvider = llmSettings?.active_image_provider || 'openai';
  const activeImageModel = activeImageProvider === 'gemini'
    ? (llmSettings?.gemini_image_model || 'gemini-2.5-flash-image')
    : (llmSettings?.openai_image_model || 'gpt-image-1');

  const activeTextProvider = llmSettings?.active_text_provider || 'openai';
  const activeTextModel = activeTextProvider === 'gemini'
    ? (llmSettings?.gemini_text_model || 'gemini-2.5-flash')
    : (llmSettings?.openai_text_model || 'gpt-4o');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic setter for heterogeneous settings object
  const update = (key: keyof PixelSettingsType, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSave = () => saveSettings(form);

  return (
    <div className="flex flex-col gap-6 p-2 max-w-3xl">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px',
              activeTab === tab.value
                ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >{tab.label}</button>
        ))}
      </div>

      {/* Behavior */}
      {activeTab === 'behavior' && (
        <div className="space-y-5">
          {/* AI Provider Info Cards */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Cpu className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Text Generation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono text-foreground capitalize">{activeTextProvider}</span> · <span className="font-mono text-foreground">{activeTextModel}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-pink-500 hover:text-pink-600 shrink-0"
                  onClick={() => router.push('/settings?tab=llm')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Image Generation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono text-foreground capitalize">{activeImageProvider}</span> · <span className="font-mono text-foreground">{activeImageModel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pixel always generates images by default. Configured globally in Settings.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-pink-500 hover:text-pink-600 shrink-0"
                  onClick={() => router.push('/settings?tab=llm')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </div>

          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Output Behavior</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Default Language</Label>
              <select value={form.default_language} onChange={e => update('default_language', e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 mt-1 bg-background focus:outline-none focus:border-pink-500/50">
                {[['en','English'],['fr','French'],['es','Spanish'],['pt','Portuguese'],['de','German']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Verbosity</Label>
              <select value={form.default_verbosity} onChange={e => update('default_verbosity', e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 mt-1 bg-background focus:outline-none focus:border-pink-500/50">
                {[['short','Short'],['standard','Standard'],['detailed','Detailed']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Retrieval info */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Unlimited Knowledge Access</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pixel has full unrestricted access to the entire Brain knowledge base and all Heart rules. Retrieval is always at maximum depth.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <div>
              <Label className="text-sm">Internal Audit Logging</Label>
              <p className="text-xs text-muted-foreground">Store retrieval references and Heart check results per response</p>
            </div>
            <Switch checked={form.internal_audit_logging} onCheckedChange={v => update('internal_audit_logging', v)} />
          </div>
        </div>
      )}

      {/* Brand Lens */}
      {activeTab === 'brand' && (
        <div className="space-y-5">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Brand & Heart Enforcement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Heart Strictness</Label>
              <select value={form.heart_strictness} onChange={e => update('heart_strictness', e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 mt-1 bg-background focus:outline-none focus:border-pink-500/50">
                <option value="enforce_and_propose">Enforce & Propose Alternative</option>
                <option value="enforce_and_redirect">Enforce & Redirect</option>
                <option value="always_enforce">Always Enforce Strictly</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Refusal Style</Label>
              <select value={form.refusal_style} onChange={e => update('refusal_style', e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 mt-1 bg-background focus:outline-none focus:border-pink-500/50">
                <option value="soft">Soft</option>
                <option value="neutral">Neutral</option>
                <option value="firm">Firm</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <div>
              <Label className="text-sm">Safety Guard Mode</Label>
              <p className="text-xs text-muted-foreground">When uncertain, produce safest compliant output and ask for constraints</p>
            </div>
            <Switch checked={form.safety_guard_mode} onCheckedChange={v => update('safety_guard_mode', v)} />
          </div>
          <div className="space-y-3">
            {[
              { key: 'allowed_vocabulary', label: 'Allowed Vocabulary', placeholder: 'Add preferred words (comma separated)' },
              { key: 'blocked_vocabulary', label: 'Blocked Vocabulary', placeholder: 'Words to never use (comma separated)' },
              { key: 'allowed_themes', label: 'Allowed Visual Themes', placeholder: 'Allowed themes (comma separated)' },
              { key: 'blocked_themes', label: 'Blocked Visual Themes', placeholder: 'Themes to always avoid (comma separated)' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={((form as unknown as Record<string, string[]>)[key] || []).join(', ')}
                  onChange={e => update(key as keyof PixelSettingsType, e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder={placeholder}
                  className="mt-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual */}
      {activeTab === 'visual' && (
        <div className="space-y-5">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Visual Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'default_aesthetic', label: 'Default Aesthetic', options: [['minimal','Minimal'],['dreamy','Dreamy'],['premium','Premium'],['playful','Playful'],['cinematic','Cinematic']] },
              { key: 'palette_behavior', label: 'Palette Behavior', options: [['locked','Locked'],['adaptive','Adaptive'],['seasonal','Seasonal']] },
              { key: 'texture_level', label: 'Texture Level', options: [['none','None'],['subtle','Subtle'],['medium','Medium']] },
              { key: 'lighting', label: 'Lighting', options: [['soft','Soft'],['dramatic','Dramatic'],['neon','Neon'],['natural','Natural']] },
              { key: 'detail_level', label: 'Detail Level', options: [['low','Low'],['medium','Medium'],['high','High']] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <select value={String((form as unknown as Record<string, string>)[key])} onChange={e => update(key as keyof PixelSettingsType, e.target.value)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 mt-1 bg-background focus:outline-none focus:border-pink-500/50">
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">These visual defaults are applied to all generated images unless overridden by a blueprint or user request.</p>
        </div>
      )}

      {/* Save */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={isPending} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0">
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Settings</>}
        </Button>
      </div>
    </div>
  );
}
