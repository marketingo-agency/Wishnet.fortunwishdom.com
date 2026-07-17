"use client";

/**
 * Scenario Studio stage 1: the brief. Topic/idea text, optional source URL or
 * pasted material, target scene count, InspireMe (knowledge-mined ideas), and
 * the generate call that produces the scenario for stage 2.
 */

import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { InspireMe } from '../wizard/InspireMe';
import { useGenerateScenario } from '@/hooks/omni/useScenario';
import type { OmniVideoScenario } from '@/hooks/omni';

interface ScenarioBriefProps {
  initialBrief: string;
  onGenerated: (brief: string, scenario: OmniVideoScenario) => void;
}

export function ScenarioBrief({ initialBrief, onGenerated }: ScenarioBriefProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [sourceUrl, setSourceUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [sceneCount, setSceneCount] = useState('6');
  const generate = useGenerateScenario();

  const canGenerate = (brief.trim() || pasted.trim() || sourceUrl.trim()) && !generate.isPending;

  const handleGenerate = () => {
    if (!canGenerate) return;
    generate.mutate(
      {
        brief: brief.trim() || undefined,
        pasted_text: pasted.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        target_scenes: Number(sceneCount),
        seconds_per_scene: 8,
      },
      { onSuccess: (result) => onGenerated(brief.trim(), result.scenario) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="scenario-brief">What is this video about?</Label>
          <InspireMe onPick={(objective) => setBrief(objective)} disabled={generate.isPending} />
        </div>
        <Textarea
          id="scenario-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="The topic, story, or campaign idea. The scenario grounds itself in your Brain knowledge and Wishpedia canon."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="scenario-url">Source URL <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="scenario-url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scenario-scenes">Target scenes</Label>
          <Select value={sceneCount} onValueChange={setSceneCount}>
            <SelectTrigger id="scenario-scenes" className="cursor-pointer" aria-label="Target scene count">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['4', '6', '8', '12', '16'].map((n) => (
                <SelectItem key={n} value={n} className="text-sm">{n} scenes (≈{Number(n) * 8}s)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showPaste ? (
        <div className="space-y-1.5">
          <Label htmlFor="scenario-paste">Pasted source material</Label>
          <Textarea
            id="scenario-paste"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste an article, script, or notes to ground the scenario."
            rows={5}
            className="resize-none"
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
