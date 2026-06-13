/**
 * SelectFromFilesDialog
 * Dialog to browse and select images from the Files Manager
 * Responsive: full-screen on mobile, 2-col grid on small screens.
 */

import { useState, useMemo } from 'react';
import { Search, Loader2, FolderOpen, ImageIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFiles, getSignedFileUrl } from '@/hooks/files';
import { SecureImage } from '@/components/files/SecureImage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: { url: string; name: string; mime_type: string }) => void;
  title?: string;
}

export function SelectFromFilesDialog({ open, onOpenChange, onSelect, title }: Props) {
  const [search, setSearch] = useState('');
  const { data: files = [], isLoading } = useFiles('all', 'images', null, search || undefined);

  const imageFiles = useMemo(() =>
    files.filter((f) => f.mime_type.startsWith('image/')),
    [files]
  );

  const handleSelect = async (file: typeof imageFiles[0]) => {
    // The consumer FETCHES this URL to re-upload, so it must be a working
    // signed URL (the files bucket is private; a public URL would 403).
    const url = await getSignedFileUrl(file.storage_path);
    if (!url) {
      toast.error('Could not open that image, please try again.');
      return;
    }
    onSelect({ url, name: file.original_name, mime_type: file.mime_type });
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col p-0 gap-0 w-[calc(100%-2rem)] sm:w-full rounded-xl sm:rounded-2xl">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            {title || 'Select from Files Manager'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose an image from your uploaded files
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 sm:px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images…"
              className="pl-9 h-10 sm:h-9 text-sm"
            />
          </div>
        </div>

        {/* Grid */}
        <ScrollArea className="flex-1 px-4 sm:px-5 pb-4 sm:pb-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : imageFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FolderOpen className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No images found</p>
              <p className="text-xs opacity-60">
                {search ? 'Try a different search term' : 'Upload images in the Files Manager first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {imageFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => void handleSelect(file)}
                  className={cn(
                    "group relative aspect-square rounded-xl border-2 border-border/50 overflow-hidden",
                    "bg-muted/20 hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-500/10",
                    "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30",
                    "min-h-[80px] min-w-[44px] active:scale-[0.97]"
                  )}
                >
                  <SecureImage
                    stored={file.storage_path}
                    alt={file.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    fallback={<div className="flex h-full w-full items-center justify-center bg-muted/30"><ImageIcon className="h-6 w-6 text-muted-foreground/40" /></div>}
                  />
                  {/* Name overlay */}
                  <div className="absolute bottom-0 inset-x-0 py-1 px-1.5 bg-background/80 backdrop-blur-sm">
                    <span className="text-[9px] text-white/80 truncate block">
                      {file.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
