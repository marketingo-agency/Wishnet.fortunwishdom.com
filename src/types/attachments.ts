/**
 * Shared Attachment Types
 * Used across Osha, Pixel, and other agent UIs for file attachments
 */

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  status: 'processing' | 'ready' | 'error';
  extractedContent?: string;
  isImage?: boolean;
  base64?: string;
  errorMessage?: string;
}

/**
 * Attachment context sent to edge functions.
 * Shared between Osha and Pixel agents.
 */
export interface AttachmentContext {
  name: string;
  type: string;
  content: string;
  isImage?: boolean;
}
