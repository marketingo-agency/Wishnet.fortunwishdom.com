import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - using legacy build for better SSR/CSP compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Worker is served as a static asset from /public so this works in Next.js
// without bundler-specific import syntax. Browser-only init guard prevents
// SSR crashes (pdfjsLib touches DOM at module load).
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfInlinePreviewProps {
  pdfData: ArrayBuffer;
  fileName: string;
  onDownload: () => void;
}

interface PageInfo {
  pageNum: number;
  rendered: boolean;
}

export function PdfInlinePreview({ pdfData, fileName, onDownload }: PdfInlinePreviewProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const doc = await loadingTask.promise;
        
        if (cancelled) return;
        
        // PDF loaded
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPages(Array.from({ length: doc.numPages }, (_, i) => ({ 
          pageNum: i + 1, 
          rendered: false 
        })));
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        
        // Extract error details for debugging
        const error = err as Error & { message?: string; name?: string; stack?: string };
        const errorName = error?.name || 'Unknown';
        const errorMessage = error?.message || String(err);
        
        console.error('[PDF.js] Error loading PDF:', {
          name: errorName,
          message: errorMessage,
          stack: error?.stack?.slice(0, 500),
        });
        
        // Provide specific error messages based on error type
        let userMessage = 'Failed to load PDF.';
        if (errorMessage.includes('worker') || errorMessage.includes('Setting up fake worker')) {
          userMessage = 'PDF worker failed to load (blocked by environment).';
        } else if (errorMessage.includes('Invalid PDF') || errorMessage.includes('Missing PDF')) {
          userMessage = 'Downloaded file is not a valid PDF (header mismatch).';
        } else {
          userMessage = `Failed to load PDF: ${errorMessage.slice(0, 100)}`;
        }
        
        setError(userMessage);
        setIsLoading(false);
      }
    };

    loadPdf();
    
    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  // Render a single page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderingRef.current.has(pageNum)) return;
    
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;
    
    renderingRef.current.add(pageNum);
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext('2d');
      if (!context) return;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      setPages(prev => prev.map(p => 
        p.pageNum === pageNum ? { ...p, rendered: true } : p
      ));
    } catch (err) {
      console.error(`[PDF.js] Error rendering page ${pageNum}:`, err);
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, [pdfDoc, scale]);

  // Render first few pages immediately, then lazy-load rest
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    
    // Render first 3 pages immediately
    const initialPages = Math.min(3, numPages);
    for (let i = 1; i <= initialPages; i++) {
      renderPage(i);
    }
  }, [pdfDoc, numPages, renderPage]);

  // Re-render all pages when scale changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;
    
    // Reset rendered state
    setPages(prev => prev.map(p => ({ ...p, rendered: false })));
    renderingRef.current.clear();
    
    // Re-render first few pages
    const initialPages = Math.min(3, numPages);
    for (let i = 1; i <= initialPages; i++) {
      renderPage(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-render only when scale changes; numPages/pdfDoc/renderPage are stable refs
  }, [scale]);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!pdfDoc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '0', 10);
            if (pageNum > 0) {
              renderPage(pageNum);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    canvasRefs.current.forEach((canvas, pageNum) => {
      canvas.setAttribute('data-page', pageNum.toString());
      observer.observe(canvas);
    });

    return () => observer.disconnect();
  }, [pdfDoc, pages.length, renderPage]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const handleResetZoom = () => setScale(1.0);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-muted/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
        <p className="text-sm text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center gap-6 bg-muted/50">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">{fileName}</p>
          <p className="text-sm text-red-500 mt-2">{error}</p>
        </div>
        <Button onClick={onDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-muted">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b shrink-0">
        <span className="text-sm text-muted-foreground">
          {numPages} page{numPages !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetZoom} className="h-8 w-8">
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Pages container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
      >
        <div className="flex flex-col items-center gap-4">
          {pages.map(({ pageNum, rendered }) => (
            <div
              key={pageNum}
              className={cn(
                "bg-card shadow-md",
                !rendered && "min-h-[800px] min-w-[600px] flex items-center justify-center"
              )}
            >
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el);
                  else canvasRefs.current.delete(pageNum);
                }}
                className="max-w-full"
              />
              {!rendered && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground/70 text-sm">
                    Loading page {pageNum}...
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
