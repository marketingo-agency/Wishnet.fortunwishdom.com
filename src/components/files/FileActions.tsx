import { Download, Trash2, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type FileRecord } from '@/hooks/useFiles';

interface FileActionsProps {
  file: FileRecord;
  isBrainDocument: boolean;
  onDownload: () => void;
  onTogglePin: () => void;
  onMoveToTrash: () => void;
  onRestoreFromTrash: () => void;
  onPermanentDelete: () => void;
}

export function FileActions({
  file,
  isBrainDocument,
  onDownload,
  onTogglePin,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
}: FileActionsProps) {
  return (
    <div className="p-4 border-t space-y-2">
      <div className="flex gap-2">
        <Button onClick={onDownload} className="flex-1 bg-card hover:bg-card">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="icon" onClick={onTogglePin}>
          {file.is_pinned ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </Button>
      </div>
      {file.is_trashed ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onRestoreFromTrash}>
            Restore
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
            onClick={onPermanentDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Forever
          </Button>
        </div>
      ) : !isBrainDocument ? (
        <Button
          variant="outline"
          className="w-full text-red-500 border-red-200 hover:bg-red-50"
          onClick={onMoveToTrash}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Move to Trash
        </Button>
      ) : null}
    </div>
  );
}
