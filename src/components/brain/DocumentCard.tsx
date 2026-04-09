import { Eye, Edit2, Trash2, Bot, Database, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { BrainDocument } from '@/types/brain';
import { AI_AGENTS } from '@/data/agents';
import { cn } from '@/lib/utils';
import { getFileIcon, formatFileSize, getFileExtension } from '@/lib/fileTypes';
import { useOcrIndexing, useDocumentIndexStatus } from '@/hooks/useOcrIndexing';
import { useProcessBrainDocumentEmbedding } from '@/hooks/useKnowledgeEmbeddings';

// Category color mapping for Brain documents
const CATEGORY_COLORS: Record<string, { accent: string; bg: string; iconColor: string }> = {
  brand: { accent: 'bg-blue-500', bg: 'bg-blue-100', iconColor: 'text-blue-600' },
  products: { accent: 'bg-green-500', bg: 'bg-green-100', iconColor: 'text-green-600' },
  support: { accent: 'bg-purple-500', bg: 'bg-purple-100', iconColor: 'text-purple-600' },
  operations: { accent: 'bg-amber-500', bg: 'bg-amber-100', iconColor: 'text-amber-600' },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.brand;
}

// Determine if a document can be indexed (any file type that can be processed)
function isIndexableDocument(mimeType: string): boolean {
  // PDFs and images - require OCR
  if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
    return true;
  }
  
  // Text-based files - direct extraction
  if (mimeType.includes('text/') || mimeType === 'application/json') {
    return true;
  }
  
  // Word documents
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
    return true;
  }
  
  // Spreadsheets (Excel, CSV, etc.)
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('.sheet')) {
    return true;
  }
  
  return false;
}

