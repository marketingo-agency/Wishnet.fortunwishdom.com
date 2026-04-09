"use client";

import { useRouter } from 'next/navigation';
import { 
  Brain, 
  BrainCircuit, 
  Heart, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Zap,
  BookOpen,
  Scale,
  ArrowRight,
  Settings,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTotalDocumentCount } from '@/hooks/useBrainDocuments';
import { useActiveRulesCount } from '@/hooks/useHeartRules';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { useHeartCategories } from '@/hooks/useHeartCategories';
import { useWishpediaEntryCount } from '@/hooks/useWishpediaEntries';
import { AI_AGENTS } from '@/data/agents';

export default function MasterMind() {
  const router = useRouter();
  const { data: totalDocs } = useTotalDocumentCount();
  const { data: activeRules } = useActiveRulesCount();
  const { data: brainCategories } = useBrainCategories();
  const { data: heartCategories } = useHeartCategories();
  const { data: wishpediaCount } = useWishpediaEntryCount();
  const stats = {
    totalKnowledge: totalDocs || 0,
    activeRules: activeRules || 0,
    agentsCovered: AI_AGENTS.length,
  };

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">Fortun MasterMind</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Central intelligence hub for your AI agents</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="outline" 
              onClick={() => router.push('/mastermind/heart')}
              className="gap-2 text-sm"
              size="sm"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">Create Rule</span>
              <span className="sm:hidden">Rule</span>
            </Button>
            <Button 
              onClick={() => router.push('/mastermind/brain')}
              className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-sm"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Knowledge</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/mastermind/vector-store')}
                    className="h-9 w-9 min-h-[44px] min-w-[44px] hover:bg-emerald-50 hover:border-emerald-200"
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
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>MasterMind Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Knowledge</p>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground">{stats.totalKnowledge}</p>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Rules</p>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground">{stats.activeRules}</p>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">AI Agents</p>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground">{stats.agentsCovered}</p>
                    </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card 
                className="border-border/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push('/mastermind/brain')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                      <BrainCircuit className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">The Brain</h3>
                        <ArrowRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                        Upload documents and build your knowledge base. Organize by category and assign to specific agents.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          <FileText className="w-3 h-3 mr-1" />
                          {stats.totalKnowledge} docs
                        </Badge>
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                          {brainCategories?.length || 0} categories
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="border-border/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push('/mastermind/heart')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                      <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">The Heart</h3>
                        <ArrowRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                        Define rules and guidelines for AI behavior. Set communication styles, restrictions, and compliance.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                          <Scale className="w-3 h-3 mr-1" />
                          {stats.activeRules} active rules
                        </Badge>
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
                          {heartCategories?.length || 0} types
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="border-border/50 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push('/mastermind/wishpedia')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                      <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">Wishpedia</h3>
                        <ArrowRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
                        Curated encyclopedia of the Fortun Wishdom universe. Characters, places, artifacts, and more.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {wishpediaCount || 0} entries
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Agent Overview */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground">Connected AI Agents</CardTitle>
                <CardDescription>All agents can access the knowledge base and follow defined rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {AI_AGENTS.map((agent) => {
                    const Icon = agent.icon;
                    return (
                      <div 
                        key={agent.id}
                        className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate hidden sm:block">{agent.role}</p>
                        </div>
                        {/* Full badge on sm+, colored dot on mobile */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs shrink-0 hidden sm:flex ${
                            agent.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-muted/50 text-muted-foreground border-border'
                          }`}
                        >
                          {agent.status === 'active' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" />Soon</>
                          )}
                        </Badge>
                        <span 
                          className={`sm:hidden w-2 h-2 rounded-full shrink-0 ${
                            agent.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                          }`} 
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
