import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, BrainCircuit, RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PixelMode } from './PixelTopBar';
import type { PostSize, PostType } from './PixelControlPanel';
import { PLATFORM_POST_TYPES } from './PixelControlPanel';

interface PixelContextPanelProps {
  selectedPostType: string | null;
  selectedSize: PostSize | null;
  onSizeSelect: (size: PostSize) => void;
  mode: PixelMode;
  lastAudit: { heartCount: number; brainCount: number; complianceStatus: string } | null;
}

const COMPLIANCE_CONFIG = {
  pass:     { label: 'Compliant',   icon: ShieldCheck,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  adjusted: { label: 'Adjusted',    icon: AlertTriangle,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  refused:  { label: 'Refused',     icon: XCircle,        color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
};

function RatioPreview({ ratio, className }: { ratio: string; className?: string }) {
  const [w, h] = ratio.split(':').map(Number);
  const maxDim = 28;
  const scale = maxDim / Math.max(w, h);
  return (
    <div
      className={cn('rounded-none border border-border bg-muted', className)}
      style={{ width: Math.round(w * scale), height: Math.round(h * scale) }}
    />
  );
}

export function PixelContextPanel({ selectedPostType, selectedSize, onSizeSelect, mode, lastAudit }: PixelContextPanelProps) {
  const compliance = lastAudit
    ? COMPLIANCE_CONFIG[lastAudit.complianceStatus as keyof typeof COMPLIANCE_CONFIG] || COMPLIANCE_CONFIG.pass
    : null;

  const postTypes = PLATFORM_POST_TYPES[mode] || [];
  const activeType = postTypes.find(pt => pt.id === selectedPostType);

  return (
    <div className="w-[220px] shrink-0 flex flex-col border-l border-border bg-background overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:transparent">
      {/* Post Size Picker */}
      <div className="p-3 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Post Size</p>
        {activeType ? (
          <div className="space-y-1.5">
            {activeType.sizes.map((size) => {
              const isActive = selectedSize && selectedSize.width === size.width && selectedSize.height === size.height;
              return (
                <button
                  key={`${size.width}x${size.height}`}
                  onClick={() => onSizeSelect(size)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all border',
                    isActive
                      ? 'border-pink-500/40 bg-pink-500/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <RatioPreview
                    ratio={size.ratio}
                    className={cn(isActive && 'border-pink-500/60 bg-pink-500/15')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-medium truncate', isActive && 'text-pink-300')}>{size.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{size.width}×{size.height} · {size.ratio}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-3 text-center">
            <RectangleHorizontal className="h-4 w-4 text-muted-foreground/60 mx-auto mb-1.5" />
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Select a post type from the left panel to see available sizes.</p>
          </div>
        )}
      </div>

      {/* Last retrieval / compliance */}
      {lastAudit && compliance && (
        <div className="p-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Last Retrieval</p>
          <div className="space-y-1.5">
            <div className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium', compliance.color)}>
              <compliance.icon className="h-3 w-3 shrink-0" />
              {compliance.label}
            </div>
            {lastAudit.brainCount > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted text-[10px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BrainCircuit className="h-3 w-3 text-violet-400" />
                  Brain chunks
                </div>
                <span className="text-foreground font-medium">{lastAudit.brainCount}</span>
              </div>
            )}
            {lastAudit.heartCount > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted text-[10px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-pink-400" />
                  Heart rules
                </div>
                <span className="text-foreground font-medium">{lastAudit.heartCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
