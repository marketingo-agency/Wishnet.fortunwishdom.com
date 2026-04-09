import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Trash2,
  Bot,
  User,
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ChatMessage,
  useAIChat,
  LLMSettings,
  OPENAI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  GEMINI_IMAGE_MODELS,
} from '@/hooks/useLLMSettings';
import { toast } from 'sonner';

interface AITestConsoleProps {
  settings: LLMSettings | null;
}

export function AITestConsole({ settings }: AITestConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [model, setModel] = useState('gpt-4o');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending } = useAIChat();

  const availableProviders = [
    ...(settings?.openai_enabled ? ['openai'] : []),
    ...(settings?.gemini_enabled ? ['gemini'] : []),
  ] as ('openai' | 'gemini')[];

  const currentModels =
    mode === 'text'
      ? provider === 'openai'
        ? OPENAI_TEXT_MODELS
        : GEMINI_TEXT_MODELS
      : provider === 'openai'
      ? OPENAI_IMAGE_MODELS
      : GEMINI_IMAGE_MODELS;

  useEffect(() => {
    // Set default model when provider or mode changes
    if (provider === 'openai') {
      setModel(mode === 'text' ? 'gpt-4o' : 'dall-e-3');
    } else {
      setModel(mode === 'text' ? 'gemini-1.5-pro' : 'gemini-1.5-pro-vision');
    }
  }, [provider, mode]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    sendMessage(
      { message: input, provider, model, mode },
      {
        onSuccess: (data) => {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.content || data.message,
            timestamp: new Date(),
            isImage: mode === 'image',
            imageUrl: data.imageUrl,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to get response');
          // Remove the user message if there was an error
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        },
      }
    );
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const noProvidersEnabled = availableProviders.length === 0;

  return (
    <Card className="flex flex-col h-full border-2 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Test Console
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 mt-3">
          <div className="flex gap-2">
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as 'openai' | 'gemini')}
              disabled={noProvidersEnabled}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === 'openai' ? 'OpenAI' : 'Gemini'}
                  </SelectItem>
                ))}
                {noProvidersEnabled && (
                  <SelectItem value="none" disabled>
                    No providers
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select
              value={model}
              onValueChange={setModel}
              disabled={noProvidersEnabled}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'image')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" disabled={noProvidersEnabled}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="image" disabled={noProvidersEnabled}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Image
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {noProvidersEnabled ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No providers enabled</p>
              <p className="text-sm">Enable OpenAI or Gemini to start testing</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
              <Sparkles className="h-12 w-12 mb-4 text-purple-300" />
              <p className="font-medium">Ready to test</p>
              <p className="text-sm">Send a message to test your AI integration</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 group',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2 relative',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.isImage && message.imageUrl ? (
                      <img
                        src={message.imageUrl}
                        alt="Generated"
                        className="rounded-lg max-w-full"
                      />
                    ) : message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:text-xs prose-pre:bg-muted prose-pre:text-foreground prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}

                    {message.role === 'assistant' && !message.isImage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'text'
                  ? 'Type a message...'
                  : 'Describe the image you want...'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isPending || noProvidersEnabled}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isPending || noProvidersEnabled}
              className="shrink-0"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {provider === 'openai' ? 'OpenAI' : 'Gemini'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currentModels.find((m) => m.value === model)?.label || model}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                mode === 'image' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
              )}
            >
              {mode === 'text' ? 'Text' : 'Image'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