// Check if document needs OCR (vs direct text extraction)
function requiresOcrProcessing(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

interface DocumentCardProps {
  document: BrainDocument;
  onView?: (doc: BrainDocument) => void;
  onEdit?: (doc: BrainDocument) => void;
  onDelete?: (doc: BrainDocument) => void;
}

export function DocumentCard({ document, onView, onEdit, onDelete }: DocumentCardProps) {
  // Use React Query hook for reactive index status updates
  const { data: indexStatus } = useDocumentIndexStatus(document.id);
  const { mutate: startOcr, isPending: isOcrPending, progress } = useOcrIndexing();
  const { mutate: processEmbedding, isPending: isEmbeddingPending } = useProcessBrainDocumentEmbedding();

  const hasRestrictions = document.restricted_agents && document.restricted_agents.length > 0;
  const restrictedAgentNames = hasRestrictions 
    ? document.restricted_agents!.map(id => AI_AGENTS.find(a => a.id === id)?.name || id)
    : [];

  // Get file icon using centralized utility
  const { icon: FileIcon, color: iconColor } = getFileIcon(document.mime_type, document.original_name);

  const colors = getCategoryColors(document.category);

  // Determine if document can be indexed and which method to use
  const canBeIndexed = isIndexableDocument(document.mime_type);
  const needsOcr = requiresOcrProcessing(document.mime_type);
  const isProcessing = isOcrPending || isEmbeddingPending;
  const showIndexButton = canBeIndexed && indexStatus && !indexStatus.isIndexed && !isProcessing;

  const handleIndex = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (needsOcr) {
      // Use OCR workflow for PDFs/images
      startOcr({
        documentId: document.id,
        storagePath: document.storage_path,
        mimeType: document.mime_type,
        onProgress: () => {
          // Progress is tracked via the hook's progress state
        },
      });
    } else {
      // Use direct embedding for text-based files (CSV, TXT, DOCX, etc.)
      processEmbedding(document.id);
    }
  };

  // Two-phase progress: rendering (0–50%) + OCR (50–100%)
  const renderPercent = progress?.totalPages && progress.totalPages > 0
    ? (progress.currentPage / progress.totalPages) * 50
    : 0;
  const ocrPercent = progress?.totalPages && progress.totalPages > 0
    ? (progress.ocrCompletedPages / progress.totalPages) * 50
    : 0;
  const progressPercent = Math.min(100, renderPercent + ocrPercent);
  const ocrCompletedPages = progress?.ocrCompletedPages ?? 0;

  return (
    <Card className="group relative overflow-hidden border-border/50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg rounded-lg">
      {/* Colored accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 z-10', colors.accent)} />
      
      {/* Processing Overlay - OCR with progress or direct embedding */}
      {isProcessing && (
        <div className="absolute inset-0 rounded-lg bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30 p-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          {needsOcr && progress ? (
            <>
              <div className="w-full max-w-[140px]">
                <Progress value={progressPercent} className="h-1.5" />
              </div>
              <p className="text-xs font-medium text-foreground text-center">
                {Math.round(progressPercent)}%
              </p>
              <p className="text-xs text-muted-foreground text-center leading-tight">
                {progress.message}
              </p>
              {progress.totalPages > 1 && (
                <p className="text-xs text-muted-foreground/70 text-center">
                  OCR: {ocrCompletedPages} / {progress.totalPages} pages
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center leading-tight">
              Indexing document...
            </p>
          )}
        </div>
      )}

      {/* Hover action overlay — desktop only */}
      <div className="absolute inset-0 rounded-lg overflow-hidden [clip-path:inset(0_round_0.5rem)] bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-2 z-20">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-card shadow-sm hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(document);
          }}
        >
          <Eye className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-card shadow-sm hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(document);
          }}
        >
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </Button>
        {showIndexButton && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-amber-50 shadow-sm hover:bg-amber-100 border-amber-200"
            onClick={handleIndex}
          >
            <Database className="w-4 h-4 text-amber-700" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-card shadow-sm hover:bg-red-50 hover:border-red-200"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(document);
          }}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      
      <CardContent className="p-3 sm:p-4 pt-4 sm:pt-5">
        <div className="flex flex-col items-center text-center">
          {/* Icon container with category-colored background */}
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center mb-3',
            colors.bg
          )}>
            <FileIcon className={cn('w-6 h-6', iconColor)} />
          </div>
          
          {/* Document name */}
          <h4 
            className="font-semibold text-foreground text-sm mb-1 truncate w-full" 
            title={document.name}
          >
            {document.name}
          </h4>

          {/* Description (one-line truncated) */}
          {document.description && (
            <p className="text-xs text-muted-foreground mb-1 truncate w-full" title={document.description}>
              {document.description}
            </p>
          )}
          
          {/* File info */}
          <p className="text-xs text-muted-foreground/70 mb-2">
            {getFileExtension(document.mime_type, document.original_name)} • {formatFileSize(document.size)}
          </p>

          {/* Indexing status badge */}
          {indexStatus && (
            <div className="mb-2">
              {indexStatus.isIndexed ? (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {indexStatus.chunkCount} chunks
                </Badge>
              ) : canBeIndexed ? (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not indexed
                </Badge>
              ) : null}
            </div>
          )}
          
          {/* Agent access badge */}
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              hasRestrictions 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
          >
            <Bot className="w-3 h-3 mr-1" />
            {hasRestrictions ? `${restrictedAgentNames.length} agents` : 'All agents'}
          </Badge>

          {/* Mobile action row — always visible on touch */}
          <div className="flex sm:hidden items-center justify-center gap-1 mt-2 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[44px] min-w-[44px]"
              onClick={(e) => { e.stopPropagation(); onView?.(document); }}
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[44px] min-w-[44px]"
              onClick={(e) => { e.stopPropagation(); onEdit?.(document); }}
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            {showIndexButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 min-h-[44px] min-w-[44px]"
                onClick={handleIndex}
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 min-h-[44px] min-w-[44px]"
              onClick={(e) => { e.stopPropagation(); onDelete?.(document); }}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
