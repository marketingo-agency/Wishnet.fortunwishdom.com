import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelTestButtonProps {
  modelValue: string;
  modelType: 'text' | 'image' | 'video';
  isConnected: boolean;
  isRunning: boolean;
  isHovering: boolean;
  status: 'success' | 'error' | null | undefined;
  onTest: (modelValue: string, modelType: 'text' | 'image' | 'video') => void;
  onCancel: (modelValue: string) => void;
  onHoverStart: (modelValue: string) => void;
  onHoverEnd: () => void;
}

export function ModelTestButton({
  modelValue,
  modelType,
  isConnected,
  isRunning,
  isHovering,
  status,
  onTest,
  onCancel,
  onHoverStart,
  onHoverEnd,
}: ModelTestButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        if (isRunning) {
          onCancel(modelValue);
        } else {
          onTest(modelValue, modelType);
        }
      }}
      onMouseEnter={() => onHoverStart(modelValue)}
      onMouseLeave={onHoverEnd}
      disabled={!isConnected && !isRunning}
      className={cn(
        'shrink-0 transition-all',
        isRunning && isHovering && 'border-destructive/50 text-destructive hover:bg-destructive/10',
        status === 'success' && !isRunning && 'border-green-300 text-green-600',
        status === 'error' && !isRunning && 'border-destructive/40 text-destructive',
      )}
      title={isRunning ? 'Cancel test' : 'Test this model'}
    >
      {isRunning ? (
        isHovering
          ? <X className="h-4 w-4" />
          : <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : status === 'error' ? (
        <XCircle className="h-4 w-4 text-destructive" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </Button>
  );
}
