/**
 * OCR Indexing Hook
 * 
 * Handles client-side PDF rendering and OCR processing for documents
 * that couldn't be indexed via standard text extraction.
 * Uses page-by-page batch processing to handle large PDFs safely.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// @ts-ignore - using legacy build for better SSR/CSP compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders, edgeFunctionUrl } from '@/lib/apiHelpers';

// Worker is served as a static asset from /public so this file works in both
// Vite (vite serves /public) and Next.js (next serves /public). Set the
// workerSrc only in the browser, since pdfjsLib touches DOM at module init.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// Number of pages per batch — keeps memory and request size within safe limits
const BATCH_SIZE = 5;

interface PageImage {
  page_number: number;
  image_base64: string;
  mime_type: 'image/png';
}

interface OcrProgress {
  stage: 'fetching' | 'rendering' | 'processing' | 'complete' | 'error';
  currentPage: number;
  totalPages: number;
  ocrCompletedPages: number;
  message: string;
}

interface OcrResult {
  success: boolean;
  chunks?: number;
  pages_processed?: number;
  total_pages?: number;
  characters_extracted?: number;
  error?: string;
}

interface OcrIndexingParams {
  documentId: string;
  storagePath: string;
  mimeType: string;
  onProgress?: (progress: OcrProgress) => void;
}

/**
 * Render a single PDF page to a PNG image
 */
async function renderPageToImage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number = 2.0
): Promise<PageImage> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  canvas.remove();

  return {
    page_number: pageNumber,
    image_base64: base64,
    mime_type: 'image/png',
  };
}

/**
 * Fetch file from Supabase storage
 */
async function fetchFileFromStorage(storagePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from('brain-documents')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to fetch file: ${error?.message || 'Unknown error'}`);
  }

  return data.arrayBuffer();
}

/**
 * Convert image ArrayBuffer directly to base64 PageImage
 */
async function imageToBase64(arrayBuffer: ArrayBuffer, mimeType: string): Promise<PageImage> {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({
        page_number: 1,
        image_base64: base64,
        mime_type: 'image/png',
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Call the OCR edge function with a batch of page images
 * append=true means skip deleting existing embeddings (used for all batches after the first)
 */
async function callOcrEdgeFunction(
  documentId: string,
  pageImages: PageImage[],
  append: boolean = false
): Promise<OcrResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(edgeFunctionUrl('process-ocr'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      document_id: documentId,
      page_images: pageImages,
      append,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `OCR processing failed (${response.status})`);
  }

  const data = await response.json();

  return data;
}

/**
 * Hook for OCR indexing of documents.
 * Uses page-by-page batch processing to safely handle large PDFs (100+ pages).
 */
export function useOcrIndexing() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<OcrProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ documentId, storagePath, mimeType, onProgress }: OcrIndexingParams) => {
      const updateProgress = (p: OcrProgress) => {
        setProgress(p);
        onProgress?.(p);
      };

      const isImage = mimeType?.startsWith('image/');

      try {
        // Stage 1: Fetch file
        updateProgress({
          stage: 'fetching',
          currentPage: 0,
          totalPages: 0,
          ocrCompletedPages: 0,
          message: isImage ? 'Fetching image...' : 'Fetching document...',
        });

        const fileData = await fetchFileFromStorage(storagePath);

        let totalChunks = 0;

        if (isImage) {
          // For images: convert directly to base64 (no pdf.js), single call
          updateProgress({
            stage: 'rendering',
            currentPage: 1,
            totalPages: 1,
            ocrCompletedPages: 0,
            message: 'Processing image...',
          });

          const imageBase64 = await imageToBase64(fileData, mimeType);

          updateProgress({
            stage: 'processing',
            currentPage: 1,
            totalPages: 1,
            ocrCompletedPages: 0,
            message: 'AI Vision: processing image...',
          });

          const result = await callOcrEdgeFunction(documentId, [imageBase64], false);

          if (!result.success) {
            throw new Error(result.error || 'OCR processing failed');
          }

          totalChunks = result.chunks || 0;

          updateProgress({
            stage: 'complete',
            currentPage: 1,
            totalPages: 1,
            ocrCompletedPages: 1,
            message: `Indexed ${totalChunks} chunks from image`,
          });

          return result;
        }

        // For PDFs: batch processing page by page
        updateProgress({
          stage: 'rendering',
          currentPage: 0,
          totalPages: 0,
          ocrCompletedPages: 0,
          message: 'Loading PDF...',
        });

        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
        const totalPages = pdf.numPages;

        // PDF loaded: totalPages pages

        let ocrCompletedPages = 0;

        for (let batchStart = 1; batchStart <= totalPages; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
          const isFirstBatch = batchStart === 1;

          // Render this batch of pages
          const batchImages: PageImage[] = [];
          for (let i = batchStart; i <= batchEnd; i++) {
            updateProgress({
              stage: 'rendering',
              currentPage: i,
              totalPages,
              ocrCompletedPages,
              message: `Rendering page ${i} of ${totalPages}…`,
            });
            batchImages.push(await renderPageToImage(pdf, i));
          }

          // Send batch to OCR edge function
          updateProgress({
            stage: 'processing',
            currentPage: batchEnd,
            totalPages,
            ocrCompletedPages,
            message: `AI Vision: processing pages ${batchStart}–${batchEnd} of ${totalPages}…`,
          });

          const result = await callOcrEdgeFunction(documentId, batchImages, !isFirstBatch);

          if (!result.success) {
            throw new Error(result.error || `OCR failed on batch starting at page ${batchStart}`);
          }

          totalChunks += result.chunks || 0;
          ocrCompletedPages = batchEnd;

          updateProgress({
            stage: 'processing',
            currentPage: batchEnd,
            totalPages,
            ocrCompletedPages,
            message: `AI Vision: ${ocrCompletedPages} / ${totalPages} pages indexed`,
          });

          // Explicitly free batch images memory
          batchImages.length = 0;
        }

        // All batches done
        updateProgress({
          stage: 'complete',
          currentPage: totalPages,
          totalPages,
          ocrCompletedPages: totalPages,
          message: `Indexed ${totalChunks} chunks from ${totalPages} pages`,
        });

        return {
          success: true,
          chunks: totalChunks,
          pages_processed: totalPages,
          total_pages: totalPages,
        };

      } catch (error) {
        updateProgress({
          stage: 'error',
          currentPage: 0,
          totalPages: 0,
          ocrCompletedPages: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success(`Document indexed: ${data.chunks} chunks created`);
      queryClient.invalidateQueries({ queryKey: ['vector-store'] });
      queryClient.invalidateQueries({ queryKey: ['document-index-status'] });
    },
    onError: (error) => {
      toast.error(`OCR indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    onSettled: () => {
      setTimeout(() => setProgress(null), 3000);
    },
  });

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    ...mutation,
    progress,
    resetProgress,
  };
}

