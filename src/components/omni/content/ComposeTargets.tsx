"use client";

/**
 * Compose - destinations: toggle networks (the six + Other), then per
 * destination pick the POST TYPE, the LANE (Auto via Metricool / Manual
 * queue), and write or AI-generate the caption. Published destinations are
 * the publish trail; ARMED destinations (live in Metricool) render locked -
 * revert the approval to change them. One full-RAG call writes all captions.
 */

import { CheckCircle2, Loader2, Lock, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DESK_NETWORKS, METRICOOL_STATUS_META, getDeskNetwork } from './contentConstants';

export interface EditableTarget {
  /** Set for targets that already exist server-side. */
  id?: string;
  network: string;
  network_label: string | null;
  post_type: string;
  caption: string;
  status: 'scheduled' | 'published';
  publish_mode: 'auto' | 'manual';
  metricool_post_id?: string | null;
  metricool_status?: string | null;
  sync_error?: string | null;
}

const isArmed = (t: EditableTarget) => Boolean(t.metricool_post_id) && t.status !== 'published';

interface ComposeTargetsProps {
  targets: EditableTarget[];
  onChange: (targets: EditableTarget[]) => void;
  onGenerateCaptions: () => void;
  generating: boolean;
  disabled?: boolean;
  /** Metricool connected + brand picked -> the Auto lane is available. */
  autoAvailable: boolean;
  /** Networks connected on the Metricool brand (auto actually works there). */
  connectedNetworks: Record<string, string>;
}

