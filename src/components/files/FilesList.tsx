import { Pin, PinOff, Brain, X, RotateCcw, Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FileRecord, useUpdateFile, useDeleteFile, useBrainKnowledgeSector, type FileView } from '@/hooks/useFiles';
import { useUpdateBrainDocument } from '@/hooks/useBrainDocuments';
import { toast } from 'sonner';
import { getFileIcon, formatFileSize, getFileTypeLabel } from '@/lib/fileTypes';

interface FilesListProps {
  files: FileRecord[];
  selectedFileId: string | null;
  onFileSelect: (file: FileRecord) => void;
  isLoading: boolean;
  currentView?: FileView;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FilesList({ 
  files, 
  selectedFileId, 
  onFileSelect, 
  isLoading,
  currentView = 'all',
}: FilesListProps) {
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const updateBrainDocument = useUpdateBrainDocument();
  const { data: brainSectorId } = useBrainKnowledgeSector();

  const handleDelete = (fileId: string) => {
    updateFile.mutate({ id: fileId, updates: { is_trashed: true } });
    toast.success('File moved to trash');
  };

  const handleRestore = (fileId: string) => {
    updateFile.mutate({ id: fileId, updates: { is_trashed: false } });
    toast.success('File restored');
  };

  const handleDeletePermanently = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      deleteFile.mutate({ id: fileId, storagePath: file.storage_path });
      toast.success('File permanently deleted');
    }
  };

  const handleTogglePin = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    const isBrainDoc = file.sector_id === 'brain-knowledge' || (brainSectorId && file.sector_id === brainSectorId);
    if (isBrainDoc) {
      updateBrainDocument.mutate({ id: fileId, updates: { is_pinned: !file.is_pinned } });
    } else {
      updateFile.mutate({ id: fileId, updates: { is_pinned: !file.is_pinned } });
    }
    toast.success(file.is_pinned ? 'File unpinned' : 'File pinned');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No files found</h3>
        <p className="text-sm text-muted-foreground">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <th className="pb-3 pl-3 w-10">Status</th>
            <th className="pb-3">Name</th>
            <th className="pb-3 hidden sm:table-cell">Type</th>
            <th className="pb-3 hidden sm:table-cell">Size</th>
            <th className="pb-3 hidden md:table-cell">Date</th>
            <th className="pb-3 pr-3 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const { icon: Icon, color } = getFileIcon(file.mime_type, file.name);
            const isSelected = selectedFileId === file.id;
            const isBrainDocument = file.sector_id === 'brain-knowledge' || (brainSectorId && file.sector_id === brainSectorId);
            const isPinned = file.is_pinned === true;
            const isTrashed = file.is_trashed === true;

            return (
              <tr
                key={file.id}
                onClick={() => onFileSelect(file)}
                className={cn(
                  'group cursor-pointer transition-colors rounded-lg',
                  isSelected
                    ? 'bg-blue-50'
                    : 'hover:bg-muted/50'
                )}
              >
                {/* Status column - icons for pinned/brain */}
                <td className="py-3 pl-3 rounded-l-lg">
                  <div className="flex items-center gap-1">
                    {isBrainDocument && (
                      <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Brain className="h-3 w-3" />
                      </div>
                    )}
                    {isPinned && !isTrashed && (
                      <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Pin className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Name column */}
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-xs">
                      {file.name}
                    </span>
                  </div>
                </td>

                {/* Type column */}
                <td className="py-3 hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {getFileTypeLabel(file.mime_type, file.name)}
                  </span>
                </td>

                {/* Size column */}
                <td className="py-3 hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </td>

                {/* Date column */}
                <td className="py-3 hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(file.created_at)}
                  </span>
                </td>

                {/* Actions column */}
                <td className="py-3 pr-3 rounded-r-lg">
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {isTrashed ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(file.id);
                          }}
                          className="h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                          title="Restore file"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePermanently(file.id);
                          }}
                          className="h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Pin toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(file.id);
                          }}
                          className={cn(
                            'h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full text-white flex items-center justify-center transition-colors',
                            isPinned ? 'bg-amber-500 hover:bg-amber-600' : 'bg-muted-foreground/50 hover:bg-muted/500'
                          )}
                          title={isPinned ? 'Unpin file' : 'Pin file'}
                        >
                          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                        {/* Delete (non-brain only) */}
                        {!isBrainDocument && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id);
                            }}
                            className="h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            title="Delete file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
