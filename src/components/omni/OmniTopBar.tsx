"use client";

/**
 * OmniTopBar: wordmark, connection dot, and workspace controls
 * (home, vector store, theme toggle, fullscreen), mirroring the Pixel top bar.
 */

import { useRouter } from 'next/navigation';
import {
  Orbit,
  Home,
  Database,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OmniTopBarProps {
  isConnected: boolean;
  showHome: boolean;
  onHome: () => void;
  omniTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

interface TopBarActionProps {
  label: string;
  onClick: () => void;
  hoverClass: string;
  children: React.ReactNode;
}

const TopBarAction = ({ label, onClick, hoverClass, children }: TopBarActionProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-label={label}
        className={cn('h-8 w-8 min-h-[44px] min-w-[44px] cursor-pointer transition-colors duration-200', hoverClass)}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export function OmniTopBar({
  isConnected,
  showHome,
  onHome,
  omniTheme,
  onToggleTheme,
  isFullscreen,
  onToggleFullscreen,
}: OmniTopBarProps) {
  const router = useRouter();

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-3 sm:px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/20">
          <Orbit className="h-4.5 w-4.5 h-[18px] w-[18px] text-white" />
        </div>
        <span className="hidden text-sm font-semibold tracking-wide sm:block">Omni</span>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {isConnected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40',
            )}
          />
        </span>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        {showHome && (
          <TopBarAction label="Omni Home" onClick={onHome} hoverClass="hover:text-cyan-400">
            <Home className="h-4 w-4" />
          </TopBarAction>
        )}
        <TopBarAction
          label="RAG Vector Store"
          onClick={() => router.push('/mastermind/vector-store')}
          hoverClass="hover:text-emerald-400"
        >
          <Database className="h-4 w-4" />
        </TopBarAction>
        <TopBarAction label="Toggle Page Theme" onClick={onToggleTheme} hoverClass="hover:text-amber-400">
          {omniTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </TopBarAction>
        <TopBarAction
          label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
          onClick={onToggleFullscreen}
          hoverClass="hover:text-violet-400"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </TopBarAction>
      </div>
    </header>
  );
}
