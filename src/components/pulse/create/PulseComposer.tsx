"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Save, Send, CalendarClock, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePulseAccounts } from '@/hooks/usePulseSettings';
import { useOptimizeDraft } from '@/hooks/promptor';
import { useCreatePulseDraft } from '@/hooks/usePulseDrafts';
import { usePublishPost } from '@/hooks/usePublishPost';
import { platformLabel, platformColor } from '@/components/settings/pulsePlatforms';
import { PULSE_PLATFORMS, localInputToIso } from '@/components/pulse/pulseStatus';
import type { PulsePostType, PulseMediaRef } from '@/types/pulse';

const POST_TYPES: PulsePostType[] = ['text', 'photo', 'video'];

export function PulseComposer() {
  const { data: accounts } = usePulseAccounts(true);
  const { optimizeDraft, isOptimizing } = useOptimizeDraft();
  const createDraft = useCreatePulseDraft();
  const publish = usePublishPost();

  const [profile, setProfile] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [postType, setPostType] = useState<PulsePostType>('text');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState('');

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const cleanMedia = mediaUrls.map((u) => u.trim()).filter(Boolean);
  const busy = createDraft.isPending || publish.isPending;

  const handleImprove = async () => {
    if (!caption.trim()) return;
    try {
      const improved = await optimizeDraft(caption);
      setCaption(improved);
    } catch {
      /* toast handled in hook */
    }
  };

  const reset = () => {
    setCaption(''); setDescription(''); setMediaUrls([]); setPlatforms([]);
    setScheduleOn(false); setScheduledLocal('');
  };

  const mediaRefs = (): PulseMediaRef[] =>
    cleanMedia.map((url) => ({ storage_path: url, url, type: postType === 'video' ? 'video' : 'image' }));

  const handleSaveDraft = () => {
    createDraft.mutate({
      profile_username: profile.trim() || null,
      platforms, post_type: postType,
      caption: caption.trim() || null,
      media_refs: mediaRefs(),
      status: 'draft', generated_by: 'manual',
    }, { onSuccess: reset });
  };

  const handlePublish = (schedule: boolean) => {
    const scheduledDate = schedule ? localInputToIso(scheduledLocal) ?? undefined : undefined;
    publish.mutate(
      {
        profile: profile.trim(),
        platforms,
        postType,
        title: caption.trim() || undefined,
        description: description.trim() || undefined,
        mediaUrls: cleanMedia,
        scheduledDate,
      },
      {
        onSuccess: (res) => {
          createDraft.mutate({
            profile_username: profile.trim() || null,
            platforms, post_type: postType,
            caption: caption.trim() || null,
            media_refs: mediaRefs(),
            status: schedule ? 'scheduled' : 'published',
            scheduled_date: scheduledDate ?? null,
            generated_by: 'manual',
          });
          toast.success(schedule ? 'Post scheduled' : 'Post published', {
            description: res.job_id ? `Job ${res.job_id}` : undefined,
          });
          reset();
        },
      },
    );
  };

  const canPublish = profile.trim() && platforms.length > 0 && (postType === 'text' ? caption.trim() : cleanMedia.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Compose a post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile + type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="composer-profile" className="text-xs font-medium">Profile</Label>
              <Input
                id="composer-profile"
                list="pulse-profiles"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="upload-post profile"
                className="h-9 text-sm"
              />
              <datalist id="pulse-profiles">
                {(accounts ?? []).map((a) => <option key={a.username} value={a.username} />)}
              </datalist>
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

          {/* Platforms */}
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

          {/* Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="composer-caption" className="text-xs font-medium">Caption</Label>
              <Button variant="ghost" size="sm" onClick={handleImprove} disabled={!caption.trim() || isOptimizing} className="h-7 gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                {isOptimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Improve with AI
              </Button>
            </div>
            <Textarea id="composer-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write your post…" className="min-h-[120px] text-sm" />
          </div>

          {/* Description (extended) */}
          <div className="space-y-1.5">
            <Label htmlFor="composer-desc" className="text-xs font-medium">Extended text <span className="text-muted-foreground">(LinkedIn / Facebook / YouTube / Reddit)</span></Label>
            <Textarea id="composer-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional longer body" className="min-h-[64px] text-sm" />
          </div>

          {/* Media URLs */}
          {postType !== 'text' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{postType === 'video' ? 'Video URL' : 'Photo URLs'}</Label>
              {mediaUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input value={url} onChange={(e) => setMediaUrls((p) => p.map((u, idx) => (idx === i ? e.target.value : u)))} placeholder="https://…" className="h-9 text-sm" />
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => setMediaUrls((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove URL"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {(postType === 'photo' || mediaUrls.length === 0) && (
                <Button variant="outline" size="sm" onClick={() => setMediaUrls((p) => [...p, ''])} className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add {postType === 'video' ? 'video' : 'photo'} URL</Button>
              )}
              <p className="text-[11px] text-muted-foreground">Paste a public/asset URL (e.g. a Pixel-generated image). Direct Pixel generation lands here next.</p>
            </div>
          )}

          {/* Schedule */}
          <div className="space-y-1.5 border-t pt-3">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} className="accent-pink-500" />
              Schedule for later
            </label>
            {scheduleOn && (
              <Input type="datetime-local" value={scheduledLocal} onChange={(e) => setScheduledLocal(e.target.value)} className="h-9 w-full text-sm sm:w-64" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={busy} className="gap-1.5">
              {createDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
            </Button>
            {scheduleOn ? (
              <Button size="sm" onClick={() => handlePublish(true)} disabled={busy || !canPublish || !scheduledLocal} className="gap-1.5">
                {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Schedule
              </Button>
            ) : (
              <Button size="sm" onClick={() => handlePublish(false)} disabled={busy || !canPublish} className="gap-1.5">
                {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
