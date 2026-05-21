"use client";
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReleaseNotesHeader, ViewMode } from '@/components/release-notes/ReleaseNotesHeader';
import { ReleaseNotesFilters, FilterCategory } from '@/components/release-notes/ReleaseNotesFilters';
import { FeaturedUpdate } from '@/components/release-notes/FeaturedUpdate';
import { UpdateFeed } from '@/components/release-notes/UpdateFeed';

import { PlannedReleases } from '@/components/release-notes/PlannedReleases';
import { mockReleaseUpdates } from '@/components/release-notes/mockData';
import { mockPlannedReleases } from '@/components/release-notes/mockPlannedData';
import { FeedbackState } from '@/components/release-notes/types';

export default function ReleaseNotes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [viewMode, setViewMode] = useState<ViewMode>('updates');

  // Get the featured update
  const featuredUpdate = useMemo(() => {
    return mockReleaseUpdates.find(update => update.isFeatured);
  }, []);

  // Filter updates based on search and category
  const filteredUpdates = useMemo(() => {
    return mockReleaseUpdates
      .filter(update => !update.isFeatured) // Exclude featured from feed
      .filter(update => {
        // Category filter
        if (activeCategory !== 'all' && update.category !== activeCategory) {
          return false;
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = update.title.toLowerCase().includes(query);
          const matchesVersion = update.version.toLowerCase().includes(query);
          const matchesChanges = update.changes.some(change => 
            change.toLowerCase().includes(query)
          );
          return matchesTitle || matchesVersion || matchesChanges;
        }
        
        return true;
      });
  }, [activeCategory, searchQuery]);

  const handleFeedback = (updateId: string, feedbackType: 'up' | 'neutral' | 'down') => {
    setFeedback(prev => ({ ...prev, [updateId]: feedbackType }));
  };

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header with View Toggle */}
        <ReleaseNotesHeader 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        {/* Filters - only show in updates view */}
        {viewMode === 'updates' && (
          <ReleaseNotesFilters 
            activeCategory={activeCategory} 
            onCategoryChange={setActiveCategory} 
          />
        )}
        
        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            {viewMode === 'updates' ? (
              <>
                {/* Featured Update - Full Width */}
                {featuredUpdate && activeCategory === 'all' && !searchQuery && (
                  <FeaturedUpdate update={featuredUpdate} />
                )}
                
                {/* Title above the layout */}
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Previous Updates
                </h3>
                
                <UpdateFeed 
                  updates={filteredUpdates}
                  feedback={feedback}
                  onFeedback={handleFeedback}
                />
              </>
            ) : (
              <PlannedReleases releases={mockPlannedReleases} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
