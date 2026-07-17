"use client";

/**
 * Video Studio stage 6: captions (Plan 2 Phase 7, D-V8).
 * Transcript via the transcribe edge action (ElevenLabs Scribe word-level on
 * fal; wizper fallback) → editable segments → SRT saved as a SIDECAR object
 * in the omni-video bucket next to the assembly, path-only in metadata.
 * Captions are optional: a caption-less film may proceed.
 */

import { useState } from 'react';
import { Captions, Check, Loader2, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { callOmniVideo } from '@/lib/omniApi';
import { formatSrtTime, segmentsFromTranscribe, toSrt, type CaptionSegment } from '@/lib/omni/videoCaptions';
import { patchAssetMetadata } from '@/hooks/omni/useVideoAudio';

interface VSCaptionsProps {
  runId: string;
  assemblyAssetId?: string;
  srtPath?: string;
  onSrtSaved: (path: string) => void;
  onNext: () => void;
  /** Continue-button label; Clips reuses this screen with its own next stop. */
  nextLabel?: string;
}

export function VSCaptions({ runId, assemblyAssetId, srtPath, onSrtSaved, onNext, nextLabel = 'Continue to Distribution' }: VSCaptionsProps) {
  const { user } = useAuth();
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [engine, setEngine] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!assemblyAssetId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Assemble the film first — captions transcribe the final cut.</p>
      </div>
    );
  }

  const transcribe = async () => {
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const res = await callOmniVideo<{ engine: string; result: Record<string, unknown> }>(
        'transcribe',
        { asset_id: assemblyAssetId },
      );
      const parsed = segmentsFromTranscribe(res.result);
      if (parsed.length === 0) {
        setTranscribeError('The transcription came back empty — the film may have no speech. You can continue without captions.');
        return;
      }
      setSegments(parsed);
      setEngine(res.engine);
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const saveSrt = async () => {
    if (!user?.id) {
      toast.error('Your session expired — sign in again.');
      return;
    }
    const srt = toSrt(segments);
    if (!srt) {
      toast.error('There are no caption lines to save.');
      return;
    }
    setSaving(true);
    try {
      const path = `${user.id}/omni-videos/${runId}/${assemblyAssetId}.srt`;
      const { error } = await supabase.storage
        .from('omni-video')
        .upload(path, new Blob([srt], { type: 'text/plain' }), { contentType: 'text/plain', upsert: true });
      if (error) throw new Error(error.message);
      const patched = await patchAssetMetadata(assemblyAssetId, { srt_path: path });
      if (!patched) throw new Error('The caption file saved, but linking it to the film failed. Try again.');
      onSrtSaved(path);
      toast.success('Captions saved as an SRT sidecar.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saving the captions failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Captions className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold">Captions</h2>
            <span className="text-[11px] text-muted-foreground">(optional)</span>
          </div>
          <Button
            size="sm"
            onClick={() => void transcribe()}
            disabled={transcribing}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Captions className="h-3.5 w-3.5" />}
            {transcribing ? 'Transcribing…' : segments.length > 0 ? 'Re-transcribe' : 'Transcribe the film'}
          </Button>
        </div>
        {srtPath && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 [[data-omni-theme=dark]_&]:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> An SRT sidecar is already saved for this film{segments.length > 0 ? ' — saving again replaces it.' : '. Re-transcribe to edit it.'}
          </p>
        )}
        {transcribing && (
          <p className="text-[11px] text-muted-foreground" aria-live="polite">
            Word-level transcription usually lands within a minute.
          </p>
        )}
        {transcribeError && (
          <p className="flex items-start gap-1.5 text-xs text-amber-600 [[data-omni-theme=dark]_&]:text-amber-400" role="status">
            <XCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {transcribeError}
          </p>
        )}
      </section>

      {segments.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {segments.length} caption lines{engine === 'wizper' ? ' (segment-level fallback engine)' : ''} — edit freely, then save.
          </p>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {segments.map((seg, i) => (
              <div key={`${seg.start_s}-${i}`} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5">
                <span className="mt-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatSrtTime(seg.start_s).slice(3, 8)}–{formatSrtTime(seg.end_s).slice(3, 8)}
                </span>
                <Textarea
                  value={seg.text}
                  onChange={(e) => setSegments((prev) => prev.map((s, j) => (j === i ? { ...s, text: e.target.value } : s)))}
                  rows={1}
                  className="min-h-[36px] flex-1 resize-y text-sm"
                  aria-label={`Caption line ${i + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSegments((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove caption line ${i + 1}`}
                  className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => void saveSrt()}
            disabled={saving}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save captions (SRT)
          </Button>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        <p className="text-[11px] text-muted-foreground">
          {srtPath ? 'Captions ride along to the Content Library.' : 'No captions yet — continuing publishes without them.'}
        </p>
        <Button
          size="sm"
          onClick={onNext}
          className="h-8 cursor-pointer bg-gradient-to-r from-violet-500 to-purple-600 text-xs text-white transition-all duration-300 hover:opacity-90"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
