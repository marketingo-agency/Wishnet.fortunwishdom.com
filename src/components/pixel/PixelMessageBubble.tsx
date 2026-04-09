import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Palette, User, Copy, Check, FileText, Image as ImageIcon, Trash2, X, Download, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { PixelMessage } from '@/hooks/usePixel';

interface PixelMessageBubbleProps {
  message: PixelMessage;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onDelete?: (id: string) => void;
}

// ─── Mermaid renderer ─────────────────────────────────────────────────────────

interface MermaidDiagramProps {
  chart: string;
  id: string;
}

function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const diagramId = `pixel-mermaid-${id}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        if (!window.mermaid) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Mermaid'));
            document.head.appendChild(script);
          });
        }

        const mermaid = window.mermaid!;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'strict',
        });

        if (!containerRef.current || cancelled) return;

        const { svg } = await mermaid.render(diagramId, chart.trim());
        if (!containerRef.current || cancelled) return;

        containerRef.current.innerHTML = svg;
        setStatus('rendered');
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e.message || 'Could not render diagram');
        }
      }
    }

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart, diagramId]);

  if (status === 'loading') {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-3">
        <p className="text-xs text-pink-600 dark:text-pink-400 mb-2">⚠ Diagram rendering failed — showing source instead.</p>
        {errorMsg && <p className="text-[10px] text-muted-foreground mb-2">{errorMsg}</p>}
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border/50">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="pixel-mermaid-diagram overflow-x-auto rounded-xl bg-muted/30 border border-border/50 p-4 [&_svg]:max-w-full [&_svg]:h-auto"
    />
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────

function createMarkdownComponents(messageId: string) {
  let mermaidIndex = 0;
  return {
    code({ node, className, children, ...props }: any) {
      const language = /language-(\w+)/.exec(className || '')?.[1];
      const isBlock = !props.inline;

      if (isBlock && language === 'mermaid') {
        const chartContent = String(children).replace(/\n$/, '');
        const idx = mermaidIndex++;
        return <MermaidDiagram chart={chartContent} id={`${messageId}-${idx}`} />;
      }

      if (isBlock) {
        return (
          <pre className="bg-muted border border-border rounded-lg p-3 overflow-x-auto my-2">
            <code className="text-xs font-mono" {...props}>{children}</code>
          </pre>
        );
      }

      return (
        <code className="bg-pink-500/10 text-pink-700 dark:text-pink-300 rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>
      );
    },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PixelMessageBubble({ message, copiedId, onCopy, onDelete }: PixelMessageBubbleProps) {
  const isUser = message.role === 'user';
  const attachments = message.attachments || [];
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [promptSetOpen, setPromptSetOpen] = useState(false);

  const handleCopyImage = async () => {
    try {
      const res = await fetch(message.image_url!);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      toast({ title: 'Could not copy image', description: 'Try right-clicking and saving instead.', variant: 'destructive' });
    }
  };

  const handleDownloadImage = async () => {
    try {
      const res = await fetch(message.image_url!);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixel-image-${message.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(message.image_url!, '_blank');
    }
  };

  const timestamp = message.created_at ? format(new Date(message.created_at), 'h:mm a') : null;
  const markdownComponents = createMarkdownComponents(message.id);

  // Detect blueprint and prompt set in response
  const hasBlueprint = !isUser && message.content.includes('**Blueprint:**');
  const hasPromptSet = !isUser && (message.content.includes('**Prompt Set:**') || message.content.includes('Prompt Set:'));
  const hasQAStatus = !isUser && message.content.includes('**QA Status:**');

  return (
    <div className={cn('flex gap-2.5 items-end group', isUser ? 'justify-end' : 'justify-start')}>
      {/* Pixel avatar */}
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0 mb-0.5 shadow-sm ring-2 ring-pink-300/20">
          <Palette className="h-4 w-4 text-white" style={{ height: '1rem', width: '1rem' }} />
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start', 'max-w-[85%]')}>
        {/* Attachment chips */}
        {isUser && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-pink-500/10 rounded-xl px-2.5 py-1 text-xs text-pink-700 dark:text-pink-300 border border-pink-500/20">
                {att.type.startsWith('image') ? (
                  <ImageIcon className="h-3 w-3" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                <span className="max-w-[120px] truncate">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'relative rounded-2xl px-4 py-3',
            isUser
              ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-tr-sm shadow-md shadow-pink-500/20'
              : 'bg-card border border-border/60 shadow-sm rounded-tl-sm'
          )}
        >
          {message.is_image && message.image_url ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border/40 shadow-md">
                {!imgLoaded && <Skeleton className="w-full h-64 rounded-xl" />}
                <img
                  src={message.image_url}
                  alt="Generated by Pixel"
                  className={cn('max-w-full h-auto block', !imgLoaded && 'hidden')}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                />
              </div>
              {message.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-p:text-muted-foreground text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ) : isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-headings:text-foreground prose-strong:text-foreground prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-code:text-xs prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-0 prose-pre:border-0 prose-blockquote:border-l-pink-400 prose-a:text-pink-600 prose-table:text-xs prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Badges row for AI messages */}
        {!isUser && (hasBlueprint || hasQAStatus) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasBlueprint && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-pink-500/20 bg-pink-500/5 text-pink-600 dark:text-pink-400">
                <Layers className="h-2.5 w-2.5" />
                Template
              </Badge>
            )}
            {hasQAStatus && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" />
                QA Pass
              </Badge>
            )}
          </div>
        )}

        {/* Action row — text messages */}
        {!isUser && !message.is_image && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => onCopy(message.content, message.id)}
            >
              {copiedId === message.id ? (
                <><Check className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
              ) : (
                <><Copy className="h-3 w-3" />Copy</>
              )}
            </button>
            {onDelete && (
              pendingDelete ? (
                <div className="flex items-center gap-0.5">
                  <button
                    className="flex items-center justify-center h-6 w-6 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    onClick={() => { onDelete(message.id); setPendingDelete(false); }}
                  ><Check className="h-3 w-3" /></button>
                  <button
                    className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                    onClick={() => setPendingDelete(false)}
                  ><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button
                  className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  onClick={() => setPendingDelete(true)}
                ><Trash2 className="h-3 w-3" /></button>
              )
            )}
          </div>
        )}

        {/* Action row — image messages */}
        {!isUser && message.is_image && message.image_url && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleCopyImage}
            >
              {copiedImage ? (
                <><Check className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">Copied</span></>
              ) : (
                <><Copy className="h-3 w-3" />Copy Image</>
              )}
            </button>
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleDownloadImage}
            >
              <Download className="h-3 w-3" />Download
            </button>
            {onDelete && (
              pendingDelete ? (
                <div className="flex items-center gap-0.5">
                  <button className="flex items-center justify-center h-6 w-6 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors" onClick={() => { onDelete(message.id); setPendingDelete(false); }}><Check className="h-3 w-3" /></button>
                  <button className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:bg-muted transition-colors" onClick={() => setPendingDelete(false)}><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => setPendingDelete(true)}><Trash2 className="h-3 w-3" /></button>
              )
            )}
          </div>
        )}

        {/* User delete */}
        {isUser && onDelete && (
          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {pendingDelete ? (
              <div className="flex items-center gap-0.5">
                <button className="flex items-center justify-center h-6 w-6 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors" onClick={() => { onDelete(message.id); setPendingDelete(false); }}><Check className="h-3 w-3" /></button>
                <button className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:bg-muted transition-colors" onClick={() => setPendingDelete(false)}><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <button className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => setPendingDelete(true)}><Trash2 className="h-3 w-3" /></button>
            )}
          </div>
        )}

        {/* Timestamp + mode */}
        <div className={cn('flex items-center gap-1.5', isUser ? 'justify-end' : 'justify-start')}>
          {!isUser && message.mode && (
            <span className="text-[9px] text-muted-foreground/50 capitalize">{message.mode.replace('_', ' ')}</span>
          )}
          {timestamp && <span className="text-[9px] text-muted-foreground/40">{timestamp}</span>}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0 mb-0.5 shadow-sm ring-2 ring-pink-300/20">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}
