"use client";

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreatePulseDraft, useUpdatePulseDraft } from '@/hooks/usePulseDrafts';
import { platformLabel, platformColor } from '@/components/settings/pulsePlatforms';
import { PULSE_PLATFORMS, isoToLocalInput, localInputToIso } from '@/components/pulse/pulseStatus';
import type { PulseDraft, PulsePostType, PulseDraftStatus } from '@/types/pulse';

interface PulseDraftEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: PulseDraft | null; // null = create
}

const POST_TYPES: PulsePostType[] = ['text', 'photo', 'video'];
const EDITABLE_STATUSES: PulseDraftStatus[] = ['draft', 'pending_approval', 'scheduled'];

export function PulseDraftEditor({ open, onOpenChange, draft }: PulseDraftEditorProps) {
  const create = useCreatePulseDraft();
  const update = useUpdatePulseDraft();

  const [postType, setPostType] = useState<PulsePostType>('text');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [profile, setProfile] = useState('');
  const [status, setStatus] = useState<PulseDraftStatus>('draft');
  const [scheduledLocal, setScheduledLocal] = useState('');

  useEffect(() => {
    if (!open) return;
    setPostType(draft?.post_type ?? 'text');
    setTitle(draft?.title ?? '');
    setCaption(draft?.caption ?? '');
    setPlatforms(draft?.platforms ?? []);
    setProfile(draft?.profile_username ?? '');
    setStatus(draft && EDITABLE_STATUSES.includes(draft.status) ? draft.status : 'draft');
    setScheduledLocal(isoToLocalInput(draft?.scheduled_date ?? null));
  }, [open, draft]);

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const isSaving = create.isPending || update.isPending;

  const handleSave = () => {
    const payload = {
      post_type: postType,
      title: title.trim() || null,
      caption: caption.trim() || null,
      platforms,
      profile_username: profile.trim() || null,
      status,
      scheduled_date: status === 'scheduled' ? localInputToIso(scheduledLocal) : draft?.scheduled_date ?? null,
    };
    const onSuccess = () => onOpenChange(false);
    if (draft) update.mutate({ id: draft.id, ...payload }, { onSuccess });
    else create.mutate({ ...payload, generated_by: 'manual' }, { onSuccess });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{draft ? 'Edit post' : 'New post'}</SheetTitle>
          <SheetDescription>
            {draft ? 'Update this draft.' : 'Create a draft you can schedule or publish later.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as PulsePostType)}>
                <SelectTrigger className="h-9 text-sm capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-sm capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PulseDraftStatus)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-sm">Draft</SelectItem>
                  <SelectItem value="pending_approval" className="text-sm">Pending approval</SelectItem>
                  <SelectItem value="scheduled" className="text-sm">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draft-title" className="text-xs font-medium">Title (internal)</Label>
            <Input id="draft-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional label" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draft-caption" className="text-xs font-medium">Caption</Label>
            <Textarea id="draft-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What do you want to post?" className="min-h-[120px] text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {PULSE_PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                      active ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:bg-muted',
                      active && platformColor(p),
                    )}
                  >
                    {platformLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draft-profile" className="text-xs font-medium">Profile (upload-post username)</Label>
            <Input id="draft-profile" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="Optional" className="h-9 text-sm" />
          </div>

          {status === 'scheduled' && (
            <div className="space-y-1.5">
              <Label htmlFor="draft-schedule" className="text-xs font-medium">Scheduled date</Label>
              <Input id="draft-schedule" type="datetime-local" value={scheduledLocal} onChange={(e) => setScheduledLocal(e.target.value)} className="h-9 text-sm" />
            </div>
          )}
        </div>

        <SheetFooter>
          <Button onClick={handleSave} disabled={isSaving || (!caption.trim() && platforms.length === 0)} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft ? 'Save changes' : 'Create draft'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
