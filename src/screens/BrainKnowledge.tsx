"use client";

import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  ChevronLeft,
  FileText,
  Bot,
  Settings,
  Database,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GeneralKnowledgeCard, AgentKnowledgeCard } from '@/components/brain';
import { useBrainSections } from '@/hooks/useBrainSections';
import { useTotalDocumentCount } from '@/hooks/useBrainDocuments';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { AI_AGENTS } from '@/data/agents';

export default function BrainKnowledge() {
  const router = useRouter();
  const { data: sections, isLoading: sectionsLoading, error: sectionsError, refetch: refetchSections } = useBrainSections();
  const { data: totalDocs } = useTotalDocumentCount();
  const { data: brainCategories } = useBrainCategories();

  // Get the count of agent sections that have documents
  const agentSections = sections?.filter(s => s.type === 'agent') || [];
  const categoryCount = brainCategories?.length ?? 0;

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/mastermind')}
              className="gap-2 text-muted-foreground hover:text-foreground -ml-2 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to MasterMind</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">The Brain</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Knowledge Base</p>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0 text-xs sm:text-sm">
              <FileText className="w-3 h-3 mr-1" />
              {totalDocs || 0} docs
            </Badge>
            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border shrink-0 hidden sm:flex text-xs sm:text-sm">
              {categoryCount} categories
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shrink-0 text-xs sm:text-sm">
              <Bot className="w-3 h-3 mr-1" />
              {AI_AGENTS.length} agents
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/mastermind/vector-store')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] shrink-0 hover:bg-emerald-50 hover:border-emerald-200"
                  >
                    <Database className="w-4 h-4 text-emerald-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>RAG Knowledge Base</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/settings?tab=mastermind')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] shrink-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>MasterMind Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Error State */}
            {sectionsError && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">Failed to load knowledge base</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {(sectionsError as Error).message || 'An unexpected error occurred.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchSections()} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!sectionsError && !sectionsLoading && totalDocs === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-muted-foreground/70" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Upload documents to the general knowledge section or to specific agents to build your AI knowledge base.
                </p>
              </div>
            )}

            {/* General Knowledge Section */}
            {!sectionsError && (totalDocs !== 0 || sectionsLoading) && (
            <section>
              <GeneralKnowledgeCard />
            </section>
            )}

            {/* Agent-Specific Knowledge */}
            {!sectionsError && (
            <section>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Agent-Specific Knowledge</h2>
                <Badge variant="outline" className="text-xs">
                  {AI_AGENTS.length} agents
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Upload specialized knowledge for individual AI agents. Documents added here are only accessible to the specific agent.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                {AI_AGENTS.map((agent) => (
                  <AgentKnowledgeCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
