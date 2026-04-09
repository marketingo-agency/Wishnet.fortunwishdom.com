import React from 'react';
import { ReleaseUpdate } from './types';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface FeaturedUpdateProps {
  update: ReleaseUpdate;
}

export function FeaturedUpdate({ update }: FeaturedUpdateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 p-4 sm:p-6 mb-4 sm:mb-6">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 sm:w-48 h-24 sm:h-48 bg-gradient-to-tr from-pink-200/20 to-indigo-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured
              </Badge>
              <span className="text-xs sm:text-sm font-medium text-indigo-600">v{update.version}</span>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {format(new Date(update.date), 'MMMM d, yyyy')}
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">{update.title}</h2>
          
          {update.description && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {update.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
