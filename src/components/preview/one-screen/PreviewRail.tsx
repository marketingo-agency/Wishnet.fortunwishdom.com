"use client";

/**
 * Left history rail for the One-Screen Preview. ChatGPT-style: collapsible on
 * desktop (280px expanded, 64px icon rail), overlay drawer on mobile.
 * Fortun Wishnet branding only; list content lives in PreviewRailContent.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Plus, X } from 'lucide-react';
import { FortunLogo } from '@/components/brand/FortunLogo';
import { cn } from '@/lib/utils';
import { MOCK_RUNS, TRACK_META, type PreviewRun } from './previewMockData';
import { RailContent } from './PreviewRailContent';
import { PT } from './previewTokens';

interface PreviewRailProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeId: string | null;
  onSelect: (run: PreviewRun) => void;
  onNew: () => void;
}

export const PreviewRail = ({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  activeId,
  onSelect,
  onNew,
}: PreviewRailProps) => {
  const reduceMotion = useReducedMotion();

  // Escape closes the mobile drawer (it is a custom overlay, not a Radix sheet).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop rail */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 280 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
        className={cn('relative z-30 hidden h-full shrink-0 flex-col overflow-hidden border-r md:flex', PT.rail)}
      >
        <div className={cn('flex h-14 shrink-0 items-center border-b', PT.border, collapsed ? 'justify-center px-2' : 'justify-between px-3')}>
          {collapsed ? (
            <FortunLogo variant="mini" className="h-8 w-8" />
          ) : (
            <>
              <FortunLogo variant="full" className="h-8 w-auto" />
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Collapse sidebar"
                aria-expanded="true"
                className={cn('flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none', PT.ghostBtn, PT.focusRing)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-3">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded="false"
              className={cn('flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none', PT.ghostBtn, PT.focusRing)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNew}
              aria-label="New creation"
              title="New creation"
              className={cn('mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white transition-all duration-200 motion-reduce:transition-none', PT.accentBtn, PT.focusRing)}
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className={cn('my-2 h-px w-8 shrink-0', 'bg-white/[0.08] [[data-preview-theme=light]_&]:bg-zinc-200')} />
            {MOCK_RUNS.slice(0, 7).map((run) => {
              const Icon = TRACK_META[run.track].icon;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => onSelect(run)}
                  aria-label={run.title}
                  title={run.title}
                  aria-current={activeId === run.id ? 'true' : undefined}
                  className={cn(
                    'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 motion-reduce:transition-none',
                    PT.focusRing,
                    activeId === run.id ? PT.rowActive : PT.row,
                  )}
                >
                  <Icon className={cn('h-4 w-4', TRACK_META[run.track].iconClass)} />
                </button>
              );
            })}
          </div>
        ) : (
          <RailContent activeId={activeId} onSelect={onSelect} onNew={onNew} />
        )}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              onClick={onMobileClose}
              className="absolute inset-0 h-full w-full cursor-pointer bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: reduceMotion ? 0 : -300 }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : -300 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
              className={cn('absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r shadow-2xl', PT.rail, PT.page)}
            >
              <div className={cn('flex h-14 shrink-0 items-center justify-between border-b px-3', PT.border)}>
                <FortunLogo variant="full" className="h-8 w-auto" />
                <button
                  type="button"
                  onClick={onMobileClose}
                  aria-label="Close sidebar"
                  className={cn('flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none', PT.ghostBtn, PT.focusRing)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <RailContent activeId={activeId} onSelect={onSelect} onNew={onNew} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
