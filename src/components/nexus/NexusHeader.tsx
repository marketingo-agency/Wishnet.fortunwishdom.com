"use client";

import { useRouter } from 'next/navigation';
import { Settings2, BrainCircuit, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LLMSettings } from '@/hooks/useLLMSettings';
import { useProviderKeyStatus, hasProviderKey } from '@/hooks/useProviderKeyStatus';

interface NexusHeaderProps {
  settings: LLMSettings | null;
}

export function NexusHeader({ settings }: NexusHeaderProps) {
  const router = useRouter();
  const { data: keyStatus } = useProviderKeyStatus();
  const providerChips = [
    { label: 'OpenAI', on: hasProviderKey(keyStatus?.openai) },
    { label: 'Gemini', on: hasProviderKey(keyStatus?.gemini) },
    { label: 'Claude', on: hasProviderKey(keyStatus?.claude) },
    { label: 'fal.ai', on: hasProviderKey(keyStatus?.fal) },
  ];

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Settings2 className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Nexus</h1>
              <Badge className="text-xs px-2.5 py-0.5 border font-medium bg-emerald-500/10 text-emerald-600 border-emerald-500/25">
                AI Control Center
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
              AI Control Center · Powered by Fortun MasterMind
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {providerChips.map((chip) => (
            <Badge
              key={chip.label}
              variant="outline"
              className={`text-xs sm:text-sm ${chip.on
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full mr-1 sm:mr-1.5 ${chip.on ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {chip.label}
            </Badge>
          ))}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push('/mastermind/brain/nexus')}
                  className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-indigo-50 hover:border-indigo-200"
                >
                  <BrainCircuit className="w-4 h-4 text-indigo-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nexus Knowledge Base</TooltipContent>
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
    </div>
  );
}
