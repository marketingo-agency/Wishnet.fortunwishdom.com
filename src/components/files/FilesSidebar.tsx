import { useState } from 'react';
import { FolderOpen, Pin, Trash2, Plus, Brain, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useSectors, useStorageUsage, useUpdateFile, useDeleteSector, type FileView, type Sector } from '@/hooks/useFiles';
import { CreateSectorDialog } from './CreateSectorDialog';
import { EditFolderDialog } from './EditFolderDialog';
import { StorageUsage } from './StorageUsage';
import { UploadButton } from './UploadButton';
import { toast } from 'sonner';

interface FilesSidebarProps {
  currentView: FileView;
  selectedSectorId: string | null;
  onViewChange: (view: FileView) => void;
  onSectorSelect: (sectorId: string | null) => void;
  onUploadClick: () => void;
  onBrainFolderSelect?: () => void;
  onBrainFolderDeselect?: () => void;
  isBrainFolderSelected?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}

const navItems = [
  { id: 'all' as FileView, label: 'All Assets', icon: FolderOpen, iconColor: 'text-blue-500' },
  { id: 'pinned' as FileView, label: 'Pinned', icon: Pin, iconColor: 'text-emerald-500' },
  { id: 'trash' as FileView, label: 'Trash Bin', icon: Trash2, iconColor: 'text-red-500' },
];

export function FilesSidebar({
  currentView,
  selectedSectorId,
  onViewChange,
  onSectorSelect,
  onUploadClick,
  onBrainFolderSelect,
  onBrainFolderDeselect,
  isBrainFolderSelected = false,
  isUploading = false,
  uploadProgress = 0,
}: FilesSidebarProps) {
  const [showCreateSector, setShowCreateSector] = useState(false);
  const [editFolder, setEditFolder] = useState<Sector | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Sector | null>(null);
  const [dragOverSectorId, setDragOverSectorId] = useState<string | null>(null);
  
  const { data: sectors = [] } = useSectors();
  const { data: storageData } = useStorageUsage();
  const updateFile = useUpdateFile();
  const deleteSector = useDeleteSector();

  const handleNavClick = (view: FileView) => {
    onViewChange(view);
    onSectorSelect(null);
    onBrainFolderDeselect?.();
  };

  // Drop handler for "All Assets" to unassign files from folders
  const handleAllAssetsDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectorId('all-assets');
  };

  const handleAllAssetsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('fileId');
    if (fileId) {
      updateFile.mutate({ id: fileId, updates: { sector_id: null } });
      toast.success('File moved to All Assets');
    }
    setDragOverSectorId(null);
  };

  const handleSectorClick = (sectorId: string) => {
    onViewChange('all');
    onSectorSelect(sectorId);
    onBrainFolderDeselect?.();
  };

  const handleBrainFolderClick = () => {
    onSectorSelect(null);
    onBrainFolderSelect?.();
  };

  // Drag and drop handlers for folders
  const handleDragOver = (e: React.DragEvent, sectorId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectorId(sectorId);
  };

  const handleDragLeave = () => {
    setDragOverSectorId(null);
  };

  const handleDrop = (e: React.DragEvent, sectorId: string) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData('fileId');
    if (fileId) {
      updateFile.mutate({ id: fileId, updates: { sector_id: sectorId } });
      toast.success('File moved to folder');
    }
    setDragOverSectorId(null);
  };

  const handleDeleteFolder = () => {
    if (!deleteFolder) return;
    
    deleteSector.mutate(deleteFolder.id, {
      onSuccess: () => {
        // If this folder was selected, reset to All Assets
        if (selectedSectorId === deleteFolder.id) {
          onSectorSelect(null);
          onViewChange('all');
        }
        setDeleteFolder(null);
      },
    });
  };

  return (
    <div className="flex flex-col h-full w-56 md:w-56 border-r bg-card shrink-0">
      {/* Upload Button */}
      <div className="p-4">
        <UploadButton
          onClick={onUploadClick}
          isUploading={isUploading}
          progress={uploadProgress}
          className="w-full"
        />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id && !selectedSectorId && !isBrainFolderSelected;
            const isAllAssets = item.id === 'all';
            const isDragOverAllAssets = isAllAssets && dragOverSectorId === 'all-assets';
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                onDragOver={isAllAssets ? handleAllAssetsDragOver : undefined}
                onDragLeave={isAllAssets ? handleDragLeave : undefined}
                onDrop={isAllAssets ? handleAllAssetsDrop : undefined}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-blue-500 bg-blue-50'
                    : 'text-foreground hover:bg-muted',
                  isDragOverAllAssets && 'bg-blue-100 ring-2 ring-blue-400'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-blue-500' : item.iconColor)} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* System Folders */}
        <div className="mt-6">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={handleBrainFolderClick}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isBrainFolderSelected
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Brain className={cn('h-4 w-4', isBrainFolderSelected ? 'text-indigo-600' : 'text-indigo-500')} />
              Brain Knowledge
            </button>
          </div>
        </div>

        {/* User Folders */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Folders
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-muted-foreground/70 hover:text-muted-foreground"
              onClick={() => setShowCreateSector(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {sectors.map((sector) => {
              const isActive = selectedSectorId === sector.id && !isBrainFolderSelected;
              const isDragOver = dragOverSectorId === sector.id;
              return (
                <ContextMenu key={sector.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => handleSectorClick(sector.id)}
                      onDragOver={(e) => handleDragOver(e, sector.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, sector.id)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'text-blue-500 bg-blue-50'
                          : 'text-foreground hover:bg-muted',
                        isDragOver && 'bg-blue-100 ring-2 ring-blue-400'
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: sector.color }}
                      />
                      {sector.name}
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setEditFolder(sector)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => setDeleteFolder(sector)}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Storage Usage */}
      <div className="p-4 border-t">
        <StorageUsage used={storageData?.used ?? 0} total={storageData?.total ?? 1073741824} />
      </div>

      {/* Create Folder Dialog */}
      <CreateSectorDialog
        open={showCreateSector}
        onOpenChange={setShowCreateSector}
      />

      {/* Edit Folder Dialog */}
      <EditFolderDialog
        open={!!editFolder}
        onOpenChange={(open) => !open && setEditFolder(null)}
        folder={editFolder}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFolder} onOpenChange={(open) => !open && setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder "{deleteFolder?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder will be deleted. Files inside will be moved to All Assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteFolder}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
