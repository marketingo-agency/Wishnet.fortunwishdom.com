import { Newspaper, Search, Clock, Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ViewMode = 'updates' | 'roadmap';

interface ReleaseNotesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ReleaseNotesHeader({ 
  searchQuery, 
  onSearchChange,
  viewMode,
  onViewModeChange,
}: ReleaseNotesHeaderProps) {
  return (
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50">
          <Newspaper className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Release Notes</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Stay up to date with the latest updates</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search - only show in updates view */}
        {viewMode === 'updates' && (
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-border"
            />
          </div>
        )}

        {/* View Toggle */}
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
          className="bg-muted/50 p-1 rounded-lg shrink-0"
        >
          <ToggleGroupItem 
            value="updates" 
            className={`px-3 sm:px-4 py-2 h-9 rounded-md text-sm font-medium transition-all ${
              viewMode === 'updates'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Updates</span>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="roadmap" 
            className={`px-3 sm:px-4 py-2 h-9 rounded-md text-sm font-medium transition-all ${
              viewMode === 'roadmap'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Rocket className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Roadmap</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
