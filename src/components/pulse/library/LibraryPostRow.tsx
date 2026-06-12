"use client";

/**
 * One per-network post variant inside the item Sheet: preview, caption,
 * status badge, and the Post now / Schedule / Unschedule actions.
 */

import { useState } from 'react';
import { AlertCircle, CalendarClock, Loader2, Send, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/settings/pulsePlatforms';
import { isoToLocalInput, localInputToIso } from '@/components/pulse/pulseStatus';
import { NETWORK_META, POST_STATUS_META } from './libraryStatus';
import { usePostNow, useSchedulePost, useUnschedulePost, type ContentLibraryPost } from './useContentLibrary';

interface LibraryPostRowProps {
  post: ContentLibraryPost;
  imageUrl: string | undefined;
}

export function LibraryPostRow({ post, imageUrl }: LibraryPostRowProps) {
  const postNow = usePostNow();
  const schedule = useSchedulePost();
  const unschedule = useUnschedulePost();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(() => isoToLocalInput(post.scheduled_at));

  const isPosted = post.status === 'posted';
  const busy = postNow.isPending || schedule.isPending || unschedule.isPending;

  const submitSchedule = () => {
    const iso = localInputToIso(scheduleValue);
    if (!iso) return;
    schedule.mutate({ postId: post.id, scheduledAt: iso }, { onSuccess: () => setScheduleOpen(false) });
  };

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {imageUrl && (
            <img src={imageUrl} alt={`${NETWORK_META[post.network].label} variant`} className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', NETWORK_META[post.network].pill)}>
              {NETWORK_META[post.network].label}
            </span>
            <Badge className={cn('border-0 px-2 py-0.5 text-[10px] font-semibold', POST_STATUS_META[post.status].badge)}>
              {POST_STATUS_META[post.status].label}
            </Badge>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{post.caption || 'No caption'}</p>
          {post.status === 'scheduled' && post.scheduled_at && (
            <p className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-300">
              <CalendarClock className="h-3 w-3" /> Scheduled for {formatDate(post.scheduled_at)}
            </p>
          )}
          {isPosted && post.posted_at && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-300">Posted {formatDate(post.posted_at)}</p>
          )}
          {post.error && !isPosted && (
            <p className="flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-px h-3 w-3 shrink-0" /> {post.error}
            </p>
          )}
        </div>
      </div>

      {!isPosted && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
          <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" disabled={busy} onClick={() => postNow.mutate(post.id)}>
            {postNow.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Post now
          </Button>
          {scheduleOpen ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                className="h-7 w-[185px] text-xs"
                aria-label="Schedule date and time"
              />
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busy || !scheduleValue} onClick={submitSchedule}>
                {schedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-xs" disabled={busy} onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="h-3 w-3" />
              {post.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
            </Button>
          )}
          {(post.status === 'scheduled' || post.status === 'queued') && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2.5 text-xs text-muted-foreground" disabled={busy} onClick={() => unschedule.mutate(post.id)}>
              {unschedule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
              Back to draft
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
