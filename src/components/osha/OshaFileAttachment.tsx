import React from 'react';
import { FileText, Image as ImageIcon, X, Loader2, AlertCircle, Check, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/fileTypes';
import type { PendingAttachment } from '@/types/attachments';

// Re-export for backward compatibility
export type { PendingAttachment } from '@/types/attachments';

interface OshaFileAttachmentProps {
  attachment: PendingAttachment;
  onRemove: (id: string) => void;
}

function getFileStyle(type: string, name: string): { icon: React.ReactNode; colorClass: string } {
  const lowerName = name.toLowerCase();

  if (type.startsWith('image/')) {
    return {
      icon: <ImageIcon className="h-4 w-4 text-purple-500" />,
      colorClass: 'border-purple-500/30 bg-purple-500/5',
    };
  }
  if (type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return {
      icon: <FileText className="h-4 w-4 text-rose-500" />,
      colorClass: 'border-rose-500/30 bg-rose-500/5',
    };
  }
  if (type.includes('spreadsheet') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
    return {
      icon: <FileSpreadsheet className="h-4 w-4 text-emerald-500" />,
      colorClass: 'border-emerald-500/30 bg-emerald-500/5',
    };
  }
  if (type.includes('word') || lowerName.endsWith('.docx')) {
    return {
      icon: <FileText className="h-4 w-4 text-sky-500" />,
      colorClass: 'border-sky-500/30 bg-sky-500/5',
    };
  }
  return {
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    colorClass: 'border-border bg-muted/30',
  };
}

export function OshaFileAttachment({ attachment, onRemove }: OshaFileAttachmentProps) {
  const { icon, colorClass } = getFileStyle(attachment.type, attachment.name);

  const statusClass =
    attachment.status === 'processing'
      ? 'border-sky-500/30 bg-sky-500/8'
      : attachment.status === 'error'
      ? 'border-rose-500/30 bg-rose-500/8'
      : attachment.status === 'ready'
      ? 'border-emerald-500/30 bg-emerald-500/8'
      : colorClass;

  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs max-w-[220px] transition-colors',
      statusClass
    )}>
      {/* Status / type icon */}
      <div className="shrink-0">
        {attachment.status === 'processing' ? (
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
        ) : attachment.status === 'error' ? (
          <AlertCircle className="h-4 w-4 text-rose-500" />
        ) : attachment.status === 'ready' ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          icon
        )}
      </div>

      {/* Name + info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-none text-foreground/90">{attachment.name}</p>
        <p className="mt-0.5 text-muted-foreground/70 leading-none">
          {attachment.status === 'processing'
            ? 'Reading...'
            : attachment.status === 'error'
            ? attachment.errorMessage || 'Failed to read'
            : formatFileSize(attachment.file.size)}
        </p>
      </div>

      {/* Remove button — larger touch target */}
      <button
        className="h-5 w-5 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
        onClick={() => onRemove(attachment.id)}
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
