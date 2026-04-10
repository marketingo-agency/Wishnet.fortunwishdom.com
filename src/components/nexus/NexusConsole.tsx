import React from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Sparkles, Image as ImageIcon, Settings2, Copy, Check, Trash2, ChevronDown,
  Loader2, Bot, User, Search, RefreshCw, CheckSquare, X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { LLMSettings } from '@/hooks/useLLMSettings';
import { useNexusConsoleController } from '@/hooks/useNexusConsoleController';

interface NexusConsoleProps {
  settings: LLMSettings | null;
  initialPrompt?: string;
  initialMode?: 'text' | 'image' | 'research';
}

export function NexusConsole({ settings, initialPrompt, initialMode }: NexusConsoleProps) {
  const ctrl = useNexusConsoleController({ settings, initialPrompt, initialMode });

  return (
    <Card className="flex flex-col h-full border-border/50">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Test Console
          </CardTitle>
          {ctrl.selectionMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">{ctrl.selectedIds.size} selected</span>
              <Button
                variant="destructive" size="sm" onClick={ctrl.handleDeleteSelected}
                disabled={ctrl.selectedIds.size === 0 || ctrl.deleteSelectedMessages.isPending}
                className="h-7 text-xs"
              >
                {ctrl.deleteSelectedMessages.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { ctrl.setSelectionMode(false); }} className="h-7 text-xs">
                <X className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Cancel</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {ctrl.messages.length > 0 && <span className="text-xs text-muted-foreground">{ctrl.messages.length}/100</span>}
              {ctrl.messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => ctrl.setSelectionMode(true)} className="h-7 text-xs text-muted-foreground">
                  <CheckSquare className="h-3 w-3 mr-1" />Select
                </Button>
              )}
              {ctrl.messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={ctrl.clearChat} className="h-7 text-xs text-muted-foreground">
                  <Trash2 className="h-3 w-3 mr-1" />Clear All
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Provider & Model Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Select value={ctrl.provider} onValueChange={(v) => ctrl.setProvider(v as 'openai' | 'gemini')} disabled={ctrl.isDisabled || ctrl.mode === 'research'}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              {ctrl.availableProviders.map((p) => (
                <SelectItem key={p} value={p}>{p === 'openai' ? 'OpenAI' : 'Gemini'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ctrl.model} onValueChange={ctrl.setModel} disabled={ctrl.isDisabled || ctrl.currentModels.length === 0}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Model" /></SelectTrigger>
            <SelectContent>
              {ctrl.currentModels.map((m) => (
                <SelectItem key={m.value} value={m.value}><span>{m.label}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode Tabs */}
        <Tabs value={ctrl.mode} onValueChange={(v) => ctrl.handleModeChange(v as 'text' | 'image' | 'research')} className="mt-3">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="text" className="text-xs" disabled={ctrl.isDisabled}>
              <Sparkles className="h-3 w-3 mr-1.5" />Text
            </TabsTrigger>
            <TabsTrigger value="research" className="text-xs" disabled={ctrl.isDisabled || !ctrl.availableProviders.includes('openai')} title={!ctrl.availableProviders.includes('openai') ? 'Requires OpenAI API key' : ''}>
              <Search className="h-3 w-3 mr-1.5" />Research
            </TabsTrigger>
            <TabsTrigger value="image" className="text-xs" disabled={ctrl.isDisabled}>
              <ImageIcon className="h-3 w-3 mr-1.5" />Image
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Advanced Settings */}
        <Collapsible open={ctrl.showAdvanced} onOpenChange={ctrl.setShowAdvanced} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
              <span className="flex items-center gap-1.5"><Settings2 className="h-3 w-3" />Advanced Settings</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", ctrl.showAdvanced && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Temperature: {ctrl.temperature[0].toFixed(1)}</label>
              <Slider value={ctrl.temperature} onValueChange={ctrl.setTemperature} min={0} max={2} step={0.1} disabled={ctrl.isDisabled} />
              <p className="text-xs text-muted-foreground mt-1">Lower = focused, Higher = creative</p>
            </div>
            {ctrl.mode !== 'image' && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">System Prompt</label>
                <Textarea value={ctrl.systemPrompt} onChange={(e) => ctrl.setSystemPrompt(e.target.value)} placeholder="You are a helpful AI assistant..." className="text-xs min-h-[60px] resize-none" disabled={ctrl.isDisabled} />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={ctrl.scrollRef}>
          {ctrl.messagesLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Loading conversation history...</p>
            </div>
          ) : ctrl.isDisabled ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No AI providers configured.</p>
              <p className="text-xs text-muted-foreground mt-1">Go to Settings → LLM Providers to add your API keys.</p>
            </div>
          ) : ctrl.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">Start a conversation to test AI capabilities.</p>
              <p className="text-xs text-muted-foreground mt-1">Try a quick prompt from the sidebar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ctrl.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 items-start",
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    ctrl.selectionMode && 'cursor-pointer'
                  )}
                  onClick={ctrl.selectionMode ? () => ctrl.toggleMessageSelection(message.id) : undefined}
                >
                  {ctrl.selectionMode && (
                    <div className="flex items-center pt-2 shrink-0">
                      <Checkbox checked={ctrl.selectedIds.has(message.id)} onCheckedChange={() => ctrl.toggleMessageSelection(message.id)} onClick={(e) => e.stopPropagation()} />
                    </div>
                  )}
                  {message.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={cn("max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 relative group", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    {message.isImage && message.imageUrl ? (
                      <div>
                        <Image src={message.imageUrl} alt="Generated" width={512} height={512} className="rounded-lg max-w-full h-auto" unoptimized />
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => ctrl.handleDeleteImage(message)} disabled={ctrl.savingImageId === message.id}>
                            {ctrl.savingImageId === message.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Delete from Files
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => ctrl.handleRegenerate(message)} disabled={ctrl.isPending || ctrl.isResearching || ctrl.isStreaming}>
                            <RefreshCw className="h-3 w-3" />Regenerate
                          </Button>
                        </div>
                      </div>
                    ) : message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-xs prose-pre:bg-muted prose-pre:text-foreground prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{ p: ({ children }) => <div className="my-1">{children}</div> }}
                        >{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.role === 'assistant' && !message.isImage && (
                      <Button variant="ghost" size="sm" className="sm:absolute sm:-right-10 sm:top-1 h-7 w-7 p-0 mt-1 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => ctrl.handleCopy(message.content, message.id)}>
                        {ctrl.copiedId === message.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {ctrl.isPending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {ctrl.isResearching && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center shrink-0 animate-pulse">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Deep Research in Progress</p>
                        <p className="text-xs text-muted-foreground">{ctrl.researchProgress || 'Initializing...'}</p>
                        <p className="text-xs text-muted-foreground mt-1">This may take 1-5 minutes. Please don't close this tab.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              value={ctrl.input}
              onChange={(e) => ctrl.setInput(e.target.value)}
              placeholder={ctrl.mode === 'text' ? "Type a message..." : ctrl.mode === 'research' ? "Enter a research topic..." : "Describe the image..."}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ctrl.handleSend()}
              disabled={ctrl.isDisabled || ctrl.isPending || ctrl.isResearching || ctrl.isStreaming}
              className="flex-1"
            />
            <Button
              onClick={ctrl.handleSend}
              disabled={!ctrl.input.trim() || ctrl.isPending || ctrl.isResearching || ctrl.isStreaming || ctrl.isDisabled}
              className="bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600"
            >
              {ctrl.isPending || ctrl.isResearching || ctrl.isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">{ctrl.provider === 'openai' ? 'OpenAI' : 'Gemini'}</Badge>
            <Badge variant="outline" className="text-xs">{ctrl.model}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{ctrl.mode}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
