import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadButtonProps {
  onClick: () => void;
  isUploading?: boolean;
  progress?: number; // 0-100
  className?: string;
}

export function UploadButton({ 
  onClick, 
  isUploading = false, 
  progress = 0, 
  className 
}: UploadButtonProps) {
  // SVG circle properties
  const size = 44;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Progress ring (shown during upload) */}
      {isUploading && (
        <svg
          className="absolute inset-0 -rotate-90 pointer-events-none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            width: 'calc(100% + 8px)',
            height: 'calc(100% + 8px)',
          }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-cyan-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-cyan-500 transition-all duration-300 ease-out"
          />
        </svg>
      )}
      
      <Button
        onClick={onClick}
        disabled={isUploading}
        className={cn(
          'w-full bg-cyan-400 hover:bg-cyan-500 text-white font-medium transition-all',
          isUploading && 'bg-cyan-300 cursor-not-allowed'
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </>
        )}
      </Button>
    </div>
  );
}