export function ComposeTargets({ targets, onChange, onGenerateCaptions, generating, disabled, autoAvailable, connectedNetworks }: ComposeTargetsProps) {
  const toggleNetwork = (network: string) => {
    const existing = targets.find((t) => t.network === network);
    if (existing) {
      if (existing.status === 'published' || isArmed(existing)) return; // trail / armed rows are immutable here
      onChange(targets.filter((t) => t.network !== network));
      return;
    }
    const def = getDeskNetwork(network);
    const autoDefault = autoAvailable && network !== 'other' && Boolean(connectedNetworks[network]);
    onChange([
      ...targets,
      {
        network, network_label: null, post_type: def.postTypes[0] ?? '', caption: '',
        status: 'scheduled', publish_mode: autoDefault ? 'auto' : 'manual',
      },
    ]);
  };

  const patch = (index: number, p: Partial<EditableTarget>) => {
    onChange(targets.map((t, i) => (i === index ? { ...t, ...p } : t)));
  };

  const editable = targets.filter((t) => t.status !== 'published' && !isArmed(t));

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Destinations</p>
        {editable.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateCaptions}
            disabled={disabled || generating}
            className="h-7 cursor-pointer gap-1.5 text-xs text-fuchsia-600 transition-colors duration-200 hover:text-fuchsia-500 [[data-omni-theme=dark]_&]:text-fuchsia-400 [[data-omni-theme=dark]_&]:hover:text-fuchsia-300"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? 'Writing captions…' : 'Generate captions with AI'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Networks">
        {DESK_NETWORKS.map((n) => {
          const Icon = n.icon;
          const row = targets.find((t) => t.network === n.id);
          const locked = row ? row.status === 'published' || isArmed(row) : false;
          return (
            <button
              key={n.id}
              type="button"
              aria-pressed={Boolean(row)}
              onClick={() => toggleNetwork(n.id)}
              disabled={disabled || locked}
              title={locked ? 'Published or armed - locked' : undefined}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                row
                  ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-700 [[data-omni-theme=dark]_&]:text-fuchsia-300'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-fuchsia-500/30 hover:text-foreground',
                locked && 'cursor-not-allowed opacity-70',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', n.accent)} />
              {n.label}
            </button>
          );
        })}
      </div>

      {targets.length === 0 && (
        <p className="text-xs text-muted-foreground">Pick at least one network to define where this post goes.</p>
      )}
      {!autoAvailable && targets.some((t) => t.network !== 'other') && (
        <p className="text-[11px] text-muted-foreground">
          Connect Metricool (Content hub, Connections) to unlock the Auto lane - until then everything runs through the manual Publish Queue.
        </p>
      )}

      {targets.map((t, i) => {
        const net = getDeskNetwork(t.network);
        const Icon = net.icon;
        const published = t.status === 'published';
        const armed = isArmed(t);
        const rowLocked = published || armed;
        const mcMeta = t.metricool_status ? METRICOOL_STATUS_META[t.metricool_status] : undefined;
        const canAuto = autoAvailable && t.network !== 'other' && Boolean(connectedNetworks[t.network]);
        return (
          <div key={`${t.network}-${t.id ?? i}`} className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className={cn('h-3.5 w-3.5', net.accent)} />
                {t.network === 'other' ? (t.network_label || 'Other') : net.label}
              </span>
              {published ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Published
                </span>
              ) : armed ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300">
                  <Lock className="h-3 w-3" /> Armed in Metricool
                </span>
              ) : t.network === 'other' ? (
                <>
                  <Input
                    value={t.network_label ?? ''}
                    onChange={(e) => patch(i, { network_label: e.target.value })}
                    placeholder="Network name (e.g. LinkedIn)"
                    aria-label="Custom network name"
                    disabled={disabled}
                    className="h-7 w-[160px] text-xs"
                  />
                  <Input
                    value={t.post_type}
                    onChange={(e) => patch(i, { post_type: e.target.value })}
                    placeholder="Post type"
                    aria-label="Custom post type"
                    disabled={disabled}
                    className="h-7 w-[130px] text-xs"
                  />
                </>
              ) : (
                <Select value={t.post_type} onValueChange={(v) => patch(i, { post_type: v })} disabled={disabled}>
                  <SelectTrigger className="h-7 w-[150px] cursor-pointer text-xs" aria-label={`${net.label} post type`}>
                    <SelectValue placeholder="Post type" />
                  </SelectTrigger>
                  <SelectContent>
                    {net.postTypes.map((pt) => (
                      <SelectItem key={pt} value={pt} className="text-xs">{pt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!rowLocked && t.network !== 'other' && (
                <div className="ml-auto flex items-center rounded-full border border-border bg-background/60 p-0.5" role="group" aria-label={`${net.label} publish lane`}>
                  <button
                    type="button"
                    aria-pressed={t.publish_mode === 'auto'}
                    disabled={disabled || !canAuto}
                    onClick={() => patch(i, { publish_mode: 'auto' })}
                    title={canAuto ? 'Publishes itself via Metricool at the scheduled time' : 'Needs Metricool + this network connected on the brand'}
                    className={cn(
                      'flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      t.publish_mode === 'auto'
                        ? 'bg-cyan-500/15 text-cyan-700 [[data-omni-theme=dark]_&]:text-cyan-300'
                        : 'text-muted-foreground hover:text-foreground',
                      !canAuto && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Zap className="h-2.5 w-2.5" /> Auto
                  </button>
                  <button
                    type="button"
                    aria-pressed={t.publish_mode === 'manual'}
                    disabled={disabled}
                    onClick={() => patch(i, { publish_mode: 'manual' })}
                    title="A teammate downloads the asset and posts it manually from the Queue"
                    className={cn(
                      'cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      t.publish_mode === 'manual'
                        ? 'bg-fuchsia-500/15 text-fuchsia-700 [[data-omni-theme=dark]_&]:text-fuchsia-300'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Manual
                  </button>
                </div>
              )}
            </div>
            <Textarea
              value={t.caption}
              onChange={(e) => patch(i, { caption: e.target.value })}
              placeholder={`Caption for ${t.network === 'other' ? (t.network_label || 'this network') : net.label}${t.post_type ? ` (${t.post_type})` : ''}…`}
              aria-label={`Caption for ${net.label}`}
              rows={3}
              disabled={disabled || rowLocked}
              className="resize-none bg-background/60 text-sm"
            />
            {armed && (
              <p className={cn('text-[11px]', mcMeta?.className ?? 'text-muted-foreground')}>
                {mcMeta?.label ?? 'Scheduled in Metricool'}
                {t.sync_error ? ` - ${t.sync_error}` : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
