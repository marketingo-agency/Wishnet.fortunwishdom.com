"use client";

import { useRouter } from 'next/navigation';
import { BookOpen, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBrainDocumentCounts } from '@/hooks/useBrainDocuments';
import { useGeneralSection } from '@/hooks/useBrainSections';
import { useBrainCategories } from '@/hooks/useBrainCategories';

export function GeneralKnowledgeCard() {
  const router = useRouter();
  const { data: section } = useGeneralSection();
  const { data: counts } = useBrainDocumentCounts();
  const { data: brainCategories } = useBrainCategories();
  
  const documentCount = section ? (counts?.[section.id] || 0) : 0;
  const categoryCount = brainCategories?.length ?? 0;

  return (
    <Card 
      className="border-border/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-indigo-50/50 to-white"
      onClick={() => router.push('/mastermind/brain/general')}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Mobile: Compact header row */}
          <div className="flex items-center gap-3 sm:hidden">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground flex-1">General Knowledge</h3>
            <ArrowRight className="w-5 h-5 text-indigo-500" />
          </div>
          
          {/* Desktop: Original layout */}
          <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="hidden sm:flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground">General Knowledge</h3>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 gap-1">
                Open <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
              Shared knowledge accessible to all AI agents. Organize content by category for easy management.
            </p>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {documentCount} docs
              </Badge>
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-xs">
                {categoryCount} categories
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
