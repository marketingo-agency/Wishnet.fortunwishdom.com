"use client";

/**
 * Connection strip for the Content Library: one chip per network with its
 * live connect state, a credentials dialog for the X / TikTok provider rows,
 * and the manual "Run dispatch now" trigger.
 */

import { useState } from 'react';
import { CheckCircle2, CircleDashed, KeyRound, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LIBRARY_NETWORKS, NETWORK_META } from './libraryStatus';
import { useLibraryConnections, useRunDispatch, useSetConnection } from './useContentLibrary';

const KEYED_PROVIDERS = ['x', 'tiktok'] as const;
type KeyedProvider = (typeof KEYED_PROVIDERS)[number];

export function LibraryConnections() {
  const { data: connections, isLoading } = useLibraryConnections();
  const dispatch = useRunDispatch();
  const setConnection = useSetConnection();

  const [keyDialog, setKeyDialog] = useState<KeyedProvider | null>(null);
  const [keyValue, setKeyValue] = useState('');

  const openKeyDialog = (provider: KeyedProvider) => {
    setKeyValue('');
    setKeyDialog(provider);
  };

  const saveKey = () => {
    if (!keyDialog || !keyValue.trim()) return;
    setConnection.mutate(
      { provider: keyDialog, apiKey: keyValue.trim() },
      { onSuccess: () => setKeyDialog(null) },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">Connections</span>

      {LIBRARY_NETWORKS.map((network) => {
        const status = connections?.[network];
        const connected = status?.connected ?? false;
        const keyed = (KEYED_PROVIDERS as readonly string[]).includes(network);
        return (
          <Tooltip key={network}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={keyed ? () => openKeyDialog(network as KeyedProvider) : undefined}
                disabled={!keyed}
                aria-label={`${NETWORK_META[network].label} connection${keyed ? ': edit credentials' : ''}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  keyed && 'cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                  connected
                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                    : 'border-border text-muted-foreground',
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : connected ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {NETWORK_META[network].label}
                {keyed && <KeyRound className="h-3 w-3 opacity-60" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {status?.detail ?? 'Checking connection state'}
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="ml-auto">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => dispatch.mutate()}
          disabled={dispatch.isPending}
        >
          {dispatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Run dispatch now
        </Button>
      </div>

      <Dialog open={keyDialog !== null} onOpenChange={(open) => !open && setKeyDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {keyDialog ? `${NETWORK_META[keyDialog].label} credentials` : 'Credentials'}
            </DialogTitle>
            <DialogDescription>
              {keyDialog === 'x'
                ? 'Store the X API credentials. Publishing activates once the X developer app (paid tier) is approved.'
                : 'Store the TikTok credentials. Publishing activates once the Content Posting API app is approved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="library-connection-key">API key</Label>
            <Input
              id="library-connection-key"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="Paste the API key"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyDialog(null)}>Cancel</Button>
            <Button onClick={saveKey} disabled={!keyValue.trim() || setConnection.isPending} className="gap-1.5">
              {setConnection.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
