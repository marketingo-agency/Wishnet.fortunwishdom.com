"use client";

import React from 'react';
import { Palette, BrainCircuit, Database, Settings2, Facebook, Instagram, Music, Globe, Maximize2, Minimize2, MoreVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PixelMode = 'facebook' | 'instagram' | 'tiktok' | 'cross_platform';

export const PIXEL_MODES: { value: PixelMode; label: string; icon: React.ReactNode; description: string; comingSoon?: boolean }[] = [
  { value: 'facebook',       label: 'Facebook',       icon: <Facebook className="h-3.5 w-3.5" />,  description: 'Optimized visuals for Facebook posts, ads, and stories' },
  { value: 'instagram',      label: 'Instagram',      icon: <Instagram className="h-3.5 w-3.5" />, description: 'Feed posts, stories, reels, and carousel visuals' },
  { value: 'tiktok',         label: 'TikTok',         icon: <Music className="h-3.5 w-3.5" />,     description: 'Vertical video covers, thumbnails, and ad creatives' },
  { value: 'cross_platform', label: 'Cross Platform', icon: <Globe className="h-3.5 w-3.5" />,     description: 'Create content optimized for multiple platforms at once', comingSoon: true },
];

interface PixelTopBarProps {
  mode: PixelMode;
  onModeChange: (mode: PixelMode) => void;
  onOpenSettings: () => void;
  isConnected: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PixelTopBar({ mode, onModeChange, onOpenSettings, isConnected, isFullscreen, onToggleFullscreen }: PixelTopBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center h-[52px] shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 gap-0">
      {/* Left: Pixel wordmark */}
      <div className="flex items-center gap-2.5 shrink-0 pr-4 border-r border-zinc-700/60 mr-3">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm shadow-pink-500/30">
          <Palette className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white tracking-tight hidden sm:block">Pixel</span>
        <div className={cn(
          'h-1.5 w-1.5 rounded-full',
          isConnected ? 'bg-emerald-500' : 'bg-zinc-500'
        )}>
          {isConnected && <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping opacity-60" />}
        </div>
      </div>

      {/* Center: Mode tabs */}
      <div className="flex items-center flex-1 min-w-0 gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <TooltipProvider>
          {PIXEL_MODES.map((m) => (
            <Tooltip key={m.value} delayDuration={400}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !m.comingSoon && onModeChange(m.value)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3.5 h-[52px] text-xs font-medium transition-all whitespace-nowrap shrink-0 border-b-2 -mb-px',
                    m.comingSoon
                      ? 'text-zinc-600 border-transparent cursor-not-allowed opacity-50'
                      : mode === m.value
                        ? 'text-white border-pink-500 bg-pink-500/8'
                        : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/60'
                  )}
                  disabled={m.comingSoon}
                >
                  <span className="leading-none">{m.icon}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                  {m.comingSoon && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-700 text-zinc-400 leading-none">
                      Soon
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                <p className="font-medium mb-0.5">{m.label}</p>
                <p className="text-zinc-400">{m.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Right: Actions — full on desktop, overflow menu on mobile */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-zinc-700/60 ml-3">
        {/* Desktop: all buttons visible */}
        <div className="hidden sm:flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/mastermind/brain/pixel')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                >
                  <BrainCircuit className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-200">Pixel Knowledge Base</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/mastermind/vector-store')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <Database className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-200">RAG Vector Store</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenSettings}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-200">Pixel Settings</TooltipContent>
            </Tooltip>
            {onToggleFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleFullscreen}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>

        {/* Mobile: settings + overflow menu */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700 text-zinc-200">
              <DropdownMenuItem onClick={() => router.push('/mastermind/brain/pixel')} className="gap-2 text-xs">
                <BrainCircuit className="h-3.5 w-3.5 text-violet-400" /> Knowledge Base
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/mastermind/vector-store')} className="gap-2 text-xs">
                <Database className="h-3.5 w-3.5 text-emerald-400" /> Vector Store
              </DropdownMenuItem>
              {onToggleFullscreen && (
                <DropdownMenuItem onClick={onToggleFullscreen} className="gap-2 text-xs">
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
