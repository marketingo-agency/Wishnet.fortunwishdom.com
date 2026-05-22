"use client";

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Plus, X } from 'lucide-react';
import { useWhisperVoicePresets, useElevenLabsVoices } from '@/hooks/useWhisperVoices';
import { useCreateWhisperShow, useUpdateWhisperShow } from '@/hooks/useWhisperShows';
import type { WhisperShow } from '@/types/whisper';

interface WhisperShowDialogProps {
  show: WhisperShow | null; // null = create
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CastRow { speaker: string; voiceId: string }

export function WhisperShowDialog({ show, open, onOpenChange }: WhisperShowDialogProps) {
  const { data: presets } = useWhisperVoicePresets();
  const { data: voices } = useElevenLabsVoices(open);
  const create = useCreateWhisperShow();
  const update = useUpdateWhisperShow();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [cast, setCast] = useState<CastRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(show?.name ?? '');
    setDescription(show?.description ?? '');
    setLanguage(show?.language ?? 'en');
    setCast(show ? Object.entries(show.default_cast).map(([speaker, voiceId]) => ({ speaker, voiceId })) : []);
  }, [open, show]);

  const busy = create.isPending || update.isPending;

  const handleSave = () => {
    const default_cast: Record<string, string> = {};
    for (const r of cast) if (r.speaker.trim() && r.voiceId) default_cast[r.speaker.trim()] = r.voiceId;
    const input = { name: name.trim() || 'Untitled show', description: description.trim() || null, language: language.trim() || 'en', default_cast };
    const onSuccess = () => onOpenChange(false);
    if (show) update.mutate({ id: show.id, ...input }, { onSuccess });
    else create.mutate(input, { onSuccess });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{show ? 'Edit show' : 'New show'}</DialogTitle>
          <DialogDescription>A show gives its episodes a consistent cast and language.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="show-name" className="text-xs font-medium">Name</Label>
            <Input id="show-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Wishdom Files" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show-desc" className="text-xs font-medium">Description</Label>
            <Textarea id="show-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px] text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show-lang" className="text-xs font-medium">Language</Label>
            <Input id="show-lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className="h-9 w-28 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Default cast</Label>
            {cast.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input value={row.speaker} onChange={(e) => setCast((p) => p.map((r, idx) => (idx === i ? { ...r, speaker: e.target.value } : r)))} placeholder="Speaker (e.g. Host A)" className="h-8 w-32 text-xs" />
                <Select value={row.voiceId} onValueChange={(v) => setCast((p) => p.map((r, idx) => (idx === i ? { ...r, voiceId: v } : r)))}>
                  <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Voice" /></SelectTrigger>
                  <SelectContent>
                    {presets && presets.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-[10px]">Presets</SelectLabel>
                        {presets.map((p) => <SelectItem key={`p-${p.id}`} value={p.elevenlabs_voice_id} className="text-sm">★ {p.name}</SelectItem>)}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      <SelectLabel className="text-[10px]">Library</SelectLabel>
                      {(voices ?? []).map((v) => <SelectItem key={v.voice_id} value={v.voice_id} className="text-sm">{v.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => setCast((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove"><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCast((p) => [...p, { speaker: '', voiceId: '' }])} className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add speaker</Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={busy || !name.trim()} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {show ? 'Save changes' : 'Create show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
