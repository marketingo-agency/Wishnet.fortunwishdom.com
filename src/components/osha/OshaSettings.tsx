import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Paperclip, Image as ImageIcon, Bell, Save, Loader2, Plus, Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useUpsertOshaSettings, type OshaSettings } from '@/hooks/useOsha';
import { OPENAI_IMAGE_MODELS, GEMINI_IMAGE_MODELS, getImageModelsForProvider, getFileAnalysisModelsForProvider } from '@/config/llmModels';
import { cn } from '@/lib/utils';

interface OshaSettingsProps {
  settings: OshaSettings;
}

export function OshaSettings({ settings }: OshaSettingsProps) {
  const { mutate: save, isPending } = useUpsertOshaSettings();
  const { register, handleSubmit, watch, setValue, getValues } = useForm<OshaSettings>({
    defaultValues: settings,
  });

  const onSubmit = (data: OshaSettings) => {
    save(data);
  };

  const FormRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 py-3">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sky-500" />
            <h2 className="font-semibold text-base">Osha Settings</h2>
          </div>
          <Button type="submit" disabled={isPending} className="h-8 text-xs bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save Settings
          </Button>
        </div>

        <Tabs defaultValue="behavior" className="p-3 sm:p-6">
          <TabsList className="w-full grid grid-cols-3 mb-6 h-9">
            <TabsTrigger value="behavior" className="text-xs">
              <Bot className="h-3.5 w-3.5 mr-1.5" />Behavior
            </TabsTrigger>
            <TabsTrigger value="bubble" className="text-xs">
              <Bell className="h-3.5 w-3.5 mr-1.5" />Bubble
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs">
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />Files
            </TabsTrigger>
          </TabsList>

          {/* ── BEHAVIOR ── */}
          <TabsContent value="behavior" className="space-y-0 divide-y divide-border/50">
            <FormRow label="Default Mode" description="Sets the tone and output style for all responses">
              <Select value={watch('default_mode')} onValueChange={v => setValue('default_mode', v)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Assistant</SelectLabel>
                    <SelectItem value="guide">📖 Guide — clear & explanatory</SelectItem>
                    <SelectItem value="operator">⚡ Operator — concise & action-focused</SelectItem>
                    <SelectItem value="creative">🎨 Creative — imaginative & exploratory</SelectItem>
                    <SelectItem value="analyst">🔬 Analyst — structured & evidence-based</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Ideation</SelectLabel>
                    <SelectItem value="spark">💡 Spark — rapid-fire ideas</SelectItem>
                    <SelectItem value="expand">🔍 Expand — deep concept development</SelectItem>
                    <SelectItem value="combine">🔗 Combine — hybrid concept merging</SelectItem>
                    <SelectItem value="filter">📊 Filter — idea scoring & ranking</SelectItem>
                    <SelectItem value="workshop">🛠️ Workshop — guided brainstorming</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Power</SelectLabel>
                    <SelectItem value="deep-research">🧠 Deep Research — multi-step web research</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Default Language" description="Language for Osha responses">
              <Select value={watch('default_language')} onValueChange={v => setValue('default_language', v)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="pl">Polish</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="sv">Swedish</SelectItem>
                  <SelectItem value="id">Indonesian</SelectItem>
                  <SelectItem value="th">Thai</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Auto-detect Language" description="Detect and match the user's language automatically">
              <Switch
                checked={watch('auto_detect_language')}
                onCheckedChange={v => setValue('auto_detect_language', v)}
              />
            </FormRow>

            <FormRow label="Default Verbosity" description="How much detail Osha includes in responses">
              <Select value={watch('default_verbosity')} onValueChange={v => setValue('default_verbosity', v)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short — 1-3 paragraphs</SelectItem>
                  <SelectItem value="standard">Standard — balanced</SelectItem>
                  <SelectItem value="detailed">Detailed — comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Response Structure" description="Format preference for structured outputs">
              <Select value={watch('response_structure')} onValueChange={v => setValue('response_structure', v)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain prose</SelectItem>
                  <SelectItem value="structured">Structured sections</SelectItem>
                  <SelectItem value="bullet">Bullet points</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Hallucination Control" description="If Brain has no answer, Osha says so and asks for info">
              <Switch
                checked={watch('hallucination_control')}
                onCheckedChange={v => setValue('hallucination_control', v)}
              />
            </FormRow>

            <FormRow label="Retrieval Depth" description="Number of Brain chunks retrieved per message">
              <div className="flex items-center gap-2">
                <Select value={watch('retrieval_depth')} onValueChange={v => setValue('retrieval_depth', v)}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (15 chunks)</SelectItem>
                    <SelectItem value="medium">Medium (30 chunks)</SelectItem>
                    <SelectItem value="large">Large (50 chunks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormRow>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold">Image Generation</h3>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>
              <div className="divide-y divide-border/50">
                <FormRow label="Enable Image Generation" description="Allow Osha to generate images when requested">
                  <Switch
                    checked={watch('image_generation_enabled')}
                    onCheckedChange={v => setValue('image_generation_enabled', v)}
                  />
                </FormRow>
                {watch('image_generation_enabled') && (
                  <>
                    <FormRow label="Image Provider" description="AI provider used to generate images">
                      <Select
                        value={watch('image_provider')}
                        onValueChange={v => {
                          setValue('image_provider', v);
                          const models = getImageModelsForProvider(v as 'openai' | 'gemini');
                          setValue('image_model', models[0]?.value || '');
                        }}
                      >
                        <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                    <FormRow label="Image Model" description="Model used for image generation">
                      <Select value={watch('image_model')} onValueChange={v => setValue('image_model', v)}>
                        <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getImageModelsForProvider((watch('image_provider') || 'openai') as 'openai' | 'gemini').map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormRow>
                    <FormRow label="Default Image Size">
                      <Select value={watch('image_default_size')} onValueChange={v => setValue('image_default_size', v)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (model decides)</SelectItem>
                          <SelectItem value="1024x1024">1024×1024 (square)</SelectItem>
                          <SelectItem value="1536x1024">1536×1024 (landscape)</SelectItem>
                          <SelectItem value="1024x1536">1024×1536 (portrait)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                    <FormRow label="Brand Preset" description="Style preset applied to all image requests">
                      <Select value={watch('image_brand_preset')} onValueChange={v => setValue('image_brand_preset', v)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="fortun_wishnet">Fortun Wishnet brand</SelectItem>
                          <SelectItem value="wishdom">Wishdom collectibles</SelectItem>
                          <SelectItem value="minimal">Minimal / clean</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── BUBBLE ── */}
          <TabsContent value="bubble" className="space-y-0">
            <div className="pb-4">
              <p className="text-xs text-muted-foreground bg-sky-500/5 border border-sky-500/20 rounded-xl px-3 py-2.5">
                The floating bubble appears only inside Fortun Wishnet for authenticated users. It cannot be embedded externally.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
              {/* Left — Settings */}
              <div className="space-y-6">

                {/* Group A — Identity */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identity</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Bot Name</Label>
                      <p className="text-xs text-muted-foreground">Displayed as the assistant's name in the chat header</p>
                      <Input {...register('bubble_name')} className="text-sm" placeholder="Osha" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Subtitle</Label>
                      <p className="text-xs text-muted-foreground">Short tagline shown below the name</p>
                      <Input {...register('bubble_subtitle')} className="text-sm" placeholder="Fortun Wishnet Assistant · Online" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Greeting Message</Label>
                      <p className="text-xs text-muted-foreground">Shown as the first message when the chat is empty</p>
                      <Textarea
                        {...register('bubble_greeting')}
                        className="text-xs min-h-[60px] resize-none"
                        placeholder="Hi! I'm Osha, your Fortun Wishnet assistant. How can I help?"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Group B — Appearance */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Appearance</h3>
                  <div className="space-y-4">

                    {/* Accent color picker */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Accent Color</Label>
                      <div className="flex gap-2.5 flex-wrap">
                        {[
                          { key: 'sky',     bg: 'bg-gradient-to-br from-sky-600 to-cyan-400',     label: 'Sky'     },
                          { key: 'indigo',  bg: 'bg-gradient-to-br from-indigo-600 to-violet-400', label: 'Indigo'  },
                          { key: 'violet',  bg: 'bg-gradient-to-br from-violet-600 to-purple-400', label: 'Violet'  },
                          { key: 'emerald', bg: 'bg-gradient-to-br from-emerald-600 to-teal-400',  label: 'Emerald' },
                          { key: 'rose',    bg: 'bg-gradient-to-br from-rose-600 to-pink-400',     label: 'Rose'    },
                          { key: 'amber',   bg: 'bg-gradient-to-br from-amber-500 to-yellow-300',  label: 'Amber'   },
                        ].map(c => (
                          <button
                            key={c.key}
                            type="button"
                            title={c.label}
                            onClick={() => setValue('bubble_accent_color', c.key)}
                            className={cn(
                              'h-8 w-8 rounded-full transition-all hover:scale-110',
                              c.bg,
                              watch('bubble_accent_color') === c.key
                                ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                                : 'ring-1 ring-border/40'
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Panel size */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Panel Size</Label>
                      <div className="flex gap-2">
                        {[
                          { key: 'compact',  label: 'Compact', sub: '340×520' },
                          { key: 'standard', label: 'Standard', sub: '390×640' },
                          { key: 'wide',     label: 'Wide', sub: '460×720' },
                        ].map(s => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setValue('bubble_panel_size', s.key)}
                            className={cn(
                              'flex-1 flex flex-col items-center py-2 px-1 rounded-xl border text-xs transition-all',
                              watch('bubble_panel_size') === s.key
                                ? 'border-primary bg-primary/5 text-foreground font-medium'
                                : 'border-border text-muted-foreground hover:border-primary/50'
                            )}
                          >
                            <span className="font-medium">{s.label}</span>
                            <span className="text-[10px] opacity-60">{s.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Button Position</Label>
                      <div className="flex gap-2">
                        {[
                          { key: 'bottom-left',   icon: <AlignLeft className="h-4 w-4" />,   label: 'Left'   },
                          { key: 'bottom-center', icon: <AlignCenter className="h-4 w-4" />, label: 'Center' },
                          { key: 'bottom-right',  icon: <AlignRight className="h-4 w-4" />,  label: 'Right'  },
                        ].map(p => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setValue('bubble_position', p.key)}
                            className={cn(
                              'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all',
                              watch('bubble_position') === p.key
                                ? 'border-primary bg-primary/5 text-foreground font-medium'
                                : 'border-border text-muted-foreground hover:border-primary/50'
                            )}
                          >
                            {p.icon}
                            <span className="text-[10px]">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Group C — Behavior */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Behavior</h3>
                  <div className="divide-y divide-border/50">
                    <FormRow label="Enable Floating Bubble" description="Show Osha as a floating chat button on all platform pages">
                      <Switch checked={watch('bubble_enabled')} onCheckedChange={v => setValue('bubble_enabled', v)} />
                    </FormRow>
                    <FormRow label="Remember Last State" description="Remember whether bubble was open or closed between sessions">
                      <Switch checked={watch('bubble_remember_state')} onCheckedChange={v => setValue('bubble_remember_state', v)} />
                    </FormRow>
                    <FormRow label="Show Mode Selector" description="Let users switch between Guide, Operator, Creative, Analyst directly inside the bubble">
                      <Switch checked={watch('bubble_show_mode_selector')} onCheckedChange={v => setValue('bubble_show_mode_selector', v)} />
                    </FormRow>
                    <FormRow label="Show Clear Button" description="Show the trash icon to clear chat history inside the bubble">
                      <Switch checked={watch('bubble_show_clear_button')} onCheckedChange={v => setValue('bubble_show_clear_button', v)} />
                    </FormRow>
                    <FormRow label="Launch Animation" description="How the chat panel appears when opened">
                      <Select value={watch('bubble_launch_animation')} onValueChange={v => setValue('bubble_launch_animation', v)}>
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slide-up">Slide Up</SelectItem>
                          <SelectItem value="fade">Fade In</SelectItem>
                          <SelectItem value="scale">Scale In</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                    <FormRow label="Show Online Status" description="Show the green pulsing dot on the bubble avatar">
                      <Switch checked={watch('bubble_show_status_dot') !== false} onCheckedChange={v => setValue('bubble_show_status_dot', v)} />
                    </FormRow>
                    <FormRow label="Sound on New Message" description="Play a subtle notification sound when a new message arrives while bubble is closed">
                      <Switch checked={watch('bubble_sound_enabled') === true} onCheckedChange={v => setValue('bubble_sound_enabled', v)} />
                    </FormRow>
                    <FormRow label="Button Size" description="Size of the floating bubble button">
                      <Select value={watch('bubble_button_size') || 'standard'} onValueChange={v => setValue('bubble_button_size', v)}>
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (44px)</SelectItem>
                          <SelectItem value="standard">Standard (56px)</SelectItem>
                          <SelectItem value="large">Large (64px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormRow>
                  </div>
                </div>

                <Separator />

                {/* Group D — Quick Starters */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Starters</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Clickable chips shown when the chat is empty (max 6)</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(watch('bubble_quick_starters') || []).map((qs, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={qs.label}
                            onChange={e => {
                              const updated = [...(getValues('bubble_quick_starters') || [])];
                              updated[i] = { ...updated[i], label: e.target.value };
                              setValue('bubble_quick_starters', updated);
                            }}
                            className="text-xs h-8"
                            placeholder="Label"
                          />
                          <Input
                            value={qs.prompt}
                            onChange={e => {
                              const updated = [...(getValues('bubble_quick_starters') || [])];
                              updated[i] = { ...updated[i], prompt: e.target.value };
                              setValue('bubble_quick_starters', updated);
                            }}
                            className="text-xs h-8"
                            placeholder="Prompt"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (getValues('bubble_quick_starters') || []).filter((_, idx) => idx !== i);
                            setValue('bubble_quick_starters', updated);
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {(watch('bubble_quick_starters') || []).length < 6 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = getValues('bubble_quick_starters') || [];
                          setValue('bubble_quick_starters', [...current, { label: '', prompt: '' }]);
                        }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 rounded-xl px-3 py-2 w-full transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Quick Starter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right — Live Preview (desktop only) */}
              <div className="hidden lg:flex flex-col gap-3 sticky top-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</h3>

                {/* Preview: button */}
                <div className="flex items-center justify-center">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center shadow-lg',
                      'bg-gradient-to-br',
                      (() => {
                        const c = watch('bubble_accent_color') || 'sky';
                        const map: Record<string, string> = {
                          sky: 'from-sky-600 to-cyan-400', indigo: 'from-indigo-600 to-violet-400',
                          violet: 'from-violet-600 to-purple-400', emerald: 'from-emerald-600 to-teal-400',
                          rose: 'from-rose-600 to-pink-400', amber: 'from-amber-500 to-yellow-300',
                        };
                        return map[c] || map.sky;
                      })()
                    )}
                  >
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Preview: panel header */}
                <div className="rounded-xl overflow-hidden border border-border shadow-md">
                  <div className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r',
                    (() => {
                      const c = watch('bubble_accent_color') || 'sky';
                      const map: Record<string, string> = {
                        sky: 'from-sky-600 via-sky-500 to-cyan-400', indigo: 'from-indigo-600 via-indigo-500 to-violet-400',
                        violet: 'from-violet-600 via-violet-500 to-purple-400', emerald: 'from-emerald-600 via-emerald-500 to-teal-400',
                        rose: 'from-rose-600 via-rose-500 to-pink-400', amber: 'from-amber-500 via-amber-400 to-yellow-300',
                      };
                      return map[c] || map.sky;
                    })()
                  )}>
                    <div className="relative shrink-0">
                      <div className="h-7 w-7 rounded-full bg-card/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      {watch('bubble_show_status_dot') !== false && (
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border border-white/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white leading-none truncate">{watch('bubble_name') || 'Osha'}</p>
                      <p className="text-[9px] text-white/70 mt-0.5 truncate">{watch('bubble_subtitle') || 'Fortun Wishnet Assistant · Online'}</p>
                    </div>
                  </div>
                  <div className="bg-muted/30 px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground italic truncate">"{watch('bubble_greeting') || 'Hi! How can I help?'}"</p>
                  </div>
                </div>

                {/* Preview: position label */}
                <div className="bg-muted/30 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Position</p>
                  <p className="text-xs text-foreground font-medium mt-0.5 capitalize">
                    {(watch('bubble_position') || 'bottom-right').replace('bottom-', 'Bottom ')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                    {watch('bubble_panel_size') || 'Standard'} panel · {watch('bubble_launch_animation') || 'Slide up'} animation
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>


          {/* ── FILES ── */}
          <TabsContent value="files" className="space-y-0 divide-y divide-border/50">
            <FormRow label="Max File Size" description="Maximum size of attached files per message">
              <Select value={String(watch('max_file_size_mb'))} onValueChange={v => setValue('max_file_size_mb', parseInt(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 MB</SelectItem>
                  <SelectItem value="10">10 MB</SelectItem>
                  <SelectItem value="20">20 MB</SelectItem>
                  <SelectItem value="50">50 MB</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Max Pages Processed" description="Maximum PDF/document pages extracted per file">
              <Select value={String(watch('max_pages_processed'))} onValueChange={v => setValue('max_pages_processed', parseInt(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 pages</SelectItem>
                  <SelectItem value="25">25 pages</SelectItem>
                  <SelectItem value="50">50 pages</SelectItem>
                  <SelectItem value="100">100 pages</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Preferred File Output" description="Default analysis type when a file is attached">
              <Select value={watch('preferred_file_output')} onValueChange={v => setValue('preferred_file_output', v)}>
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="qa">Q&A extraction</SelectItem>
                  <SelectItem value="extraction">Key data extraction</SelectItem>
                  <SelectItem value="action_items">Action items</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="File Analysis Provider" description="AI provider used to extract and analyze attached PDFs and documents">
              <Select
                value={watch('file_analysis_provider') || 'gemini'}
                onValueChange={v => {
                  setValue('file_analysis_provider', v);
                  const models = getFileAnalysisModelsForProvider(v as 'openai' | 'gemini');
                  setValue('file_analysis_model', models[0]?.value || '');
                }}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="File Analysis Model" description="Model used to extract text from PDFs and documents">
              <Select value={watch('file_analysis_model')} onValueChange={v => setValue('file_analysis_model', v)}>
                <SelectTrigger className="w-[140px] sm:w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFileAnalysisModelsForProvider((watch('file_analysis_provider') || 'gemini') as 'openai' | 'gemini').map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label} — {m.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Show Citation References" description="Display file section references in responses (user-visible)">
              <Switch
                checked={watch('citation_behavior')}
                onCheckedChange={v => setValue('citation_behavior', v)}
              />
            </FormRow>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  );
}
