import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  Copy, 
  Play,
  Wand2,
  Plus,
  X
} from 'lucide-react';
import { Prompt } from './PromptLibrary';
import { agents } from './AgentConfigGrid';

interface PromptEditorProps {
  prompt: Prompt | null;
  onTestPrompt: (content: string) => void;
}

export function PromptEditor({ prompt, onTestPrompt }: PromptEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'system' | 'template' | 'agent'>('template');
  const [content, setContent] = useState('');
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setDescription(prompt.description);
      setCategory(prompt.category);
      setContent(prompt.content);
      setAssignedAgents(prompt.agentIds);
      setTags(prompt.tags);
    } else {
      setName('');
      setDescription('');
      setCategory('template');
      setContent('');
      setAssignedAgents([]);
      setTags([]);
    }
  }, [prompt]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleAgent = (agentId: string) => {
    setAssignedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  if (!prompt) {
    return (
      <Card className="h-full border-border/50 flex items-center justify-center">
        <CardContent className="text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Wand2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Select a prompt to edit</p>
          <p className="text-xs text-muted-foreground mt-1">or create a new one</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/50 flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-amber-500" />
          Prompt Editor
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto py-4 space-y-5">
        {/* Basic Info */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prompt name"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Prompt</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="agent">Agent-Specific</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Content</Label>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {content.length} chars
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your prompt here. Use {{variable}} for placeholders."
            className="min-h-[160px] text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Tip: Use {"{{variable}}"} syntax for dynamic placeholders
          </p>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-xs">Tags</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag"
              className="h-8 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <Button variant="outline" size="sm" className="h-8" onClick={addTag}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs pr-1">
                  {tag}
                  <button 
                    className="ml-1 hover:text-destructive"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Agent Assignment */}
        <div className="space-y-2">
          <Label className="text-xs">Assign to Agents</Label>
          <div className="grid grid-cols-2 gap-2">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border/50"
              >
                <Checkbox
                  id={`agent-${agent.id}`}
                  checked={assignedAgents.includes(agent.id)}
                  onCheckedChange={() => toggleAgent(agent.id)}
                />
                <label 
                  htmlFor={`agent-${agent.id}`}
                  className="text-xs cursor-pointer"
                >
                  {agent.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <div className="p-4 border-t border-border/50 flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onTestPrompt(content)}
        >
          <Play className="h-4 w-4 mr-2" />
          Test
        </Button>
        <Button className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </Card>
  );
}
