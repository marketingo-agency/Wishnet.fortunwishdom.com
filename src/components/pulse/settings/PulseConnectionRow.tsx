"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Wifi, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUpdatePulseConnection,
  useResetPulseConnection,
  useTestPulseConnection,
  type PulseConnectionStatusEntry,
  type PulseProviderTestResult,
} from '@/hooks/usePulseConnections';
import type { PulseConnectionProvider } from '@/types/pulse';

export interface ConnectionField {
  key: 'apiKey' | 'metaAppId' | 'metaAppSecret';
  label: string;
  secret: boolean;
  placeholder: string;
}

interface PulseConnectionRowProps {
  provider: PulseConnectionProvider;
  name: string;
  accent: string; // tailwind bg-* for the dot
  note: string;
  fields: ConnectionField[];
  status?: PulseConnectionStatusEntry;
}

export function PulseConnectionRow({ provider, name, accent, note, fields, status }: PulseConnectionRowProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<PulseProviderTestResult | null>(null);

  const update = useUpdatePulseConnection();
  const reset = useResetPulseConnection();
  const test = useTestPulseConnection();

  const configured = status?.configured ?? false;
  const connected = status?.status === 'connected';
  const hasInput = fields.some((f) => (values[f.key] ?? '').trim().length > 0);

  const handleSave = () => {
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (v) payload[f.key] = v;
    }
    update.mutate({ provider, ...payload }, { onSuccess: () => setValues({}) });
  };

  const handleTest = async () => {
    const result = await test.mutateAsync(provider);
    setTestResult(result);
  };

  return (
    <div className="space-y-2.5 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', accent)} aria-hidden="true" />
          <span className="text-sm font-medium">{name}</span>
        </div>
        <Badge
          className={cn(
            'border-0 px-2 py-0.5 text-[10px] font-semibold',
            connected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : configured
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {connected ? 'Connected' : configured ? 'Key Set' : 'Not Configured'}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground">{note}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`${provider}-${field.key}`} className="text-[11px] text-muted-foreground">
              {field.label}
            </Label>
            <div className="relative">
              <Input
                id={`${provider}-${field.key}`}
                type={field.secret && !revealed[field.key] ? 'password' : 'text'}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder={configured ? '•••••••• (set — enter to replace)' : field.placeholder}
                className="h-9 pr-9 text-sm"
                autoComplete="off"
              />
              {field.secret && (
                <button
                  type="button"
                  onClick={() => setRevealed((p) => ({ ...p, [field.key]: !p[field.key] }))}
                  aria-label={revealed[field.key] ? 'Hide' : 'Reveal'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {revealed[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!hasInput || update.isPending} className="h-8 gap-1.5 text-xs">
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleTest} disabled={!configured || test.isPending} className="h-8 gap-1.5 text-xs">
          {test.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
          Test
        </Button>
        {configured && (
          <Button variant="ghost" size="sm" onClick={() => reset.mutate(provider)} disabled={reset.isPending} className="h-8 gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        {testResult && (
          <span className={cn('text-[11px]', testResult.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
            {testResult.connected ? 'Connection verified' : testResult.note ?? testResult.error ?? ''}
          </span>
        )}
      </div>
    </div>
  );
}
