import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Loader2, AlertCircle, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'running' | 'success' | 'error';

export interface TestAllStep {
  label: string;
  modelValue: string;
  modelType: 'text' | 'image' | 'video';
  status: StepStatus;
  error?: string;
}

interface TestAllPanelProps {
  steps: TestAllStep[];
  isTestingAll: boolean;
}

export function TestAllPanel({ steps, isTestingAll }: TestAllPanelProps) {
  if (steps.length === 0) return null;

  const completedSteps = steps.filter(s => s.status === 'success' || s.status === 'error').length;
  const progressValue = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="shrink-0">
            {step.status === 'pending' && <Circle className="h-3 w-3 text-muted-foreground/40" />}
            {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-warning" />}
            {step.status === 'success' && <CheckCircle2 className="h-3 w-3 text-success" />}
            {step.status === 'error' && <AlertCircle className="h-3 w-3 text-destructive" />}
          </span>
          <span className={cn(
            'flex-1 font-medium',
            step.status === 'pending' && 'text-muted-foreground',
            step.status === 'running' && 'text-foreground',
            step.status === 'success' && 'text-green-700',
            step.status === 'error' && 'text-destructive',
          )}>
            {step.label}
          </span>
          <span className="text-muted-foreground font-mono truncate max-w-[120px]">
            {step.modelValue}
          </span>
          <span className={cn(
            'shrink-0 font-medium',
            step.status === 'pending' && 'text-muted-foreground/60',
            step.status === 'running' && 'text-yellow-600',
            step.status === 'success' && 'text-green-600',
            step.status === 'error' && 'text-destructive',
          )}>
            {step.status === 'pending' && '–'}
            {step.status === 'running' && 'Running\u2026'}
            {step.status === 'success' && 'Passed'}
            {step.status === 'error' && 'Failed'}
          </span>
        </div>
      ))}
      <Progress value={progressValue} className="h-1 mt-2" />
      {!isTestingAll && completedSteps === steps.length && (
        <p className={cn(
          'text-xs font-medium text-center pt-0.5',
          steps.every(s => s.status === 'success') ? 'text-emerald-600' : 'text-amber-600',
        )}>
          {steps.every(s => s.status === 'success')
            ? `All ${steps.length} models passed \u2713`
            : `${steps.filter(s => s.status === 'success').length} passed \u00B7 ${steps.filter(s => s.status === 'error').length} failed`
          }
        </p>
      )}
    </div>
  );
}
