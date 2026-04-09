import React, { useState, useRef, useCallback } from 'react';
import { Play, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  onError?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function VideoPlayer({
  src,
  className,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  onError,
  onClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  const handleLoadedData = useCallback(() => {
    setStatus('ready');
  }, []);

  const handleError = useCallback(() => {
    setStatus('error');
    onError?.();
  }, [onError]);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('loading');
    setRetryKey(k => k + 1);
  }, []);

  if (!src) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted flex items-center justify-center p-8', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm font-medium">No video source available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-border bg-background', className)} onClick={onClick}>
      {/* Loading skeleton */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Skeleton className="absolute inset-0 rounded-xl" />
          <div className="relative z-20 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted/80 flex items-center justify-center animate-pulse">
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Loading video…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-3 p-10 bg-muted/50">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">Video failed to load</p>
          <p className="text-xs text-muted-foreground text-center max-w-[260px]">
            The video file may be corrupted or unavailable. Try again or re-generate.
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-md border border-border hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Video element */}
      {status !== 'error' && (
        <video
          ref={videoRef}
          key={retryKey}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          controls={controls}
          playsInline
          className={cn('max-w-full h-auto block', status === 'loading' && 'invisible')}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onClick={onClick ? (e) => e.stopPropagation() : undefined}
        />
      )}
    </div>
  );
}
