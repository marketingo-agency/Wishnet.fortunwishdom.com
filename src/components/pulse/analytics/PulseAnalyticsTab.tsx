"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePulseAccounts, usePulseProfileAnalytics, type PulsePlatformAnalytics } from '@/hooks/usePulseSettings';
import { platformLabel, platformColor, formatMetric } from '@/components/settings/pulsePlatforms';

/** Dependency-free reach trend (recharts was removed in the audit). */
function ReachSparkline({ data }: { data: Array<{ date: string; value: number }> }) {
  const w = 600;
  const h = 120;
  const pad = 6;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((d.value - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Reach trend">
      <polyline points={points} fill="none" stroke="#ec4899" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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

export function PulseAnalyticsTab() {
  const { data: accounts } = usePulseAccounts(true);
  const [profile, setProfile] = useState<string>('');

  useEffect(() => {
    if (!profile && accounts && accounts.length > 0) setProfile(accounts[0].username);
  }, [accounts, profile]);

  const platforms = useMemo(() => {
    const acc = accounts?.find((a) => a.username === profile);
    return (acc?.accounts ?? []).map((x) => x.platform);
  }, [accounts, profile]);

  const { data: analytics, isLoading, isError } = usePulseProfileAnalytics(profile || null, platforms, !!profile);

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><BarChart3 className="h-6 w-6 text-muted-foreground" /></div>
        <div>
          <p className="text-sm font-medium">No connected profiles</p>
          <p className="text-xs text-muted-foreground">Connect upload-post in Settings to see analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Performance</h2>
        <Select value={profile} onValueChange={setProfile}>
          <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue placeholder="Select a profile" /></SelectTrigger>
          <SelectContent>
            {accounts.map((a) => <SelectItem key={a.username} value={a.username} className="text-sm">{a.username}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Analytics unavailable for this profile right now.</p>
      ) : analytics && Object.keys(analytics).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(analytics).map(([platform, stats]) => {
            const present = METRICS.filter((m) => typeof stats?.[m.key] === 'number');
            const series = Array.isArray(stats?.reach_timeseries) ? stats.reach_timeseries : [];
            return (
              <Card key={platform} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', platformColor(platform))}>{platformLabel(platform)}</span>
                    <CardTitle className="text-sm">{platformLabel(platform)} performance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {present.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {present.map((m) => (
                        <div key={String(m.key)} className="rounded-lg bg-muted/40 p-2.5 text-center">
                          <p className="text-base font-semibold tabular-nums">{formatMetric(stats[m.key] as number)}</p>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No metrics reported for this platform.</p>
                  )}

                  {series.length > 1 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><TrendingUp className="h-3 w-3" /> Reach · last {series.length} days</p>
                      <ReachSparkline data={series} />
                      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                        <span>{series[0]?.date}</span>
                        <span>{series[series.length - 1]?.date}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">No analytics data available yet.</p>
      )}
    </div>
  );
}
