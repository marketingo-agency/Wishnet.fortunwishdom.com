import { useState, useMemo, useEffect } from 'react';
import { FilesSidebar } from '@/components/files/FilesSidebar';
import { FilesToolbar } from '@/components/files/FilesToolbar';
import { FilesGrid } from '@/components/files/FilesGrid';
import { FilesList } from '@/components/files/FilesList';
import { FileInspector } from '@/components/files/FileInspector';
import { UploadDialog } from '@/components/files/UploadDialog';
import { useFiles, useBrainDocumentsAsFiles, type FileType, type FileView, type FileRecord } from '@/hooks/useFiles';
import { getMimeTypeFilter } from '@/hooks/files/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, FolderOpen } from 'lucide-react';

// Error fallback component for FilesManager
function FilesManagerErrorFallback() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          An error occurred while loading the files manager. Please try refreshing the page.
        </p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    </div>
  );
}

function FilesManagerContent() {
  const [currentView, setCurrentView] = useState<FileView>('all');
  const [currentType, setCurrentType] = useState<FileType>('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isBrainFolderSelected, setIsBrainFolderSelected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Regular files query
  const { data: regularFiles = [], isLoading: isLoadingFiles } = useFiles(
    currentView,
    currentType,
    selectedSectorId,
    searchQuery
  );

  // Brain documents query
  const { data: brainFiles = [], isLoading: isLoadingBrain } = useBrainDocumentsAsFiles();

  // Determine which files to show based on view state
  const files = useMemo(() => {
    // Helper to filter files by type
    const filterByType = (fileList: FileRecord[]): FileRecord[] => {
      if (currentType === 'all') return fileList;
      const mimeFilters = getMimeTypeFilter(currentType);
      return fileList.filter(file =>
        mimeFilters.some(filter => file.mime_type.startsWith(filter))
      );
    };

    if (isBrainFolderSelected) {
      // Brain folder selected - filter brain docs by type
      return filterByType(brainFiles);
    }
    if (selectedSectorId) {
      // User folder selected - regular files already filtered by sector, apply type filter
      return filterByType(regularFiles);
    }
    // Show brain docs in "all" and "pinned" views
    if (currentView === 'all') {
      // Merge and filter brain docs by type
      return [...regularFiles, ...filterByType(brainFiles)];
    }
    if (currentView === 'pinned') {
      // Include pinned brain documents in the pinned view, filtered by type
      const pinnedBrainFiles = brainFiles.filter(f => f.is_pinned);
      return [...regularFiles, ...filterByType(pinnedBrainFiles)];
    }
    // For "trash" view, show only regular files (brain docs don't have trash)
    return regularFiles;
  }, [regularFiles, brainFiles, isBrainFolderSelected, selectedSectorId, currentView, currentType]);

  // Sync selectedFile with updated files data (for pin toggle, etc.)
  useEffect(() => {
    if (selectedFile) {
      const updatedFile = files.find(f => f.id === selectedFile.id);
      if (updatedFile) {
        setSelectedFile(updatedFile);
      } else {
        // File was deleted - close the inspector
        setSelectedFile(null);
      }
    }
  }, [files]);

  const isLoading = isLoadingFiles || isLoadingBrain;

  const handleFileSelect = (file: FileRecord) => {
    setSelectedFile(file);
  };

  const handleCloseInspector = () => {
    setSelectedFile(null);
  };

const handleBrainFolderSelect = () => {
    setIsBrainFolderSelected(true);
    setSelectedSectorId(null);
    setSelectedFile(null);
  };

  const handleBrainFolderDeselect = () => {
    setIsBrainFolderSelected(false);
  };

  const handleViewChange = (view: FileView) => {
    setCurrentView(view);
    setIsBrainFolderSelected(false);
  };

  const handleSectorSelect = (sectorId: string | null) => {
    setSelectedSectorId(sectorId);
    if (sectorId) {
      setIsBrainFolderSelected(false);
    }
  };

  return (
    <div className="flex h-full p-0 min-h-0">
      <div className="flex flex-col lg:flex-row w-full h-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Left Sidebar - hidden on mobile, shown in sheet */}
        <div className="hidden md:block">
          <FilesSidebar
            currentView={currentView}
            selectedSectorId={selectedSectorId}
            onViewChange={handleViewChange}
            onSectorSelect={handleSectorSelect}
            onUploadClick={() => setShowUpload(true)}
            onBrainFolderSelect={handleBrainFolderSelect}
            onBrainFolderDeselect={handleBrainFolderDeselect}
            isBrainFolderSelected={isBrainFolderSelected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <FilesToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentType={currentType}
            onTypeChange={setCurrentType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            currentView={currentView}
            onViewChange={handleViewChange}
            onUploadClick={() => setShowUpload(true)}
            isBrainFolderSelected={isBrainFolderSelected}
            onBrainFolderSelect={handleBrainFolderSelect}
            onMobileSidebarOpen={() => setMobileSidebarOpen(true)}
          />
          <ScrollArea className="flex-1">
            {viewMode === 'grid' ? (
              <FilesGrid
                files={files}
                selectedFileId={selectedFile?.id ?? null}
                onFileSelect={handleFileSelect}
                isLoading={isLoading}
                currentView={currentView}
              />
            ) : (
              <FilesList
                files={files}
                selectedFileId={selectedFile?.id ?? null}
                onFileSelect={handleFileSelect}
                isLoading={isLoading}
                currentView={currentView}
              />
            )}
          </ScrollArea>
        </div>

        {/* Right Inspector - overlay on mobile, inline on desktop */}
        {selectedFile && (
          <>
            {/* Mobile overlay backdrop */}
            <div 
              className="fixed inset-0 bg-background/80 z-40 lg:hidden"
              onClick={handleCloseInspector}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm lg:static lg:w-80 lg:shrink-0 lg:h-full">
              <FileInspector 
                file={selectedFile} 
                onClose={handleCloseInspector}
                isReadOnly={isBrainFolderSelected}
              />
            </div>
          </>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadDialog 
        open={showUpload} 
        onOpenChange={setShowUpload}
        sectorId={selectedSectorId}
        onUploadStart={() => {
          setIsUploading(true);
          setUploadProgress(0);
        }}
        onUploadProgress={(progress) => setUploadProgress(progress)}
        onUploadComplete={() => {
          setIsUploading(false);
          setUploadProgress(0);
        }}
      />

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-sm">Folders & Sectors</SheetTitle>
          </SheetHeader>
          <FilesSidebar
            currentView={currentView}
            selectedSectorId={selectedSectorId}
            onViewChange={(view) => { handleViewChange(view); setMobileSidebarOpen(false); }}
            onSectorSelect={(id) => { handleSectorSelect(id); setMobileSidebarOpen(false); }}
            onUploadClick={() => { setShowUpload(true); setMobileSidebarOpen(false); }}
            onBrainFolderSelect={() => { handleBrainFolderSelect(); setMobileSidebarOpen(false); }}
            onBrainFolderDeselect={handleBrainFolderDeselect}
            isBrainFolderSelected={isBrainFolderSelected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function FilesManager() {
  return (
    <ErrorBoundary fallback={<FilesManagerErrorFallback />}>
      <FilesManagerContent />
    </ErrorBoundary>
  );
}
