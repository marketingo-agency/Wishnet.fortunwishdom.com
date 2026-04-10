import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X, ChevronDown, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { OshaChat } from './OshaChat';
import { useOshaSettings, useOshaMessages, useClearOshaHistory, DEFAULT_OSHA_SETTINGS } from '@/hooks/useOsha';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Color map for accent colors ──────────────────────────────────────────────
const COLOR_MAP: Record<string, {
  from: string; via: string; to: string;
  ring: string; shadow: string; border: string;
}> = {
  sky:     { from: 'from-sky-600',    via: 'via-sky-500',    to: 'to-cyan-400',   ring: 'ring-sky-400',    shadow: '14,165,233',  border: 'border-sky-500'     },
  indigo:  { from: 'from-indigo-600', via: 'via-indigo-500', to: 'to-violet-400', ring: 'ring-indigo-400', shadow: '99,102,241',  border: 'border-indigo-500'  },
  violet:  { from: 'from-violet-600', via: 'via-violet-500', to: 'to-purple-400', ring: 'ring-violet-400', shadow: '139,92,246',  border: 'border-violet-500'  },
  emerald: { from: 'from-emerald-600',via: 'via-emerald-500',to: 'to-teal-400',   ring: 'ring-emerald-400',shadow: '16,185,129',  border: 'border-emerald-500' },
  rose:    { from: 'from-rose-600',   via: 'via-rose-500',   to: 'to-pink-400',   ring: 'ring-rose-400',   shadow: '244,63,94',   border: 'border-rose-500'    },
  amber:   { from: 'from-amber-500',  via: 'via-amber-400',  to: 'to-yellow-300', ring: 'ring-amber-400',  shadow: '245,158,11',  border: 'border-amber-500'   },
};

// ─── Panel size map ────────────────────────────────────────────────────────────
const PANEL_SIZE_MAP: Record<string, string> = {
  compact:  'sm:w-[340px] sm:h-[520px]',
  standard: 'sm:w-[390px] sm:h-[640px]',
  wide:     'sm:w-[460px] sm:h-[720px]',
};

// ─── Button size map ──────────────────────────────────────────────────────────
const BUTTON_SIZE_MAP: Record<string, { container: string; icon: string }> = {
  small:    { container: 'h-11 w-11', icon: 'h-5 w-5' },
  standard: { container: 'h-14 w-14', icon: 'h-6 w-6' },
  large:    { container: 'h-16 w-16', icon: 'h-7 w-7' },
};

// ─── Position maps ─────────────────────────────────────────────────────────────
const BUTTON_POSITION_MAP: Record<string, string> = {
  'bottom-right':  'bottom-safe right-4 sm:right-6',
  'bottom-left':   'bottom-safe left-4 sm:left-6',
  'bottom-center': 'bottom-safe left-1/2 -translate-x-1/2',
};

const PANEL_POSITION_MAP: Record<string, string> = {
  'bottom-right':  'sm:bottom-[88px] sm:right-6',
  'bottom-left':   'sm:bottom-[88px] sm:left-6',
  'bottom-center': 'sm:bottom-[88px] sm:left-1/2 sm:-translate-x-1/2',
};

