"use client";

/**
 * "Plan in Publishing Desk": one click takes finished Omni media (image or
 * video assets) into a draft Desk post and jumps straight into the Desk with
 * the compose open - captions, destinations, schedule, and approval from
 * there. Reused across the Images/Videos/Audios surfaces and History.
 */

import { useState } from 'react';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { callOmniContent } from '@/lib/omniApi';

interface SendToDeskButtonProps {
  /** Finished omni_assets ids (images or videos), max 10. */
  assetIds: string[];
  /** Prefills the draft post title (e.g. the run title). */
  title?: string;
  size?: 'sm' | 'xs';
  variant?: 'outline' | 'ghost';
  className?: string;
}

export function SendToDeskButton({ assetIds, title, size = 'sm', variant = 'outline', className }: SendToDeskButtonProps) {
  const [busy, setBusy] = useState(false);
  if (assetIds.length === 0) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await callOmniContent<{ success: boolean; post_id: string; imported: number; failures: string[] }>(
        'import-assets',
        { asset_ids: assetIds.slice(0, 10), ...(title ? { title } : {}) },
      );
      if (res.failures.length > 0) {
        toast.warning(`${res.imported} file${res.imported === 1 ? '' : 's'} planned; some failed: ${res.failures.join('; ')}`);
      } else {
        toast.success(`${res.imported} file${res.imported === 1 ? '' : 's'} planned in the Publishing Desk.`);
      }
      // Cross-hub jump: a full navigation guarantees the Desk mounts fresh
      // and opens the compose on the new draft.
      window.location.assign(`/ai-agents/omni?track=content&mode=publishing_desk&post=${res.post_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not plan this in the Publishing Desk');
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={(e) => void handleClick(e)}
      disabled={busy}
      className={cn(
        'cursor-pointer gap-1.5 text-fuchsia-600 transition-colors duration-200 hover:text-fuchsia-500',
        '[[data-omni-theme=dark]_&]:text-fuchsia-400 [[data-omni-theme=dark]_&]:hover:text-fuchsia-300',
        size === 'xs' ? 'h-7 px-2 text-[11px]' : 'h-8 text-xs',
        className,
      )}
    >
      {busy ? <Loader2 className={size === 'xs' ? 'h-3 w-3 animate-spin' : 'h-3.5 w-3.5 animate-spin'} /> : <CalendarPlus className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {busy ? 'Planning…' : 'Plan in Publishing Desk'}
    </Button>
  );
}
