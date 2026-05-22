"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Loader2, Plus, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePulseQueueSettings,
  useUpdatePulseQueueSettings,
  type PulseTimeSlot,
} from '@/hooks/usePulseSettings';

const MAX_SLOTS = 24;

// upload-post encodes days as 0=Monday … 6=Sunday.
const DAYS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const pad = (n: number) => String(n).padStart(2, '0');
const slotToTime = (s: PulseTimeSlot) => `${pad(s.hour)}:${pad(s.minute)}`;
const timeToSlot = (t: string): PulseTimeSlot => {
  const [h, m] = t.split(':').map((v) => parseInt(v, 10));
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
};

interface PulseQueueSettingsProps {
  enabled: boolean;
}

export function PulseQueueSettings({ enabled }: PulseQueueSettingsProps) {
  const { data, isLoading } = usePulseQueueSettings(enabled);
  const updateQueue = useUpdatePulseQueueSettings();

  const [timezone, setTimezone] = useState('UTC');
  const [days, setDays] = useState<number[]>([]);
  const [slots, setSlots] = useState<PulseTimeSlot[]>([]);

  // Seed local state from the fetched settings once they arrive.
  useEffect(() => {
    if (!data) return;
    setTimezone(data.timezone ?? 'UTC');
    setDays(Array.isArray(data.days) ? data.days : []);
    setSlots(Array.isArray(data.slots) ? data.slots : []);
  }, [data]);

  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  const toggleDay = (value: number) =>
    setDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b),
    );

  const updateSlot = (index: number, time: string) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? timeToSlot(time) : s)));

  const removeSlot = (index: number) => setSlots((prev) => prev.filter((_, i) => i !== index));

  const addSlot = () =>
    setSlots((prev) => (prev.length >= MAX_SLOTS ? prev : [...prev, { hour: 9, minute: 0 }]));

  const handleSave = () => {
    const sortedSlots = [...slots].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
    updateQueue.mutate({ timezone, days: [...days].sort((a, b) => a - b), slots: sortedSlots });
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm">Posting Schedule</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Queue time slots and days that upload-post.com uses to auto-publish scheduled posts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Connect and test the connection to manage the posting schedule.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="pulse-timezone" className="text-xs font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="pulse-timezone" className="h-9 text-sm">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-sm">{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Days */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Posting Days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => {
                  const active = days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      aria-pressed={active}
                      className={cn(
                        'h-8 min-w-[3rem] rounded-md border px-2 text-xs font-medium transition-colors cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1',
                        active
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60',
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Time Slots</Label>
                <span className="text-[10px] text-muted-foreground">{slots.length}/{MAX_SLOTS}</span>
              </div>
              {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No time slots yet — add one below.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1">
                      <input
                        type="time"
                        value={slotToTime(slot)}
                        onChange={(e) => updateSlot(i, e.target.value)}
                        aria-label={`Time slot ${i + 1}`}
                        className="bg-transparent text-xs outline-none [color-scheme:light] dark:[color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        aria-label={`Remove time slot ${i + 1}`}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={addSlot}
                disabled={slots.length >= MAX_SLOTS}
                className="mt-1 h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add time slot
              </Button>
            </div>

            {/* Save */}
            <div className="flex justify-end border-t pt-3">
              <Button size="sm" onClick={handleSave} disabled={updateQueue.isPending} className="gap-2">
                {updateQueue.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Schedule
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
