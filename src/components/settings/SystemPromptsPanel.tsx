"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bot, Save, History, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSystemPrompts,
  useCreateSystemPrompt,
  useRollbackSystemPrompt,
  type SystemPrompt,
} from '@/hooks/useSystemPrompts';

const AGENTS = [
  { id: 'osha', label: 'Osha' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'promptor', label: 'Promptor' },
  { id: 'nexus', label: 'Nexus' },
];

export function SystemPromptsPanel() {
  const [selectedAgent, setSelectedAgent] = useState('osha');
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showHistory, setShowHistory] = useState<{ agentId: string; promptKey: string } | null>(null);

  const { data: prompts = [], isLoading } = useSystemPrompts(selectedAgent);
  const { data: allPrompts = [] } = useSystemPrompts(showHistory?.agentId);
  const createPrompt = useCreateSystemPrompt();
  const rollbackPrompt = useRollbackSystemPrompt();

  // Group by prompt_key, show only active
  const activePrompts = prompts.filter(p => p.is_active);
  const historyForKey = showHistory
    ? allPrompts.filter(p => p.prompt_key === showHistory.promptKey).sort((a, b) => b.version - a.version)
    : [];

  const handleSave = async () => {
    if (!editingPrompt) return;
    try {
      await createPrompt.mutateAsync({
        agent_id: editingPrompt.agent_id,
        prompt_key: editingPrompt.prompt_key,
        content: editContent,
      });
      toast.success(`Prompt updated (v${editingPrompt.version + 1})`);
      setEditingPrompt(null);
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !newContent.trim()) return;
    try {
      await createPrompt.mutateAsync({
        agent_id: selectedAgent,
        prompt_key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
        content: newContent.trim(),
      });
      toast.success('Prompt created');
      setShowCreate(false);
      setNewKey('');
      setNewContent('');
    } catch (err) {
      toast.error('Failed to create: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRollback = async (version: number) => {
    if (!showHistory) return;
    try {
      await rollbackPrompt.mutateAsync({
        agentId: showHistory.agentId,
        promptKey: showHistory.promptKey,
        targetVersion: version,
      });
      toast.success(`Rolled back to v${version}`);
      setShowHistory(null);
    } catch (err) {
      toast.error('Rollback failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Prompts</h3>
          <p className="text-sm text-muted-foreground">
            Edit AI agent system prompts without redeploying edge functions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENTS.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Prompt
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : activePrompts.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No custom prompts for {AGENTS.find(a => a.id === selectedAgent)?.label}.</p>
            <p className="text-xs text-muted-foreground mt-1">The agent is using its hardcoded default prompts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activePrompts.map(prompt => (
            <Card key={prompt.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-mono">{prompt.prompt_key}</CardTitle>
                    <Badge variant="outline" className="text-xs">v{prompt.version}</Badge>
                    <Badge variant="secondary" className="text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory({ agentId: prompt.agent_id, promptKey: prompt.prompt_key })}
                    >
                      <History className="h-4 w-4 mr-1" /> History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingPrompt(prompt); setEditContent(prompt.content); }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono bg-muted/50 p-3 rounded-lg">
                  {prompt.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit: {editingPrompt?.prompt_key} (v{editingPrompt?.version})</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Saving creates a new version (v{(editingPrompt?.version ?? 0) + 1}). Previous versions are kept for rollback.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createPrompt.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save as v{(editingPrompt?.version ?? 0) + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Prompt for {AGENTS.find(a => a.id === selectedAgent)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prompt Key</Label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., main, operator, creative, blueprint"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="You are..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createPrompt.isPending || !newKey.trim() || !newContent.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={(open) => !open && setShowHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History: {showHistory?.promptKey}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {historyForKey.map(p => (
              <Card key={p.id} className={p.is_active ? 'border-emerald-500/30' : ''}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{p.version}</Badge>
                      {p.is_active && (
                        <Badge variant="secondary" className="text-emerald-600 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!p.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(p.version)}
                        disabled={rollbackPrompt.isPending}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 font-mono">
                    {p.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
