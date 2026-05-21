import { useState } from 'react';
import { Layers, Plus, Trash2, Check, X, ChevronDown, ChevronUp, Palette, Wand2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePixelBlueprints, useSavePixelBlueprint, useDeletePixelBlueprint, useGenerateBlueprintWithAI, type PixelBlueprint } from '@/hooks/usePixel';

interface PixelBlueprintPanelProps {
  onApply?: (blueprint: PixelBlueprint) => void;
}

const EMPTY_BLUEPRINT: Omit<PixelBlueprint, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  format: '',
  aspect_ratio: '1:1',
  composition_rules: '',
  style_rules: '',
  typography_vibe: '',
  element_rules: '',
  negative_constraints: '',
  export_specs: '',
  palette: {},
  source: 'user',
};

export function PixelBlueprintPanel({ onApply }: PixelBlueprintPanelProps) {
  const { data: blueprints = [], isLoading } = usePixelBlueprints();
  const { mutate: saveBlueprint, isPending: isSaving } = useSavePixelBlueprint();
  const { mutate: deleteBlueprint } = useDeletePixelBlueprint();
  const { mutate: generateBlueprint, isPending: isGenerating } = useGenerateBlueprintWithAI();

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_BLUEPRINT });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [wasAiGenerated, setWasAiGenerated] = useState(false);

  const handleSave = () => {
    if (!form.name.trim()) return;
    saveBlueprint(form as Partial<PixelBlueprint>, {
      onSuccess: () => {
        setIsCreating(false);
        setWasAiGenerated(false);
        setForm({ ...EMPTY_BLUEPRINT });
      },
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setWasAiGenerated(false);
    setForm({ ...EMPTY_BLUEPRINT });
  };

  const handleGenerateWithAI = () => {
    setIsCreating(true);
    generateBlueprint(undefined, {
      onSuccess: (bp) => {
        setForm(f => ({
          ...f,
          name: bp.name || f.name,
          description: bp.description || f.description,
          format: bp.format || f.format,
          aspect_ratio: bp.aspect_ratio || f.aspect_ratio,
          style_rules: bp.style_rules || f.style_rules,
          composition_rules: bp.composition_rules || f.composition_rules,
          typography_vibe: bp.typography_vibe || f.typography_vibe,
          element_rules: bp.element_rules || f.element_rules,
          negative_constraints: bp.negative_constraints || f.negative_constraints,
        }));
        setWasAiGenerated(true);
      },
    });
  };

  const formatLabels: Record<string, string> = {
    social_post: 'Social Post', story: 'Story', carousel: 'Carousel',
    deck_slide: 'Deck Slide', banner: 'Banner', thumbnail: 'Thumbnail', custom: 'Custom',
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-pink-500" />
            Visual Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable visual recipes — define once, apply consistently across all outputs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="border-pink-500/30 text-pink-600 hover:bg-pink-500/5 gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Generate with AI
              </>
            )}
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />New Template
          </Button>
        </div>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">
              {wasAiGenerated ? 'AI-Generated Template' : 'New Visual Template'}
            </h3>
            {isGenerating && (
              <div className="flex items-center gap-1.5 text-xs text-pink-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is crafting your template...
              </div>
            )}
          </div>

          {/* AI-generated badge */}
          {wasAiGenerated && !isGenerating && (
            <div className="flex items-center gap-2 rounded-xl bg-pink-500/10 border border-pink-500/20 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-pink-500 shrink-0" />
              <p className="text-xs text-pink-700 dark:text-pink-400">
                ✦ AI-generated from your Brain & Heart — review and edit before saving.
              </p>
            </div>
          )}

          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", isGenerating && "opacity-50 pointer-events-none")}>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template Name *</label>
              <Input placeholder="e.g. Premium Social 2024" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Format</label>
              <select value={form.format || ''} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:border-pink-500/50">
                <option value="">Select format</option>
                {Object.entries(formatLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Aspect Ratio</label>
              <select value={form.aspect_ratio || '1:1'} onChange={e => setForm(f => ({ ...f, aspect_ratio: e.target.value }))}
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:border-pink-500/50">
                {['1:1', '9:16', '16:9', '4:5', '4:3', '3:4', '21:9'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Input placeholder="Short description of this blueprint" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <div className={cn("space-y-3", isGenerating && "opacity-50 pointer-events-none")}>
            {[
              { key: 'style_rules', label: 'Style Rules', placeholder: 'Palette behavior, lighting, texture, mood...' },
              { key: 'composition_rules', label: 'Composition Rules', placeholder: 'Hierarchy, focal point, whitespace, grid...' },
              { key: 'typography_vibe', label: 'Typography Vibe', placeholder: 'Type personality, weight, hierarchy approach...' },
              { key: 'element_rules', label: 'Element Rules', placeholder: 'Icon style, border radius, shadow intensity, grain...' },
              { key: 'negative_constraints', label: 'Negative Constraints (Avoid)', placeholder: 'What to never include in outputs using this template...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <textarea
                  rows={2}
                  placeholder={placeholder}
                  value={String((form as unknown as Record<string, unknown>)[key] || '')}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:border-pink-500/50 resize-none"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving || isGenerating || !form.name.trim()} size="sm" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0">
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isGenerating}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Blueprint list */}
      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Loading templates...</div>
      ) : blueprints.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4">
            <Palette className="h-7 w-7 text-pink-400" />
          </div>
          <h3 className="font-medium mb-1">No templates yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Templates are reusable visual recipes. Create one manually, or click <strong>Generate with AI</strong> to auto-fill all fields from your Brain & Heart.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {blueprints.map(bp => (
            <div key={bp.id} className={cn(
              'rounded-2xl border bg-card transition-all',
              expandedId === bp.id ? 'border-pink-500/30 shadow-sm' : 'border-border hover:border-border/80'
            )}>
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{bp.name}</span>
                    {bp.source === 'ai' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-pink-500/30 text-pink-600">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />AI
                      </Badge>
                    )}
                    {bp.format && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {formatLabels[bp.format] || bp.format}
                      </Badge>
                    )}
                    {bp.aspect_ratio && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{bp.aspect_ratio}</Badge>
                    )}
                  </div>
                  {bp.description && (
                    <p className="text-xs text-muted-foreground truncate">{bp.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  {onApply && (
                    <Button size="sm" variant="outline" className="h-8 text-xs border-pink-500/20 text-pink-600 hover:bg-pink-500/5"
                      onClick={() => onApply(bp)}>
                      Apply
                    </Button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === bp.id ? null : bp.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                    {expandedId === bp.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {pendingDeleteId === bp.id ? (
                    <div className="flex items-center gap-0.5">
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => { deleteBlueprint(bp.id); setPendingDeleteId(null); }}><Check className="h-3.5 w-3.5" /></button>
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors" onClick={() => setPendingDeleteId(null)}><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => setPendingDeleteId(bp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {expandedId === bp.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                  {[
                    { key: 'style_rules', label: 'Style Rules' },
                    { key: 'composition_rules', label: 'Composition' },
                    { key: 'typography_vibe', label: 'Typography' },
                    { key: 'element_rules', label: 'Elements' },
                    { key: 'negative_constraints', label: 'Avoid' },
                  ].filter(({ key }) => (bp as unknown as Record<string, unknown>)[key]).map(({ key, label }) => (
                    <div key={key} className="text-xs">
                      <span className="text-muted-foreground font-medium">{label}: </span>
                      <span>{String((bp as unknown as Record<string, unknown>)[key])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
