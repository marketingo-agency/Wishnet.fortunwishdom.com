import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });
import { Copy, Check, Trash2, X, Download, FileText, Image as ImageIcon, Layers, Palette, BrainCircuit, Maximize2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoPlayer } from '@/components/ui/video-player';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { PixelMessage } from '@/hooks/usePixel';
import { SavePixelToBrainDialog } from './SavePixelToBrainDialog';
import { useSecureImageUrl } from '@/hooks/files';

import { PLATFORM_POST_TYPES } from './PixelControlPanel';
import type { PixelMode } from './PixelTopBar';

// ─── Platform label helpers ───────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  cross_platform: 'Cross Platform',
};

function buildCardTitle(
  mode?: string,
  selectedPostType?: string | null,
  selectedSize?: { width: number; height: number; ratio: string } | null,
) {
  const parts: string[] = [];
  parts.push(PLATFORM_LABELS[mode || ''] || 'Pixel');
  if (selectedPostType && mode) {
    const postTypes = PLATFORM_POST_TYPES[mode as PixelMode] || [];
    const pt = postTypes.find(p => p.id === selectedPostType);
    if (pt) parts.push(pt.label);
  }
  return parts.join(' — ');
}

// ─── Fullscreen lightbox ──────────────────────────────────────────────────────
function FullscreenLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-muted/80 text-foreground hover:text-foreground hover:bg-muted transition-all z-10"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Mermaid renderer ─────────────────────────────────────────────────────────
function MermaidDiagram({ chart, id }: { chart: string; id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
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
            script.onerror = () => reject();
            document.head.appendChild(script);
          });
        }
        const mermaid = window.mermaid!;
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
        if (!containerRef.current || cancelled) return;
        const { svg } = await mermaid.render(diagramId, chart.trim());
        if (!containerRef.current || cancelled) return;
        containerRef.current.innerHTML = svg;
        setStatus('rendered');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    renderDiagram();
    return () => { cancelled = true; };
  }, [chart, diagramId]);

  if (status === 'loading') return <Skeleton className="h-40 w-full rounded-xl bg-muted" />;
  if (status === 'error') return (
    <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border text-foreground">{chart}</pre>
  );
  return <div ref={containerRef} className="overflow-x-auto rounded-xl bg-background/50 border border-border p-4 [&_svg]:max-w-full [&_svg]:h-auto" />;
}

