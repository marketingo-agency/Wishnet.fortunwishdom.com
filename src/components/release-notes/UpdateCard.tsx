"use client";

import React from 'react';
import { ReleaseUpdate, UpdateCategory } from './types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FeedbackWidget } from './FeedbackWidget';
import { Sparkles, TrendingUp, Bug, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface UpdateCardProps {
  update: ReleaseUpdate;
  currentFeedback?: 'up' | 'neutral' | 'down';
  onFeedback: (updateId: string, feedback: 'up' | 'neutral' | 'down') => void;
}

const categoryConfig: Record<UpdateCategory, { label: string; icon: React.ElementType; className: string }> = {
  feature: { 
    label: 'New Features', 
    icon: Sparkles, 
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
  },
  improvement: { 
    label: 'Improvement', 
    icon: TrendingUp, 
    className: 'bg-sky-100 text-sky-700 hover:bg-sky-100' 
  },
  fix: { 
    label: 'Bug Fix', 
    icon: Bug, 
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' 
  },
};

export function UpdateCard({ update, currentFeedback, onFeedback }: UpdateCardProps) {
  const router = useRouter();
  const config = categoryConfig[update.category];
  const Icon = config.icon;

  return (
    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className={config.className}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded">
              v{update.version}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {format(new Date(update.date), 'MMM d, yyyy')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-3">{update.title}</h3>

        {/* Changes list */}
        <ul className="space-y-2 mb-3">
          {update.changes.map((change, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{change}</span>
            </li>
          ))}
        </ul>

        {/* CTA if available */}
        {update.ctaLink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(update.ctaLink!)}
            className="text-primary hover:text-primary/80 px-0 h-auto font-medium"
          >
            Learn more
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        {/* Feedback */}
        <FeedbackWidget 
          updateId={update.id} 
          currentFeedback={currentFeedback}
          onFeedback={onFeedback}
        />
      </CardContent>
    </Card>
  );
}
