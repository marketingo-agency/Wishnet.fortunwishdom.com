"use client";

/**
 * PersonaEditorSheet: create/edit one persona — identity, speaking style,
 * ElevenLabs voice with preview, portrait (Wishpedia character or URL).
 * Carries the impersonation-policy note (D-A4: designed/library voices only).
 */

import { useEffect, useState } from 'react';
import { BookOpen, Loader2, Play, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  useCreatePersona, useUpdatePersona, usePodcastVoices, useVoicePreview, type OmniPersona,
} from '@/hooks/omni/usePersonas';
import { WishpediaPersonaPicker, type WishpediaPersonaSeed } from './WishpediaPersonaPicker';

interface PersonaEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  persona: OmniPersona | null;
}

export function PersonaEditorSheet({ open, onOpenChange, persona }: PersonaEditorSheetProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [personality, setPersonality] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [wishpediaEntryId, setWishpediaEntryId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(persona?.name ?? '');
    setRole(persona?.role ?? '');
    setPersonality(persona?.personality ?? '');
    setSpeakingStyle(persona?.speaking_style ?? '');
    setVoiceId(persona?.voice_id ?? '');
    setPortraitUrl(persona?.portrait_url ?? '');
    setPortraitFailed(false);
    setWishpediaEntryId(persona?.wishpedia_entry_id ?? null);
  }, [open, persona]);

  const { data: voices = [], notConnected, isLoading: loadingVoices } = usePodcastVoices();
  const preview = useVoicePreview();
  const createPersona = useCreatePersona();
  const updatePersona = useUpdatePersona();
  const saving = createPersona.isPending || updatePersona.isPending;

  const applySeed = (seed: WishpediaPersonaSeed) => {
    if (!name.trim()) setName(seed.name);
    if (seed.portraitUrl) setPortraitUrl(seed.portraitUrl);
    if (seed.personalitySeed) {
      setPersonality((prev) => (prev.trim() ? prev : seed.personalitySeed));
    }
    setWishpediaEntryId(seed.entryId);
  };

  const save = async () => {
    const input = {
      name: name.trim(),
      role: role.trim() || null,
      personality: personality.trim() || null,
      speaking_style: speakingStyle.trim() || null,
      voice_id: voiceId || null,
      portrait_url: portraitUrl.trim() || null,
      wishpedia_entry_id: wishpediaEntryId,
    };
    if (persona) await updatePersona.mutateAsync({ id: persona.id, ...input });
    else await createPersona.mutateAsync(input);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{persona ? 'Edit persona' : 'New persona'}</SheetTitle>
          <SheetDescription>
            A reusable speaker for your shows: identity, voice, and portrait.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="persona-name">Name</Label>
            <Input id="persona-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wishu" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-role">Role</Label>
            <Input id="persona-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Host, resident dream expert" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-personality">Personality</Label>
            <Textarea id="persona-personality" value={personality} onChange={(e) => setPersonality(e.target.value)} rows={3} placeholder="Who is this speaker? Traits, quirks, background." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-style">Speaking style</Label>
            <Textarea id="persona-style" value={speakingStyle} onChange={(e) => setSpeakingStyle(e.target.value)} rows={2} placeholder="Pace, tone, catchphrases, sentence length." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="persona-voice">ElevenLabs voice</Label>
            {notConnected ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400">
                ElevenLabs is not connected. Add the API key in Pulse Settings to pick and preview voices; the persona can be saved without one.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={voiceId} onValueChange={setVoiceId} disabled={loadingVoices}>
                  <SelectTrigger id="persona-voice" className="flex-1 cursor-pointer">
                    <SelectValue placeholder={loadingVoices ? 'Loading voices…' : 'Pick a voice'} />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name}{v.category ? ` · ${v.category}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!voiceId || preview.isPending}
                  onClick={() => preview.mutate({ voiceId })}
                  aria-label="Preview this voice"
                  className="cursor-pointer"
                >
                  {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="persona-portrait">Portrait</Label>
            <div className="flex items-start gap-3">
              {portraitUrl && !portraitFailed ? (
                <img
                  src={portraitUrl}
                  alt={`Portrait of ${name || 'the persona'}`}
                  className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                  onError={() => setPortraitFailed(true)}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border px-1 text-center text-[10px] text-muted-foreground">
                  {portraitFailed ? "Couldn't load" : 'None'}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input id="persona-portrait" value={portraitUrl} onChange={(e) => { setPortraitUrl(e.target.value); setPortraitFailed(false); }} placeholder="Image URL (or pick a character)" />
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="cursor-pointer gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Pick a Wishpedia character
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Need original art? Generate it in Omni Images and paste the link — portraits power the video versions later.
            </p>
          </div>

          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Designed and library voices only. Never build a persona that imitates a real person or uses a cloned voice — podcast platforms prohibit voice impersonation.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button
            onClick={() => void save()}
            disabled={!name.trim() || saving}
            className="cursor-pointer bg-gradient-to-r from-orange-500 to-rose-600 text-white transition-all duration-300 hover:opacity-90"
          >
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {persona ? 'Save changes' : 'Create persona'}
          </Button>
        </div>

        <WishpediaPersonaPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={applySeed} />
      </SheetContent>
    </Sheet>
  );
}
