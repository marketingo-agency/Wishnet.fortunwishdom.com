import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sparkles, TrendingUp, Bug, LayoutGrid } from 'lucide-react';

export type FilterCategory = 'all' | 'feature' | 'improvement' | 'fix';

interface ReleaseNotesFiltersProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
}

const filterOptions: { value: FilterCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all', label: 'All Updates', icon: LayoutGrid, color: 'text-muted-foreground' },
  { value: 'feature', label: 'New Features', icon: Sparkles, color: 'text-emerald-600' },
  { value: 'improvement', label: 'Improvements', icon: TrendingUp, color: 'text-sky-600' },
  { value: 'fix', label: 'Bug Fixes', icon: Bug, color: 'text-amber-600' },
];

export function ReleaseNotesFilters({ activeCategory, onCategoryChange }: ReleaseNotesFiltersProps) {
  return (
    <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 overflow-x-auto">
      <ToggleGroup
        type="single"
        value={activeCategory}
        onValueChange={(value) => value && onCategoryChange(value as FilterCategory)}
        className="justify-start gap-1 sm:gap-2"
      >
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activeCategory === option.value;
          
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={`px-3 sm:px-4 py-2 h-9 rounded-full text-sm font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-background shadow-sm border border-border text-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-background/50'
              }`}
            >
              <Icon className={`h-4 w-4 sm:mr-2 ${isActive ? option.color : ''}`} />
              <span className="hidden sm:inline">{option.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
