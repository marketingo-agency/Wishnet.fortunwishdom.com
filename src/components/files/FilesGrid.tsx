import { FileRecord, useUpdateFile, useDeleteFile, useBrainKnowledgeSector } from '@/hooks/useFiles';
import { useUpdateBrainDocument } from '@/hooks/useBrainDocuments';
import { FileCard } from './FileCard';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { FileView } from '@/hooks/useFiles';

interface FilesGridProps {
  files: FileRecord[];
  selectedFileId: string | null;
  onFileSelect: (file: FileRecord) => void;
  isLoading: boolean;
  currentView?: FileView;
}

export function FilesGrid({ files, selectedFileId, onFileSelect, isLoading, currentView = 'all' }: FilesGridProps) {
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const updateBrainDocument = useUpdateBrainDocument();
  const { data: brainSectorId } = useBrainKnowledgeSector();

  const handleRestore = (fileId: string) => {
    updateFile.mutate({ id: fileId, updates: { is_trashed: false } });
    toast.success('File restored');
  };

  const handleDeletePermanently = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      deleteFile.mutate({ id: fileId, storagePath: file.storage_path });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 mx-3 sm:mx-4 border-2 border-dashed border-border rounded-xl">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="h-7 w-7 text-muted-foreground/70" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No files found</h3>
        <p className="text-sm text-muted-foreground">Upload some files to get started</p>
      </div>
    );
  }

  const handleDelete = (fileId: string) => {
    updateFile.mutate({ id: fileId, updates: { is_trashed: true } });
    toast.success('File moved to trash');
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4">
      {files.map((file) => {
        const isBrainDoc = file.sector_id === 'brain-knowledge' || (brainSectorId && file.sector_id === brainSectorId);
        return (
          <FileCard
            key={file.id}
            file={file}
            isSelected={selectedFileId === file.id}
            onClick={() => onFileSelect(file)}
            isBrainDocument={isBrainDoc}
            onRestore={currentView === 'trash' ? handleRestore : undefined}
            onDeletePermanently={currentView === 'trash' ? handleDeletePermanently : undefined}
            onDelete={currentView !== 'trash' && !isBrainDoc ? handleDelete : undefined}
            onTogglePin={currentView !== 'trash' ? handleTogglePin : undefined}
          />
        );
      })}
    </div>
  );
}
