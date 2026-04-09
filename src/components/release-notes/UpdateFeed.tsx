import React from 'react';
import { ReleaseUpdate, FeedbackState } from './types';
import { UpdateCard } from './UpdateCard';

interface UpdateFeedProps {
  updates: ReleaseUpdate[];
  feedback: FeedbackState;
  onFeedback: (updateId: string, feedbackType: 'up' | 'neutral' | 'down') => void;
}

export function UpdateFeed({ updates, feedback, onFeedback }: UpdateFeedProps) {
  if (updates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No updates found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <UpdateCard
          key={update.id}
          update={update}
          currentFeedback={feedback[update.id]}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
}