export function OshaFloatingBubble() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { data: settings = DEFAULT_OSHA_SETTINGS } = useOshaSettings();
  const { data: messages = [], isLoading: isLoadingMessages, refetch } = useOshaMessages();
  const { mutate: clearHistory, isPending: isClearing } = useClearOshaHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevMsgCount = useRef(messages.length);

  const storageKey = `osha_bubble_state_${user?.id}`;

  // Resolve settings with fallbacks
  const accentKey = settings.bubble_accent_color || 'sky';
  const color = COLOR_MAP[accentKey] || COLOR_MAP.sky;
  const panelSizeClass = PANEL_SIZE_MAP[settings.bubble_panel_size || 'standard'] || PANEL_SIZE_MAP.standard;
  const buttonPositionClass = BUTTON_POSITION_MAP[settings.bubble_position || 'bottom-right'] || BUTTON_POSITION_MAP['bottom-right'];
  const panelPositionClass = PANEL_POSITION_MAP[settings.bubble_position || 'bottom-right'] || PANEL_POSITION_MAP['bottom-right'];
  const bubbleName = settings.bubble_name || 'Osha';
  const bubbleSubtitle = settings.bubble_subtitle || 'Fortun Wishnet Assistant · Online';
  const showStatusDot = settings.bubble_show_status_dot !== false;
  const buttonSize = BUTTON_SIZE_MAP[settings.bubble_button_size || 'standard'] || BUTTON_SIZE_MAP.standard;

  // Launch animation style
  const getAnimationStyle = () => {
    const anim = settings.bubble_launch_animation || 'slide-up';
    if (isMobile) return undefined; // mobile uses CSS classes
    if (anim === 'fade') {
      return { opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' } as React.CSSProperties;
    }
    if (anim === 'scale') {
      return {
        transform: isOpen ? 'scale(1)' : 'scale(0.92)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: (isOpen ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
        transformOrigin: settings.bubble_position === 'bottom-left' ? 'bottom left' : settings.bubble_position === 'bottom-center' ? 'bottom center' : 'bottom right',
      };
    }
    // slide-up (default)
    return {
      transform: isOpen ? 'translateY(0)' : 'translateY(24px)',
      opacity: isOpen ? 1 : 0,
      pointerEvents: (isOpen ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
    };
  };

  useEffect(() => {
    if (!settings.bubble_remember_state || !user) return;
    const saved = localStorage.getItem(storageKey);
    if (saved === 'open') setIsOpen(true);
  }, [user, settings.bubble_remember_state, storageKey]);

  useEffect(() => {
    if (!settings.bubble_remember_state || !user) return;
    localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
  }, [isOpen, user, settings.bubble_remember_state, storageKey]);

  useEffect(() => {
    if (!isOpen && messages.length > prevMsgCount.current) {
      setHasNewMessage(true);
      // Play sound if enabled
      if (settings.bubble_sound_enabled) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.value = 0.08;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.stop(ctx.currentTime + 0.15);
        } catch {}
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, isOpen, settings.bubble_sound_enabled]);

  useEffect(() => {
    if (isOpen) setHasNewMessage(false);
  }, [isOpen]);

  // UI-006: suppress on mobile (covers 85% of viewport)
  // BUG-004: suppress on /ai-agents/osha (main chat already renders there)
  if (!user || !settings.bubble_enabled || isMobile || pathname?.startsWith('/ai-agents/osha')) return null;

  const showClearButton = settings.bubble_show_clear_button !== false;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-50 transition-all duration-300 ease-out',
          // Desktop positioning + size
          panelPositionClass,
          panelSizeClass,
          'sm:rounded-2xl',
          // Mobile: full bottom-sheet
          isMobile
            ? cn(
                'bottom-0 left-0 right-0 w-full rounded-t-3xl',
                isOpen ? 'h-[85dvh]' : 'h-0',
              )
            : undefined
        )}
        style={!isMobile ? getAnimationStyle() : undefined}
      >
        <div className={cn(
          'flex flex-col h-full',
          'border border-border/60 shadow-2xl bg-background overflow-hidden',
          'sm:rounded-2xl',
          isMobile ? 'rounded-t-3xl' : 'rounded-2xl',
        )}>
          {/* Drag handle (mobile only) */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}

          {/* Panel header — uses dynamic accent color */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3 shrink-0',
            'bg-gradient-to-r',
            color.from, color.via, color.to,
          )}>
            <div className="flex items-center gap-3">
              {/* Status + avatar */}
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-card/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                {showStatusDot && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white/50 animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-white">{bubbleName}</p>
                <p className="text-[10px] text-white/70 mt-0.5">{bubbleSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear history button — controlled by setting */}
              {showClearButton && messages.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-card/15 rounded-lg"
                      onClick={() => clearHistory(undefined, { onSuccess: () => refetch() })}
                      disabled={isClearing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Clear history</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-card/15 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0">
            <OshaChat
              messages={messages}
              settings={settings}
              isLoadingMessages={isLoadingMessages}
              onMessagesChange={() => refetch()}
              compact
              showModeSelector={settings.bubble_show_mode_selector}
            />
          </div>
        </div>
      </div>

      {/* Floating button — dynamic color + position */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'fixed z-50',
          buttonPositionClass,
          buttonSize.container,
          'rounded-full',
          'bg-gradient-to-br',
          color.from, color.to,
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          color.ring,
          hasNewMessage && 'ring-2 ring-offset-2 ring-offset-background',
          isOpen && 'opacity-90',
        )}
        style={{ boxShadow: `0 8px 30px rgba(${color.shadow},0.45)` }}
        aria-label={isOpen ? `Close ${bubbleName}` : `Open ${bubbleName} assistant`}
      >
        <div className={cn('transition-all duration-200', isOpen ? 'rotate-180 scale-90' : 'rotate-0 scale-100')}>
          {isOpen ? (
            <X className={cn(buttonSize.icon, 'text-white')} />
          ) : (
            <Bot className={cn(buttonSize.icon, 'text-white')} />
          )}
        </div>

        {/* New message indicator */}
        {hasNewMessage && !isOpen && (
          <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-background" />
          </span>
        )}
      </button>
    </>
  );
}
