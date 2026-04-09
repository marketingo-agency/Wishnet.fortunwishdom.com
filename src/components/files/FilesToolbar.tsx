import { Search, LayoutGrid, List, ImageIcon, Video, Music, FileText, Files, Upload, Brain, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FileType, FileView } from '@/hooks/useFiles';
import type { LucideIcon } from 'lucide-react';

interface FilesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentType: FileType;
  onTypeChange: (type: FileType) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  // Mobile navigation props
  currentView?: FileView;
  onViewChange?: (view: FileView) => void;
  onUploadClick?: () => void;
  isBrainFolderSelected?: boolean;
  onBrainFolderSelect?: () => void;
  onMobileSidebarOpen?: () => void;
}

const typeFilters: { id: FileType; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All Types', icon: Files },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'documents', label: 'Documents', icon: FileText },
];

export function FilesToolbar({
  searchQuery,
  onSearchChange,
  currentType,
  onTypeChange,
  viewMode,
  onViewModeChange,
  currentView,
  onViewChange,
  onUploadClick,
  isBrainFolderSelected,
  onBrainFolderSelect,
  onMobileSidebarOpen,
}: FilesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 border-b">
      {/* Mobile View Tabs + Upload - visible only on mobile */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
          {/* Mobile sidebar trigger */}
          <button
            onClick={onMobileSidebarOpen}
            className="px-2.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 bg-card border border-border text-muted-foreground min-h-[36px] flex items-center gap-1"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewChange?.('all')}
            className={cn(
              'px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px]',
              currentView === 'all' && !isBrainFolderSelected
                ? 'bg-card text-white'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            All
          </button>
          <button
            onClick={() => onViewChange?.('pinned')}
            className={cn(
              'px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px]',
              currentView === 'pinned' && !isBrainFolderSelected
                ? 'bg-card text-white'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            Pinned
          </button>
          <button
            onClick={() => onViewChange?.('trash')}
            className={cn(
              'px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px]',
              currentView === 'trash' && !isBrainFolderSelected
                ? 'bg-card text-white'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            Trash
          </button>
          <button
            onClick={() => onBrainFolderSelect?.()}
            className={cn(
              'p-2 rounded-full shrink-0 flex items-center justify-center min-h-[36px] min-w-[36px]',
              isBrainFolderSelected
                ? 'bg-indigo-600 text-white'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            <Brain className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {/* Mobile Upload Button */}
        <Button 
          size="sm" 
          className="bg-cyan-400 hover:bg-cyan-500 shrink-0"
          onClick={onUploadClick}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Query your files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-muted/50 border-border"
        />
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {typeFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => onTypeChange(filter.id)}
                className={cn(
                  'px-2 sm:px-4 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[36px]',
                  currentType === filter.id
                    ? 'bg-card text-white'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm">{filter.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 sm:h-8 sm:w-8 rounded-md',
              viewMode === 'grid' ? 'bg-card shadow-sm' : 'hover:bg-muted'
            )}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 sm:h-8 sm:w-8 rounded-md',
              viewMode === 'list' ? 'bg-card shadow-sm' : 'hover:bg-muted'
            )}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
