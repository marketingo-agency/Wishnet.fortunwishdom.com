"use client";

/**
 * Desk schedule picker: the platform's own date + hour control (replaces the
 * bare browser datetime-local input). Popover with the shadcn Calendar, an
 * hour/minute selector, and a clear-to-draft action. Value stays the local
 * 'yyyy-MM-ddTHH:mm' string the compose sheet already speaks.
 */

import { useMemo, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const pad = (n: number) => String(n).padStart(2, '0');

const toValue = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface DeskSchedulePickerProps {
  /** Local 'yyyy-MM-ddTHH:mm' or '' (draft). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DeskSchedulePicker({ value, onChange, disabled }: DeskSchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Legacy schedules can carry any minute - show the REAL value, never a
  // floored approximation.
  const minuteOptions = useMemo(() => {
    if (!date) return MINUTES;
    const actual = pad(date.getMinutes());
    return MINUTES.includes(actual) ? MINUTES : [...MINUTES, actual].sort();
  }, [date]);

  const setDay = (day: Date | undefined) => {
    if (!day) return;
    const next = new Date(day);
    next.setHours(date?.getHours() ?? 9, date ? date.getMinutes() : 0, 0, 0);
    onChange(toValue(next));
  };

  const setTime = (part: 'h' | 'm', v: string) => {
    const base = date ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; })();
    const next = new Date(base);
    if (part === 'h') next.setHours(Number(v));
    else next.setMinutes(Number(v));
    onChange(toValue(next));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 cursor-pointer justify-start gap-2 text-xs font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarClock className="h-3.5 w-3.5 text-fuchsia-500" />
            {date
              ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
              : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={(day) => { setDay(day ?? undefined); }}
            defaultMonth={date ?? new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1" role="group" aria-label="Publish hour">
        <Select value={date ? pad(date.getHours()) : ''} onValueChange={(v) => setTime('h', v)} disabled={disabled}>
          <SelectTrigger className="h-9 w-[64px] cursor-pointer text-xs" aria-label="Hour">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-[220px]">
            {HOURS.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">:</span>
        <Select value={date ? pad(date.getMinutes()) : ''} onValueChange={(v) => setTime('m', v)} disabled={disabled}>
          <SelectTrigger className="h-9 w-[64px] cursor-pointer text-xs" aria-label="Minutes">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent className="max-h-[220px]">
            {minuteOptions.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {date && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          disabled={disabled}
          className="h-9 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear (keep as draft)
        </Button>
      )}
    </div>
  );
}
