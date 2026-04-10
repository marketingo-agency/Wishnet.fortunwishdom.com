import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type FileRecord,
  useFileTags,
  useUpdateFile,
  useDeleteFile,
  useAddTag,
  useRemoveTag,
  useBrainKnowledgeSector,
  getSecureFileUrl,
} from '@/hooks/useFiles';
import { useUpdateBrainDocument } from '@/hooks/useBrainDocuments';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFileIcon, formatFileSize, getFileTypeLabel } from '@/lib/fileTypes';
import { FilePreview } from './FilePreview';
import { FileMetadata } from './FileMetadata';
import { FileActions } from './FileActions';

interface FileInspectorProps {
  file: FileRecord;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function FileInspector({ file, onClose, isReadOnly = false }: FileInspectorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description || '');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { session } = useAuth();
  const { data: tags = [] } = useFileTags(file.id);
  const { data: brainSectorId } = useBrainKnowledgeSector();
  const updateFile = useUpdateFile();
  const updateBrainDocument = useUpdateBrainDocument();
  const deleteFile = useDeleteFile();
  const addTag = useAddTag();
  const removeTag = useRemoveTag();

  const isBrainDocument = file.sector_id === 'brain-knowledge' || file.sector_id === brainSectorId;
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const showInlinePreview = isImage || isVideo || isAudio;

  const { icon: Icon, color, bg } = getFileIcon(file.mime_type, file.name);

  const bucket = isBrainDocument ? 'brain-documents' : 'files';
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.storage_path);
  const fileUrl = urlData?.publicUrl || '';

  useEffect(() => {
    setName(file.name);
    setDescription(file.description || '');
  }, [file]);

  const handleSaveName = () => {
    if (name.trim() && name !== file.name) {
      if (isBrainDocument) {
        updateBrainDocument.mutate({ id: file.id, updates: { name: name.trim() } });
      } else {
        updateFile.mutate({ id: file.id, updates: { name: name.trim() } });
      }
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = () => {
    if (description !== file.description) {
      if (isBrainDocument) {
        updateBrainDocument.mutate({ id: file.id, updates: { description: description.trim() || null } });
      } else {
        updateFile.mutate({ id: file.id, updates: { description: description.trim() || null } });
      }
    }
  };

  const handleTogglePin = () => {
    if (isBrainDocument) {
      updateBrainDocument.mutate({ id: file.id, updates: { is_pinned: !file.is_pinned } });
    } else {
      updateFile.mutate({ id: file.id, updates: { is_pinned: !file.is_pinned } });
    }
    toast.success(file.is_pinned ? 'File unpinned' : 'File pinned');
  };

  const handleMoveToTrash = () => {
    updateFile.mutate({ id: file.id, updates: { is_trashed: true } });
    toast.success('File moved to trash');
    onClose();
  };

  const handleRestoreFromTrash = () => {
    updateFile.mutate({ id: file.id, updates: { is_trashed: false } });
    toast.success('File restored');
  };

  const handlePermanentDelete = () => {
    if (confirm('Are you sure you want to permanently delete this file?')) {
      deleteFile.mutate({ id: file.id, storagePath: file.storage_path });
      onClose();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewWindow = () => {
    if (!session?.access_token) {
      toast.error('Please log in to open files');
      return;
    }
    const url = getSecureFileUrl(bucket, file.storage_path, file.name, session.access_token);
    window.open(url, '_blank');
  };

  const handleAddTag = (tagName: string, color: string) => {
    addTag.mutate({ fileId: file.id, name: tagName, color });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag.mutate({ tagId, fileId: file.id });
  };

  return (
    <div className="w-full lg:w-80 border-l bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
          File Viewer
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <FilePreview
            fileUrl={fileUrl}
            fileName={file.name}
            isImage={isImage}
            icon={Icon}
            iconColor={color}
            iconBg={bg}
            onPreviewClick={() => setShowPreviewModal(true)}
          />

          <FileMetadata
            file={file}
            tags={tags}
            isBrainDocument={isBrainDocument}
            name={name}
            description={description}
            isEditingName={isEditingName}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onSaveName={handleSaveName}
            onSaveDescription={handleSaveDescription}
            onStartEditingName={() => setIsEditingName(true)}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </div>
      </ScrollArea>

      <FileActions
        file={file}
        isBrainDocument={isBrainDocument}
        onDownload={handleDownload}
        onTogglePin={handleTogglePin}
        onMoveToTrash={handleMoveToTrash}
        onRestoreFromTrash={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
      />

      {/* File Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden bg-card",
            showInlinePreview
              ? "w-[95vw] sm:w-[80vw] max-w-[95vw] sm:max-w-[80vw] h-[85vh] sm:h-[80vh] max-h-[85vh] sm:max-h-[80vh]"
              : "w-[90vw] sm:w-auto sm:max-w-md"
          )}
        >
          {showInlinePreview ? (
            <>
              <DialogHeader className="p-4 border-b shrink-0">
                <DialogTitle className="text-center">{file.name}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center p-4 flex-1 overflow-auto">
                {isImage && <Image src={fileUrl} alt={file.name} width={800} height={600} className="max-w-full max-h-full object-contain" unoptimized />}
                {isVideo && <video src={fileUrl} controls className="max-w-full max-h-full" />}
                {isAudio && <audio src={fileUrl} controls className="w-full max-w-md" />}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6 py-10 px-8">
              <div className="w-24 h-24 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                <Icon className={cn('h-12 w-12', color)} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{file.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.size)} &bull; {getFileTypeLabel(file.mime_type, file.name)}
                </p>
              </div>
              {file.description && (
                <p className="text-sm text-muted-foreground text-center max-w-sm italic">
                  &ldquo;{file.description}&rdquo;
                </p>
              )}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={handleOpenInNewWindow} className="w-full bg-card hover:bg-card">
                  <ExternalLink className="h-4 w-4 mr-2" />Preview in New Window
                </Button>
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
