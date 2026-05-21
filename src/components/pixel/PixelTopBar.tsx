"use client";

import React from 'react';
import { Palette, BrainCircuit, Database, Settings2, Facebook, Instagram, Music, Globe, Maximize2, Minimize2, MoreVertical, Sun, Moon, Package } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PixelMode = 'facebook' | 'instagram' | 'tiktok' | 'cross_platform';

// eslint-disable-next-line react-refresh/only-export-components -- mode config co-located with top bar component
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
  pixelTheme?: 'light' | 'dark';
  onTogglePixelTheme?: () => void;
}

export function PixelTopBar({ mode, onModeChange, onOpenSettings, isConnected, isFullscreen, onToggleFullscreen, pixelTheme, onTogglePixelTheme }: PixelTopBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center h-[52px] shrink-0 border-b border-border bg-background px-4 gap-0">
      {/* Left: Pixel wordmark */}
      <div className="flex items-center gap-2.5 shrink-0 pr-4 border-r border-border/60 mr-3">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm shadow-pink-500/30">
          <Palette className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight hidden sm:block">Pixel</span>
        <div className={cn(
          'h-1.5 w-1.5 rounded-full',
          isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
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
                      ? 'text-muted-foreground/60 border-transparent cursor-not-allowed opacity-50'
                      : mode === m.value
                        ? 'text-foreground border-pink-500 bg-pink-500/8'
                        : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60'
                  )}
                  disabled={m.comingSoon}
                >
                  <span className="leading-none">{m.icon}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                  {m.comingSoon && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-muted text-muted-foreground leading-none">
                      Soon
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs bg-muted border-border text-foreground">
                <p className="font-medium mb-0.5">{m.label}</p>
                <p className="text-muted-foreground">{m.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Right: Actions — full on desktop, overflow menu on mobile */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-border/60 ml-3">
        {/* Desktop: all buttons visible */}
        <div className="hidden sm:flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/mastermind/brain/pixel')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                >
                  <BrainCircuit className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">Pixel Knowledge Base</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/mastermind/vector-store')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                >
                  <Database className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">RAG Vector Store</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/wishdom')}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                >
                  <Package className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">Wishdom</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenSettings}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition-all"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">Pixel Settings</TooltipContent>
            </Tooltip>
            {onTogglePixelTheme && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onTogglePixelTheme}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    {pixelTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">Toggle Page Theme</TooltipContent>
              </Tooltip>
            )}
            {onToggleFullscreen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleFullscreen}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs bg-muted border-border text-foreground">
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
            className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition-all"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-muted border-border text-foreground">
              <DropdownMenuItem onClick={() => router.push('/mastermind/brain/pixel')} className="gap-2 text-xs">
                <BrainCircuit className="h-3.5 w-3.5 text-violet-400" /> Knowledge Base
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/mastermind/vector-store')} className="gap-2 text-xs">
                <Database className="h-3.5 w-3.5 text-emerald-400" /> Vector Store
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/wishdom')} className="gap-2 text-xs">
                <Package className="h-3.5 w-3.5 text-amber-400" /> Wishdom
              </DropdownMenuItem>
              {onTogglePixelTheme && (
                <DropdownMenuItem onClick={onTogglePixelTheme} className="gap-2 text-xs">
                  {pixelTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {pixelTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
              )}
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
