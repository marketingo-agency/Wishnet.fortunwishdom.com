import { X, Brain, Pin, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FileRecord, getFileUrl, getBrainDocumentUrl } from '@/hooks/useFiles';
import { getFileIcon, formatFileSize } from '@/lib/fileTypes';

interface FileCardProps {
  file: FileRecord;
  isSelected: boolean;
  onClick: () => void;
  versionNumber?: number;
  onDragStart?: (e: React.DragEvent, fileId: string) => void;
  isBrainDocument?: boolean;
  onRestore?: (fileId: string) => void;
  onDeletePermanently?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onTogglePin?: (fileId: string) => void;
}

export function FileCard({ 
  file, 
  isSelected, 
  onClick, 
  versionNumber = 1, 
  onDragStart, 
  isBrainDocument = false,
  onRestore,
  onDeletePermanently,
  onDelete,
  onTogglePin,
}: FileCardProps) {
  const isImage = file.mime_type.startsWith('image/');
  const { icon: Icon, color, bg } = getFileIcon(file.mime_type, file.name);
  
  // Use appropriate bucket URL based on document type
  const fileUrl = isBrainDocument 
    ? getBrainDocumentUrl(file.storage_path)
    : getFileUrl(file.storage_path);
  
  const isTrashed = file.is_trashed === true;
  const isPinned = file.is_pinned === true;

  const handleDragStart = (e: React.DragEvent) => {
    if (isBrainDocument) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('fileId', file.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, file.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isBrainDocument}
      onDragStart={handleDragStart}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group relative flex flex-col bg-card rounded-xl border overflow-hidden text-left transition-all hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-border',
        isBrainDocument && 'ring-1 ring-indigo-200'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square">
        {isImage ? (
          <img
            src={fileUrl}
            alt={file.name}
            className="w-full h-full object-cover bg-card"
          />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', bg)}>
            <Icon className={cn('h-12 w-12', color)} strokeWidth={1.5} />
          </div>
        )}
        
        {/* Brain document badge */}
        {isBrainDocument && (
          <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
            <Brain className="h-3.5 w-3.5" />
          </div>
        )}
        
        {/* Pin icon for pinned files - top right */}
        {isPinned && !isTrashed && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Pin className="h-3.5 w-3.5" />
          </div>
        )}
        
        {/* Hover actions - top right */}
        {!isTrashed && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
            {/* Pin toggle */}
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(file.id);
                }}
                className={cn(
                  'h-8 w-8 sm:h-6 sm:w-6 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full text-white flex items-center justify-center shadow-sm transition-colors',
                  isPinned ? 'bg-amber-500 hover:bg-amber-600' : 'bg-muted/500 hover:bg-muted-foreground'
                )}
                title={isPinned ? 'Unpin file' : 'Pin file'}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Delete */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.id);
                }}
                className="h-8 w-8 sm:h-6 sm:w-6 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm"
                title="Delete file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        
        {/* Trash actions overlay */}
        {isTrashed && (onRestore || onDeletePermanently) && (
          <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onRestore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(file.id);
                }}
                className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-md transition-colors"
                title="Restore file"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {onDeletePermanently && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePermanently(file.id);
                }}
                className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-md transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
}
