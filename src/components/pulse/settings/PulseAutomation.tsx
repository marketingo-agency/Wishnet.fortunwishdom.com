"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Bot, ShieldCheck, Zap, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePulseWorkspaceSettings,
  useUpdatePulseWorkspaceSettings,
} from '@/hooks/usePulseWorkspaceSettings';
import type { PulseReplyMode } from '@/types/pulse';

const MODES: Array<{ value: PulseReplyMode; label: string; description: string; icon: typeof Hand }> = [
  { value: 'manual', label: 'Manual', description: 'AI drafts; you approve & send every reply.', icon: Hand },
  { value: 'semi', label: 'Semi-auto', description: 'Auto-send safe replies; flag the rest for review.', icon: ShieldCheck },
  { value: 'auto', label: 'Full-auto', description: 'AI replies automatically within the guardrails.', icon: Zap },
];

export function PulseAutomation() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = usePulseWorkspaceSettings(isAdmin === true);
  const updateSettings = useUpdatePulseWorkspaceSettings();

  const [mode, setMode] = useState<PulseReplyMode>('manual');
  const [dailyCap, setDailyCap] = useState(50);

  useEffect(() => {
    if (!data) return;
    setMode((data.reply_mode as PulseReplyMode) ?? 'manual');
    setDailyCap(typeof data.daily_dm_cap === 'number' ? data.daily_dm_cap : 50);
  }, [data]);

  const handleSave = () => {
    updateSettings.mutate({ reply_mode: mode, daily_dm_cap: Math.max(0, Math.min(1000, dailyCap)) });
  };

  if (!isAdmin) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm">Reply Automation</CardTitle>
        </div>
        <CardDescription className="text-xs">
          How aggressively Pulse handles incoming comments & DMs. Switch any time — changes apply immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Reply mode">
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1',
                      active
                        ? 'border-pink-500/40 bg-pink-500/10'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <m.icon className={cn('h-4 w-4', active ? 'text-pink-600 dark:text-pink-300' : 'text-muted-foreground')} />
                      <span className={cn('text-sm font-medium', active && 'text-pink-700 dark:text-pink-300')}>{m.label}</span>
                    </div>
                    <span className="text-[11px] leading-snug text-muted-foreground">{m.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pulse-daily-cap" className="text-xs font-medium">Daily DM cap (per profile)</Label>
              <Input
                id="pulse-daily-cap"
                type="number"
                min={0}
                max={1000}
                value={dailyCap}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDailyCap(Number.isFinite(n) ? n : 0);
                }}
                className="h-9 w-32 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Respects Instagram limits — Pulse stops sending once the cap is hit.</p>
            </div>

            <div className="flex justify-end border-t pt-3">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
                {updateSettings.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Automation
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
