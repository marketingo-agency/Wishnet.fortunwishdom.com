import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadFile } from '@/hooks/useFiles';
import { useFileSettings } from '@/hooks/useFileSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectorId?: string | null;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: () => void;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadDialog({ 
  open, 
  onOpenChange,
  sectorId,
  onUploadStart,
  onUploadProgress,
  onUploadComplete 
}: UploadDialogProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const uploadFile = useUploadFile();
  const { data: fileSettings } = useFileSettings();

  const maxSizeBytes = (fileSettings?.max_file_size_mb || 100) * 1024 * 1024;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: FileUploadState[] = [];
    
    for (const file of acceptedFiles) {
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" exceeds the ${fileSettings?.max_file_size_mb || 100}MB limit`);
        continue;
      }
      validFiles.push({
        file,
        progress: 0,
        status: 'pending' as const,
      });
    }
    
    setFiles((prev) => [...prev, ...validFiles]);
  }, [maxSizeBytes, fileSettings?.max_file_size_mb]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleUpload = async () => {
    const pendingCount = files.filter(f => f.status === 'pending').length;
    if (pendingCount === 0) return;

    onUploadStart?.();
    let completedCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' as const, progress: 50 } : f
        )
      );

      // Simulate smooth progress while uploading
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i && f.status === 'uploading' && f.progress < 80
              ? { ...f, progress: f.progress + 5 }
              : f
          )
        );
      }, 200);

      try {
        await uploadFile.mutateAsync({ file: files[i].file, sectorId: sectorId || undefined });
        clearInterval(progressInterval);
        completedCount++;
        
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'success' as const, progress: 100 } : f
          )
        );
        
        // Report overall progress
        onUploadProgress?.(Math.round((completedCount / pendingCount) * 100));
      } catch (error) {
        clearInterval(progressInterval);
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error' as const, error: (error as Error).message }
              : f
          )
        );
      }
    }

    onUploadComplete?.();
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClose = () => {
    setFiles([]);
    onOpenChange(false);
  };

  const pendingFiles = files.filter((f) => f.status === 'pending');
  const hasFiles = files.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-4 sm:p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-border hover:border-border'
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/70" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          </div>

          {/* File List */}
          {hasFiles && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {files.map((fileState, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {fileState.file.name}
                    </p>
                    {fileState.status === 'uploading' && (
                      <Progress value={fileState.progress} className="h-1 mt-1" />
                    )}
                    {fileState.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">{fileState.error}</p>
                    )}
                  </div>
                  {fileState.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {fileState.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  {fileState.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {hasFiles && files.every((f) => f.status === 'success')
                ? 'Done'
                : 'Cancel'}
            </Button>
            {pendingFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={uploadFile.isPending}
                className="bg-cyan-400 hover:bg-cyan-500"
              >
                Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
