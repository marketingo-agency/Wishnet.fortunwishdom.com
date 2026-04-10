import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Wand2,
  Loader2,
  Heart,
  Brain,
  Sparkles,
  FileText,
  Image,
  Share2,
  Camera,
  Video,
} from 'lucide-react';
import { useRunPromptor, type PromptorOutput, type OutputType, type PrompterSettings } from '@/hooks/usePromptor';
import { PromptorOutput as PromptorOutputPanel } from './PromptorOutput';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getBriefPlaceholder } from './briefPlaceholders';
import type { PromptorSession } from '@/hooks/usePromptorSession';

const OUTPUT_TYPES: {
  value: OutputType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bgColor: string;
}[] = [
  {
    value: 'text',
    label: 'Text',
    icon: <FileText className="h-5 w-5" />,
    description: 'Copy, emails, blogs, ads',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    value: 'image',
    label: 'Image',
    icon: <Image className="h-5 w-5" />,
    description: 'AI image generation',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    value: 'social_image',
    label: 'Social Image',
    icon: <Camera className="h-5 w-5" />,
    description: 'Social media visuals',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    value: 'social_copy',
    label: 'Social Copy',
    icon: <Share2 className="h-5 w-5" />,
    description: 'Posts, captions, hooks',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    value: 'video',
    label: 'Video',
    icon: <Video className="h-5 w-5" />,
    description: 'Reels, trailers, explainers',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
];

const BLUEPRINTS: Record<OutputType, { value: string; label: string }[]> = {
  text: [
    { value: 'general', label: 'General' },
    { value: 'ad_copy', label: 'Ad Copy' },
    { value: 'landing_page', label: 'Landing Page' },
    { value: 'email', label: 'Email' },
    { value: 'blog_outline', label: 'Blog Outline' },
    { value: 'product_description', label: 'Product Description' },
  ],
  image: [
    { value: 'general_scene', label: 'General Scene' },
    { value: 'character_portrait', label: 'Character Portrait' },
    { value: 'product_hero', label: 'Product Hero' },
    { value: 'social_square', label: 'Social Square' },
  ],
  social_image: [
    { value: 'announcement', label: 'Announcement' },
    { value: 'quote_card', label: 'Quote Card' },
    { value: 'carousel_slide', label: 'Carousel Slide' },
  ],
  social_copy: [
    { value: 'hook_variants', label: 'Hook Variants' },
    { value: 'caption_variants', label: 'Caption Variants' },
    { value: 'cta_variants', label: 'CTA Variants' },
  ],
  video: [
    { value: 'short_reel', label: 'Short Reel' },
    { value: 'cinematic_trailer', label: 'Cinematic Trailer' },
    { value: 'explainer_storyboard', label: 'Explainer Storyboard' },
  ],
};

type Step = 'idle' | 'querying_heart' | 'querying_brain' | 'generating' | 'done';

interface PromptorCreateProps {
  settings: PrompterSettings;
  session: PromptorSession['create'];
  onUpdate: (patch: Partial<PromptorSession['create']>) => void;
  onOutputChange?: (output: PromptorOutput | null) => void;
}

export function PromptorCreate({ settings, session, onUpdate, onOutputChange }: PromptorCreateProps) {
  const [step, setStep] = useState<Step>(session.output ? 'done' : 'idle');
  const { toast } = useToast();
  const runPromptor = useRunPromptor();

  const { outputType, blueprint, brief, output } = session;

  const handleOutputTypeChange = (val: OutputType) => {
    onUpdate({ outputType: val, blueprint: BLUEPRINTS[val][0].value });
  };

  const handleSubmit = async () => {
    if (!brief.trim()) {
      toast({ title: 'Brief required', description: 'Please describe what you need.', variant: 'destructive' });
      return;
    }

    onUpdate({ output: null });
    onOutputChange?.(null);

    setStep('querying_heart');
    const heartTimer = setTimeout(() => setStep('querying_brain'), 1200);
    const brainTimer = setTimeout(() => setStep('generating'), 2400);

    try {
      const result = await runPromptor.mutateAsync({
        action: 'create',
        output_type: outputType,
        blueprint,
        raw_request: brief,
      });
      clearTimeout(heartTimer);
      clearTimeout(brainTimer);
      onUpdate({ output: result });
      onOutputChange?.(result);
      setStep('done');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- edge function errors have no stable type
    } catch (err: any) {
      clearTimeout(heartTimer);
      clearTimeout(brainTimer);
      setStep('idle');
      toast({ title: 'Error', description: err.message || 'Generation failed', variant: 'destructive' });
    }
  };

  const isLoading = step !== 'idle' && step !== 'done';
  const currentBlueprints = BLUEPRINTS[outputType] || BLUEPRINTS.text;

  const pipelineSteps = [
    { key: 'querying_heart', icon: <Heart className="h-3.5 w-3.5" />, label: 'Heart', activeColor: 'bg-rose-500 text-white border-rose-500', doneColor: 'bg-rose-100 text-rose-600 border-rose-200' },
    { key: 'querying_brain', icon: <Brain className="h-3.5 w-3.5" />, label: 'Brain', activeColor: 'bg-indigo-500 text-white border-indigo-500', doneColor: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    { key: 'generating', icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Generate', activeColor: 'bg-violet-500 text-white border-violet-500', doneColor: 'bg-violet-100 text-violet-600 border-violet-200' },
  ];

  const stepOrder: Step[] = ['querying_heart', 'querying_brain', 'generating'];
  const currentStepIdx = stepOrder.indexOf(step as Step);

  return (
    <div className="space-y-6">
      {/* Output type selector */}
      <div>
        <Label className="text-sm font-medium text-foreground/80 mb-3 block">Expected Output Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {OUTPUT_TYPES.map((type) => {
            const isSelected = outputType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => handleOutputTypeChange(type.value)}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-xl border-2 p-3 sm:p-4 text-center transition-all hover:shadow-sm',
                  isSelected
                    ? 'border-violet-400 bg-violet-50/80 shadow-sm'
                    : 'border-border/50 bg-card hover:border-border hover:bg-muted/50'
                )}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', isSelected ? 'bg-violet-100' : type.bgColor, isSelected ? 'text-violet-600' : type.color)}>
                  {type.icon}
                </div>
                <div>
                  <p className={cn('text-xs font-semibold leading-tight', isSelected ? 'text-violet-700' : 'text-foreground/80')}>{type.label}</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 leading-tight hidden sm:block">{type.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Blueprint selector — pill row */}
      <div>
        <Label className="text-sm font-medium text-foreground/80 mb-2 block">Blueprint</Label>
        <div className="flex flex-wrap gap-2">
          {currentBlueprints.map((bp) => (
            <button
              key={bp.value}
              onClick={() => onUpdate({ blueprint: bp.value })}
              disabled={isLoading}
              className={cn(
                'rounded-full border px-4 py-2 sm:py-1.5 text-sm font-medium transition-all disabled:opacity-50',
                blueprint === bp.value
                  ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50'
              )}
            >
              {bp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brief textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="brief" className="text-sm font-medium text-foreground/80">Your Brief</Label>
          <span className={cn('text-xs tabular-nums', brief.length > 1800 ? 'text-orange-500' : 'text-muted-foreground/70')}>{brief.length} chars</span>
        </div>
        <Textarea
          id="brief"
          placeholder={getBriefPlaceholder(outputType, blueprint)}
          value={brief}
          onChange={(e) => onUpdate({ brief: e.target.value })}
          className="min-h-[160px] resize-y focus-visible:border-violet-400 focus-visible:ring-violet-100"
          disabled={isLoading}
        />
      </div>

      {/* Submit + Pipeline indicator */}
      <div className="space-y-3">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !brief.trim()}
          size="lg"
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Prompt
            </>
          )}
        </Button>

        {/* Step pipeline */}
        {isLoading && (
          <div className="flex items-center gap-2">
            {pipelineSteps.map((ps, idx) => {
              const isDone = currentStepIdx > idx;
              const isActive = currentStepIdx === idx;
              return (
                <React.Fragment key={ps.key}>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      isActive ? ps.activeColor : isDone ? ps.doneColor : 'border-border text-muted-foreground/70 bg-muted/50'
                    )}
                  >
                    {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                    {!isActive && ps.icon}
                    <span>{ps.label}</span>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className={cn('h-px w-4 flex-shrink-0 transition-colors', isDone ? 'bg-muted-foreground/30' : 'bg-muted')} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Output */}
      {output && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-muted" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Generated Output
            </div>
            <div className="h-px flex-1 bg-muted" />
          </div>
          <PromptorOutputPanel
            output={output}
            showShortPrompt={settings.include_short_prompt}
            showNegatives={settings.include_negatives}
            showQA={settings.include_qa_checklist}
            showComplianceNotes={settings.include_compliance_notes}
          />
        </div>
      )}
    </div>
  );
}
