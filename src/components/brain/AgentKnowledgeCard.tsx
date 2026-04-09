"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { AgentMetadata } from '@/data/agents';
import { useBrainSections } from '@/hooks/useBrainSections';
import { useBrainDocumentCounts } from '@/hooks/useBrainDocuments';

interface AgentKnowledgeCardProps {
  agent: AgentMetadata;
}

export function AgentKnowledgeCard({ agent }: AgentKnowledgeCardProps) {
  const router = useRouter();
  const { data: sections } = useBrainSections();
  const { data: counts } = useBrainDocumentCounts();

  // Find the section for this agent
  const section = sections?.find(s => s.agent_id === agent.id);
  const documentCount = section ? (counts?.[section.id] || 0) : 0;

  const Icon = agent.icon;

  return (
    <Card 
      className="border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={() => router.push(`/mastermind/brain/${agent.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          <div 
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-sm mb-3 group-hover:scale-105 transition-transform`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-medium text-foreground mb-1">{agent.name}</h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{agent.role}</p>
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
            <FileText className="w-3 h-3 mr-1" />
            {documentCount} docs
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
