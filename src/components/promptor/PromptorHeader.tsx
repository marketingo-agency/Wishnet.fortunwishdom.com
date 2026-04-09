"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, BrainCircuit, Database, Brain, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLLMSettings } from '@/hooks/useLLMSettings';
import { useProviderKeyStatus } from '@/hooks/useProviderKeyStatus';

interface PromptorHeaderProps {
  lastHeartChunks?: number;
  lastBrainChunks?: number;
  isConnected?: boolean;
}

export function PromptorHeader({ lastHeartChunks, lastBrainChunks, isConnected = true }: PromptorHeaderProps) {
  const router = useRouter();
  const { data: settings } = useLLMSettings();
  const { data: keyStatus } = useProviderKeyStatus();
  const hasOpenAI = !!keyStatus?.openai;
  const hasGemini = !!keyStatus?.gemini;
  const hasRetrievalStats = lastHeartChunks !== undefined || lastBrainChunks !== undefined;

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-card">
      <div className="flex items-center justify-between gap-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-semibold text-foreground">Promptor</h1>
              <Badge
                variant="outline"
                className="text-violet-600 border-violet-200 bg-violet-50 text-xs font-medium shrink-0"
              >
                Prompt Engineering AI
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Prompt Engineer · Powered by Fortun MasterMind</p>
              {hasRetrievalStats && (
                <>
                  <span className="text-muted-foreground/50 hidden sm:inline">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                      <Heart className="h-2.5 w-2.5" />
                      {lastHeartChunks ?? 0} rules
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      <Brain className="h-2.5 w-2.5" />
                      {lastBrainChunks ?? 0} chunks
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: badges + icon buttons (matching Nexus pattern) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* MasterMind badge */}
          <Badge
            variant="outline"
            className={`text-xs sm:text-sm ${isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-1 sm:mr-1.5 ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
            }`} />
            Connected<span className="hidden sm:inline"> to MasterMind</span>
          </Badge>

          {/* Promptor Brain button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push('/mastermind/brain/promptor')}
                  className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-violet-50 hover:border-violet-200"
                >
                  <BrainCircuit className="w-4 h-4 text-violet-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Promptor Knowledge Base</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Vector Store button */}
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
    </div>
  );
}