function createMarkdownComponents(messageId: string) {
  let mermaidIndex = 0;
  return {
    // Render <p> as <div> to prevent invalid <p><pre> nesting (React hydration error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-markdown component props are loosely typed
    p({ children }: any) {
      return <div className="my-1.5">{children}</div>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-markdown component props are loosely typed
    code({ className, children, ...props }: any) {
      const language = /language-(\w+)/.exec(className || '')?.[1];
      const isBlock = !props.inline;
      if (isBlock && language === 'mermaid') {
        return <MermaidDiagram chart={String(children).replace(/\n$/, '')} id={`${messageId}-${mermaidIndex++}`} />;
      }
      if (isBlock) {
        return (
          <pre className="bg-muted border border-border rounded-lg p-3 overflow-x-auto my-2">
            <code className="text-xs font-mono text-foreground" {...props}>{children}</code>
          </pre>
        );
      }
      return <code className="bg-pink-500/15 text-pink-300 rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>;
    },
  };
}

interface PixelOutputCardProps {
  userMessage: PixelMessage;
  aiMessage: PixelMessage;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onDelete: (id: string) => void;
  blueprintName?: string;
  selectedPostType?: string | null;
  selectedSize?: { width: number; height: number; ratio: string } | null;
  mode?: string;
}

export function PixelOutputCard({
  userMessage, aiMessage, copiedId, onCopy, onDelete, blueprintName,
  selectedPostType, selectedSize, mode,
}: PixelOutputCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [saveToBrainOpen, setSaveToBrainOpen] = useState(false);
  
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const isImage = !!(aiMessage.is_image && aiMessage.image_url);
  const isVideo = !!(aiMessage.is_video && aiMessage.video_url);
  // Re-sign the private 'files' reference on every mount so the media never
  // breaks when the originally-stored signed/public URL expires (durable fix).
  const secureUrl = useSecureImageUrl(aiMessage.video_url || aiMessage.image_url);

  const cardTitle = buildCardTitle(mode, selectedPostType, selectedSize);
  const timestamp = aiMessage.created_at ? format(new Date(aiMessage.created_at), 'h:mm a') : null;
  const markdownComponents = createMarkdownComponents(aiMessage.id);
  const userAttachments = (userMessage.attachments || []) as Array<{ name: string; type: string; size: number }>;

  const handleDownload = async () => {
    const url = secureUrl;
    if (!url) return;
    const ext = isVideo ? 'mp4' : 'png';
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `pixel-${aiMessage.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-3 duration-300 space-y-2">
      {/* User brief chip */}
      <div className="flex items-start gap-2.5">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-foreground">U</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Brief</span>
          </div>
          {userAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {userAttachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 text-[10px] text-muted-foreground border border-border">
                  {att.type.startsWith('image') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span className="max-w-[100px] truncate">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-foreground leading-relaxed">{userMessage.content}</p>
        </div>
      </div>

      {/* AI Output card */}
      <div className="ml-0 sm:ml-8 rounded-2xl border border-border/60 bg-background overflow-hidden shadow-xl shadow-black/30 group">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Palette className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-pink-400">
              {cardTitle}
            </span>
            {selectedSize && (isImage || isVideo) && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted border border-border rounded-md px-1.5 py-0.5">
                {selectedSize.width}×{selectedSize.height}
              </div>
            )}
            {selectedSize && (isImage || isVideo) && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted border border-border rounded-md px-1.5 py-0.5">
                {selectedSize.ratio}
              </div>
            )}
            {blueprintName && (
              <div className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md px-1.5 py-0.5">
                <Layers className="h-2.5 w-2.5" />
                {blueprintName}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {(isImage || isVideo) && (
              <button onClick={() => setFullscreenOpen(true)} className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="View fullscreen">
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Card content */}
        <div className="bg-card px-5 py-4">
          {isVideo && aiMessage.video_url ? (
            <div className="space-y-3">
              {aiMessage.content && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {aiMessage.content}
                  </ReactMarkdown>
                </div>
              )}
              <VideoPlayer
                src={secureUrl || ''}
                className="shadow-md cursor-pointer"
                onClick={() => setFullscreenOpen(true)}
              />
            </div>
          ) : isImage && aiMessage.image_url ? (
            <div className="space-y-3">
              {aiMessage.content && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {aiMessage.content}
                  </ReactMarkdown>
                </div>
              )}
              <div
                className="rounded-xl overflow-hidden border border-border shadow-md cursor-pointer group/img relative"
                onClick={() => setFullscreenOpen(true)}
              >
                {!imgLoaded && <Skeleton className="w-full h-64 rounded-xl" />}
                {secureUrl && <img
                  src={secureUrl}
                  alt="Generated by Pixel"
                  className={cn('max-w-full h-auto block', !imgLoaded && 'hidden')}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                />}
                {imgLoaded && (
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover/img:opacity-80 transition-opacity drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={cn(
              'prose prose-sm max-w-none overflow-x-auto',
              'prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5',
              'prose-headings:text-foreground',
              'prose-strong:text-foreground',
              'prose-p:text-muted-foreground',
              'prose-li:text-muted-foreground',
              'prose-a:text-pink-600 dark:prose-a:text-pink-400',
              'prose-blockquote:border-l-pink-400',
              'prose-table:text-xs prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-1.5',
              'prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5',
              'prose-code:text-xs prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-0 prose-pre:border-0',
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {aiMessage.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-background/80 border-t border-border">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={() => onCopy(aiMessage.content, aiMessage.id)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              {copiedId === aiMessage.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span className="hidden sm:inline">{copiedId === aiMessage.id ? 'Copied!' : 'Copy'}</span>
            </button>
            {isImage && (
              <button onClick={() => setSaveToBrainOpen(true)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-pink-400 transition-colors px-2 py-1 rounded-md hover:bg-pink-500/10">
                <BrainCircuit className="h-3 w-3" />
                <span className="hidden sm:inline">Save to Brain</span>
              </button>
            )}
            {(aiMessage.image_url || aiMessage.video_url) && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            {pendingDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete(userMessage.id); onDelete(aiMessage.id); }} className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:bg-emerald-500/10 transition-colors px-2 py-1 rounded-md">
                  <Check className="h-3 w-3" />
                  <span className="hidden sm:inline">Confirm</span>
                </button>
                <button onClick={() => setPendingDelete(false)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted">
                  <X className="h-3 w-3" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setPendingDelete(true)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-rose-400 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10">
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
          {timestamp && <span className="text-[10px] text-muted-foreground/60">{timestamp}</span>}
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {fullscreenOpen && (isImage && aiMessage.image_url) && (
        <FullscreenLightbox
          src={secureUrl || ''}
          alt="Generated by Pixel"
          onClose={() => setFullscreenOpen(false)}
        />
      )}
      {fullscreenOpen && (isVideo && aiMessage.video_url) && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullscreenOpen(false)}
        >
          <button
            onClick={() => setFullscreenOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-muted/80 text-foreground hover:text-foreground hover:bg-muted transition-all z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <VideoPlayer
            src={secureUrl || ''}
            autoPlay
            className="max-h-[90vh] max-w-[90vw] border-0"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {isImage && aiMessage.image_url && (
        <>
          <SavePixelToBrainDialog open={saveToBrainOpen} onOpenChange={setSaveToBrainOpen} imageUrl={secureUrl || aiMessage.image_url} messageId={aiMessage.id} />
        </>
      )}
    </div>
  );
}

// ─── User-only message (for orphaned user messages) ────────────────────────────
export function PixelUserBrief({ message, onDelete }: { message: PixelMessage; onDelete: (id: string) => void }) {
  const userAttachments = (message.attachments || []) as Array<{ name: string; type: string; size: number }>;
  return (
    <div className="flex items-start gap-2.5 animate-in slide-in-from-bottom-3 duration-300">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-foreground">U</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Brief</span>
        {userAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
            {userAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 text-[10px] text-muted-foreground border border-border">
                {att.type.startsWith('image') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                <span className="max-w-[100px] truncate">{att.name}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-foreground leading-relaxed mt-0.5">{message.content}</p>
      </div>
    </div>
  );
}
