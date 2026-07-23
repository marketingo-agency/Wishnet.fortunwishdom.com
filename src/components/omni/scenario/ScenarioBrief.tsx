"use client";

/**
 * Scenario Studio stage 1: the brief. Topic/idea text with a bottom-right
 * optimization wand that rewrites it cinematically (mirrors omni-images stage 1),
 * InspireMe (knowledge-mined ideas), reference images (Wishpedia canon; these
 * anchor the storyboard keyframes), an optional pasted source, and a target
 * scene count (up to 20). No source URL. The generate call produces the
 * scenario for stage 2.
 */

import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { InspireMe } from '../wizard/InspireMe';
import { OmniWishReferencePicker } from '../wizard/OmniWishReferencePicker';
import { ScenarioReferenceUploader } from './ScenarioReferenceUploader';
import { useGenerateScenario, type ScenarioUploadedRef } from '@/hooks/omni/useScenario';
import { useOptimizeDraft } from '@/hooks/omni';
import { stripKnowledgeMarkers } from '@/lib/omni/stripKnowledgeMarkers';
import type { OmniVideoScenario, OmniWishReferenceRef } from '@/hooks/omni';

const SCENE_OPTIONS = ['4', '6', '8', '10', '12', '16', '20'];
const SECONDS_PER_SCENE = 8;

interface ScenarioBriefProps {
  initialBrief: string;
  initialReferences: OmniWishReferenceRef[];
  uploaded: ScenarioUploadedRef[];
  onUploadedChange: (refs: ScenarioUploadedRef[]) => void;
  onGenerated: (brief: string, scenario: OmniVideoScenario, references: OmniWishReferenceRef[]) => void;
}

export function ScenarioBrief({ initialBrief, initialReferences, uploaded, onUploadedChange, onGenerated }: ScenarioBriefProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [sceneCount, setSceneCount] = useState('6');
  const [references, setReferences] = useState<OmniWishReferenceRef[]>(initialReferences);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const generate = useGenerateScenario();
  const { optimizeDraft } = useOptimizeDraft();

  const busy = generate.isPending || isOptimizing;
  const canGenerate = Boolean(brief.trim() || pasted.trim()) && !busy;

  const handleOptimize = async () => {
    if (!brief.trim() || busy) return;
    setIsOptimizing(true);
    try {
      const improved = await optimizeDraft(
        `${brief.trim()}\n\n(Rewrite this into a single, vivid, cinematic video brief: evocative visual language, mood, style, lighting, and pacing, while keeping the original intent. Output only the rewritten brief.)`,
      );
      if (improved) setBrief(stripKnowledgeMarkers(improved));
    } catch {
      // useOptimizeDraft already toasts; keep the current brief.
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    generate.mutate(
      {
        brief: brief.trim() || undefined,
        pasted_text: pasted.trim() || undefined,
        target_scenes: Number(sceneCount),
        seconds_per_scene: SECONDS_PER_SCENE,
      },
      { onSuccess: (result) => onGenerated(brief.trim(), result.scenario, references) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="scenario-brief">What is this video about?</Label>
          <InspireMe onPick={(objective) => setBrief(stripKnowledgeMarkers(objective))} disabled={busy} />
        </div>
        {/* Bottom-right optimization wand optimizes the brief in place (omni-images stage-1 pattern). */}
        <div className="relative">
          <Textarea
            id="scenario-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="The topic, story, or campaign idea. The scenario grounds itself in your Brain knowledge and Wishpedia canon."
            rows={5}
            className="resize-none pr-12"
            disabled={isOptimizing}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleOptimize()}
            disabled={!brief.trim() || busy}
            aria-label="Optimize the brief"
            title="Optimize cinematically"
            className="absolute bottom-2 right-2 h-8 w-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm transition-all duration-300 hover:opacity-90"
          >
            {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <OmniWishReferencePicker value={references} onChange={setReferences} disabled={busy} />
          <ScenarioReferenceUploader value={uploaded} onChange={onUploadedChange} disabled={busy} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scenario-scenes">Target scenes</Label>
          <Select value={sceneCount} onValueChange={setSceneCount} disabled={busy}>
            <SelectTrigger id="scenario-scenes" className="cursor-pointer sm:w-[150px]" aria-label="Target scene count">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENE_OPTIONS.map((n) => (
                <SelectItem key={n} value={n} className="text-sm">{n} scenes</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Up to 20. Each scene&apos;s length is editable next.</p>
        </div>
      </div>
      {(references.length > 0 || uploaded.length > 0) && (
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Reference images (Wishpedia + your uploads) anchor the storyboard keyframes.
        </p>
      )}

      {showPaste ? (
        <div className="space-y-1.5">
          <Label htmlFor="scenario-paste">Pasted source material <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="scenario-paste"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste an article, script, or notes to ground the scenario."
            rows={5}
            className="resize-none"
            disabled={busy}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPaste(true)}
          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 transition-colors duration-200 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Paste source material instead
        </button>
      )}

      {generate.isError && (
        <p className="text-sm text-destructive">{generate.error.message}</p>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="cursor-pointer gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generate.isPending ? 'Writing the scenario…' : 'Generate the scenario'}
        </Button>
      </div>
    </div>
  );
}
