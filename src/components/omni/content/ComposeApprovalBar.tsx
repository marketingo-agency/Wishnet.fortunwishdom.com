"use client";

/**
 * Compose - the approval layer controls. Draft posts are submitted for
 * approval; an approver arms them (Approve = the trigger that pushes every
 * Auto destination to Metricool with autoPublish) or rejects them with a
 * reason; an armed post can be reverted (its Metricool posts are deleted).
 */

import { useState } from 'react';
import { CheckCircle2, Loader2, SendHorizonal, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useApprovePost, useRejectPost, useRevertApproval, useSubmitForApproval,
  type DeskPost,
} from '@/hooks/omni/useContentDesk';

interface ComposeApprovalBarProps {
  post: DeskPost;
  disabled?: boolean;
  /** Close the sheet after an action (the snapshot is stale afterwards). */
  onDone: () => void;
}

export function ComposeApprovalBar({ post, disabled, onDone }: ComposeApprovalBarProps) {
  const submit = useSubmitForApproval();
  const approve = useApprovePost();
  const reject = useRejectPost();
  const revert = useRevertApproval();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const busy = disabled || submit.isPending || approve.isPending || reject.isPending || revert.isPending;
  const canSubmit = post.status === 'draft' || post.status === 'scheduled';
  const canDecide = post.status === 'pending_approval';
  const canRevert = post.status === 'approved';
  if (!canSubmit && !canDecide && !canRevert) return null;

  const handleApprove = () => {
    approve.mutate(post.id, {
      onSuccess: (res) => {
        if (res.failures.length > 0) {
          toast.warning(`Approved. ${res.pushed} armed, ${res.failures.length} failed: ${res.failures.map((f) => f.network).join(', ')}. Re-approve to retry.`);
        } else if (res.pushed > 0) {
          toast.success(`Approved. ${res.pushed} destination${res.pushed === 1 ? '' : 's'} armed in Metricool${res.demoted > 0 ? `, ${res.demoted} moved to the manual queue` : ''}.`);
        } else {
          toast.success('Approved. Manual destinations are waiting in the Publish Queue.');
        }
        onDone();
      },
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Approval
      </p>
      {post.rejected_reason && (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-xs text-rose-700 [[data-omni-theme=dark]_&]:text-rose-300">
          Rejected: {post.rejected_reason}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {canSubmit && (
          <Button
            type="button"
            size="sm"
            onClick={() => submit.mutate(post.id, { onSuccess: onDone })}
            disabled={busy}
            className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-xs text-white transition-all duration-300 hover:opacity-90"
          >
            {submit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
            Submit for approval
          </Button>
        )}
        {canDecide && !rejecting && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={busy}
              className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-xs text-white transition-all duration-300 hover:opacity-90"
            >
              {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve &amp; arm auto-publish
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="h-8 cursor-pointer gap-1.5 text-xs text-destructive hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </>
        )}
        {canDecide && rejecting && (
          <span className="flex flex-wrap items-center gap-1.5">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why? (optional)"
              aria-label="Rejection reason"
              className="h-8 w-[200px] text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => reject.mutate({ post_id: post.id, reason: reason.trim() || undefined }, { onSuccess: onDone })}
              disabled={busy}
              className="h-8 cursor-pointer bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90"
            >
              {reject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm reject'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={busy} className="h-8 cursor-pointer text-xs text-muted-foreground">
              Cancel
            </Button>
          </span>
        )}
        {canRevert && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => revert.mutate(post.id, { onSuccess: onDone })}
            disabled={busy}
            className="h-8 cursor-pointer gap-1.5 text-xs"
          >
            {revert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            Revert approval (disarm)
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {canSubmit && 'Approval is the safety gate: nothing auto-publishes until an admin approves it.'}
        {canDecide && 'Approving pushes every Auto destination to Metricool, scheduled for the publish time. Manual destinations go to the Queue.'}
        {canRevert && 'Reverting deletes the scheduled posts from Metricool and returns this post to review.'}
      </p>
    </div>
  );
}
