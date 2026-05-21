"use client";

import { Palette, BrainCircuit, Database, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PixelHeaderProps {
  mode: string;
  isConnected: boolean;
  complianceStatus?: string;
  brainCount?: number;
  heartCount?: number;
}

const MODE_CONFIG: Record<string, { label: string; emoji: string; colorClass: string; description: string }> = {
  cross_platform: { label: 'Cross Platform', emoji: '🌐', colorClass: 'bg-pink-500/10 text-pink-600 border-pink-500/25 dark:text-pink-400', description: 'Create content optimized for multiple platforms at once' },
  facebook:       { label: 'Facebook',       emoji: '📘', colorClass: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400', description: 'Optimized visuals for Facebook posts, ads, and stories' },
  instagram:      { label: 'Instagram',      emoji: '📸', colorClass: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/25 dark:text-fuchsia-400', description: 'Feed posts, stories, reels, and carousel visuals' },
  tiktok:         { label: 'TikTok',         emoji: '🎵', colorClass: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400', description: 'Vertical video covers, thumbnails, and ad creatives' },
};

export function PixelHeader({ mode, isConnected, complianceStatus, brainCount, heartCount }: PixelHeaderProps) {
  const router = useRouter();
  const modeInfo = MODE_CONFIG[mode] || MODE_CONFIG.quick_create;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 mb-6 bg-gradient-to-r from-pink-500/5 via-rose-500/5 to-transparent bg-card rounded-2xl border border-border shadow-sm">
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Palette className="h-8 w-8 text-white" />
          </div>
          <div className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card flex items-center justify-center',
            isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}>
            {isConnected && (
              <span className="absolute h-full w-full rounded-full bg-emerald-400 animate-ping opacity-60" />
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">Pixel</h1>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger className="focus:outline-none">
                  <Badge className={cn('text-xs px-2.5 py-0.5 border font-medium cursor-pointer', modeInfo.colorClass)}>
                    {modeInfo.emoji} {modeInfo.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-center text-xs">
                  {modeInfo.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">Visual Creator AI · Powered by MasterMind</p>
        </div>
      </div>

      {/* Right: Status badges + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 text-xs px-2.5 py-1 border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Connected&nbsp;to MasterMind
        </Badge>

        {brainCount !== undefined && brainCount > 0 && (
          <Badge variant="outline" className="gap-1.5 text-xs px-2.5 py-1 border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-400">
            <BrainCircuit className="h-3 w-3" />
            {brainCount} chunks
          </Badge>
        )}

        {complianceStatus && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 text-xs px-2.5 py-1',
              complianceStatus === 'pass' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
              complianceStatus === 'adjusted' && 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              complianceStatus === 'refused' && 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400',
            )}
          >
            <Zap className="h-3 w-3" />
            {complianceStatus === 'pass' ? 'Compliant' : complianceStatus === 'adjusted' ? 'Adjusted' : 'Refused'}
          </Badge>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/mastermind/brain/pixel')}
                className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-violet-50 hover:border-violet-200"
              >
                <BrainCircuit className="w-4 h-4 text-violet-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pixel Knowledge Base</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/mastermind/vector-store')}
                className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-emerald-50 hover:border-emerald-200"
              >
                <Database className="w-4 h-4 text-emerald-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>RAG Vector Store</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