/**
 * Hook to check if a document is indexed - uses React Query for reactive updates
 */
export function useDocumentIndexStatus(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-index-status', documentId],
    queryFn: async () => {
      if (!documentId) return { isIndexed: false, chunkCount: 0 };

      const { count, error } = await supabase
        .from('knowledge_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'brain_document')
        .eq('source_id', documentId);

      if (error) {
        console.error('Error checking index status:', error);
        return { isIndexed: false, chunkCount: 0 };
      }

      const chunkCount = count || 0;
      return {
        isIndexed: chunkCount > 0,
        chunkCount,
      };
    },
    enabled: !!documentId,
    staleTime: 30000,
  });
}

/**
 * Hook to check if a heart rule is indexed
 */
export function useRuleIndexStatus(ruleId: string | undefined) {
  return useQuery({
    queryKey: ['rule-index-status', ruleId],
    queryFn: async () => {
      if (!ruleId) return { isIndexed: false, chunkCount: 0 };

      const { count, error } = await supabase
        .from('knowledge_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'heart_rule')
        .eq('source_id', ruleId);

      if (error) {
        console.error('Error checking rule index status:', error);
        return { isIndexed: false, chunkCount: 0 };
      }

      const chunkCount = count || 0;
      return {
        isIndexed: chunkCount > 0,
        chunkCount,
      };
    },
    enabled: !!ruleId,
    staleTime: 30000,
  });
}

/**
 * Hook to check if a Wishpedia entry is indexed
 */
export function useEntryIndexStatus(entryId: string | undefined) {
  return useQuery({
    queryKey: ['entry-index-status', entryId],
    queryFn: async () => {
      if (!entryId) return { isIndexed: false, chunkCount: 0 };

      const { count, error } = await supabase
        .from('knowledge_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('source_type', 'wishpedia_entry')
        .eq('source_id', entryId);

      if (error) {
        console.error('Error checking entry index status:', error);
        return { isIndexed: false, chunkCount: 0 };
      }

      const chunkCount = count || 0;
      return {
        isIndexed: chunkCount > 0,
        chunkCount,
      };
    },
    enabled: !!entryId,
    staleTime: 30000,
  });
}
