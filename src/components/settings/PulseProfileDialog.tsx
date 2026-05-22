"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ExternalLink, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePulseProfileAnalytics,
  type PulseAccount,
  type PulsePlatformAnalytics,
} from '@/hooks/usePulseSettings';
import { platformLabel, platformColor, initials, formatMetric, formatDate } from './pulsePlatforms';

interface PulseProfileDialogProps {
  profile: PulseAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METRICS: Array<{ key: keyof PulsePlatformAnalytics; label: string }> = [
  { key: 'followers', label: 'Followers' },
  { key: 'reach', label: 'Reach' },
  { key: 'views', label: 'Views' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'profileViews', label: 'Profile Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
];

export function PulseProfileDialog({ profile, open, onOpenChange }: PulseProfileDialogProps) {
  const accounts = profile?.accounts ?? [];
  const platforms = accounts.map((a) => a.platform);

  const { data: analytics, isLoading, isError } = usePulseProfileAnalytics(
    profile?.username ?? null,
    platforms,
    open,
  );

  const created = formatDate(profile?.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-rose-500" />
            {profile?.username ?? 'Profile'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {accounts.length} connected {accounts.length === 1 ? 'account' : 'accounts'}
            {created ? ` · created ${created}` : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh] px-6 pb-6">
          {/* Connected accounts */}
          <section className="space-y-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Accounts
            </p>
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No connected accounts on this profile.</p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.platform} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                  <Avatar className="h-11 w-11 shrink-0">
                    {acc.image && <AvatarImage src={acc.image} alt={acc.displayName || acc.platform} />}
                    <AvatarFallback className="text-xs">{initials(acc.displayName || acc.handle || acc.platform)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{acc.displayName || acc.handle || '—'}</p>
                    {acc.handle && <p className="truncate text-[11px] text-muted-foreground">@{acc.handle}</p>}
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', platformColor(acc.platform))}>
                    {platformLabel(acc.platform)}
                  </span>
                  {acc.image && (
                    <a
                      href={acc.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${platformLabel(acc.platform)} profile picture in a new tab`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))
            )}
          </section>

          {/* Analytics */}
          <section className="space-y-2 pt-5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <p className="text-xs text-muted-foreground py-2">Analytics unavailable for this profile right now.</p>
            ) : analytics && Object.keys(analytics).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics).map(([platform, stats]) => {
                  const present = METRICS.filter((m) => typeof stats?.[m.key] === 'number');
                  return (
                    <div key={platform} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', platformColor(platform))}>
                          {platformLabel(platform)}
                        </span>
                      </div>
                      {present.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No metrics reported.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {present.map((m) => (
                            <div key={String(m.key)} className="rounded-md bg-muted/40 p-2 text-center">
                              <p className="text-sm font-semibold tabular-nums">{formatMetric(stats[m.key] as number)}</p>
                              <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No analytics data available.</p>
            )}
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
