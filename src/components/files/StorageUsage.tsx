import { cn } from '@/lib/utils';

interface StorageUsageProps {
  used: number;
  total: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function StorageUsage({ used, total }: StorageUsageProps) {
  const percentage = Math.min((used / total) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Storage</span>
        <span className="font-medium text-foreground/80">
          {formatBytes(used)} / {formatBytes(total)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isCritical
              ? 'bg-red-500'
              : isWarning
              ? 'bg-orange-500'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isWarning && (
        <p className={cn('text-xs', isCritical ? 'text-red-500' : 'text-orange-500')}>
          {isCritical ? 'Storage almost full!' : 'Storage running low'}
        </p>
      )}
    </div>
  );
}
