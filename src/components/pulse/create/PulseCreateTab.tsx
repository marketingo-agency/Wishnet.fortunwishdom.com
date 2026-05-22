"use client";

import { useState } from 'react';
import { PenSquare, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseComposer } from './PulseComposer';
import { PulseBulkGenerator } from './PulseBulkGenerator';

type CreateMode = 'single' | 'bulk';

const MODES: Array<{ value: CreateMode; label: string; icon: typeof PenSquare }> = [
  { value: 'single', label: 'Single post', icon: PenSquare },
  { value: 'bulk', label: 'Bulk generate', icon: Layers },
];

export function PulseCreateTab() {
  const [mode, setMode] = useState<CreateMode>('single');

  return (
    <div>
      <div className="flex justify-center gap-1 border-b p-3">
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5" role="tablist" aria-label="Create mode">
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                  active ? 'bg-card text-pink-600 shadow-sm dark:text-pink-300' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {mode === 'single' ? <PulseComposer /> : <PulseBulkGenerator />}
    </div>
  );
}
