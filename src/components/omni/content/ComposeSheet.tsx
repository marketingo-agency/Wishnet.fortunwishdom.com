"use client";

/**
 * Compose sheet: create or edit a Publishing Desk post. Title/notes, media
 * (queued locally with previews, uploaded on save in BOTH modes), destinations
 * with per-network post types + captions (manual or one full-RAG AI call), and
 * the schedule. Edit mode adds archive and delete.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DESK_QUERY_KEY, isArmedTarget, uploadDeskMedia, useArchiveDeskPost, useCreateDeskPost,
  useDeleteDeskMedia, useDeleteDeskPost, useGenerateDeskCaptions, useMetricoolStatus, useUpdateDeskPost,
  type DeskMedia, type DeskPost,
} from '@/hooks/omni/useContentDesk';
import { ComposeMedia } from './ComposeMedia';
import { ComposeTargets, type EditableTarget } from './ComposeTargets';
import { ComposeApprovalBar } from './ComposeApprovalBar';
import { DeskSchedulePicker } from './DeskSchedulePicker';
import { filesToPending, type PendingFile } from './contentConstants';

const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface ComposeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode. */
  post: DeskPost | null;
}

export function ComposeSheet({ open, onOpenChange, post }: ComposeSheetProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [targets, setTargets] = useState<EditableTarget[]>([]);
  const [media, setMedia] = useState<DeskMedia[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const createPost = useCreateDeskPost();
  const updatePost = useUpdateDeskPost();
  const archivePost = useArchiveDeskPost();
  const deletePost = useDeleteDeskPost();
  const deleteMedia = useDeleteDeskMedia();
  const captions = useGenerateDeskCaptions();
  const metricool = useMetricoolStatus();

  const autoAvailable = metricool.data?.configured === true && metricool.data?.brand_selected === true;
  const connectedNetworks = metricool.data?.networks ?? {};
  const hasArmed = (post?.targets ?? []).some(isArmedTarget);

  // Closing without saving must not leak the local preview object URLs.
  useEffect(() => {
    if (open) return;
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, [open]);

  // Seed the form each time the sheet opens (edit snapshot or a clean slate).
  useEffect(() => {
    if (!open) return;
    setTitle(post?.title ?? '');
    setNotes(post?.notes ?? '');
    setScheduledLocal(toLocalInput(post?.scheduled_at ?? null));
    setTargets((post?.targets ?? []).map((t) => ({
      id: t.id, network: t.network, network_label: t.network_label,
      post_type: t.post_type, caption: t.caption, status: t.status,
      publish_mode: t.publish_mode, metricool_post_id: t.metricool_post_id,
      metricool_status: t.metricool_status, sync_error: t.sync_error,
    })));
    setMedia(post?.media ?? []);
    setPending([]);
    setUploadingIds(new Set());
  }, [open, post]);

  const busy = saving || createPost.isPending || updatePost.isPending || captions.isPending;
  const mediaSummary = useMemo(() => {
    const imgs = media.filter((m) => m.kind === 'image').length + pending.filter((p) => p.kind === 'image').length;
    const vids = media.filter((m) => m.kind === 'video').length + pending.filter((p) => p.kind === 'video').length;
    return [imgs > 0 ? `${imgs} image${imgs === 1 ? '' : 's'}` : '', vids > 0 ? `${vids} video${vids === 1 ? '' : 's'}` : '']
      .filter(Boolean).join(' + ') || 'no media yet';
  }, [media, pending]);

  // Published rows are the trail; any Metricool-linked row is armed or live.
  const isRowLocked = (t: EditableTarget) => t.status === 'published' || Boolean(t.metricool_post_id);

  const handleGenerateCaptions = () => {
    const editable = targets.filter((t) => !isRowLocked(t));
    if (editable.length === 0) return;
    captions.mutate(
      {
        title: title.trim(),
        notes: notes.trim(),
        media_summary: mediaSummary,
        targets: editable.map((t) => ({ network: t.network, network_label: t.network_label, post_type: t.post_type })),
      },
      {
        onSuccess: (res) => {
          let cursor = 0;
          setTargets((prev) => prev.map((t) => {
            if (isRowLocked(t)) return t;
            const caption = res.captions[cursor++] ?? t.caption;
            return caption ? { ...t, caption } : t;
          }));
          toast.success(`Captions grounded in ${res.retrieval.brain_chunks} knowledge chunks + ${res.retrieval.heart_rules} Heart rules.`);
        },
      },
    );
  };

  const uploadQueued = async (postId: string) => {
    for (const p of pending) {
      setUploadingIds((prev) => new Set(prev).add(p.id));
      try {
        await uploadDeskMedia(postId, p.file);
        URL.revokeObjectURL(p.previewUrl);
        setPending((prev) => prev.filter((x) => x.id !== p.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Could not upload ${p.file.name}`);
      } finally {
        setUploadingIds((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Give the post a title.');
      return;
    }
    setSaving(true);
    try {
      const scheduledAt = scheduledLocal ? new Date(scheduledLocal).toISOString() : null;
      // Published rows are the trail; armed rows live in Metricool - the edge
      // preserves both, so the payload carries only the editable rows.
      const targetsPayload = targets
        .filter((t) => !isRowLocked(t))
        .map((t) => ({
          network: t.network, network_label: t.network_label, post_type: t.post_type,
          caption: t.caption, publish_mode: t.publish_mode,
        }));
      if (post) {
        await updatePost.mutateAsync({
          post_id: post.id, title: title.trim(), notes: notes.trim() || null,
          scheduled_at: scheduledAt, targets: targetsPayload,
        });
        await uploadQueued(post.id);
      } else {
        const created = await createPost.mutateAsync({
          title: title.trim(), notes: notes.trim() || undefined,
          scheduled_at: scheduledAt, targets: targetsPayload,
        });
        await uploadQueued(created.id);
      }
      // The mutations invalidate on THEIR success, which lands before the
      // uploads run - refresh once more so freshly-registered media shows up.
      await queryClient.invalidateQueries({ queryKey: DESK_QUERY_KEY });
      toast.success(post ? 'Post updated.' : 'Post staged.');
      onOpenChange(false);
    } catch {
      // Mutation hooks already toast their errors.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base">{post ? 'Edit post' : 'Stage a post'}</SheetTitle>
          <SheetDescription className="text-xs">
            Media, captions per destination, and a schedule. After approval, Auto destinations publish themselves via
            Metricool; Manual ones go to the Publish Queue.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="compose-title">Title</Label>
            <Input id="compose-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal name for this post" disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compose-notes">Notes <span className="font-normal text-muted-foreground">(optional — also grounds the AI captions)</span></Label>
            <Textarea id="compose-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What is this content about? Campaign, angle, key message…" rows={2} disabled={busy} className="resize-none" />
          </div>

          <ComposeMedia
            media={media}
            pending={pending}
            uploadingIds={uploadingIds}
            disabled={busy}
            onAddFiles={(files) => setPending((prev) => [...prev, ...filesToPending(files, media.length + prev.length, (msg) => toast.warning(msg))])}
            onRemovePending={(id) => setPending((prev) => prev.filter((p) => p.id !== id))}
            onDeleteMedia={(mediaId) => {
              deleteMedia.mutate(mediaId, {
                onSuccess: () => setMedia((prev) => prev.filter((m) => m.id !== mediaId)),
              });
            }}
          />

          <ComposeTargets
            targets={targets}
            onChange={setTargets}
            onGenerateCaptions={handleGenerateCaptions}
            generating={captions.isPending}
            disabled={busy}
            autoAvailable={autoAvailable}
            connectedNetworks={connectedNetworks}
          />

          <div className="space-y-1.5">
            <Label>Publish on <span className="font-normal text-muted-foreground">(date + hour; empty = draft)</span></Label>
            <DeskSchedulePicker
              value={scheduledLocal}
              onChange={setScheduledLocal}
              disabled={busy || hasArmed}
            />
            {hasArmed && (
              <p className="text-[11px] text-muted-foreground">
                Armed for auto-publish - revert the approval to reschedule.
              </p>
            )}
          </div>

          {post && (
            <ComposeApprovalBar post={post} disabled={busy} onDone={() => onOpenChange(false)} />
          )}

          {post && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => archivePost.mutate(
                  { post_id: post.id, unarchive: post.status === 'archived' },
                  { onSuccess: () => onOpenChange(false) },
                )}
                disabled={busy || archivePost.isPending}
                className="h-8 cursor-pointer gap-1.5 text-xs"
              >
                {post.status === 'archived' ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {post.status === 'archived' ? 'Unarchive' : 'Archive'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={busy || deletePost.isPending} className="h-8 cursor-pointer gap-1.5 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The post, its destinations, and its uploaded media files are removed. Anything already
                      published on a network stays live there — only the record here is deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePost.mutate(post.id, { onSuccess: () => onOpenChange(false) })}
                      className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete post
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy} className="h-8 cursor-pointer text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={busy || !title.trim()}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {post ? 'Save changes' : 'Stage the post'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
