"use client";

import React from 'react';
import { Bot, BrainCircuit, Database, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface OshaHeaderProps {
  mode: string;
  isConnected: boolean;
  complianceStatus?: string;
}

const MODE_CONFIG: Record<string, { label: string; colorClass: string; description: string }> = {
  guide:    { label: 'Guide',    colorClass: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',    description: 'Step-by-step onboarding assistant — walks you through tasks with clear, structured instructions' },
  operator: { label: 'Operator', colorClass: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400',            description: 'Task-oriented and concise — delivers checklists and direct answers with no fluff' },
  creative: { label: 'Creative', colorClass: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400', description: 'Imaginative content generation — produces ideas, copy, and creative output' },
  analyst:  { label: 'Analyst',  colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400', description: 'Structured reasoning and sourcing — provides thorough analysis with references' },
};

export function OshaHeader({ mode, isConnected, complianceStatus }: OshaHeaderProps) {
  const router = useRouter();
  const modeInfo = MODE_CONFIG[mode] || MODE_CONFIG.guide;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 mb-6 bg-gradient-to-r from-sky-500/5 via-cyan-500/5 to-transparent bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm">
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card flex items-center justify-center',
            isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}>
            {isConnected && (
              <span className="absolute h-full w-full rounded-full bg-emerald-400 animate-ping opacity-60" />
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight">Osha</h1>
            <Badge className="text-xs px-2.5 py-0.5 border font-medium bg-sky-500/10 text-sky-600 border-sky-500/25">
              AI Assistant
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">AI Assistant, Ideation & Research Agent<span className="hidden sm:inline"> · Powered by Fortun MasterMind</span></p>
        </div>
      </div>

      {/* Right: Status badges + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* MasterMind */}
        <Badge variant="outline" className="gap-1.5 text-xs px-2.5 py-1 border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Connected<span className="hidden sm:inline">&nbsp;to MasterMind</span>
        </Badge>

        {/* Compliance */}
        {complianceStatus && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 text-xs px-2.5 py-1',
              complianceStatus === 'pass' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
              complianceStatus === 'adjusted' && 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              complianceStatus === 'refused' && 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400',
            )}
          >
            <Zap className="h-3 w-3" />
            {complianceStatus === 'pass' ? 'Compliant' : complianceStatus === 'adjusted' ? 'Adjusted' : 'Refused'}
          </Badge>
        )}

        {/* Nav shortcuts */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/mastermind/brain/osha')}
                className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-violet-50 hover:border-violet-200"
              >
                <BrainCircuit className="w-4 h-4 text-violet-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Osha Knowledge Base</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/mastermind/vector-store')}
                className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-emerald-50 hover:border-emerald-200"
              >
                <Database className="w-4 h-4 text-emerald-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>RAG Knowledge Base</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
