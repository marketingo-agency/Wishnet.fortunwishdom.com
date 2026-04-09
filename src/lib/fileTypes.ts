import { 
  File, 
  Image, 
  Video, 
  Music, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  FileArchive,
  type LucideIcon 
} from 'lucide-react';

export interface FileIconResult {
  icon: LucideIcon;
  color: string;
  bg: string;
}

/**
 * Get the appropriate icon, color, and background for a file based on MIME type
 * Optionally uses fileName for extension-based fallback detection
 */
export function getFileIcon(mimeType: string, fileName?: string): FileIconResult {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName?.toLowerCase() || '';

  // CSV files (common edge case - MIME is text/csv)
  if (lowerMime === 'text/csv' || lowerName.endsWith('.csv')) {
    return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' };
  }

  // Spreadsheets (Excel, etc.)
  if (lowerMime.includes('spreadsheet') || lowerMime.includes('excel') || 
      lowerMime.includes('vnd.ms-excel') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' };
  }

  // Images - blue to match the blue badge
  if (lowerMime.startsWith('image/')) {
    return { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50' };
  }

  // Videos
  if (lowerMime.startsWith('video/')) {
    return { icon: Video, color: 'text-purple-500', bg: 'bg-purple-50' };
  }

  // Audio
  if (lowerMime.startsWith('audio/')) {
    return { icon: Music, color: 'text-blue-500', bg: 'bg-blue-50' };
  }

  // PDF
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  }

  // Word documents
  if (lowerMime.includes('word') || lowerMime.includes('document') || 
      lowerMime.includes('msword') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
    return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
  }

  // PowerPoint
  if (lowerMime.includes('powerpoint') || lowerMime.includes('presentation') ||
      lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
    return { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' };
  }

  // Archives
  if (lowerMime.includes('zip') || lowerMime.includes('rar') || lowerMime.includes('7z') ||
      lowerMime.includes('tar') || lowerMime.includes('gzip') || lowerMime.includes('compressed') ||
      lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z') ||
      lowerName.endsWith('.tar') || lowerName.endsWith('.gz')) {
    return { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-50' };
  }

  // Code/Text files
  if (lowerMime === 'text/plain' || lowerMime === 'text/markdown' || 
      lowerMime === 'application/json' || lowerMime === 'text/xml' || lowerMime === 'application/xml' ||
      lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.json') ||
      lowerName.endsWith('.xml') || lowerName.endsWith('.js') || lowerName.endsWith('.ts') ||
      lowerName.endsWith('.jsx') || lowerName.endsWith('.tsx') || lowerName.endsWith('.html') ||
      lowerName.endsWith('.css') || lowerName.endsWith('.py') || lowerName.endsWith('.java')) {
    return { icon: FileCode, color: 'text-slate-600', bg: 'bg-slate-50' };
  }

  // Default fallback - indigo/violet to match document badge
  return { icon: File, color: 'text-indigo-500', bg: 'bg-indigo-50' };
}

/**
 * Get a friendly, human-readable label for a file type
 */
export function getFileTypeLabel(mimeType: string, fileName?: string): string {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName?.toLowerCase() || '';

  // CSV
  if (lowerMime === 'text/csv' || lowerName.endsWith('.csv')) {
    return 'Spreadsheet';
  }

  // Spreadsheets
  if (lowerMime.includes('spreadsheet') || lowerMime.includes('excel') || 
      lowerMime.includes('vnd.ms-excel') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return 'Spreadsheet';
  }

  // Images - return generic "Image" label
  if (lowerMime.startsWith('image/')) {
    return 'Image';
  }

  // Videos
  if (lowerMime.startsWith('video/')) {
    return 'Video';
  }

  // Audio
  if (lowerMime.startsWith('audio/')) {
    return 'Audio';
  }

  // PDF
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'PDF';
  }

  // Word documents
  if (lowerMime.includes('word') || lowerMime.includes('document') || 
      lowerMime.includes('msword') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
    return 'Word Document';
  }

  // PowerPoint
  if (lowerMime.includes('powerpoint') || lowerMime.includes('presentation') ||
      lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx')) {
    return 'PowerPoint';
  }

  // Archives
  if (lowerMime.includes('zip') || lowerMime.includes('rar') || lowerMime.includes('7z') ||
      lowerMime.includes('tar') || lowerMime.includes('gzip') || lowerMime.includes('compressed') ||
      lowerName.endsWith('.zip') || lowerName.endsWith('.rar') || lowerName.endsWith('.7z') ||
      lowerName.endsWith('.tar') || lowerName.endsWith('.gz')) {
    return 'Archive';
  }

  // Text files
  if (lowerMime === 'text/plain' || lowerName.endsWith('.txt')) {
    return 'Text File';
  }

  // Markdown
  if (lowerMime === 'text/markdown' || lowerName.endsWith('.md')) {
    return 'Markdown';
  }

  // JSON
  if (lowerMime === 'application/json' || lowerName.endsWith('.json')) {
    return 'JSON';
  }

  // XML
  if (lowerMime === 'text/xml' || lowerMime === 'application/xml' || lowerName.endsWith('.xml')) {
    return 'XML';
  }

  // Code files
  if (lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.jsx') ||
      lowerName.endsWith('.tsx') || lowerName.endsWith('.html') || lowerName.endsWith('.css') ||
      lowerName.endsWith('.py') || lowerName.endsWith('.java')) {
    return 'Code';
  }

  // Default
  return 'File';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename or MIME type
 */
export function getFileExtension(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}
