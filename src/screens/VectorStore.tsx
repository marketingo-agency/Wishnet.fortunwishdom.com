"use client";

/**
 * Vector Store Page
 * 
 * Dedicated page for managing the knowledge vector store under MasterMind.
 */

import { Database, BrainCircuit, Heart, Settings, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { VectorStorePanel } from '@/components/settings/VectorStorePanel';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function VectorStore() {
  return (
    <div className="flex h-full p-0">
      <div className="flex-1 flex flex-col min-w-0 bg-card rounded-xl sm:rounded-2xl border shadow-sm m-2 sm:m-4 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">RAG Knowledge Base</h1>
                <p className="text-muted-foreground text-sm">
                  Retrieval-Augmented Generation knowledge base
                </p>
              </div>
            </div>
            
            {/* Quick Access Buttons */}
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild className="min-h-[44px] min-w-[44px] hover:bg-indigo-50 hover:border-indigo-200">
                      <Link href="/mastermind/brain">
                        <BrainCircuit className="w-5 h-5 text-indigo-500" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>The Brain</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild className="min-h-[44px] min-w-[44px] hover:bg-rose-50 hover:border-rose-200">
                      <Link href="/mastermind/heart">
                        <Heart className="w-5 h-5 text-rose-500" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>The Heart</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild className="min-h-[44px] min-w-[44px] hover:bg-amber-50 hover:border-amber-200">
                      <Link href="/mastermind/wishpedia">
                        <BookOpen className="w-5 h-5 text-amber-500" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Wishpedia</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild className="min-h-[44px] min-w-[44px] hover:bg-muted">
                      <Link href="/settings?tab=mastermind">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>MasterMind Settings</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <VectorStorePanel />
        </div>
      </div>
    </div>
  );
}
