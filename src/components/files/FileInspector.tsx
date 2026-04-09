import { useState, useEffect } from 'react';
import { X, Download, Trash2, Edit2, Plus, Pin, PinOff, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

interface FileInspectorProps {
  file: FileRecord;
  onClose: () => void;
  isReadOnly?: boolean;
}

const tagColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

export function FileInspector({ file, onClose, isReadOnly = false }: FileInspectorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(file.name);
  const [description, setDescription] = useState(file.description || '');
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { session } = useAuth();
  const { data: tags = [] } = useFileTags(file.id);
  const { data: brainSectorId } = useBrainKnowledgeSector();
  const updateFile = useUpdateFile();
  const updateBrainDocument = useUpdateBrainDocument();
  const deleteFile = useDeleteFile();
  const addTag = useAddTag();
  const removeTag = useRemoveTag();

  // Check if file is from brain-documents bucket
  const isBrainDocument = file.sector_id === 'brain-knowledge' || file.sector_id === brainSectorId;
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  
  // Determine if we should show inline preview (images, video, audio) or metadata card (documents)
  const showInlinePreview = isImage || isVideo || isAudio;
  
  const { icon: Icon, color, bg } = getFileIcon(file.mime_type, file.name);
  
  // Get public URL for media files (images, video, audio)
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

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)].value;
      addTag.mutate({ fileId: file.id, name: newTagName.trim(), color: randomColor });
      setNewTagName('');
      setShowTagInput(false);
    }
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
          {/* Preview */}
          <div 
            className="relative group aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
            onClick={() => setShowPreviewModal(true)}
          >
            {isImage ? (
              <img src={fileUrl} alt={file.name} className="w-full h-full object-cover bg-card" />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', bg)}>
                <Icon className={cn('h-16 w-16', color)} strokeWidth={1.5} />
              </div>
            )}
            {/* Eye icon overlay - appears on hover */}
            <div className="absolute inset-0 bg-black/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-card/90 flex items-center justify-center shadow-md">
                <Eye className="h-5 w-5 text-foreground/80" />
              </div>
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Filename
            </label>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="text-sm"
                  autoFocus
                />
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground/70"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Add a description..."
              className="text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Tags - hidden for brain documents (FK constraint) */}
          {!isBrainDocument && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {showTagInput ? (
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onBlur={() => {
                      if (newTagName.trim()) handleAddTag();
                      else setShowTagInput(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') setShowTagInput(false);
                    }}
                    placeholder="Tag name..."
                    className="h-6 w-24 text-xs"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    <Plus className="h-3 w-3" /> ADD
                  </button>
                )}
              </div>
            </div>
          )}

          {/* File Details */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Details
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between min-w-0">
                <span className="text-muted-foreground shrink-0">Type</span>
                <span className="text-foreground font-medium text-right truncate ml-2">{getFileTypeLabel(file.mime_type, file.name)}</span>
              </div>
              <div className="flex justify-between min-w-0">
                <span className="text-muted-foreground shrink-0">Size</span>
                <span className="text-foreground font-medium text-right ml-2">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex justify-between min-w-0">
                <span className="text-muted-foreground shrink-0">Uploaded</span>
                <span className="text-foreground font-medium text-right ml-2">
                  {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Button onClick={handleDownload} className="flex-1 bg-card hover:bg-card">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="icon" onClick={handleTogglePin}>
            {file.is_pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
        </div>
        {file.is_trashed ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleRestoreFromTrash}>
              Restore
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
              onClick={handlePermanentDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Forever
            </Button>
          </div>
        ) : !isBrainDocument ? (
          <Button
            variant="outline"
            className="w-full text-red-500 border-red-200 hover:bg-red-50"
            onClick={handleMoveToTrash}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Move to Trash
          </Button>
        ) : null}
      </div>

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
            // Inline preview for images, video, audio
            <>
              <DialogHeader className="p-4 border-b shrink-0">
                <DialogTitle className="text-center">{file.name}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center p-4 flex-1 overflow-auto">
                {isImage && (
                  <img 
                    src={fileUrl} 
                    alt={file.name} 
                    className="max-w-full max-h-full object-contain" 
                  />
                )}
                {isVideo && (
                  <video 
                    src={fileUrl} 
                    controls 
                    className="max-w-full max-h-full"
                  />
                )}
                {isAudio && (
                  <audio 
                    src={fileUrl} 
                    controls 
                    className="w-full max-w-md"
                  />
                )}
              </div>
            </>
          ) : (
            // Simplified metadata card for documents (PDF, Word, Excel, etc.)
            <div className="flex flex-col items-center gap-6 py-10 px-8">
              {/* Large file type icon */}
              <div className="w-24 h-24 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                <Icon className={cn('h-12 w-12', color)} strokeWidth={1.5} />
              </div>
              
              {/* File name and metadata */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">{file.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.size)} • {getFileTypeLabel(file.mime_type, file.name)}
                </p>
              </div>
              
              {/* Description if available */}
              {file.description && (
                <p className="text-sm text-muted-foreground text-center max-w-sm italic">
                  "{file.description}"
                </p>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button 
                  onClick={handleOpenInNewWindow} 
                  className="w-full bg-card hover:bg-card"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview in New Window
                </Button>
                <Button 
                  onClick={handleDownload} 
                  variant="outline" 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
