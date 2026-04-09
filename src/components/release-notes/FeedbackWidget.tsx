import React from 'react';
import { ThumbsUp, Meh, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type FeedbackType = 'up' | 'neutral' | 'down';

interface FeedbackWidgetProps {
  updateId: string;
  currentFeedback?: FeedbackType;
  onFeedback: (updateId: string, feedback: FeedbackType) => void;
}

const feedbackOptions: { type: FeedbackType; icon: React.ElementType; label: string; activeColor: string }[] = [
  { type: 'up', icon: ThumbsUp, label: 'Helpful', activeColor: 'text-emerald-500 bg-emerald-50' },
  { type: 'neutral', icon: Meh, label: 'Neutral', activeColor: 'text-amber-500 bg-amber-50' },
  { type: 'down', icon: ThumbsDown, label: 'Not helpful', activeColor: 'text-rose-500 bg-rose-50' },
];

export function FeedbackWidget({ updateId, currentFeedback, onFeedback }: FeedbackWidgetProps) {
  const handleFeedback = (type: FeedbackType) => {
    onFeedback(updateId, type);
    toast({
      title: "Thanks for your feedback!",
      description: "Your input helps us improve our updates.",
    });
  };

  return (
    <div className="flex items-center gap-3 pt-3 mt-3 border-t border-border">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <div className="flex gap-1">
        {feedbackOptions.map((option) => {
          const Icon = option.icon;
          const isActive = currentFeedback === option.type;
          
          return (
            <Button
              key={option.type}
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback(option.type)}
              className={`h-8 w-8 p-0 rounded-full transition-colors ${
                isActive ? option.activeColor : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={option.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
